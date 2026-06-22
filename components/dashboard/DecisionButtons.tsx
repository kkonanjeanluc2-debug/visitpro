'use client'

import { useState } from 'react'
import type { Utilisateur } from '@/types'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { nomComplet } from '@/lib/utils'

interface DecisionButtonsProps {
  visiteId: string
  collaborateurs: Utilisateur[]
  onDecision: (id: string, decision: 'acceptee' | 'declinee', note?: string) => Promise<void>
  onRediriger: (id: string, nouveauDestinataireId: string) => Promise<void>
  loading?: boolean
}

export default function DecisionButtons({ visiteId, collaborateurs, onDecision, onRediriger, loading = false }: DecisionButtonsProps) {
  const [showDeclinModal, setShowDeclinModal] = useState(false)
  const [showRedirModal, setShowRedirModal] = useState(false)
  const [noteDeclin, setNoteDeclin] = useState('')
  const [nouveauDest, setNouveauDest] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleDeclin = async () => {
    setSubmitting(true)
    await onDecision(visiteId, 'declinee', noteDeclin || undefined)
    setSubmitting(false)
    setShowDeclinModal(false)
    setNoteDeclin('')
  }

  const handleRediriger = async () => {
    if (!nouveauDest) return
    setSubmitting(true)
    await onRediriger(visiteId, nouveauDest)
    setSubmitting(false)
    setShowRedirModal(false)
    setNouveauDest('')
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onDecision(visiteId, 'acceptee')}
          disabled={loading}
          className="flex-1 min-w-[110px] py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-600 transition-colors disabled:opacity-50"
        >
          ✓ Faire entrer
        </button>

        <button
          disabled={loading}
          className="flex-1 min-w-[90px] py-2.5 bg-amber-100 text-amber-700 text-sm font-semibold rounded-xl hover:bg-amber-200 transition-colors disabled:opacity-50"
          title="Laisser le visiteur patienter"
        >
          ⏳ Attendre
        </button>

        <button
          onClick={() => setShowDeclinModal(true)}
          disabled={loading}
          className="flex-1 min-w-[90px] py-2.5 bg-red-100 text-red-700 text-sm font-semibold rounded-xl hover:bg-red-200 transition-colors disabled:opacity-50"
        >
          ✕ Décliner
        </button>

        <button
          onClick={() => setShowRedirModal(true)}
          disabled={loading}
          className="px-3 py-2.5 bg-purple-100 text-purple-700 text-sm font-semibold rounded-xl hover:bg-purple-200 transition-colors disabled:opacity-50"
          title="Rediriger"
        >
          ↗
        </button>
      </div>

      {/* Modal déclin */}
      <Modal
        isOpen={showDeclinModal}
        onClose={() => { setShowDeclinModal(false); setNoteDeclin('') }}
        title="Décliner cette visite"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowDeclinModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleDeclin}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Chargement...' : 'Décliner'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600 mb-3">
          Cette action est définitive. Le visiteur sera informé via l&apos;accueil.
        </p>
        <input
          type="text"
          value={noteDeclin}
          onChange={(e) => setNoteDeclin(e.target.value)}
          placeholder="Raison du déclin (optionnel)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </Modal>

      {/* Modal redirection */}
      <Modal
        isOpen={showRedirModal}
        onClose={() => { setShowRedirModal(false); setNouveauDest('') }}
        title="Rediriger vers un collaborateur"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowRedirModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleRediriger}
              disabled={submitting || !nouveauDest}
              className="px-4 py-2 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Redirection...' : 'Rediriger'}
            </button>
          </>
        }
      >
        <Select
          label="Nouveau destinataire"
          value={nouveauDest}
          onChange={(e) => setNouveauDest(e.target.value)}
          options={collaborateurs.map((c) => ({
            value: c.id,
            label: `${nomComplet(c.nom, c.prenom)}${c.poste ? ` — ${c.poste}` : ''}`,
          }))}
          placeholder="Choisir un collaborateur"
        />
      </Modal>
    </>
  )
}
