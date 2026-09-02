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

// PUT { entreprise_id, fonctionnalite_slug, actif } — crée ou met à jour l'override
export async function PUT(request: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ erreur: 'Non autorisé' }, { status: 403 })
  }

  const { entreprise_id, fonctionnalite_slug, actif } = await request.json()
  if (!entreprise_id || !fonctionnalite_slug || actif === undefined) {
    return NextResponse.json({ erreur: 'Paramètres manquants' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('entreprise_fonctionnalites')
    .upsert(
      { entreprise_id, fonctionnalite_slug, actif, modifie_le: new Date().toISOString() },
      { onConflict: 'entreprise_id,fonctionnalite_slug' }
    )

  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 })
  return NextResponse.json({ succes: true })
}

// DELETE { entreprise_id, fonctionnalite_slug } — supprime l'override (revient au défaut plan)
export async function DELETE(request: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ erreur: 'Non autorisé' }, { status: 403 })
  }

  const { entreprise_id, fonctionnalite_slug } = await request.json()
  if (!entreprise_id || !fonctionnalite_slug) {
    return NextResponse.json({ erreur: 'Paramètres manquants' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('entreprise_fonctionnalites')
    .delete()
    .eq('entreprise_id', entreprise_id)
    .eq('fonctionnalite_slug', fonctionnalite_slug)

  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 })
  return NextResponse.json({ succes: true })
}
