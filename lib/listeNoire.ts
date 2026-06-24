import { createClient } from '@/lib/supabase/client'
import type { ListeNoire } from '@/types'

export interface VerifListeNoire {
  estBloque: boolean
  entree?: ListeNoire
}

export async function verifierListeNoire(opts: {
  entrepriseId: string
  visiteurId?: string
  nom: string
  prenom?: string
  telephone?: string
}): Promise<VerifListeNoire> {
  const supabase = createClient()

  // Correspondance exacte par visiteur_id (prioritaire)
  if (opts.visiteurId) {
    const { data: parId } = await supabase
      .from('liste_noire')
      .select('*')
      .eq('entreprise_id', opts.entrepriseId)
      .eq('visiteur_id', opts.visiteurId)
      .eq('actif', true)
      .limit(1)

    if (parId && parId.length > 0) {
      return { estBloque: true, entree: parId[0] as ListeNoire }
    }
  }

  // Correspondance par nom (ILIKE) + affinage
  const { data } = await supabase
    .from('liste_noire')
    .select('*')
    .eq('entreprise_id', opts.entrepriseId)
    .eq('actif', true)
    .ilike('nom', opts.nom)
    .limit(5)

  if (!data || data.length === 0) return { estBloque: false }

  for (const entree of data) {
    // Par téléphone (plus fiable)
    if (opts.telephone && entree.telephone) {
      const norm = (t: string) => t.replace(/\D/g, '')
      if (norm(opts.telephone) === norm(entree.telephone)) {
        return { estBloque: true, entree: entree as ListeNoire }
      }
    }

    // Par nom + prénom
    const nomMatch = entree.nom.toLowerCase().trim() === opts.nom.toLowerCase().trim()
    const prenomMatch = !entree.prenom || !opts.prenom ||
      entree.prenom.toLowerCase().trim() === opts.prenom.toLowerCase().trim()

    if (nomMatch && prenomMatch) {
      return { estBloque: true, entree: entree as ListeNoire }
    }
  }

  return { estBloque: false }
}
