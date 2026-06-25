'use client'

import { useState, useEffect } from 'react'
import type { Visite } from '@/types'
import Avatar from '@/components/ui/Avatar'
import { formatHeure, nomComplet, calculerDureeAttente, formatDuree, couleurUrgence } from '@/lib/utils'
import MessageVisite from '@/components/shared/MessageVisite'
import type { Utilisateur } from '@/types'

interface NotifVisiteProps {
  visite: Visite
  isNew?: boolean
  rang?: number
  onDecision: (visiteId: string, decision: 'acceptee' | 'declinee', note?: string) => void
  onRediriger: (visite: Visite) => void
  onTerminer?: (visiteId: string, sujetTraite?: string) => void
  utilisateur?: Utilisateur
}

export default function NotifVisite({ visite, isNew = false, rang, onDecision, onRediriger, onTerminer, utilisateur }: NotifVisiteProps) {
  const enCours = visite.statut === 'en_cours' || visite.statut === 'acceptee'
  const destinataire = visite.destinataire as (Utilisateur & { nom: string; prenom: string; poste?: string }) | undefined
  const afficherDestinataire = destinataire && utilisateur && destinataire.id !== utilisateur.id
  const refTime = enCours && visite.heure_entree ? visite.heure_entree : visite.heure_arrivee

  const [duree, setDuree] = useState(calculerDureeAttente(refTime))
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNotesDrawer, setShowNotesDrawer] = useState(false)
  const [sujetTraite, setSujetTraite] = useState(visite.sujet_traite ?? '')

  const isVip = visite.visiteur?.est_vip === true
  const hasNotes = Boolean(visite.visiteur?.notes_privees)

  useEffect(() => {
    const getRef = () =>
      (visite.statut === 'en_cours' || visite.statut === 'acceptee') && visite.heure_entree
        ? visite.heure_entree
        : visite.heure_arrivee
    setDuree(calculerDureeAttente(getRef()))
    const interval = setInterval(() => setDuree(calculerDureeAttente(getRef())), 30000)
    return () => clearInterval(interval)
  }, [visite.heure_arrivee, visite.heure_entree, visite.statut])

  const urgent = !enCours && duree > 15

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
    <>
    <div className={`bg-white border rounded-2xl p-4 shadow-sm transition-all
      ${isNew ? 'animate-fade-in-down border-accent/40 shadow-accent/10 shadow-md' : 'border-gray-200'}
      ${isVip ? 'border-yellow-400 bg-yellow-50/20' : visite.niveau_urgence === 'vip' ? 'border-yellow-300' : ''}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <Avatar
              nom={visite.nom_visiteur}
              prenom={visite.prenom_visiteur ?? undefined}
              size="lg"
            />
            {isVip && (
              <span className="absolute -top-1 -right-1 text-base" title="Visiteur VIP">👑</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">
                {nomComplet(visite.nom_visiteur, visite.prenom_visiteur ?? undefined)}
              </p>
              {isVip && (
                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full border border-yellow-300">VIP</span>
              )}
            </div>
            {visite.organisation_visiteur && (
              <p className="text-sm text-gray-500">{visite.organisation_visiteur}</p>
            )}
            {afficherDestinataire && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-full">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Pour&nbsp;: {nomComplet(destinataire.nom, destinataire.prenom)}{destinataire.poste ? ` — ${destinataire.poste}` : ''}
              </span>
            )}
            <p className="text-sm text-gray-700 mt-1">{visite.motif}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {rang != null && visite.statut === 'en_attente' && (
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${rang === 1 ? 'bg-green-100 text-green-700' :
                visite.niveau_urgence === 'vip' ? 'bg-yellow-100 text-yellow-700' :
                visite.niveau_urgence === 'urgent' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-600'}`}
              title={rang === 1 ? 'Prochain dans la file' : `Rang #${rang} dans la file`}
            >
              {rang}
            </span>
          )}
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
        {enCours ? (
          <span className="font-bold text-green-600">
            En visite depuis {formatDuree(duree)}
          </span>
        ) : (
          <span className={`font-bold ${urgent ? 'text-red-600 animate-pulse' : 'text-amber-600'}`}>
            Attend depuis {formatDuree(duree)}
          </span>
        )}
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

      {/* Bouton "Voir les notes" — si notes privées existent */}
      {hasNotes && (
        <div className="mt-3">
          <button
            onClick={() => setShowNotesDrawer(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Voir les notes privées
          </button>
        </div>
      )}

      {/* Messagerie interne */}
      {utilisateur && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <MessageVisite
            visiteId={visite.id}
            utilisateur={utilisateur}
            destinataireId={visite.enregistre_par}
            compact
          />
        </div>
      )}

      {/* Boutons selon statut */}
      <div className="mt-4 flex gap-2 flex-wrap">
        {(visite.statut === 'acceptee' || visite.statut === 'en_cours') ? (
          <>
            <div className="w-full flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <span className="text-sm text-green-700 font-medium">
                {visite.statut === 'en_cours' ? 'Visite en cours' : 'Visiteur autorisé à entrer'}
              </span>
            </div>
            {/* Champ sujet traité */}
            <div className="w-full">
              <label className="block text-xs font-medium text-gray-500 mb-1">Sujet traité <span className="text-gray-400">(optionnel)</span></label>
              <input
                type="text"
                value={sujetTraite}
                onChange={e => setSujetTraite(e.target.value)}
                placeholder="Ex : Contrat de partenariat, renouvellement abonnement..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              />
            </div>
            {onTerminer && (
              <button
                onClick={async () => { setLoading(true); await onTerminer(visite.id, sujetTraite.trim() || undefined); setLoading(false) }}
                disabled={loading}
                className="w-full py-2.5 bg-gray-700 text-white text-sm font-semibold rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50"
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

    {/* Drawer notes privées */}
    {showNotesDrawer && (
      <>
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowNotesDrawer(false)} />
        <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Notes privées</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {nomComplet(visite.nom_visiteur, visite.prenom_visiteur ?? undefined)}
              </p>
            </div>
            <button
              onClick={() => setShowNotesDrawer(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {visite.visiteur?.preferences && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-semibold text-amber-800 mb-1">💛 Préférences</p>
                <p className="text-sm text-amber-700">{visite.visiteur.preferences}</p>
              </div>
            )}
            {visite.visiteur?.notes_privees && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <p className="text-xs font-semibold text-purple-800 mb-1">🔒 Notes confidentielles</p>
                <p className="text-sm text-purple-700 whitespace-pre-wrap">{visite.visiteur.notes_privees}</p>
              </div>
            )}
            {!visite.visiteur?.preferences && !visite.visiteur?.notes_privees && (
              <p className="text-sm text-gray-400 text-center py-6">Aucune note disponible</p>
            )}
          </div>
        </div>
      </>
    )}
    </>
  )
}
