'use client'

import { createContext, useContext } from 'react'
import type { Utilisateur } from '@/types'

export const AuthContext = createContext<Utilisateur | null>(null)

export function AuthProvider({ utilisateur, children }: { utilisateur: Utilisateur; children: React.ReactNode }) {
  return <AuthContext.Provider value={utilisateur}>{children}</AuthContext.Provider>
}
