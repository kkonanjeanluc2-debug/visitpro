import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  return NextResponse.json({
    maileroo: !!process.env.MAILEROO_API_KEY,
    cronSecret: !!process.env.CRON_SECRET,
  })
}
