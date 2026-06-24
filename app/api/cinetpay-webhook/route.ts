import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // Initialiser un paiement CinetPay
    if (action === 'initier_paiement') {
      const { plan, entreprise_id } = body
      const apiKey = process.env.CINETPAY_API_KEY
      const siteId = process.env.CINETPAY_SITE_ID

      if (!apiKey || !siteId) {
        return NextResponse.json({ erreur: 'CinetPay non configuré' }, { status: 500 })
      }

      const montants: Record<string, number> = {
        pro: 20000,
        enterprise: 45000,
      }

      const montant = montants[plan]
      if (!montant) {
        return NextResponse.json({ erreur: 'Plan invalide' }, { status: 400 })
      }

      const transactionId = `VP-${entreprise_id.slice(0, 8)}-${Date.now()}`

      const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey: apiKey,
          site_id: siteId,
          transaction_id: transactionId,
          amount: montant,
          currency: 'XOF',
          description: `VisitPro — Abonnement ${plan}`,
          notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/cinetpay-webhook`,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/abonnement`,
          channels: 'ALL',
          lang: 'FR',
          metadata: JSON.stringify({ entreprise_id, plan }),
        }),
      })

      const data = await response.json()

      if (data.code === '201') {
        return NextResponse.json({ payment_url: data.data.payment_url })
      }

      return NextResponse.json({ erreur: 'Erreur CinetPay: ' + data.message }, { status: 400 })
    }

    // Webhook CinetPay (notification de paiement)
    const webhookSecret = process.env.CINETPAY_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get('x-cinetpay-signature')
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex')

      if (signature !== expectedSig) {
        return NextResponse.json({ erreur: 'Signature invalide' }, { status: 401 })
      }
    }

    const { cpm_result, cpm_trans_id, metadata } = body

    if (cpm_result !== '00') {
      return NextResponse.json({ status: 'payment_failed' })
    }

    let meta: { entreprise_id: string; plan: string }
    try {
      meta = JSON.parse(metadata)
    } catch {
      return NextResponse.json({ erreur: 'Metadata invalides' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const dateFin = new Date()
    dateFin.setMonth(dateFin.getMonth() + 1)

    // Désactiver l'abonnement actuel
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
      montant: body.cpm_amount,
    })

    // Mettre à jour le plan de l'entreprise
    await supabase
      .from('entreprises')
      .update({ plan: meta.plan })
      .eq('id', meta.entreprise_id)

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Erreur webhook CinetPay:', error)
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
