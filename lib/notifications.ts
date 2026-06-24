// Orchestrateur central des notifications VisitPro
// Email   → Maileroo (automatique)
// WhatsApp → lien wa.me (clic humain depuis l'interface)

import {
  envoyerEmail,
  templateConfirmationRdv,
  templateRappelRdv,
  templateBienvenueVisite,
  templateRapportHebdo,
} from './email'

import {
  lienWaConfirmationRdv,
  lienWaRappelRdv,
  lienWaBienvenueVisite,
  lienWaAttenteVisite,
  lienWaVisiteDeclinee,
} from './whatsapp'

import { createServiceClient } from './supabase/server'

type CanalNotif = 'email' | 'whatsapp_simple' | 'email_et_whatsapp'

interface ConfigEntreprise {
  canal_notif: CanalNotif
  email_expediteur: string
  nom_expediteur: string
  nom: string
  adresse?: string
}

async function getConfigEntreprise(entrepriseId: string): Promise<ConfigEntreprise> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('entreprises')
    .select('canal_notif, nom_expediteur, nom, adresse')
    .eq('id', entrepriseId)
    .single()
  return (data as ConfigEntreprise) ?? {
    canal_notif: 'email',
    email_expediteur: '',
    nom_expediteur: '',
    nom: 'VisitPro',
  }
}

// Construit le fromName : "Cabinet X via VisitPro" ou env default
function buildFromName(nomExpediteur: string | null | undefined): string | undefined {
  if (nomExpediteur && nomExpediteur !== 'VisitPro') return `${nomExpediteur} via VisitPro`
  return undefined // lib/email.ts utilisera MAILEROO_FROM_NAME
}

async function logNotification(params: {
  entrepriseId: string
  visiteId?: string
  rdvId?: string
  canal: string
  destinataire: string
  typeNotif: string
  statut: string
  messageId?: string
  erreur?: string
  lienWhatsApp?: string
}) {
  try {
    const supabase = createServiceClient()
    await supabase.from('notifications_envoyees').insert({
      entreprise_id: params.entrepriseId,
      visite_id:     params.visiteId   ?? null,
      rdv_id:        params.rdvId      ?? null,
      canal:         params.canal,
      destinataire:  params.destinataire,
      type_notif:    params.typeNotif,
      statut:        params.statut,
      message_id:    params.messageId  ?? null,
      erreur:        params.erreur     ?? null,
      lien_whatsapp: params.lienWhatsApp ?? null,
    })
  } catch (err) {
    console.error('Erreur log notification:', err)
  }
}

export interface ResultatNotification {
  emailEnvoye: boolean
  emailErreur?: string
  lienWhatsApp?: string
  messageIdEmail?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTIONS PUBLIQUES
// ─────────────────────────────────────────────────────────────────────────────

export async function notifierConfirmationRdv(params: {
  entrepriseId: string
  rdvId: string
  nomVisiteur: string
  prenomVisiteur: string
  emailVisiteur?: string
  telephoneVisiteur?: string
  nomDestinataire: string
  dateRdv: string
  heureRdv: string
  lienQR?: string
}): Promise<ResultatNotification> {
  const config = await getConfigEntreprise(params.entrepriseId)
  const nomComplet = `${params.prenomVisiteur} ${params.nomVisiteur}`.trim()
  const result: ResultatNotification = { emailEnvoye: false }

  // Générer le lien WhatsApp
  if (
    params.telephoneVisiteur &&
    ['whatsapp_simple', 'email_et_whatsapp'].includes(config.canal_notif)
  ) {
    result.lienWhatsApp = lienWaConfirmationRdv({
      telephoneVisiteur: params.telephoneVisiteur,
      nomVisiteur:       nomComplet,
      nomDestinataire:   params.nomDestinataire,
      nomEntreprise:     config.nom,
      dateRdv:           params.dateRdv,
      heureRdv:          params.heureRdv,
      adresseEntreprise: config.adresse,
    })
    await logNotification({
      entrepriseId:  params.entrepriseId,
      rdvId:         params.rdvId,
      canal:         'whatsapp',
      destinataire:  params.telephoneVisiteur,
      typeNotif:     'confirmation_rdv',
      statut:        'lien_genere',
      lienWhatsApp:  result.lienWhatsApp,
    })
  }

  // Envoyer l'email
  if (
    params.emailVisiteur &&
    ['email', 'email_et_whatsapp'].includes(config.canal_notif)
  ) {
    const tmpl = templateConfirmationRdv({
      nomVisiteur:       nomComplet,
      nomDestinataire:   params.nomDestinataire,
      nomEntreprise:     config.nom,
      dateRdv:           params.dateRdv,
      heureRdv:          params.heureRdv,
      adresseEntreprise: config.adresse,
      lienQR:            params.lienQR,
      lienWhatsApp:      result.lienWhatsApp,
    })
    const emailResult = await envoyerEmail({
      to:        params.emailVisiteur,
      toName:    nomComplet,
      sujet:     tmpl.sujet,
      html:      tmpl.html,
      texte:     tmpl.texte,
      fromName: buildFromName(config.nom_expediteur),
    })
    result.emailEnvoye   = emailResult.success
    result.emailErreur   = emailResult.erreur
    result.messageIdEmail = emailResult.messageId
    await logNotification({
      entrepriseId: params.entrepriseId,
      rdvId:        params.rdvId,
      canal:        'email',
      destinataire: params.emailVisiteur,
      typeNotif:    'confirmation_rdv',
      statut:       emailResult.success ? 'envoye' : 'echec',
      messageId:    emailResult.messageId,
      erreur:       emailResult.erreur,
    })
  }

  return result
}

export async function notifierRappelRdv(params: {
  entrepriseId: string
  rdvId: string
  nomVisiteur: string
  prenomVisiteur: string
  emailVisiteur?: string
  telephoneVisiteur?: string
  nomDestinataire: string
  dateRdv: string
  heureRdv: string
}): Promise<ResultatNotification> {
  const config = await getConfigEntreprise(params.entrepriseId)
  const nomComplet = `${params.prenomVisiteur} ${params.nomVisiteur}`.trim()
  const result: ResultatNotification = { emailEnvoye: false }

  if (
    params.telephoneVisiteur &&
    ['whatsapp_simple', 'email_et_whatsapp'].includes(config.canal_notif)
  ) {
    result.lienWhatsApp = lienWaRappelRdv({
      telephoneVisiteur: params.telephoneVisiteur,
      nomVisiteur:       nomComplet,
      nomDestinataire:   params.nomDestinataire,
      nomEntreprise:     config.nom,
      dateRdv:           params.dateRdv,
      heureRdv:          params.heureRdv,
    })
    await logNotification({
      entrepriseId: params.entrepriseId, rdvId: params.rdvId,
      canal: 'whatsapp', destinataire: params.telephoneVisiteur,
      typeNotif: 'rappel_rdv', statut: 'lien_genere', lienWhatsApp: result.lienWhatsApp,
    })
  }

  if (
    params.emailVisiteur &&
    ['email', 'email_et_whatsapp'].includes(config.canal_notif)
  ) {
    const tmpl = templateRappelRdv({
      nomVisiteur:     nomComplet,
      nomDestinataire: params.nomDestinataire,
      nomEntreprise:   config.nom,
      dateRdv:         params.dateRdv,
      heureRdv:        params.heureRdv,
      lienWhatsApp:    result.lienWhatsApp,
    })
    const emailResult = await envoyerEmail({
      to: params.emailVisiteur, toName: nomComplet,
      sujet: tmpl.sujet, html: tmpl.html, texte: tmpl.texte,
      fromName: buildFromName(config.nom_expediteur),
    })
    result.emailEnvoye    = emailResult.success
    result.messageIdEmail  = emailResult.messageId
    await logNotification({
      entrepriseId: params.entrepriseId, rdvId: params.rdvId,
      canal: 'email', destinataire: params.emailVisiteur,
      typeNotif: 'rappel_rdv', statut: emailResult.success ? 'envoye' : 'echec',
      messageId: emailResult.messageId, erreur: emailResult.erreur,
    })
  }

  return result
}

export async function notifierBienvenueVisite(params: {
  entrepriseId: string
  visiteId: string
  nomVisiteur: string
  prenomVisiteur: string
  emailVisiteur?: string
  telephoneVisiteur?: string
  nomDestinataire: string
  heureArrivee: string
}): Promise<ResultatNotification> {
  const config = await getConfigEntreprise(params.entrepriseId)
  const nomComplet = `${params.prenomVisiteur} ${params.nomVisiteur}`.trim()
  const result: ResultatNotification = { emailEnvoye: false }

  if (
    params.telephoneVisiteur &&
    ['whatsapp_simple', 'email_et_whatsapp'].includes(config.canal_notif)
  ) {
    result.lienWhatsApp = lienWaBienvenueVisite({
      telephoneVisiteur: params.telephoneVisiteur,
      nomVisiteur:       nomComplet,
      nomDestinataire:   params.nomDestinataire,
      nomEntreprise:     config.nom,
      heureArrivee:      params.heureArrivee,
    })
    await logNotification({
      entrepriseId: params.entrepriseId, visiteId: params.visiteId,
      canal: 'whatsapp', destinataire: params.telephoneVisiteur,
      typeNotif: 'bienvenue_visite', statut: 'lien_genere', lienWhatsApp: result.lienWhatsApp,
    })
  }

  if (
    params.emailVisiteur &&
    ['email', 'email_et_whatsapp'].includes(config.canal_notif)
  ) {
    const tmpl = templateBienvenueVisite({
      nomVisiteur:     nomComplet,
      nomDestinataire: params.nomDestinataire,
      nomEntreprise:   config.nom,
      heureArrivee:    params.heureArrivee,
    })
    const emailResult = await envoyerEmail({
      to: params.emailVisiteur, toName: nomComplet,
      sujet: tmpl.sujet, html: tmpl.html, texte: tmpl.texte,
      fromName: buildFromName(config.nom_expediteur),
    })
    result.emailEnvoye    = emailResult.success
    result.messageIdEmail  = emailResult.messageId
    await logNotification({
      entrepriseId: params.entrepriseId, visiteId: params.visiteId,
      canal: 'email', destinataire: params.emailVisiteur,
      typeNotif: 'bienvenue_visite', statut: emailResult.success ? 'envoye' : 'echec',
      messageId: emailResult.messageId, erreur: emailResult.erreur,
    })
  }

  return result
}

// Retourne le lien WA pour affichage dans l'interface (pas d'email automatique)
export async function notifierAttenteVisite(params: {
  entrepriseId: string
  visiteId: string
  telephoneVisiteur?: string
  nomVisiteur: string
  prenomVisiteur: string
  nomDestinataire: string
  tempsEstime?: number
}): Promise<ResultatNotification> {
  const result: ResultatNotification = { emailEnvoye: false }
  if (params.telephoneVisiteur) {
    result.lienWhatsApp = lienWaAttenteVisite({
      telephoneVisiteur: params.telephoneVisiteur,
      nomVisiteur:       `${params.prenomVisiteur} ${params.nomVisiteur}`.trim(),
      nomDestinataire:   params.nomDestinataire,
      tempsEstime:       params.tempsEstime,
    })
  }
  return result
}

export async function notifierVisiteDeclinee(params: {
  entrepriseId: string
  visiteId: string
  nomVisiteur: string
  prenomVisiteur: string
  emailVisiteur?: string
  telephoneVisiteur?: string
}): Promise<ResultatNotification> {
  const config = await getConfigEntreprise(params.entrepriseId)
  const nomComplet = `${params.prenomVisiteur} ${params.nomVisiteur}`.trim()
  const result: ResultatNotification = { emailEnvoye: false }

  if (params.telephoneVisiteur) {
    result.lienWhatsApp = lienWaVisiteDeclinee({
      telephoneVisiteur: params.telephoneVisiteur,
      nomVisiteur:       nomComplet,
      nomEntreprise:     config.nom,
    })
  }

  if (
    params.emailVisiteur &&
    ['email', 'email_et_whatsapp'].includes(config.canal_notif)
  ) {
    const sujet = `Information sur votre visite — ${config.nom}`
    const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px"><p style="color:#333;font-size:14px">Bonjour <strong>${nomComplet}</strong>,</p><p style="color:#555;font-size:14px;line-height:1.6">Nous sommes désolés, votre interlocuteur chez <strong>${config.nom}</strong> est indisponible en ce moment. Veuillez contacter le secrétariat pour reprogrammer votre visite.</p><p style="color:#888;font-size:12px;margin-top:20px">${config.nom} — VisitPro</p></div>`
    const emailResult = await envoyerEmail({
      to: params.emailVisiteur, toName: nomComplet, sujet, html,
      fromName: buildFromName(config.nom_expediteur),
    })
    result.emailEnvoye = emailResult.success
    await logNotification({
      entrepriseId: params.entrepriseId, visiteId: params.visiteId,
      canal: 'email', destinataire: params.emailVisiteur,
      typeNotif: 'decline_visite', statut: emailResult.success ? 'envoye' : 'echec',
      erreur: emailResult.erreur,
    })
  }

  return result
}

export async function notifierRapportHebdo(params: {
  entrepriseId: string
  emailPatron: string
  nomPatron: string
  semaine: string
  stats: Parameters<typeof templateRapportHebdo>[0]['stats']
}): Promise<ResultatNotification> {
  const config = await getConfigEntreprise(params.entrepriseId)
  const tmpl = templateRapportHebdo({
    nomPatron:     params.nomPatron,
    nomEntreprise: config.nom,
    semaine:       params.semaine,
    stats:         params.stats,
  })
  const emailResult = await envoyerEmail({
    to: params.emailPatron, toName: params.nomPatron,
    sujet: tmpl.sujet, html: tmpl.html, texte: tmpl.texte,
    fromEmail: config.email_expediteur, fromName: config.nom_expediteur,
  })
  await logNotification({
    entrepriseId: params.entrepriseId,
    canal: 'email', destinataire: params.emailPatron,
    typeNotif: 'rapport_hebdo', statut: emailResult.success ? 'envoye' : 'echec',
    messageId: emailResult.messageId, erreur: emailResult.erreur,
  })
  return { emailEnvoye: emailResult.success, messageIdEmail: emailResult.messageId }
}
