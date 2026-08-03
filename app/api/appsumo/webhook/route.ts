import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

// AppSumo envoie un GET pour valider que l'URL est accessible avant d'activer
export async function GET() {
  return NextResponse.json({ status: 200, message: 'VisitPro webhook ready' })
}

function generateLicenceKey(): string {
  const part = () => randomBytes(2).toString('hex').toUpperCase()
  return `VISIT-${part()}-${part()}-${part()}`
}

function mapPlan(planId: string): 'pro' | 'enterprise' {
  if (planId.toLowerCase().includes('tier2') || planId.toLowerCase().includes('enterprise')) {
    return 'enterprise'
  }
  return 'pro'
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ status: 400, message: 'Invalid JSON' }, { status: 400 })
  }

  // Vérification de la clé API (AppSumo la place dans le body ou en header)
  const apiKey =
    (body.api_key as string | undefined) ??
    req.headers.get('X-Api-Key') ??
    req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')

  if (!process.env.APPSUMO_API_KEY || apiKey !== process.env.APPSUMO_API_KEY) {
    console.error('[appsumo webhook] clé API invalide:', apiKey?.slice(0, 8))
    return NextResponse.json({ status: 401, message: 'Unauthorized' }, { status: 401 })
  }

  const action = body.action as string
  const uuid = body.uuid as string
  const activationEmail = body.activation_email as string | undefined
  const planId = (body.plan_id as string | undefined) ?? ''
  const invoiceItemUuid = body.invoice_item_uuid as string | undefined

  console.log(`[appsumo webhook] action=${action} uuid=${uuid} plan=${planId}`)

  const admin = createAdminClient()

  // ── ACHAT ──────────────────────────────────────────────────────────────────
  if (action === 'purchase') {
    const licenceKey = generateLicenceKey()
    const plan = mapPlan(planId)

    const { error } = await admin.from('appsumo_licences').insert({
      appsumo_uuid: uuid,
      licence_key: licenceKey,
      plan,
      statut: 'non_active',
      activation_email: activationEmail ?? null,
      historique: [{ action, invoice_item_uuid: invoiceItemUuid, ts: new Date().toISOString() }],
    })

    if (error) {
      console.error('[appsumo webhook] insert:', error.message)
      return NextResponse.json({ status: 500, message: error.message }, { status: 500 })
    }

    const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
    const activationUrl = `${base}/appsumo/activer?key=${licenceKey}`

    return NextResponse.json({
      status: 200,
      message: 'License Created',
      activation_url: activationUrl,
      redirect_url: activationUrl,
      license_key: licenceKey,
      next_plan: null,
    })
  }

  // ── REMBOURSEMENT / DÉSACTIVATION ─────────────────────────────────────────
  if (action === 'refund' || action === 'disable') {
    const { data: licence } = await admin
      .from('appsumo_licences')
      .select('entreprise_id')
      .eq('appsumo_uuid', uuid)
      .single()

    await admin
      .from('appsumo_licences')
      .update({ statut: 'rembourse' })
      .eq('appsumo_uuid', uuid)

    if (licence?.entreprise_id) {
      await admin
        .from('abonnements')
        .update({ statut: 'suspendu' })
        .eq('entreprise_id', licence.entreprise_id)
        .eq('source', 'appsumo')
    }

    return NextResponse.json({ status: 200, message: 'License Disabled' })
  }

  // ── RÉACTIVATION ──────────────────────────────────────────────────────────
  if (action === 'enable') {
    const { data: licence } = await admin
      .from('appsumo_licences')
      .select('entreprise_id, plan')
      .eq('appsumo_uuid', uuid)
      .single()

    await admin
      .from('appsumo_licences')
      .update({ statut: licence?.entreprise_id ? 'active' : 'non_active' })
      .eq('appsumo_uuid', uuid)

    if (licence?.entreprise_id) {
      await admin
        .from('abonnements')
        .update({ statut: 'actif' })
        .eq('entreprise_id', licence.entreprise_id)
        .eq('source', 'appsumo')
    }

    return NextResponse.json({ status: 200, message: 'License Enabled' })
  }

  // ── UPGRADE / DOWNGRADE ───────────────────────────────────────────────────
  if (action === 'upgrade' || action === 'downgrade') {
    const newPlan = mapPlan(planId)

    await admin
      .from('appsumo_licences')
      .update({ plan: newPlan })
      .eq('appsumo_uuid', uuid)

    const { data: licence } = await admin
      .from('appsumo_licences')
      .select('entreprise_id')
      .eq('appsumo_uuid', uuid)
      .single()

    if (licence?.entreprise_id) {
      await admin
        .from('abonnements')
        .update({ plan: newPlan })
        .eq('entreprise_id', licence.entreprise_id)
        .eq('source', 'appsumo')

      await admin
        .from('entreprises')
        .update({ plan: newPlan })
        .eq('id', licence.entreprise_id)
    }

    return NextResponse.json({ status: 200, message: 'License Updated', next_plan: null })
  }

  return NextResponse.json({ status: 200, message: 'Event received' })
}
