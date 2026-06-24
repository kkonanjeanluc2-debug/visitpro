'use client'

import { useState, useRef } from 'react'
import type { Visite } from '@/types'
import { nomComplet, formatHeure, formatDuree, calculerDureeAttente, couleurUrgence } from '@/lib/utils'
import { trierFileAttente, deplacerDansFile } from '@/lib/fileAttente'

interface FileAttenteProps {
  visites: Visite[]
  entrepriseId: string
  onOrdreChange?: () => void
}

export default function FileAttente({ visites, entrepriseId, onOrdreChange }: FileAttenteProps) {
  const enAttente = trierFileAttente(visites.filter((v) => v.statut === 'en_attente'))
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const dragSrcIdx = useRef<number | null>(null)

  // ─── Drag & Drop natif HTML5 ──────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragSrcIdx.current = idx
    setDraggingId(enAttente[idx].id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIdx(idx)
  }

  const handleDrop = async (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    const srcIdx = dragSrcIdx.current
    if (srcIdx === null || srcIdx === targetIdx) {
      setDraggingId(null); setOverIdx(null); dragSrcIdx.current = null
      return
    }

    const visite = enAttente[srcIdx]
    await deplacerDansFile(visite.id, targetIdx + 1, entrepriseId)
    onOrdreChange?.()
    setDraggingId(null); setOverIdx(null); dragSrcIdx.current = null
  }

  const handleDragEnd = () => {
    setDraggingId(null); setOverIdx(null); dragSrcIdx.current = null
  }

  if (enAttente.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm">File d&apos;attente vide</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          File d&apos;attente ({enAttente.length})
        </h3>
        <p className="text-xs text-gray-400">Glisser pour réordonner</p>
      </div>

      {enAttente.map((visite, idx) => {
        const isDragging = draggingId === visite.id
        const isOver = overIdx === idx && draggingId !== visite.id
        const duree = calculerDureeAttente(visite.heure_arrivee)

        return (
          <div
            key={visite.id}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 p-3 bg-white border rounded-xl cursor-grab active:cursor-grabbing transition-all
              ${isDragging ? 'opacity-40 scale-98 border-dashed border-gray-400' : 'opacity-100'}
              ${isOver ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
            `}
          >
            {/* Position */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
              ${visite.niveau_urgence === 'vip' ? 'bg-yellow-100 text-yellow-700' :
                visite.niveau_urgence === 'urgent' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-600'}
            `}>
              {idx + 1}
            </div>

            {/* Infos visiteur */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {nomComplet(visite.nom_visiteur, visite.prenom_visiteur ?? undefined)}
                </p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${couleurUrgence(visite.niveau_urgence)}`}>
                  {visite.niveau_urgence}
                </span>
              </div>
              {visite.organisation_visiteur && (
                <p className="text-xs text-gray-500 truncate">{visite.organisation_visiteur}</p>
              )}
            </div>

            {/* Heure + attente + temps estimé */}
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-500">{formatHeure(visite.heure_arrivee)}</p>
              <p className={`text-xs font-bold ${duree > 15 ? 'text-red-600' : 'text-amber-600'}`}>
                {formatDuree(duree)}
              </p>
              {idx === 0 ? (
                <p className="text-xs font-semibold text-green-600">Prochain</p>
              ) : visite.temps_attente_estime != null && visite.temps_attente_estime > 0 ? (
                <p className="text-xs text-gray-400">Environ {visite.temps_attente_estime} min</p>
              ) : null}
            </div>

            {/* Poignée drag */}
            <div className="flex-shrink-0 text-gray-300 hover:text-gray-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zM8 12a2 2 0 11-4 0 2 2 0 014 0zM8 18a2 2 0 11-4 0 2 2 0 014 0zM20 6a2 2 0 11-4 0 2 2 0 014 0zM20 12a2 2 0 11-4 0 2 2 0 014 0zM20 18a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
          </div>
        )
      })}
    </div>
  )
}
