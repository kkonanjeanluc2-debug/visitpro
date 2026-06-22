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

      // Responsable de site → espace admin de leur site
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg mb-4">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary">VisitPro</h1>
          <p className="text-gray-500 mt-1">Gestion des visites d&apos;entreprise</p>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Connexion</h2>

          {erreur && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
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

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Se connecter
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-primary font-medium hover:underline">
                Créer votre entreprise
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 VisitPro — Solution pour la Côte d&apos;Ivoire
        </p>
      </div>
    </div>
  )
}

