'use client'

import { useEffect, useState, useRef } from 'react'

interface VisiteDisplay {
  id: string
  nom_visiteur: string
  prenom_visiteur?: string
  organisation_visiteur?: string
  statut: string
  niveau_urgence: string
  ordre_file?: number | null
  heure_arrivee: string
  temps_attente_estime?: number
  destinataire?: { prenom?: string; nom: string } | null
}

interface EntrepriseDisplay {
  id: string
  nom: string
  logo_url?: string
  display_message: string
  display_couleur_fond: string
  display_couleur_texte: string
}

function prioriteUrgence(niveau: string): number {
  if (niveau === 'vip') return 0
  if (niveau === 'urgent') return 1
  return 2
}

function nomComplet(nom: string, prenom?: string) {
  return prenom ? `${prenom} ${nom}` : nom
}

function formatHeure(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-CI', { hour: '2-digit', minute: '2-digit' })
}

export default function DisplayPage({ params }: { params: { token: string } }) {
  const token = params.token

  const [entreprise, setEntreprise] = useState<EntrepriseDisplay | null>(null)
  const [visites, setVisites] = useState<VisiteDisplay[]>([])
  const [heureActuelle, setHeureActuelle] = useState<Date | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [lastFetch, setLastFetch] = useState<string>('')
  const mountedRef = useRef(true)

  // Horloge
  useEffect(() => {
    setHeureActuelle(new Date())
    const t = setInterval(() => setHeureActuelle(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Polling principal
  useEffect(() => {
    mountedRef.current = true

    async function charger() {
      try {
        const res = await fetch(
          `/api/display/${token}?t=${Date.now()}`,
          { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
        )
        if (!mountedRef.current) return
        if (res.status === 404) { setNotFound(true); return }
        if (!res.ok) return
        const data: { entreprise: EntrepriseDisplay; visites: VisiteDisplay[] } = await res.json()
        if (!mountedRef.current) return
        setEntreprise(data.entreprise)
        const sorted = [...data.visites].sort((a, b) => {
          const pDiff = prioriteUrgence(a.niveau_urgence) - prioriteUrgence(b.niveau_urgence)
          if (pDiff !== 0) return pDiff
          const aOrdre = a.ordre_file ?? 999999
          const bOrdre = b.ordre_file ?? 999999
          if (aOrdre !== bOrdre) return aOrdre - bOrdre
          return a.heure_arrivee.localeCompare(b.heure_arrivee)
        })
        setVisites(sorted.slice(0, 12))
        setLastFetch(new Date().toLocaleTimeString('fr-CI', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      } catch {
        // réseau indisponible — on conserve le dernier état
      }
    }

    charger()
    const interval = setInterval(charger, 2_000)

    const onVisible = () => {
      if (document.visibilityState === 'visible') charger()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      mountedRef.current = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [token])

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-6xl mb-4">🔗</p>
          <h1 className="text-2xl font-bold mb-2">Écran introuvable</h1>
          <p className="text-gray-400">Le lien de cet écran n&apos;est pas valide.</p>
        </div>
      </div>
    )
  }

  if (!entreprise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  const fond = entreprise.display_couleur_fond
  const texte = entreprise.display_couleur_texte
  const isDark = fond !== '#F9FAFB' && fond !== '#FFFFFF'
  const overlay = isDark ? 'rgba(255,255,255,' : 'rgba(0,0,0,'

  return (
    <div
      className="min-h-screen flex flex-col select-none"
      style={{ backgroundColor: fond, color: texte }}
    >
      {/* ── HEADER : logo + nom + horloge ── */}
      <header
        className="flex items-center justify-between px-8 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${overlay}0.12)` }}
      >
        <div className="flex items-center gap-4">
          {entreprise.logo_url ? (
            <img src={entreprise.logo_url} alt={entreprise.nom} className="h-12 w-auto object-contain" />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl"
              style={{ backgroundColor: `${overlay}0.15)`, color: texte }}
            >
              {entreprise.nom.charAt(0)}
            </div>
          )}
          <h1 className="text-xl font-semibold tracking-wide" style={{ color: texte }}>
            {entreprise.nom}
          </h1>
        </div>

        <div className="text-right">
          <p
            className="font-light tabular-nums leading-none"
            style={{ fontSize: 'clamp(32px, 4vw, 56px)', color: texte }}
          >
            {heureActuelle?.toLocaleTimeString('fr-CI', { hour: '2-digit', minute: '2-digit' }) ?? '--:--'}
          </p>
          <p className="text-sm font-light opacity-60 mt-1 capitalize" style={{ color: texte }}>
            {heureActuelle?.toLocaleDateString('fr-CI', {
              weekday: 'long', day: 'numeric', month: 'long',
            }) ?? ''}
          </p>
        </div>
      </header>

      {/* ── CORPS ── */}
      <div className="flex-1 flex flex-col overflow-hidden px-8 py-6 gap-4">
        {visites.length === 0 ? (
          /* Aucun visiteur */
          <div className="flex-1 flex items-center justify-center">
            <p
              className="font-light opacity-70 text-center leading-relaxed"
              style={{ fontSize: 'clamp(20px, 2.5vw, 36px)', color: texte, maxWidth: '60%' }}
            >
              {entreprise.display_message}
            </p>
          </div>
        ) : (
          <>
            {/* ── EN-TÊTE LISTE ── */}
            <p className="text-xs font-semibold uppercase tracking-widest opacity-40 px-1 flex-shrink-0" style={{ color: texte }}>
              File d&apos;attente — {visites.length} personne{visites.length > 1 ? 's' : ''}
            </p>

            {/* ── LISTE COMPLÈTE (premier mis en évidence) ── */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {visites.map((visite, idx) => {
                const estPremier = idx === 0
                return (
                  <div
                    key={visite.id}
                    className="rounded-2xl flex items-center gap-5"
                    style={{
                      padding: estPremier ? '20px 28px' : '12px 20px',
                      backgroundColor: estPremier ? `${overlay}0.14)` : `${overlay}0.07)`,
                      border: `1px solid ${overlay}${estPremier ? '0.20' : '0.10'})`,
                    }}
                  >
                    {/* Numéro */}
                    <div
                      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
                      style={{
                        width: estPremier ? 48 : 36,
                        height: estPremier ? 48 : 36,
                        fontSize: estPremier ? 20 : 15,
                        backgroundColor: `${overlay}0.18)`,
                        color: texte,
                      }}
                    >
                      {idx + 1}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      {/* Badges urgence */}
                      {(visite.niveau_urgence === 'vip' || visite.niveau_urgence === 'urgent') && (
                        <div className="mb-1">
                          {visite.niveau_urgence === 'vip' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">VIP</span>
                          )}
                          {visite.niveau_urgence === 'urgent' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">URGENT</span>
                          )}
                        </div>
                      )}

                      {estPremier && (
                        <p className="text-sm font-light tracking-widest uppercase opacity-50 mb-0.5" style={{ color: texte }}>
                          Bienvenue
                        </p>
                      )}

                      {/* Nom */}
                      <p
                        className="font-bold leading-tight truncate"
                        style={{ fontSize: estPremier ? 'clamp(20px, 2.8vw, 40px)' : 'clamp(14px, 1.6vw, 22px)', color: texte }}
                      >
                        M./Mme {nomComplet(visite.nom_visiteur, visite.prenom_visiteur)}
                      </p>

                      {/* Organisation */}
                      {visite.organisation_visiteur && (
                        <p
                          className="font-light truncate"
                          style={{ fontSize: estPremier ? 15 : 13, color: texte, opacity: 0.55 }}
                        >
                          {visite.organisation_visiteur}
                        </p>
                      )}

                      {/* Message destinataire */}
                      {visite.destinataire?.nom && (
                        <p
                          className="truncate"
                          style={{ fontSize: estPremier ? 15 : 13, color: texte, opacity: estPremier ? 0.85 : 0.50, marginTop: 2 }}
                        >
                          {estPremier ? (
                            <>
                              M./Mme{' '}
                              <span className="font-semibold">
                                {nomComplet(visite.destinataire.nom, visite.destinataire.prenom)}
                              </span>{' '}
                              va vous recevoir dans quelques instants
                            </>
                          ) : (
                            <>Pour {nomComplet(visite.destinataire.nom, visite.destinataire.prenom)}</>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Heure + statut */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs opacity-40 mb-0.5" style={{ color: texte }}>Arrivé à</p>
                      <p
                        className="font-light tabular-nums"
                        style={{ fontSize: estPremier ? 28 : 16, color: texte }}
                      >
                        {formatHeure(visite.heure_arrivee)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer
        className="flex items-center justify-between px-8 py-3 flex-shrink-0"
        style={{ borderTop: `1px solid ${overlay}0.08)` }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="opacity-30 text-xs" style={{ color: texte }}>En direct</span>
        </div>
        <div className="flex items-center gap-4">
          {lastFetch && (
            <span className="opacity-20 text-xs tabular-nums" style={{ color: texte }}>
              {visites.length} en attente · {lastFetch}
            </span>
          )}
          <p className="opacity-20" style={{ fontSize: 11, color: texte }}>
            Powered by VisitPro
          </p>
        </div>
      </footer>
    </div>
  )
}
