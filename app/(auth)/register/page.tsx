'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

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

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Entreprise
  const [nomEntreprise, setNomEntreprise] = useState('')
  const [secteur, setSecteur] = useState('')
  const [adresse, setAdresse] = useState('')
  const [telephone, setTelephone] = useState('')

  // Admin
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [motDePasseConfirm, setMotDePasseConfirm] = useState('')

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomEntreprise.trim()) {
      setErreur('Le nom de l\'entreprise est obligatoire')
      return
    }
    setErreur(null)
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErreur(null)

    if (motDePasse !== motDePasseConfirm) {
      setErreur('Les mots de passe ne correspondent pas')
      return
    }
    if (motDePasse.length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setLoading(true)
    try {
      // Créer l'entreprise + compte via l'API serveur (service_role, bypass RLS)
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomEntreprise, secteur, adresse, telephone, nom, prenom, email, motDePasse }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Une erreur est survenue')

      // Connecter l'utilisateur avec les identifiants créés
      const { error: errLogin } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: motDePasse,
      })
      if (errLogin) throw new Error('Compte créé, mais connexion impossible : ' + errLogin.message)

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg mb-4">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary">VisitPro</h1>
          <p className="text-gray-500 mt-1">Créer votre espace entreprise</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Indicateur d'étapes */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>1</div>
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-100'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>2</div>
          </div>

          {erreur && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{erreur}</p>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Votre entreprise</h2>

              <Input
                label="Nom de l'entreprise"
                value={nomEntreprise}
                onChange={(e) => setNomEntreprise(e.target.value)}
                placeholder="Cabinet Kouamé & Associés"
                required
              />

              <Select
                label="Secteur d'activité"
                value={secteur}
                onChange={(e) => setSecteur(e.target.value)}
                options={SECTEURS}
                placeholder="Choisir un secteur"
              />

              <Input
                label="Adresse"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Cocody, Abidjan"
              />

              <Input
                label="Téléphone entreprise"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+225 07 00 00 00 00"
              />

              <Button type="submit" fullWidth size="lg">
                Continuer →
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-lg font-bold text-gray-900">Votre compte administrateur</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Prénom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Jean-Luc"
                  required
                />
                <Input
                  label="Nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Kouamé"
                  required
                />
              </div>

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jean@entreprise.ci"
                required
              />

              <Input
                label="Mot de passe"
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="8 caractères minimum"
                required
                hint="Au moins 8 caractères"
              />

              <Input
                label="Confirmer le mot de passe"
                type="password"
                value={motDePasseConfirm}
                onChange={(e) => setMotDePasseConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Button type="submit" fullWidth size="lg" loading={loading}>
                Créer mon espace VisitPro
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Plan Starter gratuit — 3 utilisateurs, 50 visites/mois
        </p>
      </div>
    </div>
  )
}

