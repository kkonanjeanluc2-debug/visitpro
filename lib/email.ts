// Envoi d'emails via Maileroo API REST
// Endpoint : https://smtp.maileroo.com/send
// Auth     : X-API-Key header

const MAILEROO_API_URL = 'https://smtp.maileroo.com/send'

interface EnvoiEmailParams {
  to: string
  toName?: string
  sujet: string
  html: string
  texte?: string
  fromEmail?: string
  fromName?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  erreur?: string
}

export async function envoyerEmail(params: EnvoiEmailParams): Promise<EmailResult> {
  const apiKey = process.env.MAILEROO_API_KEY
  if (!apiKey) {
    console.warn('MAILEROO_API_KEY non configurée')
    return { success: false, erreur: 'Clé API email manquante' }
  }

  const fromEmail = params.fromEmail ?? process.env.MAILEROO_FROM_EMAIL ?? 'noreply@visiteurpro.com'
  const fromName  = params.fromName  ?? process.env.MAILEROO_FROM_NAME  ?? 'VisitPro'

  try {
    const response = await fetch(MAILEROO_API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    `${fromName} <${fromEmail}>`,
        to:      params.toName ? `${params.toName} <${params.to}>` : params.to,
        subject: params.sujet,
        html:    params.html,
        plain:   params.texte ?? '',
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const msg = data.message ?? data.error ?? `Erreur HTTP ${response.status}`
      console.error('Maileroo error:', msg)
      return { success: false, erreur: msg }
    }

    return { success: true, messageId: data.message_id ?? data.id ?? 'ok' }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur réseau'
    console.error('Erreur email:', msg)
    return { success: false, erreur: msg }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES HTML
// ─────────────────────────────────────────────────────────────────────────────

export function templateConfirmationRdv(params: {
  nomVisiteur: string
  nomDestinataire: string
  nomEntreprise: string
  dateRdv: string
  heureRdv: string
  adresseEntreprise?: string
  lienQR?: string
  lienWhatsApp?: string
}) {
  const { nomVisiteur, nomDestinataire, nomEntreprise, dateRdv, heureRdv, adresseEntreprise, lienQR, lienWhatsApp } = params
  return {
    sujet: `Confirmation de votre rendez-vous — ${nomEntreprise}`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#1E3A5F;padding:24px 32px;text-align:center">
      <div style="color:#93C5FD;font-size:13px;margin-bottom:4px">VisitPro</div>
      <div style="color:#fff;font-size:20px;font-weight:500">Rendez-vous confirmé ✅</div>
    </div>
    <div style="padding:32px">
      <p style="color:#333;font-size:15px;margin:0 0 16px">Bonjour <strong>${nomVisiteur}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
        Votre rendez-vous avec <strong>${nomDestinataire}</strong> chez <strong>${nomEntreprise}</strong> est bien confirmé.
      </p>
      <div style="background:#f0f9ff;border-left:4px solid #1E3A5F;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px">
        <div style="color:#0c447c;font-size:12px;font-weight:500;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">Détails du rendez-vous</div>
        <div style="color:#333;font-size:14px;margin-bottom:6px">📅 &nbsp;${dateRdv}</div>
        <div style="color:#333;font-size:14px;margin-bottom:6px">🕐 &nbsp;${heureRdv}</div>
        ${adresseEntreprise ? `<div style="color:#333;font-size:14px">📍 &nbsp;${adresseEntreprise}</div>` : ''}
      </div>
      ${lienQR ? `<div style="text-align:center;margin-bottom:24px"><p style="color:#555;font-size:13px;margin:0 0 12px">Présentez ce QR code à votre arrivée :</p><img src="${lienQR}" alt="QR Code" style="width:150px;height:150px;border-radius:8px;border:1px solid #e5e7eb" /></div>` : ''}
      ${lienWhatsApp ? `<div style="text-align:center;margin-bottom:24px"><a href="${lienWhatsApp}" style="display:inline-block;background:#25D366;color:#fff;font-size:14px;font-weight:500;padding:10px 20px;border-radius:8px;text-decoration:none">💬 &nbsp;Contacter via WhatsApp</a><p style="color:#888;font-size:11px;margin:8px 0 0">Pour toute question sur votre rendez-vous</p></div>` : ''}
      <p style="color:#888;font-size:12px;margin:24px 0 0;border-top:1px solid #e5e7eb;padding-top:16px">Ce message est envoyé automatiquement par VisitPro pour le compte de ${nomEntreprise}.</p>
    </div>
  </div>
</body>
</html>`,
    texte: `Bonjour ${nomVisiteur},\n\nVotre rendez-vous avec ${nomDestinataire} chez ${nomEntreprise} est confirmé.\n\nDate : ${dateRdv}\nHeure : ${heureRdv}${adresseEntreprise ? `\nAdresse : ${adresseEntreprise}` : ''}\n\nVisitPro`,
  }
}

export function templateRappelRdv(params: {
  nomVisiteur: string
  nomDestinataire: string
  nomEntreprise: string
  dateRdv: string
  heureRdv: string
  lienWhatsApp?: string
}) {
  const { nomVisiteur, nomDestinataire, nomEntreprise, dateRdv, heureRdv, lienWhatsApp } = params
  return {
    sujet: `Rappel : votre rendez-vous demain — ${nomEntreprise}`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#854F0B;padding:20px 32px;text-align:center">
      <div style="color:#FAC775;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Rappel</div>
      <div style="color:#fff;font-size:18px;font-weight:500;margin-top:4px">⏰ Votre RDV est demain</div>
    </div>
    <div style="padding:28px 32px">
      <p style="color:#333;font-size:15px;margin:0 0 16px">Bonjour <strong>${nomVisiteur}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px">Rappel de votre rendez-vous avec <strong>${nomDestinataire}</strong> chez <strong>${nomEntreprise}</strong> :</p>
      <div style="background:#faeeda;border-radius:8px;padding:14px 18px;margin-bottom:20px;text-align:center">
        <div style="color:#633806;font-size:18px;font-weight:500">${dateRdv} à ${heureRdv}</div>
      </div>
      ${lienWhatsApp ? `<div style="text-align:center;margin-bottom:16px"><a href="${lienWhatsApp}" style="display:inline-block;background:#25D366;color:#fff;font-size:13px;padding:8px 16px;border-radius:8px;text-decoration:none">💬 Confirmer ou annuler via WhatsApp</a></div>` : ''}
      <p style="color:#888;font-size:12px;margin:0">Message automatique VisitPro — ${nomEntreprise}</p>
    </div>
  </div>
</body>
</html>`,
    texte: `Rappel : vous avez un RDV demain ${dateRdv} à ${heureRdv} avec ${nomDestinataire} chez ${nomEntreprise}.\n\nVisitPro`,
  }
}

export function templateBienvenueVisite(params: {
  nomVisiteur: string
  nomDestinataire: string
  nomEntreprise: string
  heureArrivee: string
}) {
  const { nomVisiteur, nomDestinataire, nomEntreprise, heureArrivee } = params
  return {
    sujet: `Votre arrivée a été enregistrée — ${nomEntreprise}`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#085041;padding:20px 32px;text-align:center">
      <div style="color:#9FE1CB;font-size:13px">VisitPro</div>
      <div style="color:#fff;font-size:18px;font-weight:500;margin-top:4px">Bienvenue ! 👋</div>
    </div>
    <div style="padding:28px 32px">
      <p style="color:#333;font-size:15px;margin:0 0 16px">Bonjour <strong>${nomVisiteur}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px">
        Votre arrivée a été enregistrée à <strong>${heureArrivee}</strong> chez <strong>${nomEntreprise}</strong>.<br><br>
        <strong>${nomDestinataire}</strong> a été informé(e) de votre présence et vous reçoit très prochainement.
      </p>
      <div style="background:#e1f5ee;border-radius:8px;padding:12px 16px;color:#085041;font-size:13px">
        Veuillez patienter en salle d'attente. Pour toute question, adressez-vous à la secrétaire.
      </div>
    </div>
  </div>
</body>
</html>`,
    texte: `Bonjour ${nomVisiteur}, votre arrivée à ${heureArrivee} chez ${nomEntreprise} a été enregistrée. ${nomDestinataire} vous reçoit très prochainement.\n\nVisitPro`,
  }
}

export function templateRapportHebdo(params: {
  nomPatron: string
  nomEntreprise: string
  semaine: string
  stats: {
    totalVisites: number
    acceptees: number
    declinees: number
    tempsAttenteMoyen: number
    topCollab: string
    topVisiteur: string
    rdvHonores: number
    rdvAnnules: number
    comparaisonSemainePrecedente: number
  }
}) {
  const { nomPatron, nomEntreprise, semaine, stats } = params
  const variation = stats.comparaisonSemainePrecedente >= 0
    ? `+${stats.comparaisonSemainePrecedente} vs semaine préc.`
    : `${stats.comparaisonSemainePrecedente} vs semaine préc.`
  return {
    sujet: `Rapport hebdomadaire — ${nomEntreprise} — Semaine du ${semaine}`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#1E3A5F;padding:24px 32px">
      <div style="color:#93C5FD;font-size:11px;text-transform:uppercase;letter-spacing:.08em">Rapport hebdomadaire</div>
      <div style="color:#fff;font-size:20px;font-weight:500;margin-top:4px">${nomEntreprise}</div>
      <div style="color:#93C5FD;font-size:13px;margin-top:4px">Semaine du ${semaine}</div>
    </div>
    <div style="padding:28px 32px">
      <p style="color:#333;font-size:14px;margin:0 0 24px">Bonjour <strong>${nomPatron}</strong>, voici le résumé de la semaine :</p>
      <table style="width:100%;border-collapse:separate;border-spacing:8px;margin:0 -8px 20px">
        <tr>
          <td style="background:#e6f1fb;border-radius:8px;padding:14px;text-align:center;width:50%">
            <div style="color:#0c447c;font-size:30px;font-weight:500">${stats.totalVisites}</div>
            <div style="color:#185fa5;font-size:12px">visites totales</div>
            <div style="color:#888;font-size:11px;margin-top:4px">${variation}</div>
          </td>
          <td style="background:#e1f5ee;border-radius:8px;padding:14px;text-align:center;width:50%">
            <div style="color:#085041;font-size:30px;font-weight:500">${stats.tempsAttenteMoyen} min</div>
            <div style="color:#0f6e56;font-size:12px">attente moyenne</div>
          </td>
        </tr>
        <tr>
          <td style="background:#eaf3de;border-radius:8px;padding:12px;text-align:center">
            <div style="color:#27500a;font-size:22px;font-weight:500">${stats.acceptees}</div>
            <div style="color:#3b6d11;font-size:12px">acceptées</div>
          </td>
          <td style="background:#fcebeb;border-radius:8px;padding:12px;text-align:center">
            <div style="color:#791f1f;font-size:22px;font-weight:500">${stats.declinees}</div>
            <div style="color:#a32d2d;font-size:12px">déclinées</div>
          </td>
        </tr>
      </table>
      <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-bottom:16px">
        <div style="color:#555;font-size:13px;margin-bottom:6px"><strong>Collaborateur le plus sollicité :</strong> ${stats.topCollab}</div>
        <div style="color:#555;font-size:13px;margin-bottom:6px"><strong>Visiteur le plus fréquent :</strong> ${stats.topVisiteur}</div>
        <div style="color:#555;font-size:13px"><strong>RDV honorés :</strong> ${stats.rdvHonores} &nbsp;·&nbsp; <strong>Annulés :</strong> ${stats.rdvAnnules}</div>
      </div>
      <p style="color:#888;font-size:12px;margin:0;border-top:1px solid #e5e7eb;padding-top:16px">Rapport généré automatiquement par VisitPro chaque lundi matin.</p>
    </div>
  </div>
</body>
</html>`,
    texte: `Rapport ${nomEntreprise} — ${semaine}\nVisites : ${stats.totalVisites} (${variation})\nAcceptées : ${stats.acceptees} / Déclinées : ${stats.declinees}\nAttente moy. : ${stats.tempsAttenteMoyen} min\nTop collab : ${stats.topCollab}\n\nVisitPro`,
  }
}

// ─── Alias backward-compat pour l'API route existante ───────────────────────
export function composerEmailConfirmationRdv(params: {
  nomVisiteur: string
  nomDestinataire: string
  dateRdv: string
  heureRdv: string
  nomEntreprise: string
  adresseEntreprise?: string
  titre?: string
}) {
  return templateConfirmationRdv(params)
}

export function composerEmailRappelRdv(params: {
  nomVisiteur: string
  nomDestinataire: string
  dateRdv: string
  heureRdv: string
  nomEntreprise: string
}) {
  return templateRappelRdv(params)
}
