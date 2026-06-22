'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { queryCache } from '@/lib/queryCache'
import type { Visite } from '@/types'

interface VisitesState {
  visites: Visite[]
  loading: boolean
  erreur: string | null
  recharger: () => void
}

interface FiltresVisites {
  statut?: string
  dateDebut?: string
  dateFin?: string
  destinataireId?: string
  siteId?: string
  seulement_mes_visites?: boolean
  onRealtime?: (eventType: string) => void
}

export function useVisites(entrepriseId: string | null, filtres: FiltresVisites = {}): VisitesState {
  const supabase = createClient()

  const cacheKey = useMemo(
    () => `visites:${entrepriseId}:${filtres.statut}:${filtres.dateDebut}:${filtres.dateFin}:${filtres.destinataireId}:${filtres.siteId}`,
    [entrepriseId, filtres.statut, filtres.dateDebut, filtres.dateFin, filtres.destinataireId, filtres.siteId]
  )

  const [visites, setVisites] = useState<Visite[]>(() => queryCache.get<Visite[]>(cacheKey) ?? [])
  const [loading, setLoading] = useState(() => !queryCache.has(cacheKey))
  const [erreur, setErreur] = useState<string | null>(null)

  const chargerRef = useRef<() => void>(() => {})
  const onRealtimeRef = useRef(filtres.onRealtime)
  useEffect(() => { onRealtimeRef.current = filtres.onRealtime }, [filtres.onRealtime])

  const charger = useCallback(async () => {
    if (!entrepriseId) return
    const key = `visites:${entrepriseId}:${filtres.statut}:${filtres.dateDebut}:${filtres.dateFin}:${filtres.destinataireId}:${filtres.siteId}`
    if (!queryCache.has(key)) setLoading(true)
    setErreur(null)

    try {
      let query = supabase
        .from('visites')
        .select(`
          *,
          destinataire:utilisateurs!destinataire_id(id, nom, prenom, poste, photo_url),
          enregistre_par_user:utilisateurs!enregistre_par(id, nom, prenom),
          visiteur:visiteurs(*)
        `)
        .eq('entreprise_id', entrepriseId)
        .order('heure_arrivee', { ascending: false })

      if (filtres.statut && filtres.statut !== 'tous') query = query.eq('statut', filtres.statut)
      if (filtres.dateDebut) query = query.gte('heure_arrivee', filtres.dateDebut)
      if (filtres.dateFin) query = query.lte('heure_arrivee', filtres.dateFin + 'T23:59:59')
      if (filtres.destinataireId) query = query.eq('destinataire_id', filtres.destinataireId)
      if (filtres.siteId) query = query.eq('site_id', filtres.siteId)

      const { data, error } = await query
      if (error) throw error
      const result = data ?? []
      setVisites(result)
      queryCache.set(key, result)
    } catch (err) {
      setErreur('Impossible de charger les visites')
      console.error('Erreur chargement visites:', err)
    } finally {
      setLoading(false)
    }
  }, [entrepriseId, filtres.statut, filtres.dateDebut, filtres.dateFin, filtres.destinataireId, filtres.siteId])

  useEffect(() => { chargerRef.current = charger }, [charger])

  // Quand le cacheKey change (navigation ou changement de filtre) : afficher le cache instantanément
  useEffect(() => {
    const cached = queryCache.get<Visite[]>(cacheKey)
    if (cached) {
      setVisites(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }
  }, [cacheKey])

  // Toujours rafraîchir en arrière-plan
  useEffect(() => { charger() }, [charger])

  useEffect(() => {
    if (!entrepriseId) return
    const channel = supabase
      .channel(`visites-entreprise-${entrepriseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visites', filter: `entreprise_id=eq.${entrepriseId}` },
        (payload) => {
          chargerRef.current()
          onRealtimeRef.current?.(payload.eventType)
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [entrepriseId])

  return { visites, loading, erreur, recharger: charger }
}

export function useVisitesAujourdhui(
  entrepriseId: string | null,
  onRealtime?: (eventType: string) => void,
  siteId?: string
): VisitesState {
  const today = new Date().toISOString().split('T')[0]
  return useVisites(entrepriseId, { dateDebut: today, dateFin: today, onRealtime, siteId })
}

export function useVisitesEnAttente(entrepriseId: string | null, destinataireId?: string): VisitesState {
  const today = new Date().toISOString().split('T')[0]
  return useVisites(entrepriseId, {
    statut: 'en_attente',
    dateDebut: today,
    dateFin: today,
    destinataireId,
  })
}
