export const runtime = 'nodejs'

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

  const today = new Date().toISOString().split('T')[0]
  const { data: visites, error: visitesError } = await admin
    .from('visites')
    .select(`
      id, nom_visiteur, prenom_visiteur, organisation_visiteur,
      statut, niveau_urgence, ordre_file, heure_arrivee, temps_attente_estime,
      destinataire:utilisateurs!destinataire_id(prenom, nom)
    `)
    .eq('entreprise_id', entreprise.id)
    .in('statut', ['en_attente', 'acceptee'])
    .gte('heure_arrivee', `${today}T00:00:00`)
    .lte('heure_arrivee', `${today}T23:59:59`)
    .limit(50)

  if (visitesError) console.error('[display] visites error:', visitesError.message)

  return NextResponse.json(
    { entreprise, visites: visites ?? [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
