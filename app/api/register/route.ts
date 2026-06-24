import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()
    const { nomEntreprise, secteur, adresse, telephone, nom, prenom, email, motDePasse } = body

    if (!nomEntreprise || !email || !motDePasse || !nom || !prenom) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const { data: entreprise, error: errEntreprise } = await admin
      .from('entreprises')
      .insert({
        nom: nomEntreprise.trim(),
        secteur: secteur || null,
        adresse: adresse || null,
        telephone: telephone || null,
        plan: 'starter',
      })
      .select()
      .single()

    if (errEntreprise || !entreprise) {
      return NextResponse.json(
        { error: 'Impossible de creer l\'entreprise : ' + errEntreprise?.message },
        { status: 400 }
      )
    }

    const { data: authData, error: errAuth } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: motDePasse,
      email_confirm: true,
      user_metadata: { nom, prenom, entreprise_id: entreprise.id, role: 'patron' },
    })

    if (errAuth || !authData.user) {
      await admin.from('entreprises').delete().eq('id', entreprise.id)
      return NextResponse.json(
        { error: 'Impossible de creer le compte : ' + errAuth?.message },
        { status: 400 }
      )
    }

    const { error: errUser } = await admin.from('utilisateurs').insert({
      id: authData.user.id,
      entreprise_id: entreprise.id,
      nom: nom.trim(),
      prenom: prenom.trim(),
      role: 'patron',
      actif: true,
    })

    if (errUser) {
      await admin.auth.admin.deleteUser(authData.user.id)
      await admin.from('entreprises').delete().eq('id', entreprise.id)
      return NextResponse.json(
        { error: 'Impossible de creer le profil : ' + errUser.message },
        { status: 400 }
      )
    }

    const dateDebut = new Date()
    const dateFin   = new Date(dateDebut.getTime() + 14 * 24 * 60 * 60 * 1000)
    await admin.from('abonnements').insert({
      entreprise_id:  entreprise.id,
      plan:           'pro',
      statut:         'essai',
      date_debut:     dateDebut.toISOString(),
      date_fin_essai: dateFin.toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
