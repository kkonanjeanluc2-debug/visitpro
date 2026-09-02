import { createServiceClient } from '@/lib/supabase/server'

export async function getFonctionnalitesEntreprise(
  entrepriseId: string,
  plan: string
): Promise<Set<string>> {
  const supabase = createServiceClient()

  const [{ data: planFeatures }, { data: overrides }] = await Promise.all([
    supabase
      .from('plan_fonctionnalites')
      .select('fonctionnalite_slug, actif')
      .eq('plan', plan),
    supabase
      .from('entreprise_fonctionnalites')
      .select('fonctionnalite_slug, actif')
      .eq('entreprise_id', entrepriseId),
  ])

  const enabled = new Set<string>()

  for (const pf of (planFeatures ?? [])) {
    if (pf.actif) enabled.add(pf.fonctionnalite_slug)
  }

  for (const ov of (overrides ?? [])) {
    if (ov.actif) enabled.add(ov.fonctionnalite_slug)
    else enabled.delete(ov.fonctionnalite_slug)
  }

  return enabled
}
