'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

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
  const [entreprise, setEntreprise] = useState<EntrepriseDisplay | null>(null)
  const [visites, setVisites] = useState<VisiteDisplay[]>([])
  const [heureActuelle, setHeureActuelle] = useState<Date | null>(null)
  const [notFound, setNotFound] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/display/${params.token}`, { cache: 'no-store' })
      if (res.status === 404) { setNotFound(true); return }
      if (!res.ok) return
      const data: { entreprise: EntrepriseDisplay; visites: VisiteDisplay[] } = await res.json()
      setEntreprise(data.entreprise)

      // Filtre : uniquement les visiteurs qui attendent (pas encore reçus)
      const enAttente = data.visites.filter(v => v.statut === 'en_attente' || v.statut === 'acceptee')

      const sorted = [...enAttente].sort((a, b) => {
        const pDiff = prioriteUrgence(a.niveau_urgence) - prioriteUrgence(b.niveau_urgence)
        if (pDiff !== 0) return pDiff
        const aOrdre = a.ordre_file ?? 999999
        const bOrdre = b.ordre_file ?? 999999
        if (aOrdre !== bOrdre) return aOrdre - bOrdre
        return a.heure_arrivee.localeCompare(b.heure_arrivee)
      })
      setVisites(sorted.slice(0, 12))
    } catch {
      // réseau indisponible — on conserve le dernier état
    }
  }, [params.token])

  useEffect(() => {
    charger()
    intervalRef.current = setInterval(charger, 10_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [charger])

  useEffect(() => {
    setHeureActuelle(new Date())
    const t = setInterval(() => setHeureActuelle(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

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
  const premier = visites[0] ?? null
  const suite = visites.slice(1)

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
            {/* ── PREMIER VISITEUR (bienvenue) ── */}
            {premier && (
              <div
                className="rounded-2xl px-8 py-6 flex-shrink-0"
                style={{ backgroundColor: `${overlay}0.12)`, border: `1px solid ${overlay}0.18)` }}
              >
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-5 min-w-0">
                    {/* Numéro */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0"
                      style={{ backgroundColor: `${overlay}0.2)`, color: texte }}
                    >
                      1
                    </div>

                    <div className="min-w-0">
                      {/* Badges urgence */}
                      {(premier.niveau_urgence === 'vip' || premier.niveau_urgence === 'urgent') && (
                        <div className="mb-2">
                          {premier.niveau_urgence === 'vip' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">VIP</span>
                          )}
                          {premier.niveau_urgence === 'urgent' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">URGENT</span>
                          )}
                        </div>
                      )}

                      {/* Message bienvenue */}
                      <p className="text-base font-light tracking-widest uppercase opacity-60 mb-1" style={{ color: texte }}>
                        Bienvenue
                      </p>

                      {/* Nom visiteur */}
                      <p
                        className="font-bold leading-tight mb-2"
                        style={{ fontSize: 'clamp(22px, 3vw, 44px)', color: texte }}
                      >
                        M./Mme {nomComplet(premier.nom_visiteur, premier.prenom_visiteur)}
                      </p>

                      {/* Organisation */}
                      {premier.organisation_visiteur && (
                        <p className="text-base font-light opacity-60 mb-2" style={{ color: texte }}>
                          {premier.organisation_visiteur}
                        </p>
                      )}

                      {/* Message destinataire */}
                      {premier.destinataire?.nom ? (
                        <p className="text-base opacity-80" style={{ color: texte }}>
                          M./Mme{' '}
                          <span className="font-semibold">
                            {nomComplet(premier.destinataire.nom, premier.destinataire.prenom)}
                          </span>{' '}
                          va vous recevoir dans quelques instants
                        </p>
                      ) : (
                        <p className="text-base opacity-60" style={{ color: texte }}>
                          Vous allez être pris en charge dans quelques instants
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Heure + statut */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm opacity-40 mb-1" style={{ color: texte }}>Arrivé à</p>
                    <p className="text-3xl font-light tabular-nums" style={{ color: texte }}>
                      {formatHeure(premier.heure_arrivee)}
                    </p>
                    {premier.statut === 'acceptee' && (
                      <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500 text-white">
                        Accepté ✓
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── LISTE DES SUIVANTS ── */}
            {suite.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-40 px-1 pb-1" style={{ color: texte }}>
                  File d&apos;attente — {suite.length + 1} personne{suite.length + 1 > 1 ? 's' : ''}
                </p>
                {suite.map((visite, idx) => (
                  <div
                    key={visite.id}
                    className="rounded-xl px-6 py-3 flex items-center gap-4"
                    style={{ backgroundColor: `${overlay}0.07)`, border: `1px solid ${overlay}0.1)` }}
                  >
                    {/* Numéro */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0"
                      style={{ backgroundColor: `${overlay}0.12)`, color: texte, opacity: 0.8 }}
                    >
                      {idx + 2}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {visite.niveau_urgence === 'vip' && (
                          <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">VIP</span>
                        )}
                        {visite.niveau_urgence === 'urgent' && (
                          <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">URG</span>
                        )}
                        <p
                          className="font-semibold truncate"
                          style={{ fontSize: 'clamp(14px, 1.6vw, 20px)', color: texte }}
                        >
                          {nomComplet(visite.nom_visiteur, visite.prenom_visiteur)}
                        </p>
                        {visite.organisation_visiteur && (
                          <p className="text-sm opacity-50 truncate hidden sm:block" style={{ color: texte }}>
                            — {visite.organisation_visiteur}
                          </p>
                        )}
                      </div>
                      {visite.destinataire?.nom && (
                        <p className="text-sm opacity-50 truncate" style={{ color: texte }}>
                          Pour {nomComplet(visite.destinataire.nom, visite.destinataire.prenom)}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm opacity-40 tabular-nums" style={{ color: texte }}>
                        {formatHeure(visite.heure_arrivee)}
                      </p>
                      {visite.statut === 'acceptee' && (
                        <span className="text-xs font-semibold text-green-400">Accepté</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
        <p className="opacity-20" style={{ fontSize: 11, color: texte }}>
          Powered by VisitPro
        </p>
      </footer>
    </div>
  )
}
