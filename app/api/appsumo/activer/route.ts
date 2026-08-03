import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { licenceKey, nomEntreprise, secteur, nom, prenom, email, motDePasse } = body

  if (!licenceKey || !nomEntreprise || !nom || !prenom || !email || !motDePasse) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Vérifier la clé de licence
  const { data: licence, error: errLicence } = await admin
    .from('appsumo_licences')
    .select('id, statut, plan, entreprise_id')
    .eq('licence_key', licenceKey.trim().toUpperCase())
    .single()

  if (errLicence || !licence) {
    return NextResponse.json({ error: 'Clé de licence invalide' }, { status: 400 })
  }
  if (licence.statut === 'rembourse' || licence.statut === 'suspendu') {
    return NextResponse.json({ error: 'Cette licence a été remboursée ou désactivée' }, { status: 400 })
  }
  if (licence.statut === 'active' && licence.entreprise_id) {
    return NextResponse.json({ error: 'Cette licence est déjà activée sur un autre compte' }, { status: 400 })
  }

  // 2. Créer l'entreprise
  const { data: entreprise, error: errEntreprise } = await admin
    .from('entreprises')
    .insert({
      nom: nomEntreprise.trim(),
      secteur: secteur || null,
      plan: licence.plan,
    })
    .select()
    .single()

  if (errEntreprise || !entreprise) {
    return NextResponse.json(
      { error: 'Impossible de créer l\'entreprise : ' + errEntreprise?.message },
      { status: 400 }
    )
  }

  // 3. Créer l'utilisateur Supabase Auth
  const { data: authData, error: errAuth } = await admin.auth.admin.createUser({
    email: email.trim(),
    password: motDePasse,
    email_confirm: true,
    user_metadata: { nom, prenom, entreprise_id: entreprise.id, role: 'patron' },
  })

  if (errAuth || !authData.user) {
    await admin.from('entreprises').delete().eq('id', entreprise.id)
    return NextResponse.json(
      { error: 'Impossible de créer le compte : ' + errAuth?.message },
      { status: 400 }
    )
  }

  // 4. Créer le profil utilisateur
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
      { error: 'Impossible de créer le profil : ' + errUser.message },
      { status: 400 }
    )
  }

  // 5. Créer l'abonnement actif (source AppSumo, pas d'essai)
  await admin.from('abonnements').insert({
    entreprise_id: entreprise.id,
    plan: licence.plan,
    statut: 'actif',
    source: 'appsumo',
    date_debut: new Date().toISOString(),
  })

  // 6. Marquer la licence comme active
  await admin
    .from('appsumo_licences')
    .update({
      statut: 'active',
      entreprise_id: entreprise.id,
      activated_at: new Date().toISOString(),
    })
    .eq('id', licence.id)

  return NextResponse.json({ success: true })
}

// GET : vérifie qu'une clé est valide avant d'afficher le formulaire
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ valid: false, reason: 'missing_key' })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('appsumo_licences')
    .select('statut, plan')
    .eq('licence_key', key.trim().toUpperCase())
    .single()

  if (error || !data) return NextResponse.json({ valid: false, reason: 'not_found' })
  if (data.statut === 'active') return NextResponse.json({ valid: false, reason: 'already_active', plan: data.plan })
  if (data.statut === 'rembourse' || data.statut === 'suspendu') {
    return NextResponse.json({ valid: false, reason: 'refunded' })
  }

  return NextResponse.json({ valid: true, plan: data.plan })
}
