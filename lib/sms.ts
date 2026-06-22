interface SmsPayload {
  destinataire: string
  message: string
}

interface SmsResult {
  succes: boolean
  erreur?: string
}

export async function envoyerSms(payload: SmsPayload): Promise<SmsResult> {
  const apiKey = process.env.ORANGE_SMS_API_KEY
  if (!apiKey) {
    console.warn('ORANGE_SMS_API_KEY non configurée')
    return { succes: false, erreur: 'Clé API SMS manquante' }
  }

  try {
    const telephone = formaterTelephone(payload.destinataire)
    const response = await fetch(
      'https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B225VisitPro/requests',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outboundSMSMessageRequest: {
            address: [`tel:${telephone}`],
            senderAddress: 'tel:+225VisitPro',
            outboundSMSTextMessage: {
              message: payload.message,
            },
            senderName: process.env.ORANGE_SMS_SENDER ?? 'VisitPro',
          },
        }),
      }
    )

    if (!response.ok) {
      const erreur = await response.text()
      console.error('Erreur SMS Orange:', erreur)
      return { succes: false, erreur: 'Échec envoi SMS' }
    }

    return { succes: true }
  } catch (error) {
    console.error('Erreur SMS:', error)
    return { succes: false, erreur: 'Erreur réseau SMS' }
  }
}

export function composerSmsConfirmationRdv(params: {
  nomVisiteur: string
  nomDestinataire: string
  dateRdv: string
  heureRdv: string
  nomEntreprise: string
  telephoneEntreprise?: string
}): string {
  const { nomVisiteur, nomDestinataire, dateRdv, heureRdv, nomEntreprise, telephoneEntreprise } = params
  let message = `Bonjour ${nomVisiteur}, votre rendez-vous avec ${nomDestinataire} est confirmé le ${dateRdv} à ${heureRdv} - ${nomEntreprise}.`
  if (telephoneEntreprise) {
    message += ` Tél: ${telephoneEntreprise}`
  }
  return message
}

export function composerSmsRappelRdv(params: {
  nomVisiteur: string
  nomDestinataire: string
  dateRdv: string
  heureRdv: string
  nomEntreprise: string
}): string {
  const { nomVisiteur, nomDestinataire, dateRdv, heureRdv, nomEntreprise } = params
  return `Rappel VisitPro: Bonjour ${nomVisiteur}, vous avez rendez-vous demain avec ${nomDestinataire} à ${heureRdv} - ${nomEntreprise}.`
}

function formaterTelephone(tel: string): string {
  const chiffres = tel.replace(/\D/g, '')
  if (chiffres.startsWith('225')) return `+${chiffres}`
  if (chiffres.startsWith('0')) return `+225${chiffres.substring(1)}`
  return `+225${chiffres}`
}
