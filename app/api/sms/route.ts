import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { envoyerSms, composerSmsConfirmationRdv, composerSmsRappelRdv } from '@/lib/sms'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telephone, type, rdvId } = body

    if (!telephone || !type) {
      return NextResponse.json({ erreur: 'Paramètres manquants' }, { status: 400 })
    }

    const supabase = createServiceClient()

    if (type === 'confirmation_rdv' && rdvId) {
      const { data: rdv } = await supabase
        .from('rendez_vous')
        .select('*, destinataire:utilisateurs!destinataire_id(nom, prenom), entreprise:entreprises(nom, telephone)')
        .eq('id', rdvId)
        .single()

      if (!rdv) {
        return NextResponse.json({ erreur: 'RDV introuvable' }, { status: 404 })
      }

      const dateFormatee = new Date(rdv.date_rdv).toLocaleDateString('fr-CI', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })

      const message = composerSmsConfirmationRdv({
        nomVisiteur: rdv.nom_visiteur_externe ?? 'Visiteur',
        nomDestinataire: rdv.destinataire
          ? `${rdv.destinataire.prenom} ${rdv.destinataire.nom}`
          : 'votre interlocuteur',
        dateRdv: dateFormatee,
        heureRdv: rdv.heure_debut,
        nomEntreprise: rdv.entreprise?.nom ?? 'l\'entreprise',
        telephoneEntreprise: rdv.entreprise?.telephone,
      })

      const result = await envoyerSms({ destinataire: telephone, message })

      if (result.succes) {
        await supabase
          .from('rendez_vous')
          .update({ sms_envoye: true })
          .eq('id', rdvId)
      }

      return NextResponse.json({ succes: result.succes, erreur: result.erreur })
    }

    if (type === 'rappel_rdv' && rdvId) {
      const { data: rdv } = await supabase
        .from('rendez_vous')
        .select('*, destinataire:utilisateurs!destinataire_id(nom, prenom), entreprise:entreprises(nom)')
        .eq('id', rdvId)
        .single()

      if (!rdv) {
        return NextResponse.json({ erreur: 'RDV introuvable' }, { status: 404 })
      }

      const dateFormatee = new Date(rdv.date_rdv).toLocaleDateString('fr-CI', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })

      const message = composerSmsRappelRdv({
        nomVisiteur: rdv.nom_visiteur_externe ?? 'Visiteur',
        nomDestinataire: rdv.destinataire
          ? `${rdv.destinataire.prenom} ${rdv.destinataire.nom}`
          : 'votre interlocuteur',
        dateRdv: dateFormatee,
        heureRdv: rdv.heure_debut,
        nomEntreprise: rdv.entreprise?.nom ?? 'l\'entreprise',
      })

      const result = await envoyerSms({ destinataire: telephone, message })

      if (result.succes) {
        await supabase
          .from('rendez_vous')
          .update({ rappel_envoye: true })
          .eq('id', rdvId)
      }

      return NextResponse.json({ succes: result.succes, erreur: result.erreur })
    }

    // SMS libre
    if (type === 'libre' && body.message) {
      const result = await envoyerSms({ destinataire: telephone, message: body.message })
      return NextResponse.json(result)
    }

    return NextResponse.json({ erreur: 'Type SMS inconnu' }, { status: 400 })
  } catch (error) {
    console.error('Erreur API SMS:', error)
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
