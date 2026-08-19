'use client'

import { useState } from 'react'
import type { ReunionPoint, Utilisateur } from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const STATUT_LABEL: Record<string, { label: string; cls: string }> = {
  a_traiter: { label: 'À traiter', cls: 'bg-gray-100 text-gray-600' },
  en_cours:  { label: 'En cours',  cls: 'bg-blue-100 text-blue-600' },
  traite:    { label: 'Traité',    cls: 'bg-emerald-100 text-emerald-700' },
  reporte:   { label: 'Reporté',   cls: 'bg-amber-100 text-amber-600' },
}

interface Props {
  points: ReunionPoint[]
  collaborateurs?: Utilisateur[]
  onAjouter: (titre: string, description?: string, responsableId?: string, duree?: number) => Promise<void>
  onModifier: (id: string, updates: { statut?: string }) => Promise<void>
  onSupprimer: (id: string) => Promise<void>
  readOnly?: boolean
}

export default function OrdreJourForm({ points, collaborateurs = [], onAjouter, onModifier, onSupprimer, readOnly }: Props) {
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [responsableId, setResponsableId] = useState('')
  const [duree, setDuree] = useState('')
  const [loading, setLoading] = useState(false)
  const [suppLoading, setSuppLoading] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const sorted = [...points].sort((a, b) => a.ordre - b.ordre)

  const handleAjouter = async () => {
    if (!titre.trim()) return
    setLoading(true)
    try {
      await onAjouter(titre.trim(), description.trim() || undefined, responsableId || undefined, duree ? parseInt(duree) : undefined)
      setTitre(''); setDescription(''); setResponsableId(''); setDuree(''); setShowForm(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSupprimer = async (id: string) => {
    setSuppLoading(id)
    try { await onSupprimer(id) } finally { setSuppLoading(null) }
  }

  return (
    <div className="space-y-2">
      {sorted.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-4">Aucun point à l'ordre du jour</p>
      )}

      {sorted.map((pt, i) => {
        const sc = STATUT_LABEL[pt.statut]
        return (
          <div key={pt.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl group">
            <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{pt.titre}</p>
              {pt.description && <p className="text-xs text-gray-500 mt-0.5">{pt.description}</p>}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {!readOnly ? (
                  <select
                    value={pt.statut}
                    onChange={(e) => onModifier(pt.id, { statut: e.target.value })}
                    className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium cursor-pointer ${sc.cls}`}
                  >
                    {Object.entries(STATUT_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
                )}
                {pt.duree_estimee && (
                  <span className="text-xs text-gray-400">{pt.duree_estimee} min</span>
                )}
                {pt.responsable && (
                  <span className="text-xs text-gray-400">
                    {pt.responsable.prenom} {pt.responsable.nom}
                  </span>
                )}
              </div>
            </div>
            {!readOnly && (
              <button
                onClick={() => handleSupprimer(pt.id)}
                disabled={suppLoading === pt.id}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )
      })}

      {!readOnly && (
        showForm ? (
          <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl space-y-3">
            <Input label="Point de l'ordre du jour" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre du point" />
            <Input label="Description (optionnelle)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails…" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Responsable</label>
                <select
                  value={responsableId}
                  onChange={(e) => setResponsableId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 focus:border-[rgb(var(--color-primary-rgb))] outline-none"
                >
                  <option value="">—</option>
                  {collaborateurs.map((c) => (
                    <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Durée estimée (min)"
                type="number"
                value={duree}
                onChange={(e) => setDuree(e.target.value)}
                placeholder="15"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAjouter} loading={loading}>Ajouter</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setTitre(''); setDescription('') }}>Annuler</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-[rgb(var(--color-primary-rgb))] border-2 border-dashed border-gray-200 rounded-xl hover:border-[rgb(var(--color-primary-rgb))] hover:bg-[rgb(var(--color-primary-rgb))]/5 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un point
          </button>
        )
      )}
    </div>
  )
}
