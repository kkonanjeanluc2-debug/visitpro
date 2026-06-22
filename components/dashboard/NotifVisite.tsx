'use client'

import { useState, useEffect } from 'react'
import type { Visite } from '@/types'
import Avatar from '@/components/ui/Avatar'
import { formatHeure, nomComplet, calculerDureeAttente, formatDuree, couleurUrgence } from '@/lib/utils'

interface NotifVisiteProps {
  visite: Visite
  isNew?: boolean
  onDecision: (visiteId: string, decision: 'acceptee' | 'declinee', note?: string) => void
  onRediriger: (visite: Visite) => void
  onTerminer?: (visiteId: string) => void
}

export default function NotifVisite({ visite, isNew = false, onDecision, onRediriger, onTerminer }: NotifVisiteProps) {
  const [dureeAttente, setDureeAttente] = useState(calculerDureeAttente(visite.heure_arrivee))
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setDureeAttente(calculerDureeAttente(visite.heure_arrivee))
    }, 30000)
    return () => clearInterval(interval)
  }, [visite.heure_arrivee])

  const urgent = dureeAttente > 15

  const handleDecision = async (decision: 'acceptee' | 'declinee') => {
    if (decision === 'declinee' && !showNote) {
      setShowNote(true)
      return
    }
    setLoading(true)
    await onDecision(visite.id, decision, note || undefined)
    setLoading(false)
  }

  return (
    <div className={`bg-white border rounded-2xl p-4 shadow-sm transition-all
      ${isNew ? 'animate-fade-in-down border-accent/40 shadow-accent/10 shadow-md' : 'border-gray-200'}
      ${visite.niveau_urgence === 'vip' ? 'border-yellow-300' : ''}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar
            nom={visite.nom_visiteur}
            prenom={visite.prenom_visiteur ?? undefined}
            size="lg"
            className="flex-shrink-0"
          />
          <div>
            <p className="font-semibold text-gray-900">
              {nomComplet(visite.nom_visiteur, visite.prenom_visiteur ?? undefined)}
            </p>
            {visite.organisation_visiteur && (
              <p className="text-sm text-gray-500">{visite.organisation_visiteur}</p>
            )}
            <p className="text-sm text-gray-700 mt-1">{visite.motif}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {isNew && (
            <span className="px-2 py-0.5 bg-accent text-white text-xs font-bold rounded-full animate-pulse-soft">
              NOUVEAU
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${couleurUrgence(visite.niveau_urgence)}`}>
            {visite.niveau_urgence.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Infos */}
      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Arrivé à {formatHeure(visite.heure_arrivee)}
        </span>
        <span className={`font-bold ${urgent ? 'text-red-600' : 'text-amber-600'}`}>
          Attend depuis {formatDuree(dureeAttente)}
        </span>
        {visite.telephone_visiteur && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {visite.telephone_visiteur}
          </span>
        )}
      </div>

      {/* Champ note pour déclin */}
      {showNote && (
        <div className="mt-3">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Raison du déclin (optionnel)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            autoFocus
          />
        </div>
      )}

      {/* Boutons selon statut */}
      <div className="mt-4 flex gap-2 flex-wrap">
        {(visite.statut === 'acceptee' || visite.statut === 'en_cours') ? (
          <>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-700 font-medium">
                {visite.statut === 'en_cours' ? 'Visite en cours' : 'Visiteur autorisé à entrer'}
              </span>
            </div>
            {onTerminer && (
              <button
                onClick={async () => { setLoading(true); await onTerminer(visite.id); setLoading(false) }}
                disabled={loading}
                className="px-4 py-2.5 bg-gray-700 text-white text-sm font-semibold rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                {loading ? '...' : '✓ Terminer la visite'}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => handleDecision('acceptee')}
              disabled={loading}
              className="flex-1 min-w-[120px] py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-600 active:bg-accent-700 transition-colors disabled:opacity-50"
            >
              ✓ Faire entrer
            </button>

            <button
              onClick={() => { setShowNote(false); setNote('') }}
              disabled={loading}
              className="flex-1 min-w-[100px] py-2.5 bg-amber-100 text-amber-700 text-sm font-semibold rounded-xl hover:bg-amber-200 transition-colors disabled:opacity-50"
            >
              ⏳ Attendre
            </button>

            <button
              onClick={() => handleDecision('declinee')}
              disabled={loading}
              className={`flex-1 min-w-[100px] py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50
                ${showNote
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
            >
              {showNote ? 'Confirmer le déclin' : '✕ Décliner'}
            </button>

            <button
              onClick={() => onRediriger(visite)}
              disabled={loading}
              className="px-3 py-2.5 bg-purple-100 text-purple-700 text-sm font-semibold rounded-xl hover:bg-purple-200 transition-colors disabled:opacity-50"
              title="Rediriger vers un autre collaborateur"
            >
              ↗ Rediriger
            </button>
          </>
        )}
      </div>
    </div>
  )
}
