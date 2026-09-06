'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { listerReunions } from '@/lib/reunions'
import type { Reunion, Site } from '@/types'
import ReunionCard from '@/components/reunions/ReunionCard'
import Button from '@/components/ui/Button'

type Filtre = 'tous' | 'a_venir' | 'passes' | 'en_cours'

const FILTRES: { value: Filtre; label: string }[] = [
  { value: 'tous',     label: 'Toutes' },
  { value: 'a_venir',  label: 'À venir' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'passes',   label: 'Passées' },
]

export default function ReunionsPage() {
  const { utilisateur } = useAuth()
  const [reunions, setReunions] = useState<Reunion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<Filtre>('a_venir')
  const [recherche, setRecherche] = useState('')
  const [sites, setSites] = useState<Site[]>([])
  const [siteSelectionne, setSiteSelectionneRaw] = useState<string>(() => {
    try { return sessionStorage.getItem('vp_dash_site') ?? '' } catch { return '' }
  })
  const setSiteSelectionne = useCallback((val: string) => {
    try { val ? sessionStorage.setItem('vp_dash_site', val) : sessionStorage.removeItem('vp_dash_site') } catch {}
    setSiteSelectionneRaw(val)
  }, [])

  const isPrimaire = ['patron', 'admin'].includes(utilisateur?.role ?? '')
  const isResponsableSite = utilisateur?.role === 'collaborateur' && utilisateur?.permissions?.responsable_site === true

  const charger = useCallback(async () => {
    if (!utilisateur) return
    const siteId = isPrimaire
      ? (siteSelectionne || null)
      : (utilisateur.site_id ?? null)
    try {
      const data = await listerReunions(utilisateur.entreprise_id, siteId)
      setReunions(data)
    } catch (err) {
      console.error('Erreur chargement réunions:', err)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateur, siteSelectionne])

  useEffect(() => { charger() }, [charger])
  useEffect(() => { setLoading(true) }, [siteSelectionne])

  // Sites — admin/patron uniquement
  useEffect(() => {
    if (!utilisateur || !isPrimaire) return
    const sb = createClient()
    sb.from('sites').select('*').eq('entreprise_id', utilisateur.entreprise_id).eq('actif', true).order('nom')
      .then(({ data }) => setSites((data ?? []) as Site[]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateur?.id])

  // Realtime sur la table reunions
  useEffect(() => {
    if (!utilisateur) return
    const sb = createClient()
    const channel = sb
      .channel(`reunions-list-${utilisateur.entreprise_id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'reunions',
        filter: `entreprise_id=eq.${utilisateur.entreprise_id}`,
      }, (payload) => setReunions((prev) => [...prev, payload.new as Reunion]))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'reunions',
        filter: `entreprise_id=eq.${utilisateur.entreprise_id}`,
      }, (payload) => setReunions((prev) => prev.map((r) => r.id === payload.new.id ? { ...r, ...payload.new } : r)))
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'reunions',
        filter: `entreprise_id=eq.${utilisateur.entreprise_id}`,
      }, (payload) => setReunions((prev) => prev.filter((r) => r.id !== payload.old.id)))
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [utilisateur])

  const today = new Date().toISOString().split('T')[0]

  const filtered = reunions.filter((r) => {
    if (recherche && !r.titre.toLowerCase().includes(recherche.toLowerCase())) return false
    if (filtre === 'a_venir') return r.date_reunion >= today && r.statut === 'planifiee'
    if (filtre === 'en_cours') return r.statut === 'en_cours'
    if (filtre === 'passes') return r.date_reunion < today || ['terminee', 'annulee'].includes(r.statut)
    return true
  })

  const countFiltre = (f: Filtre) => {
    return reunions.filter((r) => {
      if (f === 'a_venir') return r.date_reunion >= today && r.statut === 'planifiee'
      if (f === 'en_cours') return r.statut === 'en_cours'
      if (f === 'passes') return r.date_reunion < today || ['terminee', 'annulee'].includes(r.statut)
      return true
    }).length
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded-xl w-48" />
          <div className="h-12 bg-gray-100 rounded-xl" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réunions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{reunions.length} réunion{reunions.length > 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPrimaire && sites.length > 1 && (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <select value={siteSelectionne} onChange={e => setSiteSelectionne(e.target.value)}
                className="text-sm font-medium text-gray-700 focus:outline-none bg-transparent cursor-pointer">
                <option value="">Tous les sites</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
              {siteSelectionne && (
                <button onClick={() => setSiteSelectionne('')} className="text-gray-400 hover:text-gray-600 ml-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          )}
          {(isPrimaire || isResponsableSite) && (
            <Link href="/dashboard/reunions/nouvelle">
              <Button className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouvelle réunion
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une réunion…"
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))] transition"
        />
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {FILTRES.map(({ value, label }) => {
          const count = countFiltre(value)
          return (
            <button
              key={value}
              onClick={() => setFiltre(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filtre === value
                  ? 'bg-[rgb(var(--color-primary-rgb))] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0 rounded-full ${filtre === value ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">
            {recherche ? 'Aucun résultat' : 'Aucune réunion'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {recherche
              ? `Aucune réunion ne correspond à "${recherche}"`
              : filtre === 'a_venir'
                ? 'Aucune réunion planifiée à venir'
                : 'Aucune réunion dans cette catégorie'}
          </p>
          {!recherche && (isPrimaire || isResponsableSite) && (
            <Link href="/dashboard/reunions/nouvelle">
              <Button>Planifier une réunion</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((reunion) => (
            <ReunionCard key={reunion.id} reunion={reunion} />
          ))}
        </div>
      )}
    </div>
  )
}
