import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  envoyerEmail, templateConfirmationRdv, templateRappelRdv,
  templateConvocationReunion, templateCompteRenduFinalise,
} from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, type, rdvId } = body

    if (!email || !type) {
      return NextResponse.json({ erreur: 'Paramètres manquants' }, { status: 400 })
    }

    // Email de test (depuis les paramètres admin)
    if (type === 'test') {
      const result = await envoyerEmail({
        to:    email,
        sujet: 'Test email VisitPro — Maileroo',
        html:  `<div style="font-family:Arial,sans-serif;padding:24px"><h2 style="color:#1E3A5F">✅ Maileroo fonctionne !</h2><p>Cet email confirme que votre intégration Maileroo est opérationnelle.</p><p style="color:#888;font-size:12px">VisitPro</p></div>`,
      })
      return NextResponse.json({ succes: result.success, erreur: result.erreur })
    }

    const supabase = createServiceClient()

    if ((type === 'confirmation_rdv' || type === 'rappel_rdv') && rdvId) {
      const { data: rdv } = await supabase
        .from('rendez_vous')
        .select('*, destinataire:utilisateurs!destinataire_id(nom, prenom), entreprise:entreprises(nom, telephone, adresse)')
        .eq('id', rdvId)
        .single()

      if (!rdv) {
        return NextResponse.json({ erreur: 'RDV introuvable' }, { status: 404 })
      }

      const dateFormatee = new Date(rdv.date_rdv).toLocaleDateString('fr-CI', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })

      const nomDestinataire = rdv.destinataire
        ? `${rdv.destinataire.prenom} ${rdv.destinataire.nom}`
        : 'votre interlocuteur'

      const tmpl = type === 'confirmation_rdv'
        ? templateConfirmationRdv({
            nomVisiteur:       rdv.nom_visiteur_externe ?? 'Visiteur',
            nomDestinataire,
            nomEntreprise:     rdv.entreprise?.nom ?? '',
            dateRdv:           dateFormatee,
            heureRdv:          rdv.heure_debut,
            adresseEntreprise: rdv.entreprise?.adresse ?? undefined,
          })
        : templateRappelRdv({
            nomVisiteur:     rdv.nom_visiteur_externe ?? 'Visiteur',
            nomDestinataire,
            nomEntreprise:   rdv.entreprise?.nom ?? '',
            dateRdv:         dateFormatee,
            heureRdv:        rdv.heure_debut,
          })

      const result = await envoyerEmail({ to: email, sujet: tmpl.sujet, html: tmpl.html, texte: tmpl.texte })

      if (result.success) {
        const champ = type === 'confirmation_rdv' ? { email_envoye: true } : { rappel_envoye: true }
        await supabase.from('rendez_vous').update(champ).eq('id', rdvId)
      }

      return NextResponse.json({ succes: result.success, erreur: result.erreur })
    }

    // ── Convocation réunion ──────────────────────────────────────────────────
    if (type === 'convocation_reunion') {
      const { reunionId } = body
      if (!reunionId) return NextResponse.json({ erreur: 'reunionId manquant' }, { status: 400 })

      const { data: reunion } = await supabase
        .from('reunions')
        .select(`
          *,
          entreprise:entreprises(nom),
          participants:reunion_participants(
            id, utilisateur_id, nom_externe, email_externe, convocation_envoyee,
            utilisateur:utilisateurs(nom, prenom, email)
          )
        `)
        .eq('id', reunionId)
        .single()

      if (!reunion) return NextResponse.json({ erreur: 'Réunion introuvable' }, { status: 404 })

      const dateStr = new Date(reunion.date_reunion).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
      const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
      const lien = `${base}/dashboard/reunions/${reunionId}`
      const nomEntreprise = (reunion.entreprise as { nom: string })?.nom ?? 'VisitPro'

      let envoyes = 0
      for (const p of (reunion.participants ?? []) as Array<{ id: string; utilisateur?: { nom: string; prenom: string; email?: string } | null; nom_externe?: string; email_externe?: string; convocation_envoyee: boolean }>) {
        if (p.convocation_envoyee) continue
        const destinataireEmail = p.utilisateur?.email ?? p.email_externe
        const destinataireNom = p.utilisateur
          ? `${p.utilisateur.prenom} ${p.utilisateur.nom}`
          : (p.nom_externe ?? 'Participant')
        if (!destinataireEmail) continue

        const tmpl = templateConvocationReunion({
          nomParticipant: destinataireNom,
          titreReunion: reunion.titre,
          nomEntreprise,
          dateReunion: dateStr,
          heureDebut: reunion.heure_debut.slice(0, 5),
          heureFin: reunion.heure_fin?.slice(0, 5),
          lieu: reunion.lieu ?? undefined,
          description: reunion.description ?? undefined,
          lienReunion: lien,
        })
        const result = await envoyerEmail({ to: destinataireEmail, toName: destinataireNom, sujet: tmpl.sujet, html: tmpl.html, texte: tmpl.texte })
        if (result.success) envoyes++
      }

      return NextResponse.json({ succes: true, envoyes })
    }

    // ── Compte-rendu finalisé ─────────────────────────────────────────────────
    if (type === 'compte_rendu_finalise') {
      const { reunionId } = body
      if (!reunionId) return NextResponse.json({ erreur: 'reunionId manquant' }, { status: 400 })

      const { data: reunion } = await supabase
        .from('reunions')
        .select(`
          *,
          entreprise:entreprises(nom),
          participants:reunion_participants(
            utilisateur_id, nom_externe, email_externe,
            utilisateur:utilisateurs(nom, prenom, email)
          ),
          compte_rendu:comptes_rendus(decisions, plan_actions)
        `)
        .eq('id', reunionId)
        .single()

      if (!reunion) return NextResponse.json({ erreur: 'Réunion introuvable' }, { status: 404 })

      const dateStr = new Date(reunion.date_reunion).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
      const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
      const lien = `${base}/dashboard/reunions/${reunionId}/compte-rendu`
      const nomEntreprise = (reunion.entreprise as { nom: string })?.nom ?? 'VisitPro'
      const cr = reunion.compte_rendu as { decisions: string[]; plan_actions: unknown[] } | null
      const nbDecisions = (cr?.decisions ?? []).length
      const nbActions = (cr?.plan_actions ?? []).length

      let envoyes = 0
      for (const p of (reunion.participants ?? []) as Array<{ utilisateur?: { nom: string; prenom: string; email?: string } | null; nom_externe?: string; email_externe?: string }>) {
        const destinataireEmail = p.utilisateur?.email ?? p.email_externe
        const destinataireNom = p.utilisateur
          ? `${p.utilisateur.prenom} ${p.utilisateur.nom}`
          : (p.nom_externe ?? 'Participant')
        if (!destinataireEmail) continue

        const tmpl = templateCompteRenduFinalise({
          nomParticipant: destinataireNom,
          titreReunion: reunion.titre,
          nomEntreprise,
          dateReunion: dateStr,
          nbDecisions,
          nbActions,
          lienReunion: lien,
        })
        const result = await envoyerEmail({ to: destinataireEmail, toName: destinataireNom, sujet: tmpl.sujet, html: tmpl.html, texte: tmpl.texte })
        if (result.success) envoyes++
      }

      return NextResponse.json({ succes: true, envoyes })
    }

    return NextResponse.json({ erreur: 'Type inconnu' }, { status: 400 })
  } catch (error) {
    console.error('Erreur API email:', error)
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
