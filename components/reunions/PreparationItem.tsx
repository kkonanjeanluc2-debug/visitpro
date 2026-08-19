'use client'

import { useState } from 'react'
import type { ReunionPreparation, StatutPreparation } from '@/types'
import Avatar from '@/components/ui/Avatar'

const TYPE_CONFIG: Record<string, { icon: string; cls: string; label: string }> = {
  note:     { icon: '📝', cls: 'bg-blue-50 text-blue-600', label: 'Note' },
  document: { icon: '📄', cls: 'bg-purple-50 text-purple-600', label: 'Document' },
  action:   { icon: '✅', cls: 'bg-emerald-50 text-emerald-600', label: 'Action' },
  question: { icon: '❓', cls: 'bg-amber-50 text-amber-600', label: 'Question' },
}

const STATUT_CONFIG: Record<StatutPreparation, { label: string; cls: string }> = {
  en_cours: { label: 'En cours', cls: 'bg-gray-100 text-gray-500' },
  pret:     { label: 'Prêt',     cls: 'bg-blue-100 text-blue-600' },
  valide:   { label: 'Validé',   cls: 'bg-emerald-100 text-emerald-700' },
}

interface Props {
  item: ReunionPreparation
  canEdit: boolean
  onModifier: (statut: StatutPreparation) => Promise<void>
  onSupprimer: () => Promise<void>
}

export default function PreparationItem({ item, canEdit, onModifier, onSupprimer }: Props) {
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const tc = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.note
  const sc = STATUT_CONFIG[item.statut]

  const auteurNom = item.auteur ? `${item.auteur.prenom} ${item.auteur.nom}` : ''
  const dateStr = new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  const handleStatut = async (statut: StatutPreparation) => {
    setLoading(true)
    try { await onModifier(statut) } finally { setLoading(false) }
  }

  const handleSuppr = async () => {
    setLoading(true)
    try { await onSupprimer() } finally { setLoading(false) }
  }

  return (
    <div className={`rounded-xl border transition-all ${expanded ? 'border-[rgb(var(--color-primary-rgb))]/30 shadow-sm' : 'border-gray-100'} bg-white`}>
      <div
        className="flex items-start gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`text-sm px-1.5 py-0.5 rounded-md flex-shrink-0 ${tc.cls}`}>{tc.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.titre}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {item.auteur && (
              <div className="flex items-center gap-1">
                <Avatar nom={item.auteur.nom} prenom={item.auteur.prenom} photoUrl={item.auteur.photo_url ?? undefined} size="sm" />
                <span className="text-xs text-gray-400">{auteurNom}</span>
              </div>
            )}
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400">{dateStr}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit ? (
            <select
              value={item.statut}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { e.stopPropagation(); handleStatut(e.target.value as StatutPreparation) }}
              disabled={loading}
              className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium cursor-pointer ${sc.cls}`}
            >
              {(Object.keys(STATUT_CONFIG) as StatutPreparation[]).map((s) => (
                <option key={s} value={s}>{STATUT_CONFIG[s].label}</option>
              ))}
            </select>
          ) : (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
          )}

          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSuppr() }}
              disabled={loading}
              className="p-1 text-gray-300 hover:text-red-500 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {expanded && item.contenu && (
        <div className="px-3 pb-3 pt-0">
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
            {item.contenu}
          </div>
        </div>
      )}
    </div>
  )
}
