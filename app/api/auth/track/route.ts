import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const action: 'connexion' | 'deconnexion' = body.action === 'deconnexion' ? 'deconnexion' : 'connexion'

  const admin = createAdminClient()

  const { data: utilisateur } = await admin
    .from('utilisateurs')
    .select('id, entreprise_id')
    .eq('id', user.id)
    .single()

  if (!utilisateur) return NextResponse.json({ ok: false }, { status: 404 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? null
  const ua = req.headers.get('user-agent') ?? null

  await Promise.all([
    admin.from('connexions_log').insert({
      utilisateur_id: utilisateur.id,
      entreprise_id:  utilisateur.entreprise_id,
      action,
      ip_address: ip,
      user_agent: ua,
    }),
    action === 'connexion'
      ? admin.from('utilisateurs').update({ derniere_connexion: new Date().toISOString() }).eq('id', utilisateur.id)
      : Promise.resolve(),
  ])

  return NextResponse.json({ ok: true })
}
