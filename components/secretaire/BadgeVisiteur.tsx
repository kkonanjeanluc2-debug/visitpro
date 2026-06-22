'use client'

import { useState } from 'react'
import type { Visite, Entreprise } from '@/types'
import Button from '@/components/ui/Button'
import { genererBadgeVisiteur } from '@/lib/pdf'
import { genererNumeroVisite } from '@/lib/utils'

interface BadgeVisiteurProps {
  visite: Visite
  entreprise: Entreprise
  numeroIndex: number
}

export default function BadgeVisiteur({ visite, entreprise, numeroIndex }: BadgeVisiteurProps) {
  const [loading, setLoading] = useState(false)

  const handleImprimer = async () => {
    setLoading(true)
    try {
      const numero = genererNumeroVisite(numeroIndex)
      genererBadgeVisiteur(visite, entreprise, numero)

      // Marquer le badge comme imprimé
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.from('visites').update({ badge_imprime: true }).eq('id', visite.id)
    } catch (err) {
      console.error('Erreur génération badge:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleImprimer}
      loading={loading}
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      }
    >
      {visite.badge_imprime ? 'Réimprimer badge' : 'Imprimer badge'}
    </Button>
  )
}
