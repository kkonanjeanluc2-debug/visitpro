export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:noreply@visiteurpro.com', VAPID_PUBLIC, VAPID_PRIVATE)
}

export async function POST(req: Request) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ error: 'VAPID non configuré' }, { status: 500 })
  }

  const { destinataire_id, nomVisiteur, motif, visiteId } = await req.json()
  if (!destinataire_id || !nomVisiteur) {
    return NextResponse.json({ error: 'destinataire_id et nomVisiteur requis' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('utilisateur_id', destinataire_id)

  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 })

  const motifTexte = motif?.trim() ? motif.trim() : 'non précisé'
  const payload = JSON.stringify({
    title:        `Visiteur : ${nomVisiteur}`,
    body:         `Motif : ${motifTexte}`,
    nomVisiteur,
    motif:        motifTexte,
    visiteId:     visiteId ?? '',
    url:          '/dashboard',
  })

  let sent = 0
  const expired: string[] = []

  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
      sent++
    } catch (err: unknown) {
      // 410 Gone = subscription expirée ou révoquée
      const status = (err as { statusCode?: number }).statusCode
      if (status === 410 || status === 404) expired.push(sub.endpoint)
    }
  }))

  // Nettoyer les subscriptions expirées
  if (expired.length) {
    await Promise.all(expired.map(ep =>
      supabase.from('push_subscriptions')
        .delete().eq('utilisateur_id', destinataire_id).eq('endpoint', ep)
    ))
  }

  return NextResponse.json({ ok: true, sent })
}
