'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { statsReunionsDashboard } from '@/lib/reunions'
import type { Reunion } from '@/types'

type ProchReunion = Pick<Reunion, 'id' | 'titre' | 'date_reunion' | 'heure_debut' | 'type' | 'statut'>

const TYPE_CLS: Record<string, string> = {
  interne: 'bg-indigo-50 text-indigo-600',
  externe: 'bg-orange-50 text-orange-600',
  comite:  'bg-purple-50 text-purple-600',
  autre:   'bg-gray-100 text-gray-500',
}
const TYPE_LABEL: Record<string, string> = {
  interne: 'Interne', externe: 'Externe', comite: 'Comité', autre: 'Autre',
}

export default function ReunionsWidget({ entrepriseId }: { entrepriseId: string }) {
  const [prochaines, setProchaines] = useState<ProchReunion[]>([])
  const [brouillons, setBrouillons] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    statsReunionsDashboard(entrepriseId)
      .then(({ prochaines: p, brouillonsCR }) => {
        setProchaines(p)
        setBrouillons(brouillonsCR)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [entrepriseId])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-32 mb-3" />
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (prochaines.length === 0 && brouillons === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-4 h-4 text-[rgb(var(--color-primary-rgb))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Réunions à venir
        </h2>
        <Link href="/dashboard/reunions" className="text-xs text-[rgb(var(--color-primary-rgb))] font-medium hover:opacity-80">
          Voir tout →
        </Link>
      </div>

      {/* Alertes CR */}
      {brouillons > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-amber-700 font-medium">
            {brouillons} compte{brouillons > 1 ? 's' : ''}-rendu{brouillons > 1 ? 's' : ''} en attente de finalisation
          </p>
        </div>
      )}

      {/* Liste réunions */}
      <div className="p-4 space-y-2">
        {prochaines.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">Aucune réunion dans les 7 prochains jours</p>
        ) : (
          prochaines.map((r) => {
            const dateStr = new Date(r.date_reunion + 'T00:00:00').toLocaleDateString('fr-FR', {
              weekday: 'short', day: 'numeric', month: 'short',
            })
            return (
              <Link
                key={r.id}
                href={`/dashboard/reunions/${r.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                {/* Date box */}
                <div className="w-10 text-center flex-shrink-0">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase">
                    {new Date(r.date_reunion + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-bold text-gray-900 leading-tight">
                    {new Date(r.date_reunion + 'T00:00:00').getDate()}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[rgb(var(--color-primary-rgb))]">
                    {r.titre}
                  </p>
                  <p className="text-xs text-gray-400">{r.heure_debut.slice(0, 5)}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.statut === 'en_cours' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      En cours
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_CLS[r.type]}`}>
                    {TYPE_LABEL[r.type]}
                  </span>
                </div>
              </Link>
            )
          })
        )}

        <Link
          href="/dashboard/reunions/nouvelle"
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[rgb(var(--color-primary-rgb))] border-2 border-dashed border-gray-200 rounded-xl hover:border-[rgb(var(--color-primary-rgb))] hover:bg-[rgb(var(--color-primary-rgb))]/5 transition-all mt-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Planifier une réunion
        </Link>
      </div>
    </div>
  )
}
