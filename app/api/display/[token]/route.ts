export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: entreprise } = await admin
    .from('entreprises')
    .select('id, nom, logo_url, display_message, display_couleur_fond, display_couleur_texte')
    .eq('display_token', params.token)
    .single()

  if (!entreprise) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Filtre sur aujourd'hui en UTC explicite (suffixe Z) pour éviter
  // toute ambiguïté de timezone côté session Supabase/PostgreSQL.
  const todayUTC = new Date().toISOString().split('T')[0]
  const selectFields = `
    id, nom_visiteur, prenom_visiteur, organisation_visiteur,
    statut, niveau_urgence, ordre_file, heure_arrivee, temps_attente_estime,
    destinataire:utilisateurs!destinataire_id(prenom, nom)
  `

  // Visites avec heure_arrivee renseignée (cas normal)
  const { data: visitesAvecDate, error: errAvecDate } = await admin
    .from('visites')
    .select(selectFields)
    .eq('entreprise_id', entreprise.id)
    .in('statut', ['en_attente'])
    .gte('heure_arrivee', `${todayUTC}T00:00:00Z`)
    .order('heure_arrivee', { ascending: true })
    .limit(50)

  // Visites sans heure_arrivee (inserts anciens avant le correctif) — on utilise created_at
  const { data: visitesSansDate } = await admin
    .from('visites')
    .select(selectFields + ', created_at')
    .eq('entreprise_id', entreprise.id)
    .in('statut', ['en_attente'])
    .is('heure_arrivee', null)
    .gte('created_at', `${todayUTC}T00:00:00Z`)
    .limit(50)

  // Fusionner et corriger heure_arrivee = created_at pour les anciens inserts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visitesAvecDateList: any[] = visitesAvecDate ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visitesSansDateList: any[] = (visitesSansDate ?? []).map((v: any) => ({
    ...v,
    heure_arrivee: v.created_at as string,
  }))
  const visites = [...visitesAvecDateList, ...visitesSansDateList]
  const visitesError = errAvecDate

  console.log(`[display] ${entreprise.nom} | visites=${visites.length} | err=${visitesError?.message ?? 'none'}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visites.forEach((v: any) => console.log(`  - ${v.nom_visiteur} | statut=${v.statut} | arrivee=${v.heure_arrivee}`))

  return NextResponse.json(
    { entreprise, visites: visites ?? [], _ts: Date.now() },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  )
}
