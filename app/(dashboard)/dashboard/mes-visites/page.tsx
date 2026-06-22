'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useVisites } from '@/hooks/useVisites'
import VisiteCard from '@/components/secretaire/VisiteCard'
import Card from '@/components/ui/Card'

export default function MesVisitesPage() {
  const { utilisateur } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [dateDebut, setDateDebut] = useState(today)
  const [dateFin, setDateFin] = useState(today)
  const [filtreStatut, setFiltreStatut] = useState('tous')

  const { visites, loading } = useVisites(utilisateur?.entreprise_id ?? null, {
    destinataireId: utilisateur?.id,
    dateDebut,
    dateFin,
    statut: filtreStatut !== 'tous' ? filtreStatut : undefined,
  })

  const FILTRES = [
    { key: 'tous', label: 'Toutes' },
    { key: 'en_attente', label: 'En attente' },
    { key: 'acceptee', label: 'Acceptées' },
    { key: 'en_cours', label: 'En cours' },
    { key: 'terminee', label: 'Terminées' },
    { key: 'declinee', label: 'Déclinées' },
  ]

  if (!utilisateur) return null

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mes visites</h1>

      {/* Filtres date */}
      <Card className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Du</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              min={thirtyDaysAgo}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Au</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="col-span-2 sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Filtres rapides</label>
            <div className="flex gap-2">
              <button
                onClick={() => { setDateDebut(today); setDateFin(today) }}
                className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Aujourd&apos;hui
              </button>
              <button
                onClick={() => { setDateDebut(thirtyDaysAgo); setDateFin(today) }}
                className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                30 jours
              </button>
            </div>
          </div>
        </div>
      </Card>

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
          <p className="text-xs text-gray-500 mt-2">{visites.length} visite(s)</p>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-24" />
            ))
          ) : visites.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <p>Aucune visite pour cette période</p>
            </div>
          ) : (
            visites.map((visite) => (
              <VisiteCard key={visite.id} visite={visite} />
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
