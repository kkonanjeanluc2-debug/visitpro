import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// ── Helpers ──────────────────────────────────────────────────────────────────

function verifierSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secret: string,
): boolean {
  if (!timestamp || !signature) return false
  const payload     = `${timestamp}.${rawBody}`
  const expected    = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  if (expected !== signature) return false
  // Protection replay attack (5 min)
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > 300) return false
  return true
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const body    = JSON.parse(rawBody)

    // ── Initier un paiement (appel depuis le frontend) ──
    if (body.action === 'initier_paiement') {
      const { plan, entreprise_id, facturation } = body
      const apiKey    = process.env.GENIUSPAY_API_KEY
      const apiSecret = process.env.GENIUSPAY_API_SECRET

      if (!apiKey || !apiSecret) {
        return NextResponse.json({ erreur: 'GeniusPay non configuré' }, { status: 500 })
      }

      // Lire le montant depuis tarifs_plans (superadmin peut le modifier)
      const supabase = createServiceClient()
      const { data: tarif } = await supabase
        .from('tarifs_plans')
        .select('prix_mensuel, prix_annuel')
        .eq('plan', plan)
        .maybeSingle()

      const fallbacks: Record<string, { mensuel: number; annuel: number }> = {
        pro:        { mensuel: 20000, annuel: 200000 },
        enterprise: { mensuel: 45000, annuel: 450000 },
      }
      const fb     = fallbacks[plan]
      const montant = facturation === 'annuel'
        ? (tarif?.prix_annuel  ?? fb?.annuel  ?? 0)
        : (tarif?.prix_mensuel ?? fb?.mensuel ?? 0)

      if (!montant || !fb) {
        return NextResponse.json({ erreur: 'Plan invalide' }, { status: 400 })
      }

      const resp = await fetch('https://geniuspay.ci/api/v1/merchant/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key':    apiKey,
          'X-API-Secret': apiSecret,
        },
        body: JSON.stringify({
          amount:      montant,
          currency:    'XOF',
          description: `VisitPro — Abonnement ${plan} (${facturation === 'annuel' ? 'annuel' : 'mensuel'})`,
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/abonnement?paiement=success`,
          error_url:   `${process.env.NEXT_PUBLIC_APP_URL}/admin/abonnement?paiement=error`,
          metadata:    { entreprise_id, plan, facturation: facturation ?? 'mensuel' },
        }),
      })

      const data = await resp.json()

      if (data.success && data.data?.checkout_url) {
        return NextResponse.json({ payment_url: data.data.checkout_url })
      }

      return NextResponse.json(
        { erreur: 'Erreur GeniusPay : ' + (data.message ?? JSON.stringify(data)) },
        { status: 400 },
      )
    }

    // ── Webhook GeniusPay ───────────────────────────────────────────────────
    const webhookSecret = process.env.GENIUSPAY_WEBHOOK_SECRET
    if (webhookSecret) {
      const ok = verifierSignature(
        rawBody,
        request.headers.get('X-Webhook-Timestamp'),
        request.headers.get('X-Webhook-Signature'),
        webhookSecret,
      )
      if (!ok) {
        return NextResponse.json({ erreur: 'Signature invalide' }, { status: 401 })
      }
    }

    const { event, data: txData } = body

    // Seul payment.success active l'abonnement
    if (event !== 'payment.success') {
      return NextResponse.json({ status: 'ignored' })
    }

    const { reference, metadata, amount } = txData ?? {}
    const { entreprise_id, plan, facturation } = metadata ?? {}

    if (!entreprise_id || !plan) {
      return NextResponse.json({ erreur: 'Metadata manquantes' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const dateFin = new Date()
    if (facturation === 'annuel') {
      dateFin.setFullYear(dateFin.getFullYear() + 1)
    } else {
      dateFin.setMonth(dateFin.getMonth() + 1)
    }

    // Expirer les abonnements actifs / essai
    await supabase
      .from('abonnements')
      .update({ statut: 'expire' })
      .eq('entreprise_id', entreprise_id)
      .in('statut', ['actif', 'essai'])

    // Créer le nouvel abonnement
    await supabase.from('abonnements').insert({
      entreprise_id,
      plan,
      statut:                    'actif',
      date_debut:                new Date().toISOString(),
      date_fin:                  dateFin.toISOString(),
      cinetpay_transaction_id:   reference, // champ réutilisé comme transaction_id générique
      montant:                   Math.round(amount ?? 0),
    })

    // Mettre à jour le plan de l'entreprise
    await supabase.from('entreprises').update({ plan }).eq('id', entreprise_id)

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Erreur GeniusPay:', error)
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}
