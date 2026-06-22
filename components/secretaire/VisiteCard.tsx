'use client'

import { useState, useEffect } from 'react'
import type { Visite } from '@/types'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import { formatHeure, nomComplet, calculerDureeAttente, formatDuree, couleurStatut, libelleStatut, couleurUrgence } from '@/lib/utils'

interface VisiteCardProps {
  visite: Visite
  onFaireEntrer?: (id: string) => void
  onTerminer?: (id: string) => void
  afficherActions?: boolean
}

export default function VisiteCard({ visite, onFaireEntrer, onTerminer, afficherActions = false }: VisiteCardProps) {
  const [dureeAttente, setDureeAttente] = useState(calculerDureeAttente(visite.heure_arrivee))

  useEffect(() => {
    if (visite.statut !== 'en_attente') return
    const interval = setInterval(() => {
      setDureeAttente(calculerDureeAttente(visite.heure_arrivee))
    }, 30000)
    return () => clearInterval(interval)
  }, [visite.heure_arrivee, visite.statut])

  const urgent = dureeAttente > 15 && visite.statut === 'en_attente'

  return (
    <div className={`bg-white border rounded-xl p-4 transition-shadow hover:shadow-md ${visite.niveau_urgence === 'vip' ? 'border-yellow-300 bg-yellow-50/30' : visite.niveau_urgence === 'urgent' ? 'border-orange-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3">
        {/* Info visiteur */}
        <div className="flex items-start gap-3 min-w-0">
          <Avatar
            nom={visite.nom_visiteur}
            prenom={visite.prenom_visiteur ?? undefined}
            size="md"
            className="flex-shrink-0 mt-0.5"
          />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {nomComplet(visite.nom_visiteur, visite.prenom_visiteur ?? undefined)}
            </p>
            {visite.organisation_visiteur && (
              <p className="text-sm text-gray-500 truncate">{visite.organisation_visiteur}</p>
            )}
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{visite.motif}</p>
          </div>
        </div>

        {/* Badges et heure */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${couleurStatut(visite.statut)}`}>
            {libelleStatut(visite.statut)}
          </span>
          <span className={`text-xs ${couleurUrgence(visite.niveau_urgence)} px-1.5 py-0.5 rounded-full`}>
            {visite.niveau_urgence.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Destinataire + heure + attente */}
      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {visite.destinataire && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{nomComplet(visite.destinataire.nom, visite.destinataire.prenom)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{formatHeure(visite.heure_arrivee)}</span>
          {visite.statut === 'en_attente' && (
            <span className={`text-xs font-bold ${urgent ? 'text-red-600 animate-pulse' : 'text-amber-600'}`}>
              {formatDuree(dureeAttente)}
            </span>
          )}
        </div>
      </div>

      {/* Note de décision */}
      {visite.note_decision && (
        <div className="mt-2 p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 italic">{visite.note_decision}</p>
        </div>
      )}

      {/* Actions */}
      {afficherActions && visite.statut === 'acceptee' && onFaireEntrer && (
        <div className="mt-3">
          <button
            onClick={() => onFaireEntrer(visite.id)}
            className="w-full py-2 bg-accent/10 text-accent text-sm font-semibold rounded-lg hover:bg-accent hover:text-white transition-colors"
          >
            ✓ Faire entrer
          </button>
        </div>
      )}
      {afficherActions && visite.statut === 'en_cours' && onTerminer && (
        <div className="mt-3">
          <button
            onClick={() => onTerminer(visite.id)}
            className="w-full py-2 bg-gray-700 text-white text-sm font-semibold rounded-lg hover:bg-gray-900 transition-colors"
          >
            ✓ Terminer la visite
          </button>
        </div>
      )}
    </div>
  )
}
