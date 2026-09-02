import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function isSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('utilisateurs').select('is_super_admin').eq('id', user.id).single()
  return data?.is_super_admin === true
}

export async function GET() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ erreur: 'Non autorisé' }, { status: 403 })
  }

  const supabase = createServiceClient()

  const [
    { data: fonctionnalites },
    { data: planFonctionnalites },
    { data: entrepriseFonctionnalites },
    { data: entreprises },
  ] = await Promise.all([
    supabase.from('fonctionnalites').select('*').order('ordre'),
    supabase.from('plan_fonctionnalites').select('*'),
    supabase.from('entreprise_fonctionnalites').select('*'),
    supabase.from('entreprises').select('id, nom, plan').order('nom'),
  ])

  return NextResponse.json({
    fonctionnalites: fonctionnalites ?? [],
    plan_fonctionnalites: planFonctionnalites ?? [],
    entreprise_fonctionnalites: entrepriseFonctionnalites ?? [],
    entreprises: entreprises ?? [],
  })
}
