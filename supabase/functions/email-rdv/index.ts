// Supabase Edge Function : envoi email de rappel RDV J-1
// Déployer : npx supabase functions deploy email-rdv
// Planifier : cron "0 8 * * *" (tous les jours à 8h00)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const emailFrom    = Deno.env.get('EMAIL_FROM') ?? 'VisitPro <noreply@visitpro.ci>'

    const supabase = createClient(supabaseUrl, supabaseKey)

    const demain = new Date()
    demain.setDate(demain.getDate() + 1)
    const dateDemain = demain.toISOString().split('T')[0]

    const { data: rdvs, error } = await supabase
      .from('rendez_vous')
      .select('*, destinataire:utilisateurs!destinataire_id(nom, prenom), entreprise:entreprises(nom, adresse)')
      .eq('date_rdv', dateDemain)
      .eq('statut', 'confirme')
      .eq('rappel_envoye', false)
      .not('email_visiteur_externe', 'is', null)

    if (error) throw error

    let envois = 0
    let erreurs = 0

    for (const rdv of rdvs ?? []) {
      try {
        const emailVisiteur = rdv.email_visiteur_externe
        const nomVisiteur   = rdv.nom_visiteur_externe ?? 'Visiteur'
        const nomDest       = rdv.destinataire ? `${rdv.destinataire.prenom} ${rdv.destinataire.nom}` : 'votre interlocuteur'
        const nomEnt        = rdv.entreprise?.nom ?? 'l\'entreprise'
        const adresse       = rdv.entreprise?.adresse
        const heureRdv      = rdv.heure_debut
        const titre         = rdv.titre

        const dateFormatee = new Date(rdv.date_rdv).toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })

        const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="background:#f59e0b;padding:28px 32px">
          <h1 style="margin:0;color:#fff;font-size:22px">🔔 Rappel — Rendez-vous demain</h1>
          <p style="margin:6px 0 0;color:#fef3c7;font-size:14px">${nomEnt}</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;font-size:16px;color:#374151">Bonjour <strong>${nomVisiteur}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">
            Nous vous rappelons votre rendez-vous <strong>${titre}</strong> prévu <strong>demain</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;margin-bottom:24px">
            <tr><td style="padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="6">
                <tr><td style="font-size:13px;color:#6b7280;width:100px">📅 Date</td><td style="font-size:15px;color:#0f172a;font-weight:600">${dateFormatee}</td></tr>
                <tr><td style="font-size:13px;color:#6b7280">🕐 Heure</td><td style="font-size:15px;color:#0f172a;font-weight:600">${heureRdv}</td></tr>
                <tr><td style="font-size:13px;color:#6b7280">👤 Avec</td><td style="font-size:15px;color:#0f172a;font-weight:600">${nomDest}</td></tr>
                ${adresse ? `<tr><td style="font-size:13px;color:#6b7280">📍 Lieu</td><td style="font-size:15px;color:#0f172a">${adresse}</td></tr>` : ''}
              </table>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#9ca3af">À demain !</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">Message automatique VisitPro • Ne pas répondre</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

        if (resendApiKey) {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: emailFrom,
              to: [emailVisiteur],
              subject: `Rappel : votre rendez-vous demain — ${nomEnt}`,
              html,
            }),
          })

          if (res.ok) {
            await supabase.from('rendez_vous').update({ rappel_envoye: true }).eq('id', rdv.id)
            envois++
          } else {
            console.error(`Erreur Resend pour RDV ${rdv.id}:`, await res.text())
            erreurs++
          }
        } else {
          // Mode simulation
          console.log(`[Email Simulation] À: ${emailVisiteur} | Objet: Rappel RDV demain`)
          await supabase.from('rendez_vous').update({ rappel_envoye: true }).eq('id', rdv.id)
          envois++
        }
      } catch (err) {
        console.error(`Erreur email pour RDV ${rdv.id}:`, err)
        erreurs++
      }
    }

    return new Response(
      JSON.stringify({ succes: true, envois, erreurs, date: dateDemain }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur Edge Function email-rdv:', error)
    return new Response(
      JSON.stringify({ erreur: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
