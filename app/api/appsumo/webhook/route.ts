import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

// AppSumo valide l'URL avec un GET — doit retourner { success: true }
export async function GET() {
  return NextResponse.json({ success: true })
}

function generateLicenceKey(): string {
  const part = () => randomBytes(2).toString('hex').toUpperCase()
  return `VISIT-${part()}-${part()}-${part()}`
}

function mapTier(tier: number): 'pro' | 'enterprise' {
  return tier >= 2 ? 'enterprise' : 'pro'
}

export async function POST(req: NextRequest) {
  // Sécurité via la clé dans l'URL (?key=...) — AppSumo n'envoie pas de header d'auth
  const urlKey = req.nextUrl.searchParams.get('key')
  if (process.env.APPSUMO_API_KEY && urlKey !== process.env.APPSUMO_API_KEY) {
    console.error('[appsumo webhook] clé URL invalide:', urlKey?.slice(0, 8))
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
  }

  const event = body.event as string
  const appsumoLicenceKey = body.license_key as string
  const tier = (body.tier as number) ?? 1
  const isTest = body.test === true
  const extra = (body.extra ?? {}) as Record<string, unknown>
  const activationEmail = (extra.activation_email ?? extra.email) as string | undefined

  console.log(`[appsumo webhook] event=${event} licence=${appsumoLicenceKey} tier=${tier} test=${isTest}`)

  // Ignorer les requêtes de test (ne pas créer de vraies licences)
  if (isTest) {
    console.log('[appsumo webhook] requête de test ignorée')
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
    return NextResponse.json({
      success: true,
      message: 'Test received',
      redirect_url: `${base}/appsumo/activer?key=TEST-XXXX-XXXX-XXXX`,
    })
  }

  const admin = createAdminClient()

  // ── ACTIVATION (achat) ────────────────────────────────────────────────────
  if (event === 'activate') {
    // Idempotence : si la licence existe déjà, retourner l'URL d'activation
    const { data: existing } = await admin
      .from('appsumo_licences')
      .select('licence_key')
      .eq('appsumo_uuid', appsumoLicenceKey)
      .single()

    if (existing) {
      const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
      return NextResponse.json({
        success: true,
        message: 'License already exists',
        redirect_url: `${base}/appsumo/activer?key=${existing.licence_key}`,
      })
    }

    const licenceKey = generateLicenceKey()
    const plan = mapTier(tier)

    const { error } = await admin.from('appsumo_licences').insert({
      appsumo_uuid: appsumoLicenceKey,
      licence_key: licenceKey,
      plan,
      statut: 'non_active',
      activation_email: activationEmail ?? null,
      historique: [{ event, tier, ts: new Date().toISOString() }],
    })

    if (error) {
      console.error('[appsumo webhook] insert error:', error.message)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
    const redirectUrl = `${base}/appsumo/activer?key=${licenceKey}`

    console.log('[appsumo webhook] licence créée:', licenceKey, 'url:', redirectUrl)
    return NextResponse.json({
      success: true,
      message: 'License Created',
      redirect_url: redirectUrl,
    })
  }

  // ── DÉSACTIVATION / REMBOURSEMENT ────────────────────────────────────────
  if (event === 'deactivate' || event === 'refund' || event === 'disable') {
    const { data: licence } = await admin
      .from('appsumo_licences')
      .select('entreprise_id')
      .eq('appsumo_uuid', appsumoLicenceKey)
      .single()

    await admin
      .from('appsumo_licences')
      .update({ statut: 'rembourse' })
      .eq('appsumo_uuid', appsumoLicenceKey)

    if (licence?.entreprise_id) {
      await admin
        .from('abonnements')
        .update({ statut: 'suspendu' })
        .eq('entreprise_id', licence.entreprise_id)
        .eq('source', 'appsumo')
    }

    return NextResponse.json({ success: true, message: 'License Deactivated' })
  }

  // ── RÉACTIVATION ─────────────────────────────────────────────────────────
  if (event === 'enable') {
    const { data: licence } = await admin
      .from('appsumo_licences')
      .select('entreprise_id')
      .eq('appsumo_uuid', appsumoLicenceKey)
      .single()

    await admin
      .from('appsumo_licences')
      .update({ statut: licence?.entreprise_id ? 'active' : 'non_active' })
      .eq('appsumo_uuid', appsumoLicenceKey)

    if (licence?.entreprise_id) {
      await admin
        .from('abonnements')
        .update({ statut: 'actif' })
        .eq('entreprise_id', licence.entreprise_id)
        .eq('source', 'appsumo')
    }

    return NextResponse.json({ success: true, message: 'License Enabled' })
  }

  // ── UPGRADE / DOWNGRADE ──────────────────────────────────────────────────
  if (event === 'upgrade' || event === 'downgrade') {
    const newPlan = mapTier(tier)

    await admin
      .from('appsumo_licences')
      .update({ plan: newPlan })
      .eq('appsumo_uuid', appsumoLicenceKey)

    const { data: licence } = await admin
      .from('appsumo_licences')
      .select('entreprise_id')
      .eq('appsumo_uuid', appsumoLicenceKey)
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

    return NextResponse.json({ success: true, message: 'License Updated' })
  }

  return NextResponse.json({ success: true, message: 'Event received' })
}
