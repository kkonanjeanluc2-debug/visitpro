export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Permet au patron/admin d'une entreprise de définir le mot de passe
// d'un collaborateur de SA propre entreprise.
export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: moi } = await admin
    .from('utilisateurs')
    .select('role, entreprise_id, actif')
    .eq('id', user.id)
    .single()

  if (!moi || !moi.actif || !['patron', 'admin'].includes(moi.role)) {
    return NextResponse.json({ erreur: 'Accès interdit' }, { status: 403 })
  }

  const { userId, password } = await req.json().catch(() => ({}))
  if (typeof userId !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ erreur: 'Requête invalide' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 })
  }
  if (userId === user.id) {
    return NextResponse.json({ erreur: 'Utilisez la page Sécurité pour changer votre propre mot de passe' }, { status: 400 })
  }

  const { data: cible } = await admin
    .from('utilisateurs')
    .select('entreprise_id, role')
    .eq('id', userId)
    .single()

  // Même message si l'utilisateur n'existe pas ou appartient à une autre entreprise
  if (!cible || cible.entreprise_id !== moi.entreprise_id || cible.role === 'superadmin') {
    return NextResponse.json({ erreur: 'Utilisateur introuvable' }, { status: 404 })
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
