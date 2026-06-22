'use client'

import { useContext } from 'react'
import { AuthContext } from '@/contexts/AuthContext'
import type { Utilisateur } from '@/types'

interface AuthState {
  utilisateur: Utilisateur | null
  loading: boolean
  erreur: string | null
}

export function useAuth(): AuthState {
  const utilisateur = useContext(AuthContext)
  return { utilisateur, loading: false, erreur: null }
}
