// Supabase Edge Function : webhook GeniusPay
// Déployer : npx supabase functions deploy geniuspay-webhook
// Configurer l'URL dans le dashboard GeniusPay → Webhooks

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp, x-webhook-event',
}

async function verifierSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!timestamp || !signature) return false

  const payload = `${timestamp}.${rawBody}`
  const key     = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const expected  = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  if (expected !== signature) return false
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > 300) return false
  return true
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const supabaseKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const webhookSecret  = Deno.env.get('GENIUSPAY_WEBHOOK_SECRET')

    const rawBody = await req.text()
    const body    = JSON.parse(rawBody)

    // Vérification signature HMAC-SHA256
    if (webhookSecret) {
      const ok = await verifierSignature(
        rawBody,
        req.headers.get('X-Webhook-Timestamp'),
        req.headers.get('X-Webhook-Signature'),
        webhookSecret,
      )
      if (!ok) {
        return new Response(
          JSON.stringify({ erreur: 'Signature invalide' }),
          { status: 401, headers: corsHeaders },
        )
      }
    }

    const { event, data: txData } = body

    if (event !== 'payment.success') {
      return new Response(JSON.stringify({ status: 'ignored' }), { headers: corsHeaders })
    }

    const { reference, metadata, amount } = txData ?? {}
    const { entreprise_id, plan, facturation } = metadata ?? {}

    if (!entreprise_id || !plan) {
      return new Response(
        JSON.stringify({ erreur: 'Metadata manquantes' }),
        { status: 400, headers: corsHeaders },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const dateFin = new Date()
    if (facturation === 'annuel') {
      dateFin.setFullYear(dateFin.getFullYear() + 1)
    } else {
      dateFin.setMonth(dateFin.getMonth() + 1)
    }

    await supabase
      .from('abonnements')
      .update({ statut: 'expire' })
      .eq('entreprise_id', entreprise_id)
      .in('statut', ['actif', 'essai'])

    await supabase.from('abonnements').insert({
      entreprise_id,
      plan,
      statut:                  'actif',
      date_debut:              new Date().toISOString(),
      date_fin:                dateFin.toISOString(),
      cinetpay_transaction_id: reference,
      montant:                 Math.round(amount ?? 0),
    })

    await supabase.from('entreprises').update({ plan }).eq('id', entreprise_id)

    console.log(`[GeniusPay] Abonnement ${plan} activé pour ${entreprise_id} (ref: ${reference})`)

    return new Response(
      JSON.stringify({ status: 'success' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Erreur Edge Function geniuspay-webhook:', error)
    return new Response(
      JSON.stringify({ erreur: String(error) }),
      { status: 500, headers: corsHeaders },
    )
  }
})
