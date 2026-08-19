'use client'

import Link from 'next/link'
import type { Reunion } from '@/types'
import ReunionBadge from './ReunionBadge'

const TYPE_LABEL: Record<string, string> = {
  interne: 'Interne', externe: 'Externe', comite: 'Comité', autre: 'Autre',
}
const TYPE_CLS: Record<string, string> = {
  interne: 'bg-indigo-50 text-indigo-600',
  externe: 'bg-orange-50 text-orange-600',
  comite:  'bg-purple-50 text-purple-600',
  autre:   'bg-gray-100 text-gray-500',
}

export default function ReunionCard({ reunion }: { reunion: Reunion }) {
  const date = new Date(reunion.date_reunion + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
  const heure = `${reunion.heure_debut.slice(0, 5)}${reunion.heure_fin ? ` – ${reunion.heure_fin.slice(0, 5)}` : ''}`

  return (
    <Link
      href={`/dashboard/reunions/${reunion.id}`}
      className="block bg-white rounded-xl border border-gray-200 hover:border-[rgb(var(--color-primary-rgb))] hover:shadow-md transition-all p-4 group"
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-[rgb(var(--color-primary-rgb))] transition-colors">
            {reunion.titre}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">{date} · {heure}</p>
        </div>
        <ReunionBadge statut={reunion.statut} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_CLS[reunion.type]}`}>
          {TYPE_LABEL[reunion.type]}
        </span>

        {reunion.lieu && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {reunion.lieu}
          </span>
        )}

        {reunion.participants && reunion.participants.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {reunion.participants.length} participant{reunion.participants.length > 1 ? 's' : ''}
          </span>
        )}

        {reunion.compte_rendu?.statut === 'finalise' && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            CR finalisé
          </span>
        )}
        {reunion.compte_rendu?.statut === 'brouillon' && (
          <span className="text-xs text-amber-600 font-medium">CR en cours</span>
        )}
      </div>
    </Link>
  )
}
