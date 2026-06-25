'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useVisitesAujourdhui } from '@/hooks/useVisites'
import VisiteCard from '@/components/secretaire/VisiteCard'
import Card from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import { jouerSon, initialiserAudio } from '@/lib/sound'
import { nomComplet } from '@/lib/utils'
import type { Visite } from '@/types'

const FILTRES = [
  { key: 'tous', label: 'Toutes' },
  { key: 'en_attente', label: 'En attente' },
  { key: 'acceptee', label: 'Acceptées' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'terminee', label: 'Terminées' },
  { key: 'declinee', label: 'Déclinées' },
  { key: 'redirigee', label: 'Redirigées' },
]

export default function VisitesPage() {
  const { utilisateur } = useAuth()
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const supabase = createClient()
  const [vipAlerte, setVipAlerte] = useState<Visite | null>(null)
  const prevVisitIdsRef = useRef<Set<string>>(new Set())
  const isFirstLoadRef = useRef(true)

  // Initialise l'AudioContext au montage et le réactive sur chaque clic
  useEffect(() => initialiserAudio(), [])

  // Pour les INSERT, le son est géré par la détection VIP ci-dessous.
  // Pour les autres événements (UPDATE/DELETE), on joue changement_statut.
  const handleRealtime = useCallback((eventType: string) => {
    if (eventType !== 'INSERT') jouerSon('changement_statut')
  }, [])

  // Si l'utilisateur est assigné à un site (et n'est pas admin), filtrer par site
  const siteIdFiltre = utilisateur?.site_id && !['patron', 'admin'].includes(utilisateur.role ?? '')
    ? utilisateur.site_id
    : undefined
  const { visites, loading } = useVisitesAujourdhui(utilisateur?.entreprise_id ?? null, handleRealtime, siteIdFiltre)

  // Détection des nouvelles visites après chaque reload pour jouer le bon son
  useEffect(() => {
    if (loading) return
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false
      prevVisitIdsRef.current = new Set(visites.map(v => v.id))
      return
    }
    const currentIds = new Set(visites.map(v => v.id))
    const nouvelles = visites.filter(v => !prevVisitIdsRef.current.has(v.id))
    if (nouvelles.length > 0) {
      const vip = nouvelles.find(v => v.visiteur?.est_vip)
      if (vip) {
        jouerSon('visite_vip')
        setVipAlerte(vip)
      } else {
        jouerSon('nouvelle_visite')
      }
    }
    prevVisitIdsRef.current = currentIds
  }, [visites, loading])

  const handleFaireEntrer = async (visiteId: string) => {
    const visite = visites.find((v) => v.id === visiteId)
    const now = new Date()
    const dureeAttente = visite?.heure_arrivee
      ? Math.round((now.getTime() - new Date(visite.heure_arrivee).getTime()) / 60000)
      : null
    await supabase
      .from('visites')
      .update({
        statut: 'en_cours',
        heure_entree: now.toISOString(),
        ...(dureeAttente != null ? { duree_attente: dureeAttente } : {}),
      })
      .eq('id', visiteId)
  }

  const handleTerminer = async (visiteId: string, sujetTraite?: string) => {
    const heureSortie = new Date()
    const visite = visites.find((v) => v.id === visiteId)
    const dureeVisite = visite?.heure_entree
      ? Math.round((heureSortie.getTime() - new Date(visite.heure_entree).getTime()) / 60000)
      : null

    await supabase
      .from('visites')
      .update({
        statut: 'terminee',
        heure_sortie: heureSortie.toISOString(),
        duree_visite: dureeVisite,
        ...(sujetTraite ? { sujet_traite: sujetTraite } : {}),
      })
      .eq('id', visiteId)

    // Accumulation du sujet dans l'historique du visiteur
    const sujet = sujetTraite ?? visite?.sujet_traite?.trim()
    if (sujet && visite?.visiteur_id) {
      const { data: v } = await supabase
        .from('visiteurs').select('sujets_historique').eq('id', visite.visiteur_id).single()
      const hist = v?.sujets_historique ?? []
      if (!hist.includes(sujet)) {
        await supabase.from('visiteurs')
          .update({ sujets_historique: [...hist, sujet] })
          .eq('id', visite.visiteur_id)
      }
    }
  }

  const visitesFiltrees = filtreStatut === 'tous'
    ? visites
    : visites.filter((v) => v.statut === filtreStatut)

  const stats = {
    enAttente: visites.filter((v) => v.statut === 'en_attente').length,
    acceptees: visites.filter((v) => ['acceptee', 'en_cours'].includes(v.statut)).length,
    terminees: visites.filter((v) => ['terminee', 'declinee'].includes(v.statut)).length,
  }

  if (!utilisateur) return null

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Visites du jour</h1>

      {/* ─── Alerte visiteur VIP ─────────────────────────────── */}
      {vipAlerte && (
        <div className="mb-4 flex items-center gap-3 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-2xl shadow-lg animate-fade-in-down">
          <span className="text-3xl flex-shrink-0 animate-bounce">👑</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-yellow-800 text-sm">Visiteur VIP arrivé !</p>
            <p className="text-yellow-700 font-medium truncate">
              {nomComplet(vipAlerte.nom_visiteur, vipAlerte.prenom_visiteur ?? undefined)}
              {vipAlerte.organisation_visiteur && (
                <span className="font-normal text-yellow-600"> — {vipAlerte.organisation_visiteur}</span>
              )}
            </p>
            {vipAlerte.motif && (
              <p className="text-xs text-yellow-600 mt-0.5 truncate">Motif : {vipAlerte.motif}</p>
            )}
          </div>
          <button
            onClick={() => setVipAlerte(null)}
            className="flex-shrink-0 p-1.5 rounded-lg text-yellow-500 hover:text-yellow-700 hover:bg-yellow-100 transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{stats.enAttente}</p>
          <p className="text-xs text-amber-600 mt-1">En attente</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{stats.acceptees}</p>
          <p className="text-xs text-green-600 mt-1">En cours</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">{stats.terminees}</p>
          <p className="text-xs text-gray-600 mt-1">Terminées</p>
        </div>
      </div>

      <Card noPadding>
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {FILTRES.map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltreStatut(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                  ${filtreStatut === f.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-24" />
            ))
          ) : visitesFiltrees.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p>Aucune visite</p>
            </div>
          ) : (
            visitesFiltrees.map((visite) => (
              <VisiteCard
                key={visite.id}
                visite={visite}
                afficherActions
                onFaireEntrer={handleFaireEntrer}
                onTerminer={handleTerminer}
                nomEntreprise={utilisateur?.entreprise?.nom}
                utilisateur={utilisateur ?? undefined}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
