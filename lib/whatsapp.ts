// WhatsApp "simple" — sans API Business, sans compte Meta
// Fonctionne via des liens wa.me qui ouvrent WhatsApp avec un message pré-rempli.
// L'envoi nécessite un clic humain depuis l'interface (secrétaire ou patron).
// Avantage : zéro coût, zéro approbation Meta, zéro configuration.

// ─── Formater un numéro pour wa.me ───────────────────────────────────────────
// Exemples : "07 88 44 22 11" → "2250788442211"
//            "+225 07 88 44 22 11" → "2250788442211"
export function formatWhatsAppNumber(telephone: string): string {
  const chiffres = telephone.replace(/\D/g, '')
  if (chiffres.startsWith('225')) return chiffres
  if (chiffres.startsWith('0') && chiffres.length === 10) {
    return `225${chiffres.substring(1)}`
  }
  return `225${chiffres}`
}

// ─── Générer un lien wa.me avec message pré-rempli ───────────────────────────
export function genererLienWhatsApp(telephone: string, message: string): string {
  const numero = formatWhatsAppNumber(telephone)
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// GÉNÉRATEURS DE LIENS — un par type de notification
// ─────────────────────────────────────────────────────────────────────────────

export function lienWaConfirmationRdv(params: {
  telephoneVisiteur: string
  nomVisiteur: string
  nomDestinataire: string
  nomEntreprise: string
  dateRdv: string
  heureRdv: string
  adresseEntreprise?: string
}): string {
  const message = `Bonjour ${params.nomVisiteur} 👋

Votre rendez-vous est confirmé :

📅 ${params.dateRdv}
🕐 ${params.heureRdv}
👤 Avec : ${params.nomDestinataire}
🏢 Chez : ${params.nomEntreprise}${params.adresseEntreprise ? `\n📍 ${params.adresseEntreprise}` : ''}

Nous vous attendons !
— VisitPro`
  return genererLienWhatsApp(params.telephoneVisiteur, message)
}

export function lienWaRappelRdv(params: {
  telephoneVisiteur: string
  nomVisiteur: string
  nomDestinataire: string
  nomEntreprise: string
  dateRdv: string
  heureRdv: string
}): string {
  const message = `Rappel ⏰ Bonjour ${params.nomVisiteur},

N'oubliez pas votre rendez-vous :
📅 ${params.dateRdv} à ${params.heureRdv}
👤 Avec : ${params.nomDestinataire}
🏢 ${params.nomEntreprise}

À demain !
— VisitPro`
  return genererLienWhatsApp(params.telephoneVisiteur, message)
}

export function lienWaBienvenueVisite(params: {
  telephoneVisiteur: string
  nomVisiteur: string
  nomDestinataire: string
  nomEntreprise: string
  heureArrivee: string
}): string {
  const message = `Bienvenue ${params.nomVisiteur} 👋

Votre arrivée à ${params.heureArrivee} chez ${params.nomEntreprise} a bien été enregistrée.

${params.nomDestinataire} a été informé(e) et vous reçoit très prochainement. Veuillez patienter en salle d'attente.

— VisitPro`
  return genererLienWhatsApp(params.telephoneVisiteur, message)
}

export function lienWaAttenteVisite(params: {
  telephoneVisiteur: string
  nomVisiteur: string
  nomDestinataire: string
  tempsEstime?: number
}): string {
  const temps = params.tempsEstime
    ? `dans environ ${params.tempsEstime} minutes`
    : 'très prochainement'
  const message = `Bonjour ${params.nomVisiteur},

${params.nomDestinataire} vous recevra ${temps}.

Merci de patienter 🙏
— VisitPro`
  return genererLienWhatsApp(params.telephoneVisiteur, message)
}

export function lienWaVisiteDeclinee(params: {
  telephoneVisiteur: string
  nomVisiteur: string
  nomEntreprise: string
}): string {
  const message = `Bonjour ${params.nomVisiteur},

Nous sommes désolés, votre interlocuteur chez ${params.nomEntreprise} est indisponible en ce moment.

Veuillez contacter le secrétariat pour reprogrammer votre visite.

— VisitPro`
  return genererLienWhatsApp(params.telephoneVisiteur, message)
}

// ─── Helper front-end ─────────────────────────────────────────────────────────
export function ouvrirWhatsApp(lien: string): void {
  window.open(lien, '_blank', 'noopener,noreferrer')
}

// Marqueur indiquant que la Meta API n'est plus utilisée
export const metaApiDesactivee = true
