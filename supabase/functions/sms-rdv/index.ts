// Supabase Edge Function : envoi SMS de confirmation et rappel RDV
// Déployer : npx supabase functions deploy sms-rdv

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const orangeApiKey = Deno.env.get('ORANGE_SMS_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Récupérer les RDV de demain sans rappel envoyé
    const demain = new Date()
    demain.setDate(demain.getDate() + 1)
    const dateDemain = demain.toISOString().split('T')[0]

    const { data: rdvs, error } = await supabase
      .from('rendez_vous')
      .select('*, destinataire:utilisateurs!destinataire_id(nom, prenom), entreprise:entreprises(nom, telephone)')
      .eq('date_rdv', dateDemain)
      .eq('statut', 'confirme')
      .eq('rappel_envoye', false)
      .not('telephone_visiteur_externe', 'is', null)

    if (error) throw error

    let envois = 0
    let erreurs = 0

    for (const rdv of rdvs ?? []) {
      try {
        const heure = rdv.heure_debut
        const nomVisiteur = rdv.nom_visiteur_externe ?? 'Visiteur'
        const nomDest = rdv.destinataire
          ? `${rdv.destinataire.prenom} ${rdv.destinataire.nom}`
          : 'votre interlocuteur'
        const nomEnt = rdv.entreprise?.nom ?? 'l\'entreprise'

        const message = `Rappel VisitPro: Bonjour ${nomVisiteur}, vous avez rendez-vous demain avec ${nomDest} à ${heure} - ${nomEnt}.`
        const telephone = rdv.telephone_visiteur_externe

        if (orangeApiKey) {
          const tel = telephone.replace(/\D/g, '')
          const telFormat = tel.startsWith('225') ? `+${tel}` : `+225${tel}`

          const smsResponse = await fetch(
            'https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B225VisitPro/requests',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${orangeApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                outboundSMSMessageRequest: {
                  address: [`tel:${telFormat}`],
                  senderAddress: 'tel:+225VisitPro',
                  outboundSMSTextMessage: { message },
                  senderName: 'VisitPro',
                },
              }),
            }
          )

          if (smsResponse.ok) {
            await supabase
              .from('rendez_vous')
              .update({ rappel_envoye: true })
              .eq('id', rdv.id)
            envois++
          } else {
            erreurs++
          }
        } else {
          // Mode simulation (dev sans clé API)
          console.log(`[SMS Simulation] À: ${telephone} | Message: ${message}`)
          await supabase
            .from('rendez_vous')
            .update({ rappel_envoye: true })
            .eq('id', rdv.id)
          envois++
        }
      } catch (err) {
        console.error(`Erreur SMS pour RDV ${rdv.id}:`, err)
        erreurs++
      }
    }

    return new Response(
      JSON.stringify({ succes: true, envois, erreurs, date: dateDemain }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur Edge Function sms-rdv:', error)
    return new Response(
      JSON.stringify({ erreur: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
