import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { envoyerEmail, composerEmailConfirmationRdv, composerEmailRappelRdv } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, type, rdvId } = body

    if (!email || !type) {
      return NextResponse.json({ erreur: 'Paramètres manquants' }, { status: 400 })
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

      const params = {
        nomVisiteur:        rdv.nom_visiteur_externe ?? 'Visiteur',
        nomDestinataire:    rdv.destinataire ? `${rdv.destinataire.prenom} ${rdv.destinataire.nom}` : 'votre interlocuteur',
        dateRdv:            dateFormatee,
        heureRdv:           rdv.heure_debut,
        nomEntreprise:      rdv.entreprise?.nom ?? 'l\'entreprise',
        adresseEntreprise:  rdv.entreprise?.adresse ?? undefined,
        telephoneEntreprise: rdv.entreprise?.telephone ?? undefined,
        titre:              rdv.titre,
      }

      const { sujet, html } = type === 'confirmation_rdv'
        ? composerEmailConfirmationRdv(params)
        : composerEmailRappelRdv(params)

      const result = await envoyerEmail({ destinataire: email, sujet, html })

      if (result.succes) {
        const champ = type === 'confirmation_rdv' ? { email_envoye: true } : { rappel_envoye: true }
        await supabase.from('rendez_vous').update(champ).eq('id', rdvId)
      }

      return NextResponse.json({ succes: result.succes, erreur: result.erreur })
    }

    return NextResponse.json({ erreur: 'Type inconnu' }, { status: 400 })
  } catch (error) {
    console.error('Erreur API email:', error)
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
