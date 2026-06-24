'use client'

import { useEffect, useState, useCallback } from 'react'
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
  destinataire_prenom?: string
  destinataire_nom?: string
}

function prioriteUrgence(niveau: string): number {
  if (niveau === 'vip') return 0
  if (niveau === 'urgent') return 1
  return 2
}

interface EntrepriseDisplay {
  id: string
  nom: string
  logo_url?: string
  display_message: string
  display_couleur_fond: string
  display_couleur_texte: string
}

function nomComplet(nom: string, prenom?: string) {
  return prenom ? `${prenom} ${nom}` : nom
}

function civility(prenom?: string) {
  return prenom ? 'M./Mme' : 'M./Mme'
}

export default function DisplayPage({ params }: { params: { token: string } }) {
  const supabase = createClient()
  const [entreprise, setEntreprise] = useState<EntrepriseDisplay | null>(null)
  const [visites, setVisites] = useState<VisiteDisplay[]>([])
  const [heureActuelle, setHeureActuelle] = useState<Date | null>(null)
  const [notFound, setNotFound] = useState(false)

  const chargerEntreprise = useCallback(async (): Promise<string | undefined> => {
    const { data } = await supabase
      .from('entreprises')
      .select('id, nom, logo_url, display_message, display_couleur_fond, display_couleur_texte')
      .eq('display_token', params.token)
      .single()

    if (!data) { setNotFound(true); return undefined }
    setEntreprise(data as EntrepriseDisplay)
    return data.id
  }, [params.token])

  const chargerVisites = useCallback(async (entrepriseId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('visites')
      .select(`
        id, nom_visiteur, prenom_visiteur, organisation_visiteur,
        statut, niveau_urgence, ordre_file, heure_arrivee, temps_attente_estime,
        destinataire:utilisateurs!destinataire_id(prenom, nom)
      `)
      .eq('entreprise_id', entrepriseId)
      .in('statut', ['en_attente', 'acceptee'])
      .gte('heure_arrivee', today + 'T00:00:00')
      .limit(50)

    const mapped: VisiteDisplay[] = (data ?? []).map((v: any) => ({
      id: v.id,
      nom_visiteur: v.nom_visiteur,
      prenom_visiteur: v.prenom_visiteur,
      organisation_visiteur: v.organisation_visiteur,
      statut: v.statut,
      niveau_urgence: v.niveau_urgence ?? 'normal',
      ordre_file: v.ordre_file,
      heure_arrivee: v.heure_arrivee,
      temps_attente_estime: v.temps_attente_estime,
      destinataire_prenom: v.destinataire?.prenom,
      destinataire_nom: v.destinataire?.nom,
    }))

    // VIP → urgent → normal, puis ordre_file, puis heure_arrivee
    mapped.sort((a, b) => {
      const pDiff = prioriteUrgence(a.niveau_urgence) - prioriteUrgence(b.niveau_urgence)
      if (pDiff !== 0) return pDiff
      const aOrdre = a.ordre_file ?? 999999
      const bOrdre = b.ordre_file ?? 999999
      if (aOrdre !== bOrdre) return aOrdre - bOrdre
      return a.heure_arrivee.localeCompare(b.heure_arrivee)
    })

    setVisites(mapped.slice(0, 10))
  }, [])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    const init = async () => {
      const id = await chargerEntreprise()
      if (cancelled || !id) return
      await chargerVisites(id)
      if (cancelled) return

      channel = supabase
        .channel(`display-${params.token}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'visites',
          filter: `entreprise_id=eq.${id}`,
        }, () => { if (!cancelled) chargerVisites(id) })
        .subscribe()
    }

    init()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [params.token])

  // Horloge — initialisée côté client uniquement
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

  // Premier visiteur en attente (le plus ancien = premier arrivé)
  const visiteurActuel = visites[0] ?? null

  return (
    <div
      className="min-h-screen flex flex-col select-none overflow-hidden"
      style={{ backgroundColor: fond, color: texte }}
    >
      {/* ── HEADER : Logo + nom entreprise (15% hauteur) ── */}
      <header
        className="flex flex-col items-center justify-center"
        style={{ minHeight: '15vh', borderBottom: `1px solid rgba(255,255,255,0.12)` }}
      >
        {entreprise.logo_url ? (
          <img
            src={entreprise.logo_url}
            alt={entreprise.nom}
            className="h-16 w-auto object-contain mb-2"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl mb-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: texte }}
          >
            {entreprise.nom.charAt(0)}
          </div>
        )}
        <h1 className="text-xl font-semibold tracking-wide" style={{ color: texte }}>
          {entreprise.nom}
        </h1>
      </header>

      {/* ── HEURE + DATE ── */}
      <div className="flex flex-col items-center justify-center py-8" style={{ borderBottom: `1px solid rgba(255,255,255,0.12)` }}>
        <p
          className="font-light tabular-nums leading-none"
          style={{ fontSize: 'clamp(72px, 12vw, 140px)', color: texte }}
        >
          {heureActuelle?.toLocaleTimeString('fr-CI', { hour: '2-digit', minute: '2-digit' }) ?? '--:--'}
        </p>
        <p className="text-xl font-light opacity-70 mt-2 capitalize" style={{ color: texte }}>
          {heureActuelle?.toLocaleDateString('fr-CI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) ?? ''}
        </p>
      </div>

      {/* ── ZONE VISITEUR (50% hauteur) ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center text-center px-8"
        style={{ minHeight: '50vh' }}
      >
        {visiteurActuel ? (
          <>
            {/* "Bienvenue" petit */}
            <p
              className="text-lg font-light tracking-widest uppercase mb-6 opacity-70"
              style={{ color: texte }}
            >
              Bienvenue
            </p>

            {/* Nom complet très grand */}
            <p
              className="font-bold leading-tight mb-4"
              style={{
                fontSize: 'clamp(36px, 6vw, 72px)',
                color: texte,
                textShadow: '0 2px 12px rgba(0,0,0,0.2)',
              }}
            >
              {nomComplet(visiteurActuel.nom_visiteur, visiteurActuel.prenom_visiteur)}
            </p>

            {/* Organisation */}
            {visiteurActuel.organisation_visiteur && (
              <p
                className="text-2xl font-light opacity-80 mb-8"
                style={{ color: texte }}
              >
                {visiteurActuel.organisation_visiteur}
              </p>
            )}

            {/* Temps d'attente estimé */}
            {visiteurActuel.temps_attente_estime != null && visiteurActuel.temps_attente_estime > 0 && (
              <p className="text-lg font-light opacity-60 mb-4" style={{ color: texte }}>
                Environ {visiteurActuel.temps_attente_estime} minute{visiteurActuel.temps_attente_estime > 1 ? 's' : ''} d&apos;attente
              </p>
            )}

            {/* Message destinataire */}
            {visiteurActuel.destinataire_nom && (
              <div
                className="mt-2 px-8 py-4 rounded-2xl inline-block"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
              >
                <p className="text-xl font-light" style={{ color: texte }}>
                  {civility(visiteurActuel.destinataire_prenom)}{' '}
                  <strong>
                    {nomComplet(visiteurActuel.destinataire_nom, visiteurActuel.destinataire_prenom)}
                  </strong>{' '}
                  vous reçoit dans quelques instants
                </p>
              </div>
            )}

            {/* Nb de personnes en attente derrière */}
            {visites.length > 1 && (
              <p
                className="mt-8 text-sm opacity-40"
                style={{ color: texte }}
              >
                {visites.length - 1} autre{visites.length > 2 ? 's' : ''} personne{visites.length > 2 ? 's' : ''} en attente
              </p>
            )}
          </>
        ) : (
          /* Aucun visiteur : message générique */
          <p
            className="font-light opacity-80 text-center leading-relaxed"
            style={{ fontSize: 'clamp(22px, 3vw, 40px)', color: texte, maxWidth: '70%' }}
          >
            {entreprise.display_message}
          </p>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer
        className="flex items-center justify-between px-10 py-4"
        style={{ borderTop: `1px solid rgba(255,255,255,0.08)` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-green-400 animate-pulse"
          />
          <span className="opacity-30 text-xs" style={{ color: texte }}>En direct</span>
        </div>
        <p className="opacity-20" style={{ fontSize: 11, color: texte }}>
          Powered by VisitPro
        </p>
      </footer>
    </div>
  )
}
