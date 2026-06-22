interface EmailPayload {
  destinataire: string
  sujet: string
  html: string
}

interface EmailResult {
  succes: boolean
  erreur?: string
}

export async function envoyerEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY non configurée')
    return { succes: false, erreur: 'Clé API email manquante' }
  }

  try {
    const from = process.env.EMAIL_FROM ?? 'VisitPro <noreply@visitpro.ci>'
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.destinataire],
        subject: payload.sujet,
        html: payload.html,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Erreur Resend:', err)
      return { succes: false, erreur: 'Échec envoi email' }
    }

    return { succes: true }
  } catch (error) {
    console.error('Erreur email:', error)
    return { succes: false, erreur: 'Erreur réseau email' }
  }
}

export function composerEmailConfirmationRdv(params: {
  nomVisiteur: string
  nomDestinataire: string
  dateRdv: string
  heureRdv: string
  nomEntreprise: string
  adresseEntreprise?: string
  telephoneEntreprise?: string
  titre: string
}): { sujet: string; html: string } {
  const { nomVisiteur, nomDestinataire, dateRdv, heureRdv, nomEntreprise, adresseEntreprise, telephoneEntreprise, titre } = params

  const sujet = `Confirmation de votre rendez-vous — ${nomEntreprise}`

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:28px 32px">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700">✅ Rendez-vous confirmé</h1>
            <p style="margin:6px 0 0;color:#93c5fd;font-size:14px">${nomEntreprise}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 24px;font-size:16px;color:#374151">Bonjour <strong>${nomVisiteur}</strong>,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">
              Votre rendez-vous <strong>${titre}</strong> avec <strong>${nomDestinataire}</strong> est confirmé.
            </p>
            <!-- Info card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:24px">
              <tr><td style="padding:20px 24px">
                <table width="100%" cellpadding="0" cellspacing="6">
                  <tr>
                    <td style="font-size:13px;color:#6b7280;width:100px">📅 Date</td>
                    <td style="font-size:15px;color:#0f172a;font-weight:600">${dateRdv}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280">🕐 Heure</td>
                    <td style="font-size:15px;color:#0f172a;font-weight:600">${heureRdv}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280">👤 Avec</td>
                    <td style="font-size:15px;color:#0f172a;font-weight:600">${nomDestinataire}</td>
                  </tr>
                  ${adresseEntreprise ? `<tr><td style="font-size:13px;color:#6b7280">📍 Lieu</td><td style="font-size:15px;color:#0f172a">${adresseEntreprise}</td></tr>` : ''}
                  ${telephoneEntreprise ? `<tr><td style="font-size:13px;color:#6b7280">📞 Tél.</td><td style="font-size:15px;color:#0f172a">${telephoneEntreprise}</td></tr>` : ''}
                </table>
              </td></tr>
            </table>
            <p style="margin:0;font-size:13px;color:#9ca3af">Si vous avez des questions, contactez-nous directement.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">Ce message est envoyé automatiquement par VisitPro • Ne pas répondre à cet email</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { sujet, html }
}

export function composerEmailRappelRdv(params: {
  nomVisiteur: string
  nomDestinataire: string
  dateRdv: string
  heureRdv: string
  nomEntreprise: string
  adresseEntreprise?: string
  titre: string
}): { sujet: string; html: string } {
  const { nomVisiteur, nomDestinataire, dateRdv, heureRdv, nomEntreprise, adresseEntreprise, titre } = params

  const sujet = `Rappel : votre rendez-vous demain — ${nomEntreprise}`

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr>
          <td style="background:#f59e0b;padding:28px 32px">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700">🔔 Rappel — Rendez-vous demain</h1>
            <p style="margin:6px 0 0;color:#fef3c7;font-size:14px">${nomEntreprise}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 24px;font-size:16px;color:#374151">Bonjour <strong>${nomVisiteur}</strong>,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">
              Nous vous rappelons votre rendez-vous <strong>${titre}</strong> prévu <strong>demain</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;margin-bottom:24px">
              <tr><td style="padding:20px 24px">
                <table width="100%" cellpadding="0" cellspacing="6">
                  <tr>
                    <td style="font-size:13px;color:#6b7280;width:100px">📅 Date</td>
                    <td style="font-size:15px;color:#0f172a;font-weight:600">${dateRdv}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280">🕐 Heure</td>
                    <td style="font-size:15px;color:#0f172a;font-weight:600">${heureRdv}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280">👤 Avec</td>
                    <td style="font-size:15px;color:#0f172a;font-weight:600">${nomDestinataire}</td>
                  </tr>
                  ${adresseEntreprise ? `<tr><td style="font-size:13px;color:#6b7280">📍 Lieu</td><td style="font-size:15px;color:#0f172a">${adresseEntreprise}</td></tr>` : ''}
                </table>
              </td></tr>
            </table>
            <p style="margin:0;font-size:13px;color:#9ca3af">À demain !</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">Ce message est envoyé automatiquement par VisitPro • Ne pas répondre à cet email</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { sujet, html }
}
