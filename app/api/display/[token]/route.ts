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

  const todayUTC = new Date().toISOString().split('T')[0]

  // Requête 1 : visites du jour en attente ou acceptées (sans JOIN pour éviter toute exclusion de ligne)
  const { data: visitesData, error: visitesError } = await admin
    .from('visites')
    .select('id, nom_visiteur, prenom_visiteur, organisation_visiteur, statut, niveau_urgence, ordre_file, heure_arrivee, temps_attente_estime, created_at, destinataire_id')
    .eq('entreprise_id', entreprise.id)
    .in('statut', ['en_attente', 'acceptee'])
    .gte('created_at', `${todayUTC}T00:00:00Z`)
    .order('created_at', { ascending: true })
    .limit(50)

  // Requête 2 : noms des destinataires (séparée pour ne pas bloquer les visites)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const destinataireIds = [...new Set((visitesData ?? []).map((v: any) => v.destinataire_id).filter(Boolean))]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const destinataireMap: Record<string, { prenom: string | null; nom: string }> = {}

  if (destinataireIds.length > 0) {
    const { data: users } = await admin
      .from('utilisateurs')
      .select('id, prenom, nom')
      .in('id', destinataireIds)
    for (const u of users ?? []) {
      destinataireMap[u.id] = { prenom: u.prenom, nom: u.nom }
    }
  }

  // Fusion : heure_arrivee avec fallback + destinataire injecté
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visites = (visitesData ?? []).map((v: any) => ({
    ...v,
    heure_arrivee: (v.heure_arrivee ?? v.created_at) as string,
    destinataire: v.destinataire_id ? (destinataireMap[v.destinataire_id] ?? null) : null,
  }))

  console.log(`[display] ${entreprise.nom} | visites=${visites.length} | err=${visitesError?.message ?? 'none'}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visites.forEach((v: any) => console.log(`  - ${v.nom_visiteur} | statut=${v.statut} | arrivee=${v.heure_arrivee}`))

  return NextResponse.json(
    { entreprise, visites, _ts: Date.now() },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  )
}
