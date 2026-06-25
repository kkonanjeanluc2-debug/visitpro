'use client'

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { queryCache } from '@/lib/queryCache'
import NotifVisite from '@/components/dashboard/NotifVisite'
import FileAttente from '@/components/dashboard/FileAttente'
import KpiGrid from '@/components/dashboard/KpiGrid'
import { trierFileAttente } from '@/lib/fileAttente'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { nomComplet } from '@/lib/utils'
import { jouerSon, initialiserAudio } from '@/lib/sound'
import type { Visite, DashboardStats, Utilisateur, Site } from '@/types'

type Periode = 'today' | '7j' | '30j' | 'custom'
type DashCache = { attente: Visite[]; enCours: Visite[]; stats: DashboardStats }

const DEFAULT_STATS: DashboardStats = {
  visites_aujourd_hui: 0, visites_en_attente: 0, visites_acceptees: 0,
  visites_declinee: 0, temps_attente_moyen: 0, rdv_aujourd_hui: 0, rdv_a_venir: 0,
}

export default function DashboardPage() {
  const { utilisateur } = useAuth()
  const supabase = createClient()

  // ── États (vides au départ pour cohérence SSR/client) ────────────────────
  const [visitesEnAttente, setVisitesEnAttente] = useState<Visite[]>([])
  const [visitesEnCours,   setVisitesEnCours]   = useState<Visite[]>([])
  const [stats,            setStats]            = useState<DashboardStats>(DEFAULT_STATS)
  const [loading,          setLoading]          = useState(true)
  const [collaborateurs,   setCollaborateurs]   = useState<Utilisateur[]>([])
  const [sites,            setSites]            = useState<Site[]>([])

  // Charger depuis le cache avant le premier paint (client uniquement)
  const initKey = `dash:${utilisateur?.entreprise_id}:${utilisateur?.site_id ?? ''}:today`
  useLayoutEffect(() => {
    const cached = queryCache.get<DashCache>(initKey)
    if (cached) {
      setVisitesEnAttente(cached.attente)
      setVisitesEnCours(cached.enCours)
      setStats(cached.stats)
      setLoading(false)
    }
    const cachedCollabs = queryCache.get<Utilisateur[]>(`collabs:${utilisateur?.id}`)
    if (cachedCollabs) setCollaborateurs(cachedCollabs)
    const cachedSites = queryCache.get<Site[]>(`sites:${utilisateur?.entreprise_id}`)
    if (cachedSites) setSites(cachedSites)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [periode,         setPeriode]         = useState<Periode>('today')
  const [dateDebut,       setDateDebut]       = useState('')
  const [dateFin,         setDateFin]         = useState('')
  const [siteSelectionne, setSiteSelectionne] = useState<string>(utilisateur?.site_id ?? '')
  const [redirVisite,     setRedirVisite]     = useState<Visite | null>(null)
  const [vueFile,         setVueFile]         = useState(false)
  const [nouveauDest,     setNouveauDest]     = useState('')
  const [visitesNouvelles, setVisitesNouvelles] = useState<Set<string>>(new Set())

  // ── Chargement principal ─────────────────────────────────────────────────
  const charger = useCallback(async () => {
    if (!utilisateur) return
    const today = new Date().toISOString().split('T')[0]
    const isPrimaire = ['patron', 'admin'].includes(utilisateur.role)

    const siteIdEffectif = isPrimaire
      ? (siteSelectionne || undefined)
      : (utilisateur.site_id || undefined)

    const getDateBorne = () => {
      const d = new Date()
      if (periode === 'today') return today
      if (periode === '7j')  { d.setDate(d.getDate() - 6);  return d.toISOString().split('T')[0] }
      if (periode === '30j') { d.setDate(d.getDate() - 29); return d.toISOString().split('T')[0] }
      if (periode === 'custom' && dateDebut) return dateDebut
      return today
    }
    const dateBorne   = getDateBorne()
    const dateFinBorne = periode === 'custom' && dateFin ? dateFin : today
    const cacheKey = `dash:${utilisateur.entreprise_id}:${siteIdEffectif ?? ''}:${periode}:${dateBorne}:${dateFinBorne}`

    // Afficher le cache instantanément si disponible
    const cached = queryCache.get<DashCache>(cacheKey)
    if (cached) {
      setVisitesEnAttente(cached.attente)
      setVisitesEnCours(cached.enCours)
      setStats(cached.stats)
      setLoading(false)
    }

    // Construire toutes les requêtes
    let qAttente = supabase
      .from('visites')
      .select('*, visiteur:visiteurs(*), destinataire:utilisateurs!destinataire_id(id,nom,prenom,poste)')
      .eq('entreprise_id', utilisateur.entreprise_id)
      .eq('statut', 'en_attente')
      .gte('heure_arrivee', dateBorne)
      .lte('heure_arrivee', dateFinBorne + 'T23:59:59')
      .order('niveau_urgence', { ascending: false })
      .order('heure_arrivee',  { ascending: false })

    let qEnCours = supabase
      .from('visites')
      .select('*, visiteur:visiteurs(*), destinataire:utilisateurs!destinataire_id(id,nom,prenom,poste)')
      .eq('entreprise_id', utilisateur.entreprise_id)
      .in('statut', ['acceptee', 'en_cours'])
      .gte('heure_arrivee', today)
      .order('heure_arrivee', { ascending: true })

    // Patron/admin voient toutes les visites de leur périmètre.
    // Les collaborateurs ne voient que leurs propres visites (sauf si gestion_visites ou responsable_site).
    if (!isPrimaire && !utilisateur.permissions?.gestion_visites && !utilisateur.permissions?.responsable_site) {
      qAttente = qAttente.eq('destinataire_id', utilisateur.id)
      qEnCours = qEnCours.eq('destinataire_id', utilisateur.id)
    }
    if (siteIdEffectif) {
      qAttente = qAttente.eq('site_id', siteIdEffectif)
      qEnCours = qEnCours.eq('site_id', siteIdEffectif)
    }

    let qStats = supabase
      .from('visites')
      .select('statut, duree_attente')
      .eq('entreprise_id', utilisateur.entreprise_id)
      .gte('heure_arrivee', today)
    if (siteIdEffectif) qStats = qStats.eq('site_id', siteIdEffectif)

    let qRdvJour = supabase
      .from('rendez_vous')
      .select('id')
      .eq('entreprise_id', utilisateur.entreprise_id)
      .eq('date_rdv', today)
      .neq('statut', 'annule')
    if (siteIdEffectif) qRdvJour = qRdvJour.eq('site_id', siteIdEffectif)

    let qRdvAvenir = supabase
      .from('rendez_vous')
      .select('id', { count: 'exact', head: true })
      .eq('entreprise_id', utilisateur.entreprise_id)
      .gt('date_rdv', today)
      .neq('statut', 'annule')
    if (siteIdEffectif) qRdvAvenir = qRdvAvenir.eq('site_id', siteIdEffectif)

    // Toutes les requêtes en parallèle
    const [
      { data: attente },
      { data: enCours },
      { data: toutesVisites },
      { data: rdvJour },
      { count: rdvAVenir },
    ] = await Promise.all([qAttente, qEnCours, qStats, qRdvJour, qRdvAvenir])

    const durees = (toutesVisites ?? []).filter(v => v.duree_attente).map(v => v.duree_attente as number)
    const freshStats: DashboardStats = {
      visites_aujourd_hui: toutesVisites?.length ?? 0,
      visites_en_attente:  toutesVisites?.filter(v => v.statut === 'en_attente').length ?? 0,
      visites_acceptees:   toutesVisites?.filter(v => ['acceptee','en_cours'].includes(v.statut)).length ?? 0,
      visites_declinee:    toutesVisites?.filter(v => v.statut === 'declinee').length ?? 0,
      temps_attente_moyen: durees.length ? Math.round(durees.reduce((a,b) => a+b,0)/durees.length) : 0,
      rdv_aujourd_hui:     rdvJour?.length ?? 0,
      rdv_a_venir:         rdvAVenir ?? 0,
    }

    // Mettre en cache pour la prochaine visite
    queryCache.set(cacheKey, { attente: attente ?? [], enCours: enCours ?? [], stats: freshStats })

    setVisitesEnAttente(attente ?? [])
    setVisitesEnCours(enCours ?? [])
    setStats(freshStats)
    setLoading(false)
  }, [utilisateur, periode, dateDebut, dateFin, siteSelectionne])

  useEffect(() => { charger() }, [charger])
  useEffect(() => initialiserAudio(), [])

  const chargerRef = useRef(charger)
  useEffect(() => { chargerRef.current = charger }, [charger])

  // Realtime
  useEffect(() => {
    if (!utilisateur) return
    let premierChargement = true
    const channel = supabase
      .channel(`dashboard-${utilisateur.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visites', filter: `entreprise_id=eq.${utilisateur.entreprise_id}` },
        (payload) => {
          chargerRef.current()
          if (!premierChargement) {
            if (payload.eventType === 'INSERT') jouerSon('nouvelle_visite')
            else jouerSon('changement_statut')
          }
        })
      .subscribe()
    const t = setTimeout(() => { premierChargement = false }, 2000)
    return () => { clearTimeout(t); supabase.removeChannel(channel) }
  }, [utilisateur?.id])

  // Sites (avec cache)
  useEffect(() => {
    if (!utilisateur || !['patron', 'admin'].includes(utilisateur.role)) return
    const key = `sites:${utilisateur.entreprise_id}`
    supabase.from('sites').select('*').eq('entreprise_id', utilisateur.entreprise_id).eq('actif', true).order('nom')
      .then(({ data }) => { setSites(data ?? []); queryCache.set(key, data ?? []) })
  }, [utilisateur?.id])

  // Collaborateurs pour redirection (avec cache)
  useEffect(() => {
    if (!utilisateur) return
    const key = `collabs:${utilisateur.id}`
    let q = supabase.from('utilisateurs').select('*')
      .eq('entreprise_id', utilisateur.entreprise_id).eq('actif', true)
      .neq('id', utilisateur.id).in('role', ['collaborateur','patron','admin']).order('nom')
    if (utilisateur.site_id) q = q.eq('site_id', utilisateur.site_id)
    q.then(({ data }) => { setCollaborateurs(data ?? []); queryCache.set(key, data ?? []) })
  }, [utilisateur?.id, utilisateur?.site_id])

  // Flash animation nouvelles visites
  useEffect(() => {
    const ids = new Set(visitesEnAttente.map(v => v.id))
    setVisitesNouvelles(ids)
    const t = setTimeout(() => setVisitesNouvelles(new Set()), 5000)
    return () => clearTimeout(t)
  }, [visitesEnAttente.length])

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDecision = async (visiteId: string, decision: 'acceptee' | 'declinee', note?: string) => {
    const updates: Record<string, unknown> = {
      statut: decision, decision_par: utilisateur!.id,
      decision_at: new Date().toISOString(), note_decision: note ?? null,
    }
    if (decision === 'acceptee') {
      const now = new Date()
      updates.heure_entree = now.toISOString()
      const visite = visitesEnAttente.find(v => v.id === visiteId)
      if (visite?.heure_arrivee) {
        updates.duree_attente = Math.round((now.getTime() - new Date(visite.heure_arrivee).getTime()) / 60000)
      }
    }
    await supabase.from('visites').update(updates).eq('id', visiteId)

    const visite = visitesEnAttente.find(v => v.id === visiteId)
    if (visite) {
      const { data: secs } = await supabase.from('utilisateurs').select('id')
        .eq('entreprise_id', utilisateur!.entreprise_id).eq('role', 'secretaire')
      for (const sec of secs ?? []) {
        await supabase.from('notifications').insert({
          entreprise_id: utilisateur!.entreprise_id, destinataire_id: sec.id,
          type: 'decision_prise', visite_id: visiteId,
          titre: decision === 'acceptee' ? 'Visiteur autorisé à entrer' : 'Visiteur décliné',
          corps: `${nomComplet(visite.nom_visiteur, visite.prenom_visiteur ?? undefined)} — ${decision === 'acceptee' ? 'Peut entrer' : (note ?? 'Décliné')}`,
        })
      }
    }
    charger()
  }

  const handleTerminer = async (visiteId: string) => {
    const heureSortie = new Date()
    const visite = visitesEnCours.find(v => v.id === visiteId)
    const dureeVisite = visite?.heure_entree
      ? Math.round((heureSortie.getTime() - new Date(visite.heure_entree).getTime()) / 60000)
      : null
    await supabase.from('visites').update({
      statut: 'terminee', heure_sortie: heureSortie.toISOString(), duree_visite: dureeVisite,
    }).eq('id', visiteId)
    charger()
  }

  const handleRediriger = async () => {
    if (!redirVisite || !nouveauDest) return
    await supabase.from('visites').update({
      destinataire_id: nouveauDest,
      statut: 'en_attente',
      note_decision: `Redirigé par ${nomComplet(utilisateur!.nom, utilisateur!.prenom)}`,
    }).eq('id', redirVisite.id)
    await supabase.from('notifications').insert({
      entreprise_id: utilisateur!.entreprise_id, destinataire_id: nouveauDest,
      type: 'redirection', visite_id: redirVisite.id,
      titre: `Visite redirigée : ${nomComplet(redirVisite.nom_visiteur, redirVisite.prenom_visiteur ?? undefined)}`,
      corps: redirVisite.motif,
    })
    setRedirVisite(null); setNouveauDest('')
    charger()
  }

  if (!utilisateur) return null

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Bonjour */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {utilisateur.prenom} 👋</h1>
          <p className="text-gray-500 mt-1 capitalize">{utilisateur.poste ?? utilisateur.role}</p>
        </div>

        {['patron','admin'].includes(utilisateur.role) && sites.length > 1 && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <select value={siteSelectionne} onChange={e => setSiteSelectionne(e.target.value)}
              className="text-sm font-medium text-gray-700 focus:outline-none bg-transparent cursor-pointer">
              <option value="">Tous les sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
            {siteSelectionne && (
              <button onClick={() => setSiteSelectionne('')} className="text-gray-400 hover:text-gray-600 ml-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        )}

        {!['patron','admin'].includes(utilisateur.role) && utilisateur.site_id && (
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl px-3 py-2 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {(utilisateur.site as unknown as { nom: string })?.nom ?? 'Mon site'}
          </div>
        )}
      </div>

      <KpiGrid stats={stats} loading={loading} />

      {visitesEnCours.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Visites en cours</h2>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-sm font-bold rounded-full">{visitesEnCours.length}</span>
          </div>
          <div className="space-y-4">
            {visitesEnCours.map(visite => (
              <NotifVisite key={visite.id} visite={visite} isNew={false}
                onDecision={handleDecision} onRediriger={v => setRedirVisite(v)} onTerminer={handleTerminer}
                utilisateur={utilisateur ?? undefined} />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            Visiteurs en attente
            {visitesEnAttente.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-sm font-bold rounded-full">{visitesEnAttente.length}</span>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle vue file */}
            {visitesEnAttente.length > 0 && (
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setVueFile(false)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${!vueFile ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >Liste</button>
                <button
                  onClick={() => setVueFile(true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${vueFile ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >File</button>
              </div>
            )}
            {(['today','7j','30j','custom'] as Periode[]).map(p => (
              <button key={p}
                onClick={() => { setPeriode(p); if (p !== 'custom') { setDateDebut(''); setDateFin('') } }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${periode === p ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                {p === 'today' ? "Aujourd'hui" : p === '7j' ? '7 derniers jours' : p === '30j' ? '30 derniers jours' : 'Personnalisé'}
              </button>
            ))}
            {periode === 'custom' && (
              <div className="flex items-center gap-2 mt-1 w-full sm:w-auto">
                <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                  max={dateFin || new Date().toISOString().split('T')[0]}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <span className="text-xs text-gray-400">→</span>
                <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                  min={dateDebut} max={new Date().toISOString().split('T')[0]}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-40" />)}
          </div>
        ) : visitesEnAttente.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">Aucun visiteur en attente</p>
            <p className="text-sm mt-1">
              {periode === 'today' ? "Les nouvelles visites apparaîtront ici en temps réel"
                : periode === '7j' ? "Aucune visite en attente sur les 7 derniers jours"
                : periode === '30j' ? "Aucune visite en attente sur les 30 derniers jours"
                : "Aucune visite en attente sur la période sélectionnée"}
            </p>
          </div>
        ) : vueFile ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <FileAttente
              visites={visitesEnAttente}
              entrepriseId={utilisateur!.entreprise_id}
              onOrdreChange={charger}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const tries = trierFileAttente(visitesEnAttente)
              return tries.map((visite, idx) => (
                <NotifVisite key={visite.id} visite={visite} isNew={visitesNouvelles.has(visite.id)}
                  rang={idx + 1}
                  onDecision={handleDecision} onRediriger={v => setRedirVisite(v)} onTerminer={handleTerminer}
                  utilisateur={utilisateur ?? undefined} />
              ))
            })()}
          </div>
        )}
      </div>

      <Modal isOpen={!!redirVisite} onClose={() => { setRedirVisite(null); setNouveauDest('') }}
        title="Rediriger ce visiteur" size="sm"
        footer={
          <>
            <button onClick={() => setRedirVisite(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button onClick={handleRediriger} disabled={!nouveauDest}
              className="px-4 py-2 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">Rediriger</button>
          </>
        }>
        <p className="text-sm text-gray-600 mb-4">
          Choisissez le collaborateur vers qui rediriger{' '}
          <strong>{redirVisite ? nomComplet(redirVisite.nom_visiteur, redirVisite.prenom_visiteur ?? undefined) : ''}</strong>
        </p>
        <Select label="Nouveau destinataire" value={nouveauDest} onChange={e => setNouveauDest(e.target.value)}
          options={collaborateurs.map(c => ({ value: c.id, label: `${nomComplet(c.nom, c.prenom)}${c.poste ? ` — ${c.poste}` : ''}` }))}
          placeholder="Choisir un collaborateur" />
      </Modal>
    </div>
  )
}
