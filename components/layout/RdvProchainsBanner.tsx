'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RendezVous } from '@/types'

interface Props {
  entrepriseId: string
  role: string
  utilisateurId: string
}

function emailDuRdv(rdv: RendezVous): string | null {
  if (rdv.visiteur?.email) return rdv.visiteur.email
  if (rdv.email_visiteur_externe) return rdv.email_visiteur_externe
  return null
}

function nomVisiteurRdv(rdv: RendezVous): string {
  if (rdv.visiteur) return `${rdv.visiteur.prenom ?? ''} ${rdv.visiteur.nom}`.trim()
  return rdv.nom_visiteur_externe ?? 'Visiteur'
}

function labelJour(date: string, today: string, tomorrow: string): string {
  if (date === today) return "Aujourd'hui"
  if (date === tomorrow) return 'Demain'
  return new Date(date + 'T00:00:00').toLocaleDateString('fr-CI', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function RdvProchainsBanner({ entrepriseId, role, utilisateurId }: Props) {
  const supabase = createClient()
  const [rdvs, setRdvs] = useState<RendezVous[]>([])
  const [ouvert, setOuvert] = useState(true)
  const [envois, setEnvois] = useState<Record<string, 'loading' | 'ok' | 'err'>>({})
  const [rappelEnvoye, setRappelEnvoye] = useState<Set<string>>(new Set())

  const charger = useCallback(async () => {
    const now = new Date()
    const today    = now.toISOString().split('T')[0]
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0]

    let q = supabase
      .from('rendez_vous')
      .select('*, visiteur:visiteurs(*), destinataire:utilisateurs!destinataire_id(id, nom, prenom, poste)')
      .eq('entreprise_id', entrepriseId)
      .eq('statut', 'confirme')
      .in('date_rdv', [today, tomorrow])
      .order('date_rdv', { ascending: true })
      .order('heure_debut', { ascending: true })

    // Collaborateur ne voit que ses propres RDV
    if (!['patron', 'admin', 'secretaire'].includes(role)) {
      q = q.eq('destinataire_id', utilisateurId)
    }

    const { data } = await q
    if (data?.length) {
      setRdvs(data as RendezVous[])
      // Pré-charger les rappels déjà envoyés
      setRappelEnvoye(new Set(data.filter(r => r.rappel_envoye).map(r => r.id)))
    }
  }, [entrepriseId, role, utilisateurId])

  useEffect(() => { charger() }, [charger])

  const envoyerRappel = async (rdv: RendezVous) => {
    const email = emailDuRdv(rdv)
    if (!email) return
    setEnvois(e => ({ ...e, [rdv.id]: 'loading' }))
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'rappel_rdv', rdvId: rdv.id }),
      })
      if (res.ok) {
        setEnvois(e => ({ ...e, [rdv.id]: 'ok' }))
        setRappelEnvoye(s => { const n = new Set(Array.from(s)); n.add(rdv.id); return n })
      } else {
        setEnvois(e => ({ ...e, [rdv.id]: 'err' }))
      }
    } catch {
      setEnvois(e => ({ ...e, [rdv.id]: 'err' }))
    }
  }

  if (!rdvs.length) return null

  const today    = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const nbAujourdhui = rdvs.filter(r => r.date_rdv === today).length
  const nbDemain     = rdvs.filter(r => r.date_rdv === tomorrow).length

  const resumé = [
    nbAujourdhui > 0 && `${nbAujourdhui} aujourd'hui`,
    nbDemain > 0     && `${nbDemain} demain`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="bg-indigo-50 border-b border-indigo-200">
      {/* Barre de titre cliquable */}
      <button
        onClick={() => setOuvert(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-indigo-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-semibold text-indigo-800">
            {rdvs.length} rendez-vous à venir
          </span>
          <span className="text-xs text-indigo-500 font-normal">— {resumé}</span>
        </div>
        <svg
          className={`w-4 h-4 text-indigo-500 transition-transform ${ouvert ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Liste des RDV */}
      {ouvert && (
        <div className="px-4 pb-3 space-y-2">
          {rdvs.map(rdv => {
            const email     = emailDuRdv(rdv)
            const nom       = nomVisiteurRdv(rdv)
            const destinat  = rdv.destinataire ? `${(rdv.destinataire as any).prenom ?? ''} ${(rdv.destinataire as any).nom ?? ''}`.trim() : ''
            const estEnvoyé = rappelEnvoye.has(rdv.id)
            const etat      = envois[rdv.id]
            const jourLabel = labelJour(rdv.date_rdv, today, tomorrow)

            return (
              <div
                key={rdv.id}
                className="flex items-center justify-between gap-3 bg-white rounded-xl border border-indigo-100 px-3 py-2.5 shadow-sm"
              >
                {/* Infos RDV */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{nom}</p>
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-indigo-600">{jourLabel} à {rdv.heure_debut}</span>
                      {destinat && <> · avec {destinat}</>}
                      {rdv.titre && <> · <em className="not-italic text-gray-400">{rdv.titre}</em></>}
                    </p>
                  </div>
                </div>

                {/* Bouton rappel */}
                <div className="flex-shrink-0">
                  {!email ? (
                    <span className="text-xs text-gray-400 italic">Pas d&apos;email</span>
                  ) : estEnvoyé || etat === 'ok' ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Rappel envoyé
                    </span>
                  ) : etat === 'err' ? (
                    <button
                      onClick={() => envoyerRappel(rdv)}
                      className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Réessayer
                    </button>
                  ) : (
                    <button
                      onClick={() => envoyerRappel(rdv)}
                      disabled={etat === 'loading'}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50"
                    >
                      {etat === 'loading' ? (
                        <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                      {etat === 'loading' ? 'Envoi...' : 'Envoyer rappel'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
