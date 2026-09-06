'use client'

import { useCallback, useState } from 'react'

const KEY = 'vp_dash_site'

export function useSiteFilter() {
  const [siteId, setSiteIdRaw] = useState<string>(() => {
    try { return sessionStorage.getItem(KEY) ?? '' } catch { return '' }
  })
  const setSiteId = useCallback((val: string) => {
    try { val ? sessionStorage.setItem(KEY, val) : sessionStorage.removeItem(KEY) } catch {}
    setSiteIdRaw(val)
  }, [])
  // siteId : null = tous les sites, string = un site précis
  return { siteId: siteId || null, siteIdRaw: siteId, setSiteId }
}
