export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifierGestionnaireEquipe, peutGererUtilisateur } from '@/lib/equipe-auth'

// Permet au patron/admin (toute l'entreprise) ou au responsable de site
// (son site) de définir le mot de passe d'un collaborateur.
export async function POST(req: Request) {
  const auth = await verifierGestionnaireEquipe()
  if (!auth.ok) return auth.reponse
  const g = auth.gestionnaire

  const { userId, password } = await req.json().catch(() => ({}))
  if (typeof userId !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ erreur: 'Requête invalide' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 })
  }
  if (userId === g.id) {
    return NextResponse.json({ erreur: 'Utilisez la page Sécurité pour changer votre propre mot de passe' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: cible } = await admin
    .from('utilisateurs')
    .select('entreprise_id, site_id, role, is_super_admin')
    .eq('id', userId)
    .single()

  // Même message si l'utilisateur n'existe pas ou est hors de portée
  if (!cible || !peutGererUtilisateur(g, cible)) {
    return NextResponse.json({ erreur: 'Utilisateur introuvable' }, { status: 404 })
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
