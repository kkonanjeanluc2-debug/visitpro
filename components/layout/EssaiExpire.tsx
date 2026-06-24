'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AbonnementSection from '@/components/admin/AbonnementSection'

interface Props {
  role: string
}

export default function EssaiExpire({ role }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const isAdmin  = ['admin', 'patron'].includes(role)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-full bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Période d&apos;essai expirée</h1>
          {isAdmin ? (
            <p className="text-gray-500">Choisissez un abonnement pour continuer à utiliser VisitPro</p>
          ) : (
            <p className="text-gray-500">Contactez votre administrateur pour renouveler l&apos;abonnement</p>
          )}
        </div>

        {isAdmin ? (
          <AbonnementSection />
        ) : (
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-6">
              Votre compte est temporairement suspendu en attente de renouvellement.
            </p>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
