// Module-level in-memory cache — persists between component unmount/remount
// Keys: string built from query params; values: fetched arrays
const store = new Map<string, { data: unknown; ts: number }>()
const TTL = 60_000 // 60 seconds

export const queryCache = {
  get<T>(key: string): T | null {
    const e = store.get(key)
    if (!e) return null
    if (Date.now() - e.ts > TTL) { store.delete(key); return null }
    return e.data as T
  },
  set(key: string, data: unknown) {
    store.set(key, { data, ts: Date.now() })
  },
  has(key: string): boolean {
    const e = store.get(key)
    if (!e) return false
    if (Date.now() - e.ts > TTL) { store.delete(key); return false }
    return true
  },
}
