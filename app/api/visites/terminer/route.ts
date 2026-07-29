import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // 1. Authentifier l'utilisateur via la session cookie
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

    // 2. Récupérer le profil pour connaître l'entreprise de l'utilisateur
    const { data: profil } = await supabase
      .from('utilisateurs')
      .select('entreprise_id, role')
      .eq('id', user.id)
      .single()

    if (!profil?.entreprise_id) {
      return NextResponse.json({ erreur: 'Profil introuvable' }, { status: 403 })
    }

    const { visite_id, duree_visite } = await request.json()
    if (!visite_id) return NextResponse.json({ erreur: 'visite_id manquant' }, { status: 400 })

    // 3. Vérifier que la visite appartient bien à l'entreprise de l'utilisateur
    const admin = createAdminClient()
    const { data: visite } = await admin
      .from('visites')
      .select('id, entreprise_id')
      .eq('id', visite_id)
      .eq('entreprise_id', profil.entreprise_id)
      .single()

    if (!visite) {
      return NextResponse.json({ erreur: 'Visite introuvable ou accès refusé' }, { status: 404 })
    }

    // 4. Mettre à jour avec le client admin (bypasse RLS)
    const { error } = await admin
      .from('visites')
      .update({
        statut: 'terminee',
        heure_sortie: new Date().toISOString(),
        ...(duree_visite != null ? { duree_visite } : {}),
      })
      .eq('id', visite_id)

    if (error) return NextResponse.json({ erreur: error.message }, { status: 500 })

    return NextResponse.json({ succes: true })
  } catch {
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
