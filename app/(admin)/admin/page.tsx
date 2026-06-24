'use client'

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import type { Entreprise, Plan, Abonnement, Site, Utilisateur } from '@/types'
import { PLANS } from '@/types'
import { formatDate, libelleRole } from '@/lib/utils'
import { applyTheme } from '@/lib/theme'
import Link from 'next/link'
import AbonnementSection from '@/components/admin/AbonnementSection'

// ─── Secteurs ────────────────────────────────────────────────────────────────
const SECTEURS = [
  { value: 'Juridique', label: 'Juridique / Notariat' },
  { value: 'BTP', label: 'BTP / Construction' },
  { value: 'Commerce', label: 'Commerce / Distribution' },
  { value: 'Finance', label: 'Finance / Banque' },
  { value: 'Santé', label: 'Santé / Médical' },
  { value: 'Education', label: 'Éducation / Formation' },
  { value: 'Industrie', label: 'Industrie / Production' },
  { value: 'Services', label: 'Services aux entreprises' },
  { value: 'Technologie', label: 'Technologie / IT' },
  { value: 'Autre', label: 'Autre' },
]

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = 'entreprise' | 'sites' | 'equipe' | 'abonnement' | 'securite' | 'notifications' | 'apparence'

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: 'entreprise', label: 'Entreprise',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
  {
    id: 'sites', label: 'Sites',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    id: 'equipe', label: 'Équipe',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    id: 'abonnement', label: 'Abonnement',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  },
  {
    id: 'securite', label: 'Sécurité',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  },
  {
    id: 'notifications', label: 'Notifications',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  },
  {
    id: 'apparence', label: 'Apparence',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
  },
]

// ─── Composant Toggle ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-primary' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ParametresPage() {
  const { utilisateur } = useAuth()
  const supabase = createClient()
  const [section, setSection] = useState<Section>('entreprise')

  // Entreprise
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [loadingEntreprise, setLoadingEntreprise] = useState(true)
  const [nom, setNom] = useState('')
  const [secteur, setSecteur] = useState('')
  const [adresse, setAdresse] = useState('')
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')
  const [savingEntreprise, setSavingEntreprise] = useState(false)
  const [succesEntreprise, setSuccesEntreprise] = useState(false)

  // Sécurité
  const [ancienMdp, setAncienMdp] = useState('')
  const [nouveauMdp, setNouveauMdp] = useState('')
  const [confirmMdp, setConfirmMdp] = useState('')
  const [savingMdp, setSavingMdp] = useState(false)
  const [erreurMdp, setErreurMdp] = useState('')
  const [succesMdp, setSuccesMdp] = useState(false)
  const [showMdp, setShowMdp] = useState(false)

  // Notifications — préférences personnelles
  const [notifNavigateur, setNotifNavigateur] = useState(true)
  const [notifEmail, setNotifEmail] = useState(false)
  const [notifSon, setNotifSon] = useState(true)
  // Notifications — config canal entreprise (Maileroo + WhatsApp simple)
  const [canalNotif, setCanalNotif] = useState<'email' | 'whatsapp_simple' | 'email_et_whatsapp'>('email')
  const [nomExpediteur, setNomExpediteur] = useState('VisitPro')
  const [savingNotif, setSavingNotif] = useState(false)
  const [succesNotif, setSuccesNotif] = useState(false)
  const [testEmailLoading, setTestEmailLoading] = useState(false)
  const [testEmailResultat, setTestEmailResultat] = useState<'ok' | 'erreur' | null>(null)

  // Apparence
  const [langue, setLangue] = useState('fr')
  const [dateFormat, setDateFormat] = useState('dd/mm/yyyy')
  const [fuseau, setFuseau] = useState('Africa/Abidjan')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')
  const [couleurPrimaire, setCouleurPrimaire] = useState('#1E3A5F')
  const [couleurAccent, setCouleurAccent] = useState('#1D9E75')
  const [savingCouleurs, setSavingCouleurs] = useState(false)
  const [succesCouleurs, setSuccesCouleurs] = useState(false)

  // Abonnement
  const [abonnement, setAbonnement] = useState<Abonnement | null>(null)
  const planActuel = PLANS[(abonnement?.plan ?? entreprise?.plan ?? 'starter') as Plan]

  // Sites
  const [sites, setSites] = useState<Site[]>([])
  const [loadingSites, setLoadingSites] = useState(false)
  const [modalSite, setModalSite] = useState<'add' | 'edit' | null>(null)
  const [siteEdite, setSiteEdite] = useState<Site | null>(null)
  const [siteNom, setSiteNom] = useState('')
  const [siteAdresse, setSiteAdresse] = useState('')
  const [siteTel, setSiteTel] = useState('')
  const [siteResponsableId, setSiteResponsableId] = useState('')
  const [savingSite, setSavingSite] = useState(false)
  const [collaborateurs, setCollaborateurs] = useState<Utilisateur[]>([])
  const [confirmSuppSite, setConfirmSuppSite] = useState<Site | null>(null)

  useEffect(() => {
    if (utilisateur?.entreprise_id) { chargerEntreprise(); chargerAbonnement(); chargerSites() }
    // Restore saved preferences
    const savedTheme = (localStorage.getItem('visitpro-theme') ?? 'light') as 'light'|'dark'|'system'
    setTheme(savedTheme)
    setLangue(localStorage.getItem('visitpro-langue') ?? 'fr')
    setDateFormat(localStorage.getItem('visitpro-date-fmt') ?? 'dd/mm/yyyy')
    setFuseau(localStorage.getItem('visitpro-fuseau') ?? 'Africa/Abidjan')
  }, [utilisateur?.entreprise_id])

  // Applique le thème dès que les couleurs changent (prévisualisation en temps réel)
  useEffect(() => {
    applyTheme(couleurPrimaire, couleurAccent)
  }, [couleurPrimaire, couleurAccent])

  const appliquerTheme = useCallback((t: 'light' | 'dark' | 'system') => {
    setTheme(t)
    localStorage.setItem('visitpro-theme', t)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (t === 'dark' || (t === 'system' && prefersDark)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const chargerAbonnement = async () => {
    const { data } = await supabase
      .from('abonnements')
      .select('*')
      .eq('entreprise_id', utilisateur!.entreprise_id)
      .eq('statut', 'actif')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setAbonnement(data)
  }

  // ── Gestion des sites ──────────────────────────────────────────────────────
  const chargerSites = async () => {
    setLoadingSites(true)
    const isResponsSite = utilisateur?.permissions?.responsable_site === true && utilisateur?.role === 'collaborateur'
    let sitesQuery = supabase.from('sites').select('*, responsable:responsable_id(id,nom,prenom,poste)')
      .eq('entreprise_id', utilisateur!.entreprise_id).order('created_at')
    if (isResponsSite && utilisateur?.site_id) {
      sitesQuery = sitesQuery.eq('id', utilisateur.site_id)
    }
    const [{ data: sitesData }, { data: collabData }] = await Promise.all([
      sitesQuery,
      supabase.from('utilisateurs').select('id,nom,prenom,poste,role')
        .eq('entreprise_id', utilisateur!.entreprise_id).eq('actif', true),
    ])
    setSites(sitesData ?? [])
    setCollaborateurs((collabData ?? []) as unknown as Utilisateur[])
    setLoadingSites(false)
  }

  const ouvrirModalSite = (site?: Site) => {
    if (site) {
      setSiteEdite(site)
      setSiteNom(site.nom)
      setSiteAdresse(site.adresse ?? '')
      setSiteTel(site.telephone ?? '')
      setSiteResponsableId(site.responsable_id ?? '')
      setModalSite('edit')
    } else {
      setSiteEdite(null)
      setSiteNom(''); setSiteAdresse(''); setSiteTel(''); setSiteResponsableId('')
      setModalSite('add')
    }
  }

  const sauvegarderSite = async () => {
    if (!siteNom.trim()) return
    setSavingSite(true)
    const payload = {
      nom: siteNom.trim(),
      adresse: siteAdresse.trim() || null,
      telephone: siteTel.trim() || null,
      responsable_id: siteResponsableId || null,
    }
    if (siteEdite) {
      await supabase.from('sites').update(payload).eq('id', siteEdite.id)
    } else {
      await supabase.from('sites').insert({ ...payload, entreprise_id: utilisateur!.entreprise_id })
    }
    setSavingSite(false)
    setModalSite(null)
    chargerSites()
  }

  const toggleActifSite = async (site: Site) => {
    await supabase.from('sites').update({ actif: !site.actif }).eq('id', site.id)
    chargerSites()
  }

  const supprimerSite = async (site: Site) => {
    await fetch('/api/sites/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: site.id }),
    })
    setConfirmSuppSite(null)
    chargerSites()
  }

  const chargerEntreprise = async () => {
    const { data } = await supabase
      .from('entreprises')
      .select('*')
      .eq('id', utilisateur!.entreprise_id)
      .single()
    if (data) {
      setEntreprise(data)
      setNom(data.nom)
      setSecteur(data.secteur ?? '')
      setAdresse(data.adresse ?? '')
      setTelephone(data.telephone ?? '')
      setEmail(data.email ?? '')
      // Config notifications
      setCanalNotif(data.canal_notif ?? 'email')
      setNomExpediteur(data.nom_expediteur ?? 'VisitPro')
      // Couleurs
      const prim = data.couleur_primaire ?? '#1E3A5F'
      const acc  = data.couleur_accent   ?? '#1D9E75'
      setCouleurPrimaire(prim)
      setCouleurAccent(acc)
      applyTheme(prim, acc)
    }
    setLoadingEntreprise(false)
  }

  const sauvegarderEntreprise = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingEntreprise(true)
    await supabase.from('entreprises').update({
      nom, secteur: secteur || null,
      adresse: adresse || null,
      telephone: telephone || null,
      email: email || null,
    }).eq('id', utilisateur!.entreprise_id)
    setSavingEntreprise(false)
    setSuccesEntreprise(true)
    setTimeout(() => setSuccesEntreprise(false), 3000)
  }

  const changerMotDePasse = async (e: React.FormEvent) => {
    e.preventDefault()
    setErreurMdp('')
    if (nouveauMdp.length < 8) { setErreurMdp('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (nouveauMdp !== confirmMdp) { setErreurMdp('Les mots de passe ne correspondent pas.'); return }
    setSavingMdp(true)
    const { error } = await supabase.auth.updateUser({ password: nouveauMdp })
    setSavingMdp(false)
    if (error) { setErreurMdp('Erreur : ' + error.message); return }
    setSuccesMdp(true)
    setAncienMdp(''); setNouveauMdp(''); setConfirmMdp('')
    setTimeout(() => setSuccesMdp(false), 4000)
  }

  if (!utilisateur) return null

  const isResponsableSite = utilisateur.permissions?.responsable_site === true && utilisateur.role === 'collaborateur'
  // Sections visibles selon le rôle
  const sectionsVisibles = SECTIONS.filter(s => {
    if (isResponsableSite && s.id === 'abonnement') return false
    return true
  })

  // Pill des onglets settings — py-2.5 + text-sm = 40px, gap-0.5 = 2px
  const SETTING_H = 40
  const SETTING_GAP = 2
  const activeSectionIdx = sectionsVisibles.findIndex((s) => s.id === section)

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        {isResponsableSite && (
          <span className="px-2.5 py-1 bg-accent/10 text-accent text-xs font-semibold rounded-full border border-accent/20">
            Responsable — {utilisateur.site?.nom ?? 'Mon site'}
          </span>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── Navigation latérale ──────────────────────────────────── */}
        <aside className="lg:w-52 flex-shrink-0">
          {/* Mobile : scroll horizontal avec pill animé */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {sectionsVisibles.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                  ${section === s.id
                    ? 'bg-primary text-white shadow-sm scale-[1.03]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                  }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>

          {/* Desktop : liste verticale avec pill glissant */}
          <nav className="hidden lg:flex relative flex-col gap-0.5 bg-white border border-gray-200 rounded-2xl p-2">
            {/* Sliding pill — fixed at top:8px, moved via translateY (GPU-accelerated) */}
            <div
              aria-hidden
              className="absolute left-2 right-2 rounded-xl z-0 pointer-events-none"
              style={{
                top: 8,
                height: SETTING_H,
                transform: `translateY(${activeSectionIdx * (SETTING_H + SETTING_GAP)}px)`,
                transition: 'transform 280ms cubic-bezier(0.34,1.2,0.64,1)',
                backgroundColor: 'rgba(30, 58, 95, 0.1)',
              }}
            />
            {sectionsVisibles.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`relative z-10 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left w-full
                  ${section === s.id ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ─── Contenu avec fade-in ──────────────────────────────────── */}
        <div key={section} className="flex-1 min-w-0 animate-section-in">

          {/* ══════ ENTREPRISE ══════ */}
          {section === 'entreprise' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">Informations de l&apos;entreprise</h2>
                <p className="text-xs text-gray-500 mt-0.5">Ces informations apparaissent sur vos documents et badges visiteurs.</p>
              </div>

              {succesEntreprise && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Modifications enregistrées avec succès.
                </div>
              )}

              {loadingEntreprise ? (
                <div className="space-y-3 animate-pulse">
                  {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}
                </div>
              ) : (
                <form onSubmit={sauvegarderEntreprise} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nom de l&apos;entreprise *</label>
                    <input value={nom} onChange={e => setNom(e.target.value)} required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Secteur d&apos;activité</label>
                    <select value={secteur} onChange={e => setSecteur(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                      <option value="">— Choisir un secteur —</option>
                      {SECTEURS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                    <input value={adresse} onChange={e => setAdresse(e.target.value)}
                      placeholder="Quartier, Commune, Ville"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                      <input value={telephone} onChange={e => setTelephone(e.target.value)} type="tel"
                        placeholder="+225 07..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                      <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                        placeholder="contact@entreprise.ci"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>

                  <button type="submit" disabled={savingEntreprise}
                    className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
                    {savingEntreprise ? 'Enregistrement…' : 'Enregistrer les modifications'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ══════ SITES ══════ */}
          {section === 'sites' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Gestion des sites</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Gérez vos établissements, agences et succursales.</p>
                  </div>
                  {!isResponsableSite && (
                    <button onClick={() => { ouvrirModalSite(); chargerSites() }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Nouveau site
                    </button>
                  )}
                </div>
              </div>

              {loadingSites ? (
                <div className="space-y-3">
                  {[1,2].map(i => <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-24" />)}
                </div>
              ) : sites.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                  <p className="text-sm text-gray-500">Aucun site configuré</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sites.map((site) => (
                    <div key={site.id} className={`bg-white border rounded-2xl p-4 transition-all ${site.actif ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${site.actif ? 'bg-primary/10' : 'bg-gray-100'}`}>
                            <svg className={`w-5 h-5 ${site.actif ? 'text-primary' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-gray-900">{site.nom}</p>
                              {!site.actif && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">Inactif</span>}
                            </div>
                            {site.adresse && <p className="text-xs text-gray-500 mt-0.5">{site.adresse}</p>}
                            {site.telephone && (
                              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                {site.telephone}
                              </p>
                            )}
                            {(site.responsable as any) && (
                              <p className="text-xs text-primary mt-1 font-medium">
                                Responsable : {(site.responsable as any).prenom} {(site.responsable as any).nom}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => ouvrirModalSite(site)}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Modifier">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          {!isResponsableSite && (
                            <>
                              <button onClick={() => toggleActifSite(site)}
                                className={`p-1.5 rounded-lg transition-colors ${site.actif ? 'text-gray-400 hover:text-amber-500 hover:bg-amber-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
                                title={site.actif ? 'Désactiver' : 'Activer'}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {site.actif
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  }
                                </svg>
                              </button>
                              {sites.length > 1 && (
                                <button onClick={() => setConfirmSuppSite(site)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Modal ajout/édition site */}
              {modalSite && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalSite(null)} />
                  <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <h3 className="text-sm font-bold text-gray-900">{modalSite === 'add' ? 'Nouveau site' : 'Modifier le site'}</h3>
                      <button onClick={() => setModalSite(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nom du site *</label>
                        <input value={siteNom} onChange={e => setSiteNom(e.target.value)} placeholder="Ex: Siège Social, Agence Plateau…"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                        <input value={siteAdresse} onChange={e => setSiteAdresse(e.target.value)} placeholder="Quartier, Commune, Ville"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                        <input value={siteTel} onChange={e => setSiteTel(e.target.value)} placeholder="+225 07…" type="tel"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Responsable du site</label>
                        <select value={siteResponsableId} onChange={e => setSiteResponsableId(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                          <option value="">— Aucun responsable —</option>
                          {collaborateurs.map(c => (
                            <option key={c.id} value={c.id}>{c.prenom} {c.nom} {c.poste ? `(${c.poste})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="px-5 pb-5 flex gap-2 border-t border-gray-100 pt-3">
                      <button onClick={() => setModalSite(null)}
                        className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                        Annuler
                      </button>
                      <button onClick={sauvegarderSite} disabled={savingSite || !siteNom.trim()}
                        className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
                        {savingSite ? 'Enregistrement…' : modalSite === 'add' ? 'Créer le site' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation suppression */}
              {confirmSuppSite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmSuppSite(null)} />
                  <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Supprimer «&nbsp;{confirmSuppSite.nom}&nbsp;»&nbsp;?</h3>
                    <p className="text-xs text-gray-500 mb-4">Cette action est irréversible. Tous les utilisateurs, visites et rendez-vous liés à ce site seront définitivement supprimés.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmSuppSite(null)}
                        className="flex-1 py-2 border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                        Annuler
                      </button>
                      <button onClick={() => supprimerSite(confirmSuppSite)}
                        className="flex-1 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors">
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════ ÉQUIPE ══════ */}
          {section === 'equipe' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h2 className="text-base font-bold text-gray-900 mb-1">Gestion de l&apos;équipe</h2>
                <p className="text-xs text-gray-500 mb-4">Invitez des collaborateurs, définissez leurs rôles et gérez leurs accès.</p>

                <Link href="/admin/collaborateurs"
                  className="flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Gérer les collaborateurs</p>
                      <p className="text-xs text-gray-500">Ajouter, modifier ou désactiver des comptes</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Rôles disponibles</h3>
                <div className="space-y-3">
                  {[
                    { role: 'secretaire', color: 'bg-blue-50 border-blue-200 text-blue-700', desc: 'Accueil visiteurs, enregistrement des visites et rendez-vous' },
                    { role: 'collaborateur', color: 'bg-gray-50 border-gray-200 text-gray-700', desc: 'Tableau de bord personnel, gestion de ses propres visites' },
                    { role: 'patron', color: 'bg-amber-50 border-amber-200 text-amber-700', desc: 'Accès complet : statistiques, équipe, paramètres' },
                  ].map(({ role, color, desc }) => (
                    <div key={role} className={`flex items-start gap-3 p-3 rounded-xl border ${color}`}>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 border border-current mt-0.5">
                        {libelleRole(role)}
                      </span>
                      <p className="text-xs">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════ ABONNEMENT ══════ */}
          {section === 'abonnement' && <AbonnementSection />}

          {/* ══════ SÉCURITÉ ══════ */}
          {section === 'securite' && (
            <div className="space-y-4">
              {/* Changer mot de passe */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h2 className="text-base font-bold text-gray-900 mb-1">Changer le mot de passe</h2>
                <p className="text-xs text-gray-500 mb-4">Choisissez un mot de passe fort d&apos;au moins 8 caractères.</p>

                {succesMdp && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 mb-4">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Mot de passe mis à jour avec succès.
                  </div>
                )}
                {erreurMdp && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-4">{erreurMdp}</div>
                )}

                <form onSubmit={changerMotDePasse} className="space-y-3">
                  {[
                    { label: 'Nouveau mot de passe', value: nouveauMdp, setter: setNouveauMdp },
                    { label: 'Confirmer le mot de passe', value: confirmMdp, setter: setConfirmMdp },
                  ].map(({ label, value, setter }) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <div className="relative">
                        <input
                          type={showMdp ? 'text' : 'password'}
                          value={value}
                          onChange={e => setter(e.target.value)}
                          placeholder="••••••••"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <button type="button" onClick={() => setShowMdp(!showMdp)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showMdp
                            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          }
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Indicateur de force */}
                  {nouveauMdp && (
                    <div>
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full ${
                            nouveauMdp.length >= i * 3
                              ? i <= 2 ? 'bg-red-400' : i === 3 ? 'bg-amber-400' : 'bg-green-500'
                              : 'bg-gray-200'
                          }`} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400">
                        {nouveauMdp.length < 6 ? 'Faible' : nouveauMdp.length < 9 ? 'Moyen' : nouveauMdp.length < 12 ? 'Fort' : 'Très fort'}
                      </p>
                    </div>
                  )}

                  <button type="submit" disabled={savingMdp}
                    className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
                    {savingMdp ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                  </button>
                </form>
              </div>

              {/* Infos session */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Session active</h3>
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Session actuelle</p>
                    <p className="text-xs text-gray-500">{utilisateur.prenom} {utilisateur.nom} · {libelleRole(utilisateur.role)}</p>
                  </div>
                </div>
              </div>

              {/* Bonnes pratiques */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-amber-800 mb-2">Bonnes pratiques de sécurité</h3>
                <ul className="space-y-1.5 text-xs text-amber-700">
                  {[
                    'Utilisez un mot de passe unique d\'au moins 12 caractères',
                    'Ne partagez jamais vos identifiants de connexion',
                    'Déconnectez-vous sur les appareils partagés',
                    'Changez votre mot de passe tous les 3 mois',
                  ].map(tip => (
                    <li key={tip} className="flex items-start gap-1.5">
                      <span className="mt-0.5 flex-shrink-0">•</span>{tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ══════ NOTIFICATIONS ══════ */}
          {section === 'notifications' && (
            <div className="space-y-4">


              {/* ── Config Email ────────────────────────────────────────── */}
              {(canalNotif === 'email' || canalNotif === 'email_et_whatsapp') && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Configuration Email</h3>

                  {/* Bandeau VisitPro gère l'envoi */}
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-blue-800">Emails envoyés automatiquement via VisitPro</p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Aucune configuration requise. Les emails partent depuis{' '}
                        <span className="font-mono font-medium">noreply@visitpro.ci</span>.
                      </p>
                    </div>
                  </div>

                  {succesNotif && (
                    <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Configuration enregistrée.
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nom affiché dans vos emails
                      </label>
                      <input
                        type="text"
                        value={nomExpediteur}
                        onChange={(e) => setNomExpediteur(e.target.value)}
                        placeholder="Cabinet Kouamé & Associés"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        Vos visiteurs verront :{' '}
                        <span className="text-gray-600 font-medium">
                          &ldquo;{nomExpediteur || 'VisitPro'}{nomExpediteur && nomExpediteur !== 'VisitPro' ? ' via VisitPro' : ''}&rdquo;
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={async () => {
                          setSavingNotif(true)
                          await supabase.from('entreprises').update({
                            canal_notif:    canalNotif,
                            nom_expediteur: nomExpediteur,
                          }).eq('id', utilisateur!.entreprise_id)
                          setSavingNotif(false)
                          setSuccesNotif(true)
                          setTimeout(() => setSuccesNotif(false), 3000)
                        }}
                        disabled={savingNotif}
                        className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {savingNotif ? 'Enregistrement...' : 'Enregistrer'}
                      </button>

                      <button
                        onClick={async () => {
                          setTestEmailLoading(true)
                          setTestEmailResultat(null)
                          try {
                            const res = await fetch('/api/test-email', { method: 'POST' })
                            setTestEmailResultat(res.ok ? 'ok' : 'erreur')
                          } catch {
                            setTestEmailResultat('erreur')
                          } finally {
                            setTestEmailLoading(false)
                            setTimeout(() => setTestEmailResultat(null), 5000)
                          }
                        }}
                        disabled={testEmailLoading}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        {testEmailLoading ? (
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Envoi...
                          </span>
                        ) : '📨 Email de test'}
                      </button>

                      {testEmailResultat === 'ok' && (
                        <span className="text-xs text-green-600 font-medium">✓ Email envoyé !</span>
                      )}
                      {testEmailResultat === 'erreur' && (
                        <span className="text-xs text-red-600 font-medium">✕ Échec — contacter le support</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Info WhatsApp simple ────────────────────────────────── */}
              {(canalNotif === 'whatsapp_simple' || canalNotif === 'email_et_whatsapp') && (
                <div className="bg-[#e9fae3] border border-[#25D366]/30 rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.099.539 4.073 1.485 5.793L0 24l6.335-1.473A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.868 0-3.619-.504-5.12-1.385l-.368-.216-3.763.875.932-3.658-.237-.379A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">WhatsApp simple — aucune configuration requise</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Les boutons WhatsApp apparaissent automatiquement dans l&apos;interface lorsqu&apos;un visiteur a un numéro de téléphone.
                        Un clic ouvre WhatsApp sur votre téléphone ou ordinateur avec le message pré-rempli.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {['Zéro compte Meta', 'Zéro approbation', 'Zéro coût', 'Fonctionne immédiatement'].map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-white/60 border border-[#25D366]/30 rounded-full text-[11px] font-medium text-[#128C7E]">
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Enregistrer le canal si uniquement WA ───────────────── */}
              {canalNotif === 'whatsapp_simple' && (
                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      setSavingNotif(true)
                      await supabase.from('entreprises')
                        .update({ canal_notif: canalNotif })
                        .eq('id', utilisateur!.entreprise_id)
                      setSavingNotif(false)
                      setSuccesNotif(true)
                      setTimeout(() => setSuccesNotif(false), 3000)
                    }}
                    disabled={savingNotif}
                    className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50"
                  >
                    {savingNotif ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              )}

              {succesNotif && canalNotif === 'whatsapp_simple' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Configuration enregistrée.
                </div>
              )}

              {/* ── Préférences personnelles ─────────────────────────────── */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Préférences personnelles</h3>
                <div className="divide-y divide-gray-100">
                  <Toggle
                    checked={notifNavigateur}
                    onChange={setNotifNavigateur}
                    label="Notifications navigateur"
                    desc="Alertes en temps réel dans votre navigateur"
                  />
                  <Toggle
                    checked={notifSon}
                    onChange={setNotifSon}
                    label="Son de notification"
                    desc="Bip sonore à chaque nouvelle visite ou changement"
                  />
                  <Toggle
                    checked={notifEmail}
                    onChange={setNotifEmail}
                    label="Résumé e-mail quotidien"
                    desc="Récapitulatif des visites et rendez-vous du jour"
                  />
                </div>
              </div>

            </div>
          )}

          {/* ══════ APPARENCE ══════ */}
          {section === 'apparence' && (
            <div className="space-y-4">

              {/* ── Couleurs de l'entreprise ───────────────────────────── */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h2 className="text-base font-bold text-gray-900 mb-1">Couleurs de l&apos;application</h2>
                <p className="text-xs text-gray-500 mb-5">Personnalisez les couleurs de l&apos;interface pour tous les utilisateurs de votre entreprise.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  {/* Couleur primaire */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Couleur principale</label>
                    <p className="text-[11px] text-gray-400 mb-2">Sidebar, boutons, liens actifs</p>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="color"
                          value={couleurPrimaire}
                          onChange={(e) => setCouleurPrimaire(e.target.value)}
                          className="w-14 h-14 rounded-2xl border-2 border-gray-200 cursor-pointer p-0.5 bg-white"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={couleurPrimaire}
                          onChange={(e) => setCouleurPrimaire(e.target.value)}
                          maxLength={7}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="#1E3A5F"
                        />
                        <div className="mt-1.5 flex gap-1.5 flex-wrap">
                          {['#1E3A5F','#0F4C81','#2D3748','#7B2D8B','#C0392B','#1A5276'].map((c) => (
                            <button key={c} title={c}
                              onClick={() => setCouleurPrimaire(c)}
                              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                              style={{ backgroundColor: c, borderColor: couleurPrimaire === c ? '#333' : 'transparent' }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Couleur accent */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Couleur d&apos;accentuation</label>
                    <p className="text-[11px] text-gray-400 mb-2">Boutons d&apos;action, badges, confirmations</p>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="color"
                          value={couleurAccent}
                          onChange={(e) => setCouleurAccent(e.target.value)}
                          className="w-14 h-14 rounded-2xl border-2 border-gray-200 cursor-pointer p-0.5 bg-white"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={couleurAccent}
                          onChange={(e) => setCouleurAccent(e.target.value)}
                          maxLength={7}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="#1D9E75"
                        />
                        <div className="mt-1.5 flex gap-1.5 flex-wrap">
                          {['#1D9E75','#16A085','#27AE60','#2980B9','#E67E22','#8E44AD'].map((c) => (
                            <button key={c} title={c}
                              onClick={() => setCouleurAccent(c)}
                              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                              style={{ backgroundColor: c, borderColor: couleurAccent === c ? '#333' : 'transparent' }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aperçu */}
                <div className="rounded-xl border border-gray-100 overflow-hidden mb-4">
                  <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: couleurPrimaire }}>
                    <div className="w-6 h-6 rounded-lg bg-white/20" />
                    <div className="flex-1 space-y-1">
                      <div className="h-1.5 w-20 rounded bg-white/60" />
                      <div className="h-1 w-14 rounded bg-white/30" />
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white/20" />
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-white">
                    <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: couleurAccent }}>
                      Confirmer
                    </button>
                    <button className="px-4 py-1.5 rounded-lg text-xs font-medium border-2" style={{ borderColor: couleurPrimaire, color: couleurPrimaire }}>
                      Voir plus
                    </button>
                    <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: couleurAccent }}>
                      3 nouveaux
                    </span>
                  </div>
                </div>

                {succesCouleurs && (
                  <div className="flex items-center gap-2 p-3 mb-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Couleurs appliquées pour toute l&apos;entreprise.
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      setSavingCouleurs(true)
                      await supabase.from('entreprises').update({
                        couleur_primaire: couleurPrimaire,
                        couleur_accent:   couleurAccent,
                      }).eq('id', utilisateur!.entreprise_id)
                      setSavingCouleurs(false)
                      setSuccesCouleurs(true)
                      setTimeout(() => setSuccesCouleurs(false), 3000)
                    }}
                    disabled={savingCouleurs}
                    className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50"
                  >
                    {savingCouleurs ? 'Enregistrement...' : 'Appliquer à toute l\'entreprise'}
                  </button>
                  <button
                    onClick={() => {
                      setCouleurPrimaire('#1E3A5F')
                      setCouleurAccent('#1D9E75')
                    }}
                    className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>

              {/* Thème */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h2 className="text-base font-bold text-gray-900 mb-1">Thème</h2>
                <p className="text-xs text-gray-500 mb-4">Choisissez l&apos;apparence de l&apos;interface.</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { id: 'light' as const, label: 'Clair',
                      preview: <div className="w-full h-10 rounded-lg bg-white border border-gray-200 flex gap-1 p-1.5"><div className="w-4 bg-gray-200 rounded" /><div className="flex-1 bg-gray-100 rounded" /></div> },
                    { id: 'dark' as const, label: 'Sombre',
                      preview: <div className="w-full h-10 rounded-lg bg-gray-900 border border-gray-700 flex gap-1 p-1.5"><div className="w-4 bg-gray-700 rounded" /><div className="flex-1 bg-gray-800 rounded" /></div> },
                    { id: 'system' as const, label: 'Système',
                      preview: <div className="w-full h-10 rounded-lg border border-gray-200 flex overflow-hidden"><div className="flex-1 bg-white flex gap-0.5 p-1.5"><div className="w-2 bg-gray-200 rounded" /><div className="flex-1 bg-gray-100 rounded" /></div><div className="flex-1 bg-gray-900 flex gap-0.5 p-1.5"><div className="w-2 bg-gray-700 rounded" /><div className="flex-1 bg-gray-800 rounded" /></div></div> },
                  ] as const).map(({ id, label, preview }) => (
                    <button key={id} onClick={() => appliquerTheme(id)}
                      className={`relative flex flex-col gap-2 p-3 rounded-xl border-2 transition-all hover:border-primary/40
                        ${theme === id ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}>
                      {preview}
                      <span className="text-xs font-medium text-gray-700 text-center">{label}</span>
                      {theme === id && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Langue & Région */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h2 className="text-base font-bold text-gray-900 mb-1">Langue & Région</h2>
                <p className="text-xs text-gray-500 mb-4">Personnalisez l&apos;affichage selon vos préférences locales.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Langue de l&apos;interface</label>
                    <select value={langue} onChange={e => { setLangue(e.target.value); localStorage.setItem('visitpro-langue', e.target.value) }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                      <option value="fr">🇫🇷 Français</option>
                      <option value="en">🇬🇧 English</option>
                    </select>
                    {langue === 'en' && (
                      <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                        La traduction complète de l&apos;interface sera disponible dans la prochaine mise à jour.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Format de date</label>
                    <select value={dateFormat} onChange={e => { setDateFormat(e.target.value); localStorage.setItem('visitpro-date-fmt', e.target.value) }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                      <option value="dd/mm/yyyy">JJ/MM/AAAA (ex: 22/06/2026)</option>
                      <option value="dd-mm-yyyy">JJ-MM-AAAA (ex: 22-06-2026)</option>
                      <option value="long">Long (ex: lundi 22 juin 2026)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fuseau horaire</label>
                    <select value={fuseau} onChange={e => { setFuseau(e.target.value); localStorage.setItem('visitpro-fuseau', e.target.value) }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                      <option value="Africa/Abidjan">GMT+0 — Abidjan (Côte d&apos;Ivoire)</option>
                      <option value="Africa/Dakar">GMT+0 — Dakar (Sénégal)</option>
                      <option value="Africa/Lagos">GMT+1 — Lagos (Nigeria)</option>
                      <option value="Africa/Douala">GMT+1 — Douala (Cameroun)</option>
                      <option value="Africa/Nairobi">GMT+3 — Nairobi (Kenya)</option>
                      <option value="Europe/Paris">GMT+2 — Paris (France)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* À propos */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">À propos de VisitPro</h3>
                <p className="text-xs text-gray-500 mb-3">Logiciel de gestion des visiteurs et rendez-vous.</p>
                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex justify-between"><span>Version</span><span className="font-medium text-gray-700">1.0.0</span></div>
                  <div className="flex justify-between"><span>Plan</span><span className="font-medium text-gray-700">{PLANS[(entreprise?.plan ?? 'starter') as Plan].nom}</span></div>
                  <div className="flex justify-between"><span>Région</span><span className="font-medium text-gray-700">Côte d&apos;Ivoire</span></div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
