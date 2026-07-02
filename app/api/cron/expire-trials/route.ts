import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const isSuperadminCall = url.searchParams.get('superadmin') === '1'
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')

  if (isSuperadminCall) {
    // Appelé depuis l'interface superadmin — vérifier que l'utilisateur est bien superadmin
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 })

    const { data: u } = await supabase
      .from('utilisateurs')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (!u?.is_super_admin) return NextResponse.json({ erreur: 'Non autorisé' }, { status: 403 })
  } else if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Essais expirés
  const { data: essaisExpires } = await supabase
    .from('abonnements')
    .select('id, entreprise_id')
    .eq('statut', 'essai')
    .lt('date_fin_essai', now)

  // Abonnements payants expirés
  const { data: abonnementsExpires } = await supabase
    .from('abonnements')
    .select('id, entreprise_id')
    .eq('statut', 'actif')
    .lt('date_fin', now)

  const tous = [...(essaisExpires ?? []), ...(abonnementsExpires ?? [])]

  if (tous.length === 0) {
    return NextResponse.json({ message: 'Rien à expirer', compte: 0 })
  }

  const aboIds = tous.map(t => t.id)
  const entrepriseIds = Array.from(new Set(tous.map(t => t.entreprise_id)))

  // Passer les abonnements à "expire"
  await supabase
    .from('abonnements')
    .update({ statut: 'expire' })
    .in('id', aboIds)

  // Remettre le plan à "starter" sur les entreprises
  await supabase
    .from('entreprises')
    .update({ plan: 'starter' })
    .in('id', entrepriseIds)

  // Désactiver tous les utilisateurs de ces entreprises
  await supabase
    .from('utilisateurs')
    .update({ actif: false })
    .in('entreprise_id', entrepriseIds)
    .eq('is_super_admin', false)

  return NextResponse.json({
    message: `${tous.length} abonnement(s) expiré(s), ${entrepriseIds.length} entreprise(s) désactivée(s)`,
    compte: tous.length,
    entreprises: entrepriseIds,
  })
}
