import { createClient } from '@/lib/supabase/client'
import type { Visite } from '@/types'
import type { NiveauUrgence, TypeVisite } from '@/types'

export async function recalculerFileAttente(entrepriseId: string): Promise<void> {
  const supabase = createClient()
  await supabase.rpc('recalculer_file_attente', { entreprise_id_param: entrepriseId })
}

export async function deplacerDansFile(
  visiteId: string,
  nouvelOrdre: number,
  entrepriseId: string,
): Promise<void> {
  const supabase = createClient()
  await supabase.from('visites').update({ ordre_file: nouvelOrdre }).eq('id', visiteId)
  await recalculerFileAttente(entrepriseId)
}

// Trier les visites en attente selon la logique file : VIP > urgent > normal, puis ordre_file, puis heure
export function trierFileAttente(visites: Visite[]): Visite[] {
  const priorite: Record<string, number> = { vip: 0, urgent: 1, normal: 2 }
  return [...visites].sort((a, b) => {
    const pa = priorite[a.niveau_urgence] ?? 2
    const pb = priorite[b.niveau_urgence] ?? 2
    if (pa !== pb) return pa - pb
    if (a.ordre_file != null && b.ordre_file != null) return a.ordre_file - b.ordre_file
    if (a.ordre_file != null) return -1
    if (b.ordre_file != null) return 1
    return new Date(a.heure_arrivee).getTime() - new Date(b.heure_arrivee).getTime()
  })
}

// Calcule l'ordre à assigner à une nouvelle visite selon la priorité
// VIP → 1-9 | RDV confirmé → 10-49 | Urgent → 50-99 | Normal → 100+
export async function calculerOrdreFile(
  destinataireId: string,
  niveauUrgence: NiveauUrgence,
  type: TypeVisite,
): Promise<number> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  if (niveauUrgence === 'vip') {
    const { count } = await supabase
      .from('visites').select('id', { count: 'exact', head: true })
      .eq('destinataire_id', destinataireId).eq('statut', 'en_attente')
      .eq('niveau_urgence', 'vip').gte('heure_arrivee', today)
    return Math.min(1 + (count ?? 0), 9)
  }

  if (type === 'rdv') {
    const { count } = await supabase
      .from('visites').select('id', { count: 'exact', head: true })
      .eq('destinataire_id', destinataireId).eq('statut', 'en_attente')
      .eq('type_visite', 'rdv').gte('heure_arrivee', today)
    return Math.min(10 + (count ?? 0), 49)
  }

  if (niveauUrgence === 'urgent') {
    const { count } = await supabase
      .from('visites').select('id', { count: 'exact', head: true })
      .eq('destinataire_id', destinataireId).eq('statut', 'en_attente')
      .eq('niveau_urgence', 'urgent').gte('heure_arrivee', today)
    return Math.min(50 + (count ?? 0), 99)
  }

  // Normal → 100+
  const { count } = await supabase
    .from('visites').select('id', { count: 'exact', head: true })
    .eq('destinataire_id', destinataireId).eq('statut', 'en_attente')
    .gte('heure_arrivee', today)
  return 100 + (count ?? 0)
}

// Estime le temps d'attente en minutes basé sur la durée moyenne des 10 dernières visites terminées
export async function estimerTempsAttente(
  destinataireId: string,
  ordreFile: number,
): Promise<number> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  // Combien de personnes ont un ordreFile inférieur (= devant dans la file)
  const { count: devant } = await supabase
    .from('visites').select('id', { count: 'exact', head: true })
    .eq('destinataire_id', destinataireId).eq('statut', 'en_attente')
    .not('ordre_file', 'is', null).lt('ordre_file', ordreFile)
    .gte('heure_arrivee', today)

  // Durée moyenne des 10 dernières visites terminées pour ce destinataire
  const { data } = await supabase
    .from('visites').select('duree_visite')
    .eq('destinataire_id', destinataireId).eq('statut', 'terminee')
    .not('duree_visite', 'is', null)
    .order('heure_arrivee', { ascending: false }).limit(10)

  const durees = (data ?? []).map(v => v.duree_visite as number).filter(d => d > 0)
  const tempsMoyen = durees.length
    ? Math.round(durees.reduce((a, b) => a + b, 0) / durees.length)
    : 15

  return (devant ?? 0) * tempsMoyen
}
