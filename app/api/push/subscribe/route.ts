export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { endpoint, keys } = await req.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Subscription invalide' }, { status: 400 })
  }

  const { data: utilisateur } = await supabase
    .from('utilisateurs').select('entreprise_id').eq('id', user.id).single()
  if (!utilisateur) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  await supabase.from('push_subscriptions').upsert({
    utilisateur_id: user.id,
    entreprise_id:  utilisateur.entreprise_id,
    endpoint,
    p256dh: keys.p256dh,
    auth:   keys.auth,
  }, { onConflict: 'utilisateur_id,endpoint' })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { endpoint } = await req.json()
  await supabase.from('push_subscriptions')
    .delete().eq('utilisateur_id', user.id).eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}
