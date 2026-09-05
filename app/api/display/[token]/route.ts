export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
}

async function handleDisplay(token: string) {
  noStore()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Chercher d'abord dans les sites (token de site, écran propre à un site)
  const { data: site } = await admin
    .from('sites')
    .select('id, entreprise_id, nom')
    .eq('display_token', token)
    .single()

  let entrepriseId: string
  let siteId: string | null = null
  let entreprise: { id: string; nom: string; logo_url?: string; display_message: string; display_couleur_fond: string; display_couleur_texte: string } | null = null

  if (site) {
    // Token de site — affiche uniquement les visiteurs de ce site
    entrepriseId = site.entreprise_id
    siteId = site.id

    const { data: ent } = await admin
      .from('entreprises')
      .select('id, nom, logo_url, display_message, display_couleur_fond, display_couleur_texte')
      .eq('id', entrepriseId)
      .single()

    if (!ent) {
      return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_CACHE_HEADERS })
    }
    entreprise = { ...ent, nom: `${ent.nom} — ${site.nom}` }
  } else {
    // Token d'entreprise (admin) — affiche tous les visiteurs de l'entreprise
    const { data: ent } = await admin
      .from('entreprises')
      .select('id, nom, logo_url, display_message, display_couleur_fond, display_couleur_texte')
      .eq('display_token', token)
      .single()

    if (!ent) {
      return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_CACHE_HEADERS })
    }
    entreprise = ent
    entrepriseId = ent.id
  }

  const todayUTC = new Date().toISOString().split('T')[0]

  // Visites du jour en attente
  let q = admin
    .from('visites')
    .select('id, nom_visiteur, prenom_visiteur, organisation_visiteur, statut, niveau_urgence, ordre_file, heure_arrivee, temps_attente_estime, created_at, destinataire_id')
    .eq('entreprise_id', entrepriseId)
    .in('statut', ['en_attente'])
    .gte('created_at', `${todayUTC}T00:00:00Z`)
    .order('created_at', { ascending: true })
    .limit(50)

  // Filtrer par site si c'est un écran de site
  if (siteId) q = q.eq('site_id', siteId)

  const { data: visitesData, error: visitesError } = await q

  // Noms des destinataires
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const destinataireIds = Array.from(new Set((visitesData ?? []).map((v: any) => v.destinataire_id).filter(Boolean)))
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visites = (visitesData ?? []).map((v: any) => ({
    ...v,
    heure_arrivee: (v.heure_arrivee ?? v.created_at) as string,
    destinataire: v.destinataire_id ? (destinataireMap[v.destinataire_id] ?? null) : null,
  }))

  console.log(`[display] ${entreprise.nom} | site=${siteId ?? 'global'} | visites=${visites.length} | err=${visitesError?.message ?? 'none'}`)

  return NextResponse.json(
    { entreprise, visites, _ts: Date.now() },
    { headers: NO_CACHE_HEADERS }
  )
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  return handleDisplay(params.token)
}

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  return handleDisplay(params.token)
}
