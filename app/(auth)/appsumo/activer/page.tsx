'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type EtatCle = 'verification' | 'valide' | 'invalide' | 'deja_active' | 'rembourse'

function AppSumoActiverContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const licenceKey = (searchParams.get('key') ?? '').toUpperCase()

  const [etatCle, setEtatCle] = useState<EtatCle>('verification')
  const [plan, setPlan] = useState<string>('')

  const [nomEntreprise, setNomEntreprise] = useState('')
  const [secteur, setSecteur] = useState('')
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmer, setConfirmer] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (!licenceKey) { setEtatCle('invalide'); return }

    fetch(`/api/appsumo/activer?key=${encodeURIComponent(licenceKey)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setEtatCle('valide')
          setPlan(data.plan)
        } else if (data.reason === 'already_active') {
          setEtatCle('deja_active')
          setPlan(data.plan ?? '')
        } else if (data.reason === 'refunded') {
          setEtatCle('rembourse')
        } else {
          setEtatCle('invalide')
        }
      })
      .catch(() => setEtatCle('invalide'))
  }, [licenceKey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErreur(null)

    if (motDePasse !== confirmer) {
      setErreur('Les mots de passe ne correspondent pas')
      return
    }
    if (motDePasse.length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/appsumo/activer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenceKey, nomEntreprise, secteur, nom, prenom, email, motDePasse }),
      })
      const data = await res.json()
      if (!res.ok) { setErreur(data.error ?? 'Erreur lors de l\'activation'); return }
      router.push('/login?activated=appsumo')
    } catch {
      setErreur('Erreur réseau, veuillez réessayer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Panneau gauche */}
      <div
        className="hidden lg:flex lg:w-[42%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(145deg, #ff6b35 0%, #e85d04 50%, #7c1d00 100%)' }}
      >
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)' }} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-white font-bold text-xl">VisitPro</span>
        </div>

        <div className="relative z-10">
          {/* Logo AppSumo */}
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-2 mb-8">
            <svg className="w-4 h-4 text-orange-200" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-white text-xs font-semibold">Offre AppSumo</span>
          </div>

          <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Activez votre<br />
            <span className="text-orange-200">accès à vie.</span>
          </h1>
          <p className="text-white/70 text-base leading-relaxed mb-8">
            Vous avez obtenu VisitPro sur AppSumo. Créez votre entreprise et commencez à gérer vos visiteurs en 2 minutes.
          </p>

          {plan && (
            <div className="bg-white/15 border border-white/20 rounded-2xl p-4">
              <p className="text-orange-200 text-xs font-semibold uppercase tracking-widest mb-1">Votre plan</p>
              <p className="text-white font-bold text-xl capitalize">{plan === 'enterprise' ? 'Enterprise' : 'Pro'}</p>
              <p className="text-white/60 text-sm mt-1">Accès à vie · Aucun abonnement mensuel</p>
            </div>
          )}
        </div>

        <p className="relative z-10 text-white/30 text-xs">© 2026 VisitPro</p>
      </div>

      {/* Panneau droit */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">

        {/* Vérification */}
        {etatCle === 'verification' && (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Vérification de la clé de licence…</p>
          </div>
        )}

        {/* Clé invalide */}
        {etatCle === 'invalide' && (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Clé invalide</h2>
            <p className="text-gray-500 text-sm mb-6">
              Cette clé de licence est invalide ou introuvable. Vérifiez le lien reçu sur AppSumo.
            </p>
            <Link href="https://appsumo.com" className="text-sm text-orange-600 hover:underline">
              Retourner sur AppSumo
            </Link>
          </div>
        )}

        {/* Remboursé */}
        {etatCle === 'rembourse' && (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Licence remboursée</h2>
            <p className="text-gray-500 text-sm">Cette licence a été annulée ou remboursée.</p>
          </div>
        )}

        {/* Déjà activée */}
        {etatCle === 'deja_active' && (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Déjà activée</h2>
            <p className="text-gray-500 text-sm mb-6">
              Cette licence est déjà associée à un compte VisitPro. Connectez-vous pour y accéder.
            </p>
            <Link href="/login">
              <Button>Se connecter</Button>
            </Link>
          </div>
        )}

        {/* Formulaire d'activation */}
        {etatCle === 'valide' && (
          <div className="w-full max-w-md">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-3 py-1 mb-4">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-xs text-orange-700 font-medium">
                  Clé valide · Plan {plan === 'enterprise' ? 'Enterprise' : 'Pro'}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Créez votre compte</h2>
              <p className="text-sm text-gray-500 mt-1">Votre clé : <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{licenceKey}</code></p>
            </div>

            {erreur && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{erreur}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Votre entreprise</p>

              <Input
                label="Nom de l'entreprise"
                value={nomEntreprise}
                onChange={(e) => setNomEntreprise(e.target.value)}
                placeholder="SGCI, Société ABC…"
                required
              />
              <Input
                label="Secteur d'activité"
                value={secteur}
                onChange={(e) => setSecteur(e.target.value)}
                placeholder="Finance, Santé, Commerce…"
              />

              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 pt-2">Votre compte</p>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Prénom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  required
                />
                <Input
                  label="Nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                />
              </div>
              <Input
                label="Adresse email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.ci"
                required
                autoComplete="email"
              />
              <Input
                label="Mot de passe"
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="Minimum 8 caractères"
                required
              />
              <Input
                label="Confirmer le mot de passe"
                type="password"
                value={confirmer}
                onChange={(e) => setConfirmer(e.target.value)}
                placeholder="Répétez le mot de passe"
                required
              />

              <div className="pt-2">
                <Button type="submit" fullWidth size="lg" loading={loading}
                  className="bg-orange-500 hover:bg-orange-600 focus:ring-orange-300">
                  Activer ma licence VisitPro
                </Button>
              </div>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-orange-600 font-semibold hover:underline">Se connecter</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AppSumoActiverPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    }>
      <AppSumoActiverContent />
    </Suspense>
  )
}
