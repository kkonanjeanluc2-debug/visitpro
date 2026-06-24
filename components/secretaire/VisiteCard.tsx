'use client'

import { useState, useEffect } from 'react'
import type { Visite } from '@/types'
import Avatar from '@/components/ui/Avatar'
import { formatHeure, nomComplet, calculerDureeAttente, formatDuree, couleurStatut, libelleStatut, couleurUrgence } from '@/lib/utils'
import { lienWaBienvenueVisite, ouvrirWhatsApp } from '@/lib/whatsapp'
import Link from 'next/link'
import MessageVisite from '@/components/shared/MessageVisite'
import type { Utilisateur } from '@/types'

interface VisiteCardProps {
  visite: Visite
  onFaireEntrer?: (id: string) => void
  onTerminer?: (id: string) => void
  afficherActions?: boolean
  nomEntreprise?: string
  utilisateur?: Utilisateur
}

export default function VisiteCard({ visite, onFaireEntrer, onTerminer, afficherActions = false, nomEntreprise, utilisateur }: VisiteCardProps) {
  const enCours = visite.statut === 'en_cours'
  const refTime = enCours && visite.heure_entree ? visite.heure_entree : visite.heure_arrivee

  const [duree, setDuree] = useState(calculerDureeAttente(refTime))

  useEffect(() => {
    if (visite.statut !== 'en_attente' && visite.statut !== 'en_cours') return
    const getRef = () => visite.statut === 'en_cours' && visite.heure_entree ? visite.heure_entree : visite.heure_arrivee
    setDuree(calculerDureeAttente(getRef()))
    const interval = setInterval(() => setDuree(calculerDureeAttente(getRef())), 30000)
    return () => clearInterval(interval)
  }, [visite.heure_arrivee, visite.heure_entree, visite.statut])

  const urgent = duree > 15 && visite.statut === 'en_attente'

  // Lien WhatsApp disponible si le visiteur a un téléphone et est en attente
  const lienWA =
    visite.telephone_visiteur &&
    visite.statut === 'en_attente' &&
    visite.destinataire
      ? lienWaBienvenueVisite({
          telephoneVisiteur: visite.telephone_visiteur,
          nomVisiteur:       nomComplet(visite.nom_visiteur, visite.prenom_visiteur ?? undefined),
          nomDestinataire:   nomComplet(visite.destinataire.nom, visite.destinataire.prenom),
          nomEntreprise:     nomEntreprise ?? '',
          heureArrivee:      formatHeure(visite.heure_arrivee),
        })
      : null

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
            {visite.visiteur_id ? (
              <Link href={`/secretaire/visiteurs/${visite.visiteur_id}`} className="font-semibold text-gray-900 truncate hover:text-primary transition-colors block">
                {nomComplet(visite.nom_visiteur, visite.prenom_visiteur ?? undefined)}
                {visite.visiteur?.est_vip && <span className="ml-1 text-sm">⭐</span>}
              </Link>
            ) : (
              <p className="font-semibold text-gray-900 truncate">
                {nomComplet(visite.nom_visiteur, visite.prenom_visiteur ?? undefined)}
              </p>
            )}
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

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Terminée : affiche heure_entree → heure_sortie */}
          {visite.statut === 'terminee' ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span title="Arrivée">{formatHeure(visite.heure_arrivee)}</span>
              {visite.heure_entree && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="font-medium text-gray-700" title="Prise en charge">
                    ↳ {formatHeure(visite.heure_entree)}
                  </span>
                </>
              )}
              {visite.heure_sortie && (
                <>
                  <span className="text-gray-300">→</span>
                  <span className="font-medium text-gray-700" title="Fin de visite">
                    {formatHeure(visite.heure_sortie)}
                  </span>
                </>
              )}
            </div>
          ) : (
            <>
              <span className="text-xs text-gray-500">{formatHeure(visite.heure_arrivee)}</span>
              {visite.statut === 'en_attente' && (
                <span className={`text-xs font-bold ${urgent ? 'text-red-600 animate-pulse' : 'text-amber-600'}`}>
                  {formatDuree(duree)}
                </span>
              )}
              {enCours && (
                <span className="text-xs font-bold text-green-600">
                  En visite {formatDuree(duree)}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Note de décision */}
      {visite.note_decision && (
        <div className="mt-2 p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 italic">{visite.note_decision}</p>
        </div>
      )}

      {/* Préférences visiteur — si visiteur connu et a des préférences */}
      {visite.visiteur_id && visite.visiteur?.preferences && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-1.5">
          <span className="text-sm flex-shrink-0">💛</span>
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Préférences :</span> {visite.visiteur.preferences}
          </p>
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

      {/* Messagerie interne */}
      {utilisateur && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <MessageVisite
            visiteId={visite.id}
            utilisateur={utilisateur}
            destinataireId={visite.destinataire_id}
            compact
          />
        </div>
      )}

      {/* Bouton WhatsApp — visible si le visiteur est en attente et a un téléphone */}
      {lienWA && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => ouvrirWhatsApp(lienWA)}
            className="flex items-center gap-2 text-xs font-medium text-[#128C7E] hover:text-[#075E54] transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.099.539 4.073 1.485 5.793L0 24l6.335-1.473A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.868 0-3.619-.504-5.12-1.385l-.368-.216-3.763.875.932-3.658-.237-.379A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            💬 Envoyer message WhatsApp au visiteur
          </button>
        </div>
      )}
    </div>
  )
}
