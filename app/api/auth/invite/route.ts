import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { envoyerEmail, templateInvitationUtilisateur } from '@/lib/email'
import { verifierGestionnaireEquipe } from '@/lib/equipe-auth'
import { PLANS, type Plan } from '@/types'

const ROLES_CREABLES = ['secretaire', 'collaborateur', 'patron']

export async function POST(request: NextRequest) {
  try {
    const auth = await verifierGestionnaireEquipe()
    if (!auth.ok) return auth.reponse
    const g = auth.gestionnaire

    const body = await request.json()
    const { email, nom, prenom, role, poste, service, mot_de_passe } = body

    if (!email || !nom || !prenom || !role || !mot_de_passe) {
      return NextResponse.json({ erreur: 'Tous les champs sont obligatoires' }, { status: 400 })
    }

    if (mot_de_passe.length < 8) {
      return NextResponse.json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 })
    }

    // Un responsable de site ne crée pas d'administrateur
    if (!ROLES_CREABLES.includes(role) || (!g.estAdmin && role === 'patron')) {
      return NextResponse.json({ erreur: 'Rôle non autorisé' }, { status: 403 })
    }

    // L'entreprise est toujours celle de l'appelant (jamais celle envoyée par le client),
    // et un responsable de site ne crée des comptes que sur son site.
    const entreprise_id = g.entreprise_id
    const admin = createAdminClient()

    const site_id: string | null = g.estAdmin ? (body.site_id || null) : g.site_id
    if (site_id && g.estAdmin) {
      const { data: site } = await admin
        .from('sites').select('id').eq('id', site_id).eq('entreprise_id', entreprise_id).maybeSingle()
      if (!site) return NextResponse.json({ erreur: 'Site invalide' }, { status: 400 })
    }

    // Limite d'utilisateurs du plan
    const { data: ent } = await admin.from('entreprises').select('plan').eq('id', entreprise_id).single()
    const maxUsers = PLANS[(ent?.plan ?? 'starter') as Plan]?.max_utilisateurs ?? null
    if (maxUsers !== null) {
      const { count } = await admin
        .from('utilisateurs')
        .select('id', { count: 'exact', head: true })
        .eq('entreprise_id', entreprise_id)
        .eq('actif', true)
      if ((count ?? 0) >= maxUsers) {
        return NextResponse.json({ erreur: `Limite atteinte : votre plan autorise ${maxUsers} utilisateurs maximum.` }, { status: 403 })
      }
    }

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
      service: service?.trim() || null,
      site_id: site_id ?? null,
      actif: true,
    })

    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ erreur: profileError.message }, { status: 400 })
    }

    // Récupérer le nom de l'entreprise pour l'email
    const { data: entreprise } = await admin
      .from('entreprises')
      .select('nom')
      .eq('id', entreprise_id)
      .single()

    const lienConnexion = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '') + '/login'
    const tmpl = templateInvitationUtilisateur({
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.trim(),
      motDePasse: mot_de_passe,
      nomEntreprise: entreprise?.nom ?? 'VisitPro',
      role,
      lienConnexion,
    })
    await envoyerEmail({ to: email.trim(), toName: `${prenom} ${nom}`, sujet: tmpl.sujet, html: tmpl.html, texte: tmpl.texte })

    return NextResponse.json({ succes: true, user_id: authData.user.id })
  } catch (error) {
    console.error('Erreur creation utilisateur:', error)
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
