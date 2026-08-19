'use client'

import { useState } from 'react'
import type { PointAction } from '@/types'

interface Props {
  actions: PointAction[]
  onChange: (actions: PointAction[]) => void
  readOnly?: boolean
}

const STATUT_CLS: Record<string, string> = {
  a_faire:  'bg-gray-100 text-gray-600',
  en_cours: 'bg-blue-100 text-blue-600',
  fait:     'bg-emerald-100 text-emerald-700',
}

const STATUT_OPTIONS = [
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'fait', label: 'Fait' },
]

export default function PlanActionTable({ actions, onChange, readOnly }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const update = (id: string, field: keyof PointAction, value: string) => {
    onChange(actions.map((a) => a.id === id ? { ...a, [field]: value } : a))
  }

  const ajouter = () => {
    const newAction: PointAction = {
      id: crypto.randomUUID(),
      description: '',
      responsable: '',
      echeance: '',
      statut: 'a_faire',
    }
    onChange([...actions, newAction])
    setEditingId(newAction.id)
  }

  const supprimer = (id: string) => {
    onChange(actions.filter((a) => a.id !== id))
    if (editingId === id) setEditingId(null)
  }

  if (readOnly) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-semibold text-gray-600 text-xs w-8">#</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 text-xs">Action</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 text-xs w-36">Responsable</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 text-xs w-28">Échéance</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 text-xs w-24">Statut</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a, i) => (
              <tr key={a.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-3 py-2.5 text-gray-900">{a.description}</td>
                <td className="px-3 py-2.5 text-gray-600">{a.responsable}</td>
                <td className="px-3 py-2.5 text-gray-500 text-xs">
                  {a.echeance ? new Date(a.echeance).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_CLS[a.statut]}`}>
                    {STATUT_OPTIONS.find((s) => s.value === a.statut)?.label ?? a.statut}
                  </span>
                </td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-400 text-sm">
                  Aucune action définie
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {actions.map((a, i) => (
        <div
          key={a.id}
          className={`rounded-xl border p-3 transition-all ${editingId === a.id ? 'border-[rgb(var(--color-primary-rgb))]/40 bg-[rgb(var(--color-primary-rgb))]/2' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
        >
          {editingId === a.id ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                <input
                  className="flex-1 text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-[rgb(var(--color-primary-rgb))]"
                  value={a.description}
                  onChange={(e) => update(a.id, 'description', e.target.value)}
                  placeholder="Description de l'action…"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-3 gap-2 pl-7">
                <input
                  className="text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-[rgb(var(--color-primary-rgb))]"
                  value={a.responsable}
                  onChange={(e) => update(a.id, 'responsable', e.target.value)}
                  placeholder="Responsable"
                />
                <input
                  type="date"
                  className="text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-[rgb(var(--color-primary-rgb))]"
                  value={a.echeance ?? ''}
                  onChange={(e) => update(a.id, 'echeance', e.target.value)}
                />
                <select
                  value={a.statut}
                  onChange={(e) => update(a.id, 'statut', e.target.value)}
                  className={`text-sm px-2.5 py-1.5 border-0 rounded-lg font-medium cursor-pointer ${STATUT_CLS[a.statut]}`}
                >
                  {STATUT_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pl-7">
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs px-3 py-1 bg-[rgb(var(--color-primary-rgb))] text-white rounded-lg"
                >
                  OK
                </button>
                <button
                  onClick={() => supprimer(a.id)}
                  className="text-xs px-3 py-1 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setEditingId(a.id)}
            >
              <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">{i + 1}</span>
              <p className={`flex-1 text-sm text-gray-900 truncate ${!a.description ? 'text-gray-400 italic' : ''}`}>
                {a.description || 'Cliquer pour modifier…'}
              </p>
              <span className="text-xs text-gray-400 flex-shrink-0">{a.responsable}</span>
              {a.echeance && (
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(a.echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUT_CLS[a.statut]}`}>
                {STATUT_OPTIONS.find((s) => s.value === a.statut)?.label}
              </span>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={ajouter}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-[rgb(var(--color-primary-rgb))] border-2 border-dashed border-gray-200 rounded-xl hover:border-[rgb(var(--color-primary-rgb))] hover:bg-[rgb(var(--color-primary-rgb))]/5 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Ajouter une action
      </button>
    </div>
  )
}
