import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

async function isSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('utilisateurs').select('is_super_admin').eq('id', user.id).single()
  return data?.is_super_admin === true
}

// PUT { plan, fonctionnalite_slug, actif }
export async function PUT(request: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ erreur: 'Non autorisé' }, { status: 403 })
  }

  const { plan, fonctionnalite_slug, actif } = await request.json()
  if (!plan || !fonctionnalite_slug || actif === undefined) {
    return NextResponse.json({ erreur: 'Paramètres manquants' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('plan_fonctionnalites')
    .upsert({ plan, fonctionnalite_slug, actif }, { onConflict: 'plan,fonctionnalite_slug' })

  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 })
  return NextResponse.json({ succes: true })
}
