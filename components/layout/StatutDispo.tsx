'use client'

import { useState } from 'react'
import type { Utilisateur } from '@/types'
import type { StatutDispoType } from '@/types'

interface StatutDispoProps {
  utilisateur: Utilisateur
}

const STATUTS: { value: StatutDispoType; label: string; emoji: string; couleur: string }[] = [
  { value: 'disponible',      label: 'Disponible',       emoji: '🟢', couleur: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'en_reunion',      label: 'En réunion',       emoji: '🟡', couleur: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'ne_pas_deranger', label: 'Ne pas déranger',  emoji: '🔴', couleur: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'absent',          label: 'Absent',           emoji: '⚫', couleur: 'text-gray-700 bg-gray-50 border-gray-200' },
]

export default function StatutDispo({ utilisateur }: StatutDispoProps) {
  const currentStatut = (utilisateur.statut_dispo ?? 'disponible') as StatutDispoType
  const [statut, setStatut] = useState<StatutDispoType>(currentStatut)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  // "Jusqu'à quelle heure ?" pour en_reunion (format HH:MM)
  const [heureRetour, setHeureRetour] = useState('')
  // "De retour le" pour absent (format datetime-local)
  const [dateRetour, setDateRetour] = useState('')

  const statutInfo = STATUTS.find((s) => s.value === statut) ?? STATUTS[0]

  const buildRetourAuto = (s: StatutDispoType): string | null => {
    if (s === 'en_reunion' && heureRetour) {
      const [h, m] = heureRetour.split(':').map(Number)
      const d = new Date()
      d.setHours(h, m, 0, 0)
      return d.toISOString()
    }
    if (s === 'absent' && dateRetour) {
      return new Date(dateRetour).toISOString()
    }
    return null
  }

  const sauvegarder = async (nouveauStatut: StatutDispoType) => {
    setSaving(true)
    try {
      await fetch('/api/dispo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut_dispo: nouveauStatut,
          dispo_retour_auto: nouveauStatut === 'disponible' ? null : buildRetourAuto(nouveauStatut),
        }),
      })
      setStatut(nouveauStatut)
      setOpen(false)
      setHeureRetour('')
      setDateRetour('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${statutInfo.couleur}`}
        title="Changer mon statut de disponibilité"
      >
        <span>{statutInfo.emoji}</span>
        <span className="hidden sm:inline">{statutInfo.label}</span>
        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Mon statut de disponibilité</p>
              <p className="text-xs text-gray-500 mt-0.5">Visible par la secrétaire lors d&apos;une visite</p>
            </div>

            <div className="p-3 space-y-1.5">
              {STATUTS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    if (s.value === 'disponible') {
                      sauvegarder('disponible')
                    } else {
                      setStatut(s.value)
                    }
                  }}
                  disabled={saving}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60
                    ${statut === s.value ? s.couleur : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <span className="text-base">{s.emoji}</span>
                  <span>{s.label}</span>
                  {statut === s.value && (
                    <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Champ complémentaire selon le statut sélectionné */}
            {statut === 'en_reunion' && (
              <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Jusqu&apos;à quelle heure ? <span className="text-gray-400">(optionnel)</span>
                  </label>
                  <input
                    type="time"
                    value={heureRetour}
                    onChange={(e) => setHeureRetour(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  onClick={() => sauvegarder('en_reunion')}
                  disabled={saving}
                  className="w-full py-2 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60"
                >
                  {saving ? 'Enregistrement…' : 'Confirmer — En réunion'}
                </button>
              </div>
            )}

            {statut === 'ne_pas_deranger' && (
              <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                <button
                  onClick={() => sauvegarder('ne_pas_deranger')}
                  disabled={saving}
                  className="w-full py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {saving ? 'Enregistrement…' : 'Confirmer — Ne pas déranger'}
                </button>
              </div>
            )}

            {statut === 'absent' && (
              <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    De retour le <span className="text-gray-400">(optionnel)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={dateRetour}
                    onChange={(e) => setDateRetour(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  onClick={() => sauvegarder('absent')}
                  disabled={saving}
                  className="w-full py-2 bg-gray-600 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-60"
                >
                  {saving ? 'Enregistrement…' : 'Confirmer — Absent'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
