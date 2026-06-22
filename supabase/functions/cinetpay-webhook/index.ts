// Supabase Edge Function : webhook CinetPay
// Déployer : npx supabase functions deploy cinetpay-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hmac } from 'https://deno.land/x/hmac@v2.0.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cinetpay-signature',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const webhookSecret = Deno.env.get('CINETPAY_WEBHOOK_SECRET')

    const body = await req.text()
    const data = JSON.parse(body)

    // Vérification HMAC
    if (webhookSecret) {
      const signature = req.headers.get('x-cinetpay-signature')
      const expectedSig = await hmac('sha256', webhookSecret, body, 'utf8', 'hex')

      if (signature !== expectedSig) {
        return new Response(
          JSON.stringify({ erreur: 'Signature invalide' }),
          { status: 401, headers: corsHeaders }
        )
      }
    }

    const { cpm_result, cpm_trans_id, metadata, cpm_amount } = data

    if (cpm_result !== '00') {
      console.log(`Paiement échoué: ${cpm_trans_id}`)
      return new Response(JSON.stringify({ status: 'payment_failed' }), { headers: corsHeaders })
    }

    let meta: { entreprise_id: string; plan: string }
    try {
      meta = JSON.parse(metadata)
    } catch {
      return new Response(
        JSON.stringify({ erreur: 'Metadata invalides' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const dateFin = new Date()
    dateFin.setMonth(dateFin.getMonth() + 1)

    // Désactiver les abonnements actifs
    await supabase
      .from('abonnements')
      .update({ statut: 'expire' })
      .eq('entreprise_id', meta.entreprise_id)
      .eq('statut', 'actif')

    // Créer le nouvel abonnement
    await supabase.from('abonnements').insert({
      entreprise_id: meta.entreprise_id,
      plan: meta.plan,
      statut: 'actif',
      date_fin: dateFin.toISOString(),
      cinetpay_transaction_id: cpm_trans_id,
      montant: parseInt(cpm_amount ?? '0'),
    })

    // Mettre à jour le plan de l'entreprise
    await supabase
      .from('entreprises')
      .update({ plan: meta.plan })
      .eq('id', meta.entreprise_id)

    console.log(`Abonnement ${meta.plan} activé pour ${meta.entreprise_id}`)

    return new Response(
      JSON.stringify({ status: 'success' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur Edge Function cinetpay-webhook:', error)
    return new Response(
      JSON.stringify({ erreur: String(error) }),
      { status: 500, headers: corsHeaders }
    )
  }
})
