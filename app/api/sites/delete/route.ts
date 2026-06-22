import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { siteId } = body

    if (!siteId) {
      return NextResponse.json({ erreur: 'siteId requis' }, { status: 400 })
    }

    // Verify caller is authorized
    const supabaseUser = createClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
    }

    const { data: appelant } = await supabaseUser
      .from('utilisateurs')
      .select('role, permissions')
      .eq('id', user.id)
      .single()

    if (!appelant) {
      return NextResponse.json({ erreur: 'Utilisateur introuvable' }, { status: 401 })
    }

    const isResponsable = appelant.permissions?.responsable_site === true && appelant.role === 'collaborateur'
    if (!['admin', 'patron'].includes(appelant.role) && !isResponsable) {
      return NextResponse.json({ erreur: 'Permission refusée' }, { status: 403 })
    }

    const admin = createAdminClient()

    // 1. Get all user IDs of this site before touching anything
    const { data: utilisateurs } = await admin
      .from('utilisateurs')
      .select('id')
      .eq('site_id', siteId)

    const userIds = (utilisateurs ?? []).map((u) => u.id)

    // 2. Break circular FK: sites.responsable_id → utilisateurs (RESTRICT by default)
    await admin.from('sites').update({ responsable_id: null }).eq('id', siteId)

    // 3. Break circular FK: utilisateurs.site_id → sites (RESTRICT by default)
    if (userIds.length > 0) {
      await admin.from('utilisateurs').update({ site_id: null }).in('id', userIds)
    }

    // 4. Collect visite/rdv IDs for notification cleanup
    const { data: visitesDuSite } = await admin
      .from('visites')
      .select('id')
      .eq('site_id', siteId)

    const { data: rdvDuSite } = await admin
      .from('rendez_vous')
      .select('id')
      .eq('site_id', siteId)

    const visiteIds = (visitesDuSite ?? []).map((v) => v.id)
    const rdvIds = (rdvDuSite ?? []).map((r) => r.id)

    // 5. Delete notifications linked to site visites and rdv
    if (visiteIds.length > 0) {
      await admin.from('notifications').delete().in('visite_id', visiteIds)
    }
    if (rdvIds.length > 0) {
      await admin.from('notifications').delete().in('rdv_id', rdvIds)
    }

    // 6. Delete visites and rdv of the site
    await admin.from('visites').delete().eq('site_id', siteId)
    await admin.from('rendez_vous').delete().eq('site_id', siteId)

    // 7. Clean up cross-site data referencing these users (to avoid FK violations on delete)
    if (userIds.length > 0) {
      const idList = userIds.join(',')

      // Notifications addressed to these users
      await admin.from('notifications').delete().in('destinataire_id', userIds)

      // Visites from other sites referencing these users as destinataire/enregistre_par/decision_par
      const { data: autresVisites } = await admin
        .from('visites')
        .select('id')
        .or(`destinataire_id.in.(${idList}),enregistre_par.in.(${idList}),decision_par.in.(${idList})`)

      const autresVisiteIds = (autresVisites ?? []).map((v) => v.id)
      if (autresVisiteIds.length > 0) {
        await admin.from('notifications').delete().in('visite_id', autresVisiteIds)
        await admin.from('visites').delete().in('id', autresVisiteIds)
      }

      // Rendez-vous from other sites referencing these users
      const { data: autresRdv } = await admin
        .from('rendez_vous')
        .select('id')
        .or(`destinataire_id.in.(${idList}),cree_par.in.(${idList})`)

      const autresRdvIds = (autresRdv ?? []).map((r) => r.id)
      if (autresRdvIds.length > 0) {
        await admin.from('notifications').delete().in('rdv_id', autresRdvIds)
        await admin.from('rendez_vous').delete().in('id', autresRdvIds)
      }

      // Delete each user from auth — ON DELETE CASCADE removes utilisateurs row automatically
      for (const uid of userIds) {
        await admin.auth.admin.deleteUser(uid)
      }
    }

    // 8. Finally delete the site (no FK references remain)
    const { error: siteError } = await admin.from('sites').delete().eq('id', siteId)
    if (siteError) {
      return NextResponse.json({ erreur: siteError.message }, { status: 400 })
    }

    return NextResponse.json({ succes: true })
  } catch (error) {
    console.error('Erreur suppression site:', error)
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
