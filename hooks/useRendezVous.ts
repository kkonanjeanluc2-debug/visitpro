'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { queryCache } from '@/lib/queryCache'
import type { RendezVous } from '@/types'

interface RendezVousState {
  rendezVous: RendezVous[]
  loading: boolean
  erreur: string | null
  recharger: () => void
}

interface FiltresRdv {
  date?: string
  destinataireId?: string
  statut?: string
  siteId?: string
}

export function useRendezVous(entrepriseId: string | null, filtres: FiltresRdv = {}): RendezVousState {
  const supabase = createClient()

  const cacheKey = useMemo(
    () => `rdv:${entrepriseId}:${filtres.date}:${filtres.destinataireId}:${filtres.statut}:${filtres.siteId}`,
    [entrepriseId, filtres.date, filtres.destinataireId, filtres.statut, filtres.siteId]
  )

  const [rendezVous, setRendezVous] = useState<RendezVous[]>(() => queryCache.get<RendezVous[]>(cacheKey) ?? [])
  const [loading, setLoading] = useState(() => !queryCache.has(cacheKey))
  const [erreur, setErreur] = useState<string | null>(null)

  const chargerRef = useRef<() => void>(() => {})

  const charger = useCallback(async () => {
    if (!entrepriseId) return
    const key = `rdv:${entrepriseId}:${filtres.date}:${filtres.destinataireId}:${filtres.statut}:${filtres.siteId}`
    if (!queryCache.has(key)) setLoading(true)
    setErreur(null)

    try {
      let query = supabase
        .from('rendez_vous')
        .select(`
          *,
          destinataire:utilisateurs!destinataire_id(id, nom, prenom, poste, photo_url),
          visiteur:visiteurs(*)
        `)
        .eq('entreprise_id', entrepriseId)
        .order('date_rdv', { ascending: true })
        .order('heure_debut', { ascending: true })

      if (filtres.date) query = query.eq('date_rdv', filtres.date)
      if (filtres.destinataireId) query = query.eq('destinataire_id', filtres.destinataireId)
      if (filtres.statut && filtres.statut !== 'tous') query = query.eq('statut', filtres.statut)
      if (filtres.siteId) query = query.eq('site_id', filtres.siteId)

      const { data, error } = await query
      if (error) throw error
      const result = data ?? []
      setRendezVous(result)
      queryCache.set(key, result)
    } catch (err) {
      setErreur('Impossible de charger les rendez-vous')
      console.error('Erreur chargement RDV:', err)
    } finally {
      setLoading(false)
    }
  }, [entrepriseId, filtres.date, filtres.destinataireId, filtres.statut, filtres.siteId])

  useEffect(() => { chargerRef.current = charger }, [charger])

  // Afficher le cache instantanément quand le cacheKey change
  useEffect(() => {
    const cached = queryCache.get<RendezVous[]>(cacheKey)
    if (cached) {
      setRendezVous(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }
  }, [cacheKey])

  // Rafraîchir en arrière-plan
  useEffect(() => { charger() }, [charger])

  useEffect(() => {
    if (!entrepriseId) return
    const channel = supabase
      .channel(`rdv-entreprise-${entrepriseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rendez_vous', filter: `entreprise_id=eq.${entrepriseId}` },
        () => { chargerRef.current() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [entrepriseId])

  return { rendezVous, loading, erreur, recharger: charger }
}

export function useRendezVousAujourdhui(entrepriseId: string | null, destinataireId?: string, siteId?: string): RendezVousState {
  const today = new Date().toISOString().split('T')[0]
  return useRendezVous(entrepriseId, { date: today, destinataireId, siteId })
}
