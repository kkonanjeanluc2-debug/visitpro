// Two-tier cache: memory (instant, lost on refresh) + localStorage (instant, survives refresh)
// Pattern: show cached data immediately, refresh from network in background

const PREFIX = 'vp:'
const MEM_TTL = 60_000      // 1 min in memory
const LS_TTL  = 5 * 60_000  // 5 min in localStorage

type Entry = { data: unknown; ts: number }
const mem = new Map<string, Entry>()

function lsGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const e: Entry = JSON.parse(raw)
    if (Date.now() - e.ts > LS_TTL) { window.localStorage.removeItem(PREFIX + key); return null }
    return e.data as T
  } catch { return null }
}

function lsSet(key: string, data: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now() }))
  } catch { /* quota exceeded — silent fail */ }
}

export const queryCache = {
  get<T>(key: string): T | null {
    // 1. Memory (no serialization, fastest)
    const m = mem.get(key)
    if (m && Date.now() - m.ts < MEM_TTL) return m.data as T
    // 2. localStorage (survives page refresh)
    const ls = lsGet<T>(key)
    if (ls !== null) { mem.set(key, { data: ls, ts: Date.now() }); return ls }
    return null
  },
  set(key: string, data: unknown) {
    mem.set(key, { data, ts: Date.now() })
    lsSet(key, data)
  },
  has(key: string): boolean {
    return this.get(key) !== null
  },
  invalidate(prefix: string) {
    Array.from(mem.keys()).forEach(key => {
      if (key.startsWith(prefix)) mem.delete(key)
    })
    if (typeof window === 'undefined') return
    try {
      const keys: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (k?.startsWith(PREFIX + prefix)) keys.push(k)
      }
      keys.forEach(k => window.localStorage.removeItem(k))
    } catch {}
  },
}
