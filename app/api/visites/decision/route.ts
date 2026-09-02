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
      .select('entreprise_id, role')
      .eq('id', user.id)
      .single()

    if (!profil?.entreprise_id) {
      return NextResponse.json({ erreur: 'Profil introuvable' }, { status: 403 })
    }

    const { visite_id, decision, note, heure_arrivee } = await request.json()

    if (!visite_id || !decision || !['acceptee', 'declinee'].includes(decision)) {
      return NextResponse.json({ erreur: 'Paramètres invalides' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: visite } = await admin
      .from('visites')
      .select('id, entreprise_id, destinataire_id')
      .eq('id', visite_id)
      .eq('entreprise_id', profil.entreprise_id)
      .single()

    if (!visite) {
      return NextResponse.json({ erreur: 'Visite introuvable ou accès refusé' }, { status: 404 })
    }

    const peutDecider =
      ['admin', 'patron', 'secretaire'].includes(profil.role) ||
      visite.destinataire_id === user.id

    if (!peutDecider) {
      return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
    }

    const now = new Date()
    const updates: Record<string, unknown> = {
      statut: decision,
      decision_par: user.id,
      decision_at: now.toISOString(),
      note_decision: note ?? null,
    }

    if (decision === 'acceptee') {
      updates.heure_entree = now.toISOString()
      if (heure_arrivee) {
        updates.duree_attente = Math.round(
          (now.getTime() - new Date(heure_arrivee).getTime()) / 60000
        )
      }
    }

    const { error } = await admin.from('visites').update(updates).eq('id', visite_id)
    if (error) return NextResponse.json({ erreur: error.message }, { status: 500 })

    return NextResponse.json({ succes: true })
  } catch {
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
