'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErreur(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: motDePasse,
      })

      if (error) {
        setErreur('Email ou mot de passe incorrect')
        return
      }

      if (!data.user) {
        setErreur('Erreur de connexion, veuillez réessayer')
        return
      }

      const { data: utilisateur, error: userError } = await supabase
        .from('utilisateurs')
        .select('role, is_super_admin, permissions')
        .eq('id', data.user.id)
        .single()

      if (userError || !utilisateur) {
        setErreur('Profil utilisateur introuvable')
        return
      }

      if (utilisateur.is_super_admin) {
        router.push('/superadmin')
        router.refresh()
        return
      }

      if (utilisateur.role === 'collaborateur' && (utilisateur.permissions as Record<string, boolean>)?.responsable_site) {
        router.push('/admin')
        router.refresh()
        return
      }

      const redirectMap: Record<string, string> = {
        secretaire: '/secretaire',
        collaborateur: '/dashboard',
        patron: '/dashboard',
        admin: '/admin',
      }

      router.push(redirectMap[utilisateur.role] ?? '/dashboard')
      router.refresh()
    } catch {
      setErreur('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Panneau gauche — branding ──────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[58%] xl:w-[62%] relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(145deg, rgb(var(--color-primary-rgb)) 0%, rgb(var(--color-primary-darker-rgb)) 55%, #0a1628 100%)',
        }}
      >
        {/* Cercles décoratifs */}
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(29,158,117,0.18) 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 right-0 w-[280px] h-[280px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', transform: 'translateY(-50%) translateX(40%)' }} />

        {/* Grille de points */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />

        {/* Logo top */}
        <Link href="/" className="relative z-10 flex items-center gap-3 group w-fit">
          <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center group-hover:bg-white/25 transition-colors">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">VisitPro</span>
        </Link>

        {/* Centre — hero */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-16">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-xs text-white/80 font-medium mb-8 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft" />
            Solution professionnelle · Côte d&apos;Ivoire
          </div>

          <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-tight mb-6">
            Votre accueil<br />
            <span style={{ color: 'rgb(var(--color-accent-rgb))' }}>réinventé.</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-sm mb-14">
            Gérez les visites, les rendez-vous et la file d&apos;attente de toute votre entreprise en temps réel.
          </p>

          {/* Features */}
          <div className="space-y-3 max-w-sm">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                label: 'Enregistrement visiteurs instantané',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                ),
                label: 'Notifications en temps réel',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                label: 'Rapports et statistiques hebdomadaires',
              },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                  style={{ background: 'rgb(var(--color-accent-rgb) / 0.25)' }}>
                  {f.icon}
                </div>
                <span className="text-sm text-white/80 font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer gauche */}
        <div className="relative z-10">
          <p className="text-xs text-white/30">© 2026 VisitPro — Solution pour la Côte d&apos;Ivoire</p>
        </div>
      </div>

      {/* ── Panneau droit — formulaire ─────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">

        {/* Retour landing — mobile uniquement */}
        <Link href="/" className="lg:hidden self-start flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Accueil
        </Link>

        {/* Logo mobile */}
        <div className="lg:hidden text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl shadow-lg mb-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-primary">VisitPro</h1>
          <p className="text-gray-400 text-sm mt-1">Gestion des visites d&apos;entreprise</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Connexion</h2>
            <p className="text-sm text-gray-500 mt-1">Accédez à votre espace de travail</p>
          </div>

          {erreur && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{erreur}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Adresse email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.ci"
              required
              autoComplete="email"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
            />

            <Input
              label="Mot de passe"
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />

            <div className="pt-1">
              <Button type="submit" fullWidth size="lg" loading={loading}>
                Se connecter
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Créer votre entreprise
              </Link>
            </p>
          </div>

          {/* Footer mobile */}
          <p className="lg:hidden text-center text-xs text-gray-400 mt-10">
            © 2026 VisitPro — Solution pour la Côte d&apos;Ivoire
          </p>
        </div>
      </div>

    </div>
  )
}
