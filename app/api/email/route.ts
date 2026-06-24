import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { envoyerEmail, templateConfirmationRdv, templateRappelRdv } from '@/lib/email'

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

    return NextResponse.json({ erreur: 'Type inconnu' }, { status: 400 })
  } catch (error) {
    console.error('Erreur API email:', error)
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
