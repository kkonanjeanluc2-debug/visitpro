import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const { pathname } = request.nextUrl

  // Routes publiques
  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
    if (user) {
      // Utilisateur connecté sur page publique → rediriger selon le rôle
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
    .select('role, permissions')
    .eq('id', user.id)
    .single()

  if (!utilisateur) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = utilisateur.role
  const perms = utilisateur.permissions as Record<string, boolean> | null
  const isResponsableSite = perms?.responsable_site === true

  // Protection par zone
  if (pathname.startsWith('/secretaire') && !['secretaire', 'admin'].includes(role)) {
    return redirectByRole(role, isResponsableSite, request)
  }

  if (pathname.startsWith('/dashboard') && !['collaborateur', 'patron', 'admin'].includes(role)) {
    return redirectByRole(role, isResponsableSite, request)
  }

  if (pathname.startsWith('/admin') && !['admin', 'patron'].includes(role) && !isResponsableSite) {
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
    secretaire: '/secretaire',
    collaborateur: '/dashboard',
    patron: '/dashboard',
    admin: '/admin',
  }
  const dest = map[role] ?? '/login'
  return NextResponse.redirect(new URL(dest, request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

