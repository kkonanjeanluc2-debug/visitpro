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

  const today        = new Date().toISOString().split('T')[0]
  const tomorrow     = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const nbAujourdhui = rdvs.filter(r => r.date_rdv === today).length
  const nbDemain     = rdvs.filter(r => r.date_rdv === tomorrow).length
  const hasToday     = nbAujourdhui > 0

  return (
    <div className={`border-b shadow-sm ${hasToday ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-[#1E3A5F] to-indigo-700'}`}>

      {/* ── Barre de titre ────────────────────────────────────────────────── */}
      <button
        onClick={() => setOuvert(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:brightness-95 transition-all"
      >
        <div className="flex items-center gap-3">
          {/* Icône + dot pulsé si RDV aujourd'hui */}
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            {hasToday && (
              <span className="absolute -top-1 -right-1 w-3 h-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
            )}
          </div>

          {/* Texte */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {hasToday
                  ? `${nbAujourdhui} RDV aujourd'hui${nbDemain > 0 ? ` · ${nbDemain} demain` : ''}`
                  : `${nbDemain} rendez-vous demain`}
              </span>
              <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {rdvs.length}
              </span>
            </div>
            <p className="text-xs text-white/70 mt-0.5">
              {hasToday ? 'Attention requise — vérifiez votre agenda' : 'Planifiez votre journée à l\'avance'}
            </p>
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`w-5 h-5 text-white/80 transition-transform flex-shrink-0 ${ouvert ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Liste des RDV ─────────────────────────────────────────────────── */}
      {ouvert && (
        <div className="px-3 pb-3 space-y-2">
          {rdvs.map(rdv => {
            const email     = emailDuRdv(rdv)
            const nom       = nomVisiteurRdv(rdv)
            const destinat  = rdv.destinataire ? `${(rdv.destinataire as any).prenom ?? ''} ${(rdv.destinataire as any).nom ?? ''}`.trim() : ''
            const estEnvoyé = rappelEnvoye.has(rdv.id)
            const etat      = envois[rdv.id]
            const isToday   = rdv.date_rdv === today
            const jourLabel = labelJour(rdv.date_rdv, today, tomorrow)

            return (
              <div
                key={rdv.id}
                className="flex items-center justify-between gap-3 bg-white rounded-xl px-3 py-3 shadow-md"
              >
                {/* Bandeau coloré gauche */}
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${isToday ? 'bg-orange-400' : 'bg-indigo-400'}`} />

                {/* Heure en évidence */}
                <div className={`flex-shrink-0 text-center w-14 px-1 py-1.5 rounded-lg ${isToday ? 'bg-orange-50' : 'bg-indigo-50'}`}>
                  <p className={`text-sm font-extrabold leading-none ${isToday ? 'text-orange-600' : 'text-indigo-600'}`}>
                    {rdv.heure_debut.slice(0, 5)}
                  </p>
                  <p className={`text-[10px] font-semibold mt-0.5 ${isToday ? 'text-orange-400' : 'text-indigo-400'}`}>
                    {isToday ? "Auj." : 'Demain'}
                  </p>
                </div>

                {/* Infos visiteur */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{nom}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {destinat && <span>avec {destinat}</span>}
                    {rdv.titre && <span className="text-gray-400"> · {rdv.titre}</span>}
                  </p>
                </div>

                {/* Bouton rappel */}
                <div className="flex-shrink-0">
                  {!email ? (
                    <span className="text-xs text-gray-300 italic">Sans email</span>
                  ) : estEnvoyé || etat === 'ok' ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Envoyé
                    </span>
                  ) : etat === 'err' ? (
                    <button onClick={() => envoyerRappel(rdv)}
                      className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                      Réessayer
                    </button>
                  ) : (
                    <button
                      onClick={() => envoyerRappel(rdv)}
                      disabled={etat === 'loading'}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 shadow-sm
                        ${isToday
                          ? 'bg-orange-500 hover:bg-orange-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                    >
                      {etat === 'loading' ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                      {etat === 'loading' ? 'Envoi...' : 'Rappel'}
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
