'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import MessagesInbox from '@/components/shared/MessagesInbox'

export default function MessagesPageSecretaire() {
  const { utilisateur } = useAuth()
  const searchParams    = useSearchParams()
  const defaultVisiteId = searchParams.get('visite')

  if (!utilisateur) return null

  if (utilisateur.entreprise?.plan !== 'enterprise') {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Messagerie interne</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          La messagerie interne entre la secrétaire et les collaborateurs est disponible avec le plan Enterprise.
        </p>
        <Link
          href="/admin/abonnement"
          className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
        >
          Voir les plans
        </Link>
      </div>
    )
  }

  return (
    <div className="h-full">
      <MessagesInbox
        utilisateur={utilisateur as never}
        defaultVisiteId={defaultVisiteId}
      />
    </div>
  )
}
