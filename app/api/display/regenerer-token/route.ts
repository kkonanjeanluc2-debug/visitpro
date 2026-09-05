import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

    const { data: profil } = await supabase
      .from('utilisateurs')
      .select('entreprise_id, role, site_id')
      .eq('id', user.id)
      .single()

    if (!profil?.entreprise_id) {
      return NextResponse.json({ erreur: 'Profil introuvable' }, { status: 403 })
    }

    // Lire le body optionnel — site_id présent = régénérer le token d'un site
    let siteId: string | null = null
    try {
      const body = await request.json().catch(() => ({}))
      siteId = body?.site_id ?? null
    } catch { /* body vide */ }

    const admin = createAdminClient()
    const nouveauToken = crypto.randomUUID().replace(/-/g, '')

    if (siteId) {
      // Régénérer le token d'un site spécifique
      // Autorisé si : admin/patron OU collaborateur responsable du site
      const { data: site } = await admin
        .from('sites')
        .select('id, entreprise_id, responsable_id')
        .eq('id', siteId)
        .eq('entreprise_id', profil.entreprise_id)
        .single()

      if (!site) return NextResponse.json({ erreur: 'Site introuvable' }, { status: 404 })

      const peutRegener =
        ['admin', 'patron'].includes(profil.role) ||
        site.responsable_id === user.id

      if (!peutRegener) return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

      const { error } = await admin
        .from('sites')
        .update({ display_token: nouveauToken })
        .eq('id', siteId)

      if (error) return NextResponse.json({ erreur: error.message }, { status: 500 })
      return NextResponse.json({ token: nouveauToken })
    } else {
      // Régénérer le token global de l'entreprise — réservé admin/patron
      if (!['admin', 'patron'].includes(profil.role)) {
        return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
      }

      const { error } = await admin
        .from('entreprises')
        .update({ display_token: nouveauToken })
        .eq('id', profil.entreprise_id)

      if (error) return NextResponse.json({ erreur: error.message }, { status: 500 })
      return NextResponse.json({ token: nouveauToken })
    }
  } catch {
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
