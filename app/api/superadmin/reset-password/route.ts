export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  // Vérifier que l'appelant est bien superadmin
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: moi } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
  if (moi?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
  }

  const { userId, password } = await req.json()
  if (!userId || !password || password.length < 6) {
    return NextResponse.json({ error: 'userId et mot de passe (6 car. min.) requis' }, { status: 400 })
  }

  // Utiliser le service role pour modifier le mot de passe Supabase Auth
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
