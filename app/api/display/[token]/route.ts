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

  // Filtre sur les visites créées aujourd'hui (UTC).
  // On utilise created_at (toujours défini par la DB) plutôt que heure_arrivee
  // pour éviter tout problème si heure_arrivee est NULL ou mal défini.
  const todayUTC = new Date().toISOString().split('T')[0]
  const selectFields = `
    id, nom_visiteur, prenom_visiteur, organisation_visiteur,
    statut, niveau_urgence, ordre_file, heure_arrivee, temps_attente_estime,
    created_at,
    destinataire:utilisateurs!destinataire_id(prenom, nom)
  `

  const { data: visitesData, error: visitesError } = await admin
    .from('visites')
    .select(selectFields)
    .eq('entreprise_id', entreprise.id)
    .in('statut', ['en_attente'])
    .gte('created_at', `${todayUTC}T00:00:00Z`)
    .order('heure_arrivee', { ascending: true, nullsFirst: false })
    .limit(50)

  // Si heure_arrivee est NULL (anciens inserts), utiliser created_at pour l'affichage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visites = (visitesData ?? []).map((v: any) => ({
    ...v,
    heure_arrivee: (v.heure_arrivee ?? v.created_at) as string,
  }))

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
