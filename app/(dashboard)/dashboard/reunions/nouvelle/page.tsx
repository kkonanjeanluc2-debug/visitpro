'use client'

import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { creerReunion } from '@/lib/reunions'
import type { ReunionFormData } from '@/components/reunions/ReunionForm'
import ReunionFormComponent from '@/components/reunions/ReunionForm'
import Link from 'next/link'

export default function NouvelleReunionPage() {
  const { utilisateur } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (utilisateur && !['patron', 'admin'].includes(utilisateur.role)) {
      router.replace('/dashboard/reunions')
    }
  }, [utilisateur, router])

  const handleSubmit = useCallback(async (data: ReunionFormData) => {
    if (!utilisateur) return
    const reunion = await creerReunion({
      titre: data.titre,
      type: data.type,
      date_reunion: data.date_reunion,
      heure_debut: data.heure_debut,
      heure_fin: data.heure_fin || undefined,
      lieu: data.lieu || undefined,
      description: data.description || undefined,
      entreprise_id: utilisateur.entreprise_id,
      organisateur_id: utilisateur.id,
    })
    router.push(`/dashboard/reunions/${reunion.id}`)
  }, [utilisateur, router])

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard/reunions" className="hover:text-gray-600 transition-colors">Réunions</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">Nouvelle réunion</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Planifier une réunion</h1>
          <p className="text-sm text-gray-500 mt-1">Renseignez les informations de base, vous pourrez ajouter participants et ordre du jour ensuite.</p>
        </div>

        <ReunionFormComponent
          defaultValues={{ date_reunion: today }}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/reunions')}
          submitLabel="Créer la réunion"
        />
      </div>
    </div>
  )
}
