import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function buildSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          )
        },
      },
    }
  )
}

const STATUTS_VALIDES = ['disponible', 'en_reunion', 'ne_pas_deranger', 'absent']

export async function PATCH(request: NextRequest) {
  try {
    const supabase = buildSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { statut_dispo, dispo_retour_auto } = body

    if (!STATUTS_VALIDES.includes(statut_dispo)) {
      return NextResponse.json({ erreur: 'Statut invalide' }, { status: 400 })
    }

    const { error } = await supabase
      .from('utilisateurs')
      .update({
        statut_dispo,
        dispo_retour_auto: dispo_retour_auto ?? null,
      })
      .eq('id', user.id)

    if (error) return NextResponse.json({ erreur: error.message }, { status: 500 })
    return NextResponse.json({ succes: true })
  } catch {
    return NextResponse.json({ erreur: 'Erreur interne' }, { status: 500 })
  }
}

// Compatibilité POST (ancien code)
export async function POST(request: NextRequest) {
  return PATCH(request)
}
