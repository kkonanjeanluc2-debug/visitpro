export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Endpoint de diagnostic : vérifie la config push pour l'utilisateur connecté
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY

  const subsResult = user
    ? await supabase.from('push_subscriptions').select('endpoint, created_at').eq('utilisateur_id', user.id)
    : { data: null, error: { message: 'Non authentifié' } }

  return NextResponse.json({
    vapid_public_configured:  !!vapidPublic,
    vapid_private_configured: !!vapidPrivate,
    user_id: user?.id ?? null,
    subscriptions: subsResult.data?.length ?? 0,
    subscriptions_detail: subsResult.data?.map(s => ({
      endpoint_preview: s.endpoint.slice(0, 60) + '…',
      created_at: s.created_at,
    })) ?? [],
    error: (subsResult as { error?: { message: string } | null }).error?.message ?? null,
  })
}
