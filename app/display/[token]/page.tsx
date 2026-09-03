'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

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

// Synthèse vocale robuste : attend le chargement des voix, réessaie sans langue si échec
function parlerTTS(texte: string) {
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()

    const doSpeak = (avecLang: boolean) => {
      try {
        const utt = new SpeechSynthesisUtterance(texte)
        utt.rate = 0.92
        if (avecLang) {
          utt.lang = 'fr-FR'
          // Choisir une voix si disponible, sinon laisser le navigateur décider
          const frVoix = synth.getVoices().find(v => v.lang.startsWith('fr'))
          if (frVoix) utt.voice = frVoix
        }
        utt.onerror = () => {
          // Si la tentative avec lang échoue, réessayer sans contrainte de langue
          if (avecLang) setTimeout(() => doSpeak(false), 100)
        }
        synth.speak(utt)
      } catch {
        if (avecLang) setTimeout(() => doSpeak(false), 100)
      }
    }

    const voices = synth.getVoices()
    if (voices.length > 0) {
      doSpeak(true)
    } else {
      // Attendre que les voix se chargent (certains navigateurs TV sont lents)
      let done = false
      const fire = () => { if (!done) { done = true; doSpeak(true) } }
      synth.addEventListener('voiceschanged', fire, { once: true })
      setTimeout(fire, 500) // fallback si voiceschanged ne se déclenche pas
    }
  } catch {
    // speechSynthesis indisponible ou bloqué
  }
}

export default function DisplayPage({ params }: { params: { token: string } }) {
  const token = params.token

  const [entreprise, setEntreprise] = useState<EntrepriseDisplay | null>(null)
  const [visites, setVisites] = useState<VisiteDisplay[]>([])
  const [heureActuelle, setHeureActuelle] = useState<Date | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [lastFetch, setLastFetch] = useState<string>('')
  const [pollErreurs, setPollErreurs] = useState(0)
  const mountedRef = useRef(true)
  const chargerRef = useRef<() => void>(() => {})
  const abortRef = useRef<AbortController | null>(null)
  const prevVisiteIdsRef = useRef<Set<string>>(new Set())
  const initialisedRef = useRef(false)
  const audioActifRef = useRef(false)
  const [audioActif, setAudioActif] = useState(false)

  // Horloge
  useEffect(() => {
    setHeureActuelle(new Date())
    const t = setInterval(() => setHeureActuelle(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Rechargement automatique toutes les 5 min — garantit le dernier code déployé
  useEffect(() => {
    const t = setTimeout(() => window.location.reload(), 5 * 60 * 1000)
    return () => clearTimeout(t)
  }, [])

  // Désenregistrer tous les service workers sur la page display
  // Le SW cause des données périmées car il intercepte les requêtes API.
  // La page display n'a pas besoin de fonctionnement hors ligne.
  useEffect(() => {
    navigator.serviceWorker?.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister())
    }).catch(() => {})
  }, [])


  // Chargement des données — POST pour éviter tout cache CDN
  const charger = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const res = await fetch(
        `/api/display/${token}`,
        { method: 'POST', signal: ctrl.signal, cache: 'no-store' }
      )
      if (!mountedRef.current) return
      if (res.status === 404) { setNotFound(true); return }
      if (!res.ok) {
        console.error('[display] poll HTTP', res.status)
        setPollErreurs((n) => n + 1)
        return
      }
      const data: { entreprise: EntrepriseDisplay; visites: VisiteDisplay[]; _ts: number } = await res.json()
      if (!mountedRef.current) return
      setPollErreurs(0)
      setEntreprise(data.entreprise)
      const sorted = [...data.visites].sort((a, b) => {
        const pDiff = prioriteUrgence(a.niveau_urgence) - prioriteUrgence(b.niveau_urgence)
        if (pDiff !== 0) return pDiff
        // FIFO strict : le plus ancien en tête de liste
        return (a.heure_arrivee ?? '').localeCompare(b.heure_arrivee ?? '')
      })
      // Annoncer vocalement les nouveaux visiteurs
      const newIds = new Set(sorted.map(v => v.id))
      if (initialisedRef.current && audioActifRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
        for (const v of sorted) {
          if (!prevVisiteIdsRef.current.has(v.id)) {
            const nom = nomComplet(v.nom_visiteur, v.prenom_visiteur)
            let texte = `Bienvenue, ${nom}.`
            if (v.destinataire?.nom) {
              const dest = nomComplet(v.destinataire.nom, v.destinataire.prenom)
              texte += ` ${dest} va vous recevoir dans quelques instants.`
            }
            parlerTTS(texte)
          }
        }
      }
      prevVisiteIdsRef.current = newIds
      initialisedRef.current = true
      setVisites(sorted.slice(0, 12))
      setLastFetch(new Date().toLocaleTimeString('fr-CI', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('[display] poll err:', err)
        setPollErreurs((n) => n + 1)
      }
    }
  }, [token])

  // Garder chargerRef synchronisé pour accès depuis le callback broadcast
  useEffect(() => { chargerRef.current = charger }, [charger])

  // Polling de secours toutes les 2s
  useEffect(() => {
    mountedRef.current = true
    charger()
    const interval = setInterval(charger, 2_000)
    const onVisible = () => { if (document.visibilityState === 'visible') charger() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [charger])

  // Broadcast Realtime : rafraîchissement instantané + rechargement forcé depuis admin
  useEffect(() => {
    if (!entreprise?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`display-${entreprise.id}`)
      .on('broadcast', { event: 'nouveau_visiteur' }, () => {
        chargerRef.current()
      })
      .on('broadcast', { event: 'force_reload' }, () => {
        window.location.reload()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [entreprise?.id])

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="opacity-30 text-xs" style={{ color: texte }}>En direct</span>
          </div>
          <button
            onClick={() => {
              const next = !audioActif
              audioActifRef.current = next
              setAudioActif(next)
              if (next) {
                parlerTTS('Son activé.')
              } else {
                try { window.speechSynthesis?.cancel() } catch { /* */ }
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: audioActif ? `${overlay}0.12)` : `${overlay}0.06)`,
              color: texte,
              opacity: audioActif ? 0.8 : 0.35,
              border: `1px solid ${overlay}${audioActif ? '0.20' : '0.10'})`,
            }}
            title={audioActif ? 'Désactiver les annonces vocales' : 'Activer les annonces vocales'}
          >
            {audioActif ? '🔊' : '🔇'} <span>{audioActif ? 'Son actif' : 'Son coupé'}</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          {pollErreurs > 0 && (
            <span className="text-xs font-bold text-red-400">
              ⚠ {pollErreurs} erreur(s) de connexion
            </span>
          )}
          {lastFetch && (
            <span className="opacity-60 text-xs tabular-nums" style={{ color: texte }}>
              {visites.length} en attente · {lastFetch}
            </span>
          )}
          <p className="opacity-20" style={{ fontSize: 11, color: texte }}>
            Powered by VisitPro
          </p>
        </div>
      </footer>

      {/* ── OVERLAY ACTIVATION AUDIO ── */}
      {!audioActif && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 cursor-pointer"
          style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
          onClick={() => {
            audioActifRef.current = true
            setAudioActif(true)
            parlerTTS('Son activé. Bienvenue.')
          }}
        >
          <div
            className="text-center rounded-3xl"
            style={{
              padding: 'clamp(32px, 5vw, 80px) clamp(40px, 7vw, 120px)',
              backgroundColor: fond,
              border: `2px solid rgba(255,255,255,0.18)`,
              maxWidth: '70vw',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: 'clamp(60px, 8vw, 110px)', lineHeight: 1 }}>🔊</div>
            <p
              className="font-bold leading-snug mt-6"
              style={{ fontSize: 'clamp(20px, 2.8vw, 48px)', color: texte }}
            >
              Toucher l&apos;écran pour activer les annonces vocales
            </p>
            <p
              className="mt-4 opacity-55 leading-relaxed"
              style={{ fontSize: 'clamp(13px, 1.5vw, 24px)', color: texte }}
            >
              Les visiteurs seront annoncés à haute voix à leur arrivée
            </p>
            <div
              className="mt-8 inline-flex items-center gap-3 rounded-2xl font-semibold"
              style={{
                padding: 'clamp(12px, 1.5vw, 20px) clamp(24px, 3vw, 48px)',
                backgroundColor: '#22c55e',
                color: '#fff',
                fontSize: 'clamp(14px, 1.6vw, 26px)',
              }}
            >
              ▶ Activer le son
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
