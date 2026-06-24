'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface DispoCollaborateur {
  id: string
  nom: string
  prenom: string
  poste?: string
  photo_url?: string
  statut_dispo: 'disponible' | 'en_reunion' | 'ne_pas_deranger' | 'absent'
  dispo_message?: string
  dispo_retour_auto?: string
}

export function useDisponibilites(entrepriseId: string | null, siteId?: string) {
  const supabase = createClient()
  const [dispos, setDispos] = useState<DispoCollaborateur[]>([])
  const [loading, setLoading] = useState(true)

  const charger = async () => {
    if (!entrepriseId) { setLoading(false); return }

    let q = supabase
      .from('utilisateurs')
      .select('id, nom, prenom, poste, photo_url, statut_dispo, dispo_message, dispo_retour_auto')
      .eq('entreprise_id', entrepriseId)
      .eq('actif', true)
      .in('role', ['collaborateur', 'patron', 'admin'])
      .order('nom')

    if (siteId) q = q.eq('site_id', siteId)

    const { data } = await q
    setDispos((data ?? []) as DispoCollaborateur[])
    setLoading(false)
  }

  useEffect(() => {
    charger()

    if (!entrepriseId) return

    const channel = supabase
      .channel(`dispo-${entrepriseId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'utilisateurs',
        filter: `entreprise_id=eq.${entrepriseId}`,
      }, () => charger())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [entrepriseId, siteId])

  return { dispos, loading }
}
