'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { applyTheme } from '@/lib/theme'

export default function ThemeProvider() {
  const { utilisateur } = useAuth()

  useEffect(() => {
    const entreprise = utilisateur?.entreprise
    applyTheme(entreprise?.couleur_primaire, entreprise?.couleur_accent)
  }, [utilisateur?.entreprise?.couleur_primaire, utilisateur?.entreprise?.couleur_accent])

  return null
}
