'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useVisitesAujourdhui } from '@/hooks/useVisites'
import VisiteCard from '@/components/secretaire/VisiteCard'
import Card from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import { jouerSon, initialiserAudio } from '@/lib/sound'

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

  // Initialise l'AudioContext au montage et le réactive sur chaque clic
  useEffect(() => initialiserAudio(), [])

  const handleRealtime = useCallback((eventType: string) => {
    if (eventType === 'INSERT') jouerSon('nouvelle_visite')
    else jouerSon('changement_statut')
  }, [])

  // Si l'utilisateur est assigné à un site (et n'est pas admin), filtrer par site
  const siteIdFiltre = utilisateur?.site_id && !['patron', 'admin'].includes(utilisateur.role ?? '')
    ? utilisateur.site_id
    : undefined
  const { visites, loading } = useVisitesAujourdhui(utilisateur?.entreprise_id ?? null, handleRealtime, siteIdFiltre)

  const handleFaireEntrer = async (visiteId: string) => {
    await supabase
      .from('visites')
      .update({ statut: 'en_cours', heure_entree: new Date().toISOString() })
      .eq('id', visiteId)
  }

  const handleTerminer = async (visiteId: string) => {
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
      })
      .eq('id', visiteId)
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
              />
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
