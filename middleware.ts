import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Stockage en mémoire par instance serveur.
// Sur Vercel (serverless multi-instance) : migrer vers Upstash Redis pour
// une protection totale. En l'état, limite les abus sur chaque instance.

type RLEntry = { count: number; resetAt: number }
const rlStore = new Map<string, RLEntry>()
let lastCleanup = Date.now()

const ROUTES_LIMITEES: Record<string, { limit: number; windowSec: number }> = {
  '/api/register':    { limit: 5,  windowSec: 3600 },  // 5 inscriptions / heure
  '/api/email':       { limit: 30, windowSec: 60   },  // 30 emails / minute
  '/api/sms':         { limit: 10, windowSec: 60   },  // 10 SMS / minute (coût !)
  '/api/auth/invite': { limit: 20, windowSec: 3600 },  // 20 invitations / heure
  '/api/sites':       { limit: 60, windowSec: 60   },  // 60 requêtes / minute
}

function verifierRateLimit(
  pathname: string,
  ip: string,
): { bloque: boolean; retryAfter: number } {
  const regle = Object.entries(ROUTES_LIMITEES).find(([p]) => pathname.startsWith(p))
  if (!regle) return { bloque: false, retryAfter: 0 }

  const [route, { limit, windowSec }] = regle
  const now = Date.now()

  // Nettoyage périodique (toutes les 5 min) pour éviter les fuites mémoire
  if (now - lastCleanup > 5 * 60 * 1000) {
    Array.from(rlStore.entries()).forEach(([k, e]) => {
      if (e.resetAt < now) rlStore.delete(k)
    })
    lastCleanup = now
  }

  const key = `${route}:${ip}`
  const entry = rlStore.get(key)

  if (!entry || entry.resetAt < now) {
    rlStore.set(key, { count: 1, resetAt: now + windowSec * 1000 })
    return { bloque: false, retryAfter: 0 }
  }

  if (entry.count >= limit) {
    return { bloque: true, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { bloque: false, retryAfter: 0 }
}

// ─── Middleware principal ─────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Routes API : rate limiting uniquement, pas de vérification auth ──────
  if (pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    const { bloque, retryAfter } = verifierRateLimit(pathname, ip)

    if (bloque) {
      return NextResponse.json(
        { erreur: 'Trop de requêtes. Veuillez patienter avant de réessayer.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'Content-Type': 'application/json',
          },
        }
      )
    }

    return NextResponse.next()
  }

  // ── Pages : vérification session + protection par rôle ───────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Routes publiques — écran d'affichage avec token (accessible sans connexion)
  // /display/[token] est public ; /display (config admin) nécessite auth
  if (pathname.startsWith('/display/') && pathname !== '/display') {
    return NextResponse.next()
  }

  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
    if (user) {
      const { data: utilisateur } = await supabase
        .from('utilisateurs')
        .select('role')
        .eq('id', user.id)
        .single()

      if (utilisateur) {
        return redirectByRole(utilisateur.role, false, request)
      }
    }
    return supabaseResponse
  }

  // Routes protégées : pas de session → login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('role, permissions, actif, is_super_admin')
    .eq('id', user.id)
    .single()

  if (!utilisateur) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Compte désactivé (essai expiré ou suspension) → page dédiée
  if (!utilisateur.actif && !utilisateur.is_super_admin && !pathname.startsWith('/compte-suspendu')) {
    return NextResponse.redirect(new URL('/compte-suspendu', request.url))
  }

  const role = utilisateur.role
  const perms = utilisateur.permissions as Record<string, boolean> | null
  const isResponsableSite = perms?.responsable_site === true

  if (pathname.startsWith('/secretaire') && !['secretaire', 'admin'].includes(role)) {
    return redirectByRole(role, isResponsableSite, request)
  }

  if (pathname.startsWith('/dashboard') && !['collaborateur', 'patron', 'admin'].includes(role)) {
    return redirectByRole(role, isResponsableSite, request)
  }

  if (pathname.startsWith('/admin') && !['admin', 'patron', 'collaborateur'].includes(role) && !isResponsableSite) {
    return redirectByRole(role, isResponsableSite, request)
  }

  const routesAdminPatron = ['/rapports', '/display']
  if (routesAdminPatron.some((r) => pathname.startsWith(r)) && !['admin', 'patron'].includes(role) && !isResponsableSite) {
    return redirectByRole(role, isResponsableSite, request)
  }

  if (pathname.startsWith('/securite') && !['admin', 'patron', 'collaborateur'].includes(role)) {
    return redirectByRole(role, isResponsableSite, request)
  }

  if (pathname === '/dashboard/stats' && role !== 'patron' && role !== 'admin' && !isResponsableSite) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

function redirectByRole(role: string, isResponsableSite: boolean, request: NextRequest): NextResponse {
  if (isResponsableSite && role === 'collaborateur') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }
  const map: Record<string, string> = {
    secretaire:    '/secretaire',
    collaborateur: '/dashboard',
    patron:        '/dashboard',
    admin:         '/admin',
  }
  return NextResponse.redirect(new URL(map[role] ?? '/login', request.url))
}

export const config = {
  matcher: [
    // Routes API (rate limiting)
    '/api/:path*',
    // Pages (auth) — exclut les assets statiques
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
