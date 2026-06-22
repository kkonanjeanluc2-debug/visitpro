'use client'

import { useState } from 'react'
import type { RendezVous } from '@/types'
import { nomComplet, libelleStatut } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'

interface AgendaJourProps {
  rendezVous: RendezVous[]
  loading?: boolean
  onAnnuler?: (id: string) => void
  onTerminer?: (id: string) => void
}

function statutClasses(statut: string) {
  if (statut === 'confirme') return 'bg-green-100 text-green-700'
  if (statut === 'annule') return 'bg-red-100 text-red-700'
  if (statut === 'reporte') return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-600'
}

function DetailModal({ rdv, onClose, onTerminer, onAnnuler }: {
  rdv: RendezVous
  onClose: () => void
  onTerminer?: (id: string) => void
  onAnnuler?: (id: string) => void
}) {
  const nomVisiteur = rdv.visiteur
    ? nomComplet(rdv.visiteur.nom, rdv.visiteur.prenom ?? undefined)
    : rdv.nom_visiteur_externe ?? 'Visiteur externe'

  const telephone = rdv.visiteur?.telephone ?? rdv.telephone_visiteur_externe
  const email = rdv.visiteur?.email ?? rdv.email_visiteur_externe
  const organisation = rdv.visiteur?.organisation ?? rdv.organisation_externe

  const dateLabel = new Date(rdv.date_rdv + 'T00:00:00').toLocaleDateString('fr-CI', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header coloré */}
        <div className={`px-5 pt-5 pb-4 ${rdv.statut === 'annule' ? 'bg-red-50' : rdv.statut === 'termine' ? 'bg-gray-50' : 'bg-primary/5'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${statutClasses(rdv.statut)}`}>
                {libelleStatut(rdv.statut)}
              </span>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{rdv.titre}</h2>
              <p className="text-sm text-gray-500 mt-0.5 capitalize">{dateLabel}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/10 transition-colors flex-shrink-0">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Horaire */}
          <div className="flex items-center gap-2 mt-3">
            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-primary">
              {rdv.heure_debut}{rdv.heure_fin ? ` → ${rdv.heure_fin}` : ''}
            </span>
          </div>
        </div>

        {/* Corps */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Visiteur */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Visiteur</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">
                  {nomVisiteur.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{nomVisiteur}</p>
                {organisation && <p className="text-xs text-gray-500">{organisation}</p>}
              </div>
            </div>
            {(telephone || email) && (
              <div className="mt-2 space-y-1 pl-13">
                {telephone && (
                  <a href={`tel:${telephone}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {telephone}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {email}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Destinataire */}
          {rdv.destinataire && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Avec</p>
              <div className="flex items-center gap-3">
                <Avatar nom={rdv.destinataire.nom} prenom={rdv.destinataire.prenom} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {rdv.destinataire.prenom} {rdv.destinataire.nom}
                  </p>
                  {rdv.destinataire.poste && (
                    <p className="text-xs text-gray-500">{rdv.destinataire.poste}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {rdv.description && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Objet</p>
              <p className="text-sm text-gray-700 leading-relaxed">{rdv.description}</p>
            </div>
          )}

          {/* Notes */}
          {rdv.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700 leading-relaxed bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{rdv.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {rdv.statut === 'confirme' && (onTerminer || onAnnuler) && (
          <div className="px-5 pb-5 pt-2 flex gap-2 border-t border-gray-100">
            {onTerminer && (
              <button
                onClick={() => { onTerminer(rdv.id); onClose() }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Terminer
              </button>
            )}
            {onAnnuler && (
              <button
                onClick={() => { onAnnuler(rdv.id); onClose() }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors border border-red-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Annuler
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgendaJour({ rendezVous, loading = false, onAnnuler, onTerminer }: AgendaJourProps) {
  const [rdvSelectionne, setRdvSelectionne] = useState<RendezVous | null>(null)

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-20" />
        ))}
      </div>
    )
  }

  if (rendezVous.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">Aucun rendez-vous aujourd&apos;hui</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {rendezVous.map((rdv) => {
          const nomVisiteur = rdv.visiteur
            ? nomComplet(rdv.visiteur.nom, rdv.visiteur.prenom ?? undefined)
            : rdv.nom_visiteur_externe ?? 'Visiteur externe'

          return (
            <div
              key={rdv.id}
              onClick={() => setRdvSelectionne(rdv)}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer
                ${rdv.statut === 'annule' ? 'opacity-50 bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-primary/40 hover:shadow-sm'}
              `}
            >
              {/* Heure */}
              <div className="flex-shrink-0 text-center min-w-[50px]">
                <p className="text-sm font-bold text-primary">{rdv.heure_debut}</p>
                {rdv.heure_fin && <p className="text-xs text-gray-400">{rdv.heure_fin}</p>}
              </div>

              {/* Séparateur vertical */}
              <div className="w-px bg-primary/20 self-stretch flex-shrink-0" />

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{rdv.titre}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{nomVisiteur}</p>
                {(rdv.visiteur?.organisation ?? rdv.organisation_externe) && (
                  <p className="text-xs text-gray-400 truncate">
                    {rdv.visiteur?.organisation ?? rdv.organisation_externe}
                  </p>
                )}
              </div>

              {/* Destinataire + statut */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {rdv.destinataire && (
                  <Avatar nom={rdv.destinataire.nom} prenom={rdv.destinataire.prenom} size="sm" />
                )}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statutClasses(rdv.statut)}`}>
                  {libelleStatut(rdv.statut)}
                </span>
              </div>

              {/* Actions sur RDV confirmé */}
              {rdv.statut === 'confirme' && (onTerminer || onAnnuler) && (
                <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {onTerminer && (
                    <button
                      onClick={() => onTerminer(rdv.id)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Marquer comme terminé"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                  {onAnnuler && (
                    <button
                      onClick={() => onAnnuler(rdv.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Annuler ce RDV"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              {/* Badge terminé */}
              {rdv.statut === 'termine' && (
                <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">
                  Terminé
                </span>
              )}
            </div>
          )
        })}
      </div>

      {rdvSelectionne && (
        <DetailModal
          rdv={rdvSelectionne}
          onClose={() => setRdvSelectionne(null)}
          onTerminer={onTerminer}
          onAnnuler={onAnnuler}
        />
      )}
    </>
  )
}
