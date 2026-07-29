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
  const todayUTC = new Date().toISOString().split('T')[0]  // "2026-07-30"
  const { data: visites, error: visitesError } = await admin
    .from('visites')
    .select(`
      id, nom_visiteur, prenom_visiteur, organisation_visiteur,
      statut, niveau_urgence, ordre_file, heure_arrivee, temps_attente_estime,
      destinataire:utilisateurs!destinataire_id(prenom, nom)
    `)
    .eq('entreprise_id', entreprise.id)
    .in('statut', ['en_attente'])
    .gte('heure_arrivee', `${todayUTC}T00:00:00Z`)
    .order('heure_arrivee', { ascending: true })
    .limit(50)

  console.log(`[display] ${entreprise.nom} | visites=${visites?.length ?? 0} | err=${visitesError?.message ?? 'none'}`)
  visites?.forEach(v => console.log(`  - ${v.nom_visiteur} | statut=${v.statut} | arrivee=${v.heure_arrivee}`))

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
