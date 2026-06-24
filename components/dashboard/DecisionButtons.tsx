'use client'

import { useState } from 'react'
import type { Utilisateur } from '@/types'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { nomComplet } from '@/lib/utils'
import { lienWaAttenteVisite, lienWaVisiteDeclinee, ouvrirWhatsApp } from '@/lib/whatsapp'

interface DecisionButtonsProps {
  visiteId: string
  collaborateurs: Utilisateur[]
  onDecision: (id: string, decision: 'acceptee' | 'declinee', note?: string) => Promise<void>
  onRediriger: (id: string, nouveauDestinataireId: string) => Promise<void>
  loading?: boolean
  // Infos visiteur pour les liens WhatsApp (optionnelles — progressive enhancement)
  telephoneVisiteur?: string
  nomVisiteur?: string
  prenomVisiteur?: string
  nomDestinataire?: string
}

export default function DecisionButtons({
  visiteId, collaborateurs, onDecision, onRediriger, loading = false,
  telephoneVisiteur, nomVisiteur, prenomVisiteur, nomDestinataire,
}: DecisionButtonsProps) {
  const [showDeclinModal, setShowDeclinModal]   = useState(false)
  const [showRedirModal, setShowRedirModal]     = useState(false)
  const [noteDeclin, setNoteDeclin]             = useState('')
  const [nouveauDest, setNouveauDest]           = useState('')
  const [submitting, setSubmitting]             = useState(false)
  const [lienWaApresAction, setLienWaApresAction] = useState<string | null>(null)
  const [typeAction, setTypeAction]             = useState<'attente' | 'declin' | null>(null)

  const visiteurNom = nomComplet(nomVisiteur ?? '', prenomVisiteur ?? undefined)

  const genererLienWa = (type: 'attente' | 'declin'): string | null => {
    if (!telephoneVisiteur) return null
    if (type === 'attente' && nomDestinataire) {
      return lienWaAttenteVisite({
        telephoneVisiteur,
        nomVisiteur:     visiteurNom,
        nomDestinataire: nomDestinataire,
      })
    }
    if (type === 'declin') {
      return lienWaVisiteDeclinee({
        telephoneVisiteur,
        nomVisiteur:  visiteurNom,
        nomEntreprise: 'notre entreprise',
      })
    }
    return null
  }

  const handleAttendre = () => {
    const lien = genererLienWa('attente')
    if (lien) {
      setTypeAction('attente')
      setLienWaApresAction(lien)
    }
  }

  const handleDeclin = async () => {
    setSubmitting(true)
    await onDecision(visiteId, 'declinee', noteDeclin || undefined)
    setSubmitting(false)
    setShowDeclinModal(false)
    setNoteDeclin('')
    const lien = genererLienWa('declin')
    if (lien) {
      setTypeAction('declin')
      setLienWaApresAction(lien)
    }
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
          onClick={handleAttendre}
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

      {/* Bouton WhatsApp après action Attendre / Décliner */}
      {lienWaApresAction && (
        <div className="mt-2 flex items-center gap-2 p-2.5 bg-[#e9fae3] border border-[#25D366]/30 rounded-xl">
          <svg className="w-4 h-4 text-[#25D366] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.099.539 4.073 1.485 5.793L0 24l6.335-1.473A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.868 0-3.619-.504-5.12-1.385l-.368-.216-3.763.875.932-3.658-.237-.379A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800">
              {typeAction === 'attente' ? 'Informer le visiteur qu\'il doit patienter' : 'Informer le visiteur du refus'}
            </p>
            <p className="text-[10px] text-gray-500">Cliquez pour ouvrir WhatsApp avec le message pré-rempli</p>
          </div>
          <button
            onClick={() => ouvrirWhatsApp(lienWaApresAction)}
            className="flex-shrink-0 px-3 py-1.5 bg-[#25D366] text-white text-xs font-semibold rounded-lg hover:bg-[#1da851] transition-colors"
          >
            Envoyer
          </button>
          <button
            onClick={() => setLienWaApresAction(null)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none"
            title="Fermer"
          >
            ×
          </button>
        </div>
      )}

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
