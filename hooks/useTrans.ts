'use client'

import { useState, useEffect } from 'react'
import t, { type Lang, type Translations } from '@/lib/translations'

export function useTrans(): Translations {
  const [lang, setLang] = useState<Lang>('fr')

  useEffect(() => {
    const stored = (localStorage.getItem('visitpro-langue') ?? 'fr') as Lang
    setLang(stored === 'en' ? 'en' : 'fr')

    const handler = () => {
      const updated = (localStorage.getItem('visitpro-langue') ?? 'fr') as Lang
      setLang(updated === 'en' ? 'en' : 'fr')
    }
    window.addEventListener('visitpro-lang-change', handler)
    return () => window.removeEventListener('visitpro-lang-change', handler)
  }, [])

  return t[lang]
}
