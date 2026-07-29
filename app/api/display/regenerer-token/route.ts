import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    // Authentifier l'utilisateur
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

    // Récupérer son entreprise
    const { data: profil } = await supabase
      .from('utilisateurs')
      .select('entreprise_id, role')
      .eq('id', user.id)
      .single()

    if (!profil?.entreprise_id) {
      return NextResponse.json({ erreur: 'Profil introuvable' }, { status: 403 })
    }
    if (!['admin', 'patron'].includes(profil.role)) {
      return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
    }

    // Générer un nouveau token et l'enregistrer via le client admin
    const nouveauToken = crypto.randomUUID().replace(/-/g, '')
    const admin = createAdminClient()
    const { error } = await admin
      .from('entreprises')
      .update({ display_token: nouveauToken })
      .eq('id', profil.entreprise_id)

    if (error) return NextResponse.json({ erreur: error.message }, { status: 500 })

    return NextResponse.json({ token: nouveauToken })
  } catch {
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
