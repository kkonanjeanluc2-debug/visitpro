'use client'

import { useState } from 'react'
import Link from 'next/link'

function Check({ accent = false }: { accent?: boolean }) {
  return (
    <svg className={`w-4 h-4 flex-shrink-0 ${accent ? 'text-accent' : 'text-primary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function Cross() {
  return (
    <svg className="w-4 h-4 flex-shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    titre: 'Enregistrement instantané',
    desc: 'La secrétaire saisit le visiteur en quelques secondes. Un badge numérique est généré automatiquement.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h8m-8 4h4" />
      </svg>
    ),
    titre: 'File d\'attente intelligente',
    desc: 'Priorisation automatique selon l\'urgence, le type de visite et l\'heure d\'arrivée.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    titre: 'Notifications temps réel',
    desc: 'Dès l\'arrivée d\'un visiteur, le collaborateur reçoit une alerte instantanée directement dans son espace VisitPro.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
    titre: 'Dashboard personnel',
    desc: 'Chaque collaborateur voit ses propres visiteurs, accepte ou décline depuis son espace.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
      </svg>
    ),
    titre: 'Écran d\'accueil',
    desc: 'Affichez les visiteurs attendus sur un écran TV en salle d\'attente. Professionnel et élégant.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    titre: 'Agenda & Rendez-vous',
    desc: 'Planifiez et gérez les rendez-vous à l\'avance. Vue semaine, mois ou personnalisée.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    titre: 'Rapports & Statistiques',
    desc: 'Rapports hebdomadaires automatiques, KPIs de flux, export PDF pour la direction.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    titre: 'Sécurité & Liste noire',
    desc: 'Bloquez les visiteurs indésirables. La secrétaire est alertée discrètement sans exposer le motif.',
  },
]

const PLANS_DATA = [
  {
    key: 'pro',
    nom: 'Pro',
    tagline: 'Idéal pour les PME',
    prix: 20000,
    prixAnnuel: 200000,
    accent: true,
    popular: true,
    users: '5 utilisateurs',
    visites: 'Visites illimitées',
    features: [
      { label: 'Badge visiteur numérique', ok: true },
      { label: 'Notifications temps réel', ok: true },
      { label: 'Agenda rendez-vous', ok: true },
      { label: 'Rapports & Export PDF', ok: true },
      { label: "Écran d'accueil", ok: true },
      { label: 'Liste noire / Sécurité', ok: true },
      { label: 'Messagerie interne', ok: false },
      { label: 'Multi-sites', ok: false },
    ],
    cta: 'Essayer 14 jours',
    href: '/register',
  },
  {
    key: 'enterprise',
    nom: 'Enterprise',
    tagline: 'Grandes structures & multi-sites',
    prix: 45000,
    prixAnnuel: 450000,
    accent: false,
    popular: false,
    users: 'Utilisateurs illimités',
    visites: 'Visites illimitées',
    features: [
      { label: 'Badge visiteur numérique', ok: true },
      { label: 'Notifications temps réel', ok: true },
      { label: 'Agenda rendez-vous', ok: true },
      { label: 'Rapports & Export PDF', ok: true },
      { label: "Écran d'accueil", ok: true },
      { label: 'Liste noire / Sécurité', ok: true },
      { label: 'Messagerie interne', ok: true },
      { label: 'Multi-sites', ok: true },
    ],
    cta: 'Essayer 14 jours',
    href: '/register',
  },
]

function formatPrix(n: number) {
  if (n === 0) return 'Gratuit'
  return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n)
}

export default function LandingPage() {
  const [facturation, setFacturation] = useState<'mensuel' | 'annuel'>('mensuel')
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ═══════════════════════════════════════════════════════
          NAVBAR
      ═══════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgb(var(--color-primary-rgb))' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="font-bold text-lg" style={{ color: 'rgb(var(--color-primary-rgb))' }}>VisitPro</span>
          </Link>

          {/* Nav + CTAs desktop — groupés pour éviter l'espace entre Tarifs et Se connecter */}
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
              <a href="#fonctionnalites" className="hover:text-gray-900 transition-colors">Fonctionnalités</a>
              <a href="#comment" className="hover:text-gray-900 transition-colors">Comment ça marche</a>
              <a href="#tarifs" className="hover:text-gray-900 transition-colors">Tarifs</a>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-xl transition-colors">
                Se connecter
              </Link>
              <Link href="/register"
                className="text-sm font-semibold text-white px-5 py-2 rounded-xl shadow-sm transition-opacity hover:opacity-90"
                style={{ background: 'rgb(var(--color-primary-rgb))' }}>
                S&apos;inscrire
              </Link>
            </div>
          </div>

          {/* Burger mobile */}
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setNavOpen(!navOpen)} aria-label="Menu">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {navOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {navOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <a href="#fonctionnalites" onClick={() => setNavOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Fonctionnalités</a>
            <a href="#comment" onClick={() => setNavOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Comment ça marche</a>
            <a href="#tarifs" onClick={() => setNavOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Tarifs</a>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/login" className="w-full text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-xl py-2.5">Se connecter</Link>
              <Link href="/register"
                className="w-full text-center text-sm font-semibold text-white rounded-xl py-2.5"
                style={{ background: 'rgb(var(--color-primary-rgb))' }}>
                S&apos;inscrire
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 lg:px-8"
        style={{ background: 'linear-gradient(160deg, #f8faff 0%, #f0f7ff 40%, #e8faf4 100%)' }}>

        {/* Déco arrière-plan */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgb(var(--color-primary-rgb)), transparent 70%)' }} />
          <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, rgb(var(--color-accent-rgb)), transparent 70%)' }} />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Texte */}
            <div>
              <div className="inline-flex items-center gap-2 border rounded-full px-4 py-1.5 text-xs font-semibold mb-8"
                style={{ borderColor: 'rgb(var(--color-accent-rgb) / 0.4)', color: 'rgb(var(--color-accent-rgb))', background: 'rgb(var(--color-accent-rgb) / 0.06)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: 'rgb(var(--color-accent-rgb))' }} />
                Solution N°1 pour les entreprises de Côte d&apos;Ivoire
              </div>

              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold leading-tight tracking-tight mb-6">
                L&apos;accueil visiteurs<br />
                <span style={{ color: 'rgb(var(--color-primary-rgb))' }}>enfin</span>{' '}
                <span style={{ color: 'rgb(var(--color-accent-rgb))' }}>professionnel.</span>
              </h1>

              <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-lg">
                VisitPro digitalise votre accueil : enregistrement des visiteurs, notifications en temps réel, gestion de la file d&apos;attente et rapports hebdomadaires — le tout en quelques minutes.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white rounded-2xl shadow-lg transition-opacity hover:opacity-90"
                  style={{ background: 'rgb(var(--color-primary-rgb))' }}>
                  Créer mon entreprise
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link href="/login"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold rounded-2xl border-2 transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'rgb(var(--color-primary-rgb) / 0.3)', color: 'rgb(var(--color-primary-rgb))' }}>
                  Se connecter
                </Link>
              </div>

              <p className="text-xs text-gray-400 mt-5">Configuration en 5 minutes · Support disponible</p>
            </div>

            {/* Mockup app */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 rounded-3xl blur-3xl opacity-20"
                style={{ background: 'rgb(var(--color-primary-rgb))' }} />
              <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">

                {/* Fausse topbar */}
                <div className="h-12 flex items-center px-4 gap-3"
                  style={{ background: 'rgb(var(--color-primary-rgb))' }}>
                  <div className="w-2 h-2 rounded-full bg-white/30" />
                  <div className="w-2 h-2 rounded-full bg-white/30" />
                  <div className="w-2 h-2 rounded-full bg-white/30" />
                  <div className="ml-2 h-5 bg-white/15 rounded flex items-center px-3">
                    <span className="text-[10px] text-white/70 font-medium">VisitPro — Dashboard</span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-sm text-gray-900">Visiteurs en attente</span>
                    <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full"
                      style={{ background: 'rgb(var(--color-primary-rgb))' }}>2</span>
                  </div>

                  {/* Carte visiteur 1 */}
                  <div className="border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgb(var(--color-primary-rgb))' }}>KJ</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-gray-900">Kouadio Jean-Baptiste</p>
                        <p className="text-[11px] text-gray-400">Réunion commerciale</p>
                      </div>
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 flex-shrink-0">URGENT</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 rounded-lg text-[11px] font-bold text-white"
                        style={{ background: 'rgb(var(--color-accent-rgb))' }}>✓ Faire entrer</button>
                      <button className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 bg-gray-100">Attendre</button>
                    </div>
                  </div>

                  {/* Carte visiteur 2 */}
                  <div className="border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: '#8B5CF6' }}>AT</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-gray-900">Aminata Touré</p>
                        <p className="text-[11px] text-gray-400">Consultation juridique</p>
                      </div>
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">Attend 12min</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 rounded-lg text-[11px] font-bold text-white"
                        style={{ background: 'rgb(var(--color-accent-rgb))' }}>✓ Faire entrer</button>
                      <button className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 bg-gray-100">Décliner</button>
                    </div>
                  </div>

                  {/* Mini stats */}
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[
                      { label: 'Aujourd\'hui', val: '7' },
                      { label: 'En cours', val: '2' },
                      { label: 'Moy. attente', val: '8 min' },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="font-bold text-sm text-gray-900">{s.val}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          STATS
      ═══════════════════════════════════════════════════════ */}
      <section className="py-12 border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { val: '200+', label: 'Entreprises en Côte d\'Ivoire' },
              { val: '50 000+', label: 'Visites gérées' },
              { val: '< 2 min', label: 'Temps d\'enregistrement moyen' },
              { val: '99.9 %', label: 'Disponibilité de la plateforme' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold" style={{ color: 'rgb(var(--color-primary-rgb))' }}>{s.val}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          COMMENT ÇA MARCHE
      ═══════════════════════════════════════════════════════ */}
      <section id="comment" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'rgb(var(--color-accent-rgb))' }}>Simple & efficace</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Comment ça marche ?</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">Trois étapes, zéro paperasse. Opérationnel en moins d&apos;une heure.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Ligne connecteur */}
            <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            {[
              {
                num: '1',
                titre: 'La secrétaire enregistre',
                desc: 'Elle saisit nom, motif et destinataire en moins de 2 minutes. Un badge numérique est généré automatiquement.',
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ),
              },
              {
                num: '2',
                titre: 'Le collaborateur est notifié',
                desc: 'Il reçoit une alerte instantanée directement dans son espace VisitPro avec les informations du visiteur.',
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                ),
              },
              {
                num: '3',
                titre: 'Le visiteur est bien accueilli',
                desc: 'Le collaborateur accepte ou reporte depuis son dashboard. La secrétaire fait entrer le visiteur.',
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                ),
              },
            ].map((step) => (
              <div key={step.num} className="relative bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-white shadow-md"
                  style={{ background: 'rgb(var(--color-primary-rgb))' }}>
                  {step.icon}
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-black text-white shadow-sm"
                  style={{ background: 'rgb(var(--color-accent-rgb))' }}>
                  {step.num}
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-3">{step.titre}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FONCTIONNALITÉS
      ═══════════════════════════════════════════════════════ */}
      <section id="fonctionnalites" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'rgb(var(--color-accent-rgb))' }}>Tout ce dont vous avez besoin</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Des fonctionnalités pensées pour votre équipe</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">Du registre d&apos;accueil numérique aux rapports automatisés, VisitPro couvre tous les besoins de votre accueil.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.titre} className="group rounded-2xl p-6 border border-gray-100 hover:border-primary/20 hover:shadow-md transition-all duration-200 bg-white">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-colors text-white"
                  style={{ background: 'rgb(var(--color-primary-rgb) / 0.1)', color: 'rgb(var(--color-primary-rgb))' }}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.titre}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TARIFS
      ═══════════════════════════════════════════════════════ */}
      <section id="tarifs" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'rgb(var(--color-accent-rgb))' }}>Tarification transparente</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Des prix adaptés à votre taille</h2>
            <p className="text-gray-500 mt-4 max-w-lg mx-auto">Commencez gratuitement. Passez au plan supérieur quand vous en avez besoin.</p>

            {/* Toggle mensuel / annuel */}
            <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 mt-8 shadow-sm">
              <button
                onClick={() => setFacturation('mensuel')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${facturation === 'mensuel' ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                style={facturation === 'mensuel' ? { background: 'rgb(var(--color-primary-rgb))' } : {}}>
                Mensuel
              </button>
              <button
                onClick={() => setFacturation('annuel')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${facturation === 'annuel' ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                style={facturation === 'annuel' ? { background: 'rgb(var(--color-primary-rgb))' } : {}}>
                Annuel
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${facturation === 'annuel' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>
                  −17%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-3xl mx-auto">
            {PLANS_DATA.map((plan) => {
              const prixMoyen = facturation === 'annuel' && plan.prixAnnuel > 0
                ? Math.round(plan.prixAnnuel / 12)
                : plan.prix

              return (
                <div key={plan.key}
                  className={`relative flex flex-col rounded-3xl p-8 border-2 transition-all ${
                    plan.popular
                      ? 'shadow-xl scale-[1.02]'
                      : 'bg-white border-gray-200 shadow-sm'
                  }`}
                  style={plan.popular ? {
                    background: 'rgb(var(--color-primary-rgb))',
                    borderColor: 'rgb(var(--color-primary-rgb))',
                  } : {}}>

                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-bold text-white px-4 py-1.5 rounded-full shadow-md"
                        style={{ background: 'rgb(var(--color-accent-rgb))' }}>
                        Le plus populaire
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${plan.popular ? 'text-white/60' : 'text-gray-400'}`}>
                      {plan.tagline}
                    </p>
                    <h3 className={`text-2xl font-extrabold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                      {plan.nom}
                    </h3>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-end gap-1">
                      <span className={`text-4xl font-extrabold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                        {plan.prix === 0 ? 'Gratuit' : formatPrix(prixMoyen)}
                      </span>
                      {plan.prix > 0 && (
                        <span className={`text-sm mb-1 ${plan.popular ? 'text-white/60' : 'text-gray-400'}`}>/ mois</span>
                      )}
                    </div>
                    {facturation === 'annuel' && plan.prixAnnuel > 0 && (
                      <p className={`text-xs mt-1 ${plan.popular ? 'text-white/60' : 'text-gray-400'}`}>
                        Facturé {formatPrix(plan.prixAnnuel)} / an
                      </p>
                    )}
                    <div className={`mt-3 flex flex-col gap-0.5 text-sm ${plan.popular ? 'text-white/80' : 'text-gray-500'}`}>
                      <span>{plan.users}</span>
                      <span>{plan.visites}</span>
                    </div>
                  </div>

                  <ul className="flex-1 space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f.label} className="flex items-center gap-3 text-sm">
                        {f.ok
                          ? <span className={`w-4 h-4 flex-shrink-0 ${plan.popular ? 'text-white' : ''}`}>
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          : <Cross />
                        }
                        <span className={f.ok
                          ? (plan.popular ? 'text-white' : 'text-gray-700')
                          : 'text-gray-300'}>
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.href}
                    className={`block text-center py-3.5 rounded-2xl text-sm font-bold transition-opacity hover:opacity-90 ${
                      plan.popular
                        ? 'bg-white'
                        : 'text-white'
                    }`}
                    style={plan.popular
                      ? { color: 'rgb(var(--color-primary-rgb))' }
                      : { background: 'rgb(var(--color-primary-rgb))' }
                    }>
                    {plan.cta}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CTA FINAL
      ═══════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-rgb)) 0%, rgb(var(--color-primary-darker-rgb)) 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-5">
            Prêt à transformer votre accueil ?
          </h2>
          <p className="text-lg text-white/70 mb-10">
            Rejoignez les entreprises ivoiriennes qui font confiance à VisitPro. Configuration en 5 minutes, opérationnel immédiatement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold rounded-2xl shadow-xl transition-opacity hover:opacity-90"
              style={{ background: 'rgb(var(--color-accent-rgb))', color: '#fff' }}>
              Créer mon compte
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href="/login"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-2xl border-2 border-white/30 text-white hover:bg-white/10 transition-colors">
              Déjà un compte ? Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-gray-800">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgb(var(--color-primary-rgb))' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="font-bold text-white text-lg">VisitPro</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                La solution de gestion des visiteurs conçue pour les entreprises de Côte d&apos;Ivoire et d&apos;Afrique de l&apos;Ouest.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Produit</p>
              <ul className="space-y-3 text-sm">
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#tarifs" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="#comment" className="hover:text-white transition-colors">Comment ça marche</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Compte</p>
              <ul className="space-y-3 text-sm">
                <li><Link href="/login" className="hover:text-white transition-colors">Se connecter</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Créer un compte</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs">© 2026 VisitPro — Solution pour la Côte d&apos;Ivoire</p>
            <p className="text-xs">Développé avec ❤ pour les entreprises africaines</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
