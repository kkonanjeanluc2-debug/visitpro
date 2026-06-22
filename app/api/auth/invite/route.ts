import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, nom, prenom, role, poste, entreprise_id, mot_de_passe, site_id } = body

    if (!email || !nom || !prenom || !role || !entreprise_id || !mot_de_passe) {
      return NextResponse.json({ erreur: 'Tous les champs sont obligatoires' }, { status: 400 })
    }

    if (mot_de_passe.length < 8) {
      return NextResponse.json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: mot_de_passe,
      email_confirm: true,
      user_metadata: { nom, prenom, entreprise_id, role },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ erreur: authError?.message ?? 'Erreur creation compte' }, { status: 400 })
    }

    const { error: profileError } = await admin.from('utilisateurs').insert({
      id: authData.user.id,
      entreprise_id,
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: email.trim(),
      role,
      poste: poste?.trim() || null,
      site_id: site_id ?? null,
      actif: true,
    })

    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ erreur: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ succes: true, user_id: authData.user.id })
  } catch (error) {
    console.error('Erreur creation utilisateur:', error)
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
