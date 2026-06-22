import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('role, is_super_admin, permissions')
    .eq('id', user.id)
    .single()

  if (!utilisateur) {
    redirect('/login')
  }

  if (utilisateur.is_super_admin) redirect('/superadmin')

  // Responsable de site → accès admin de leur site
  if (utilisateur.permissions?.responsable_site && utilisateur.role === 'collaborateur') {
    redirect('/admin')
  }

  const redirectMap: Record<string, string> = {
    secretaire: '/secretaire',
    collaborateur: '/dashboard',
    patron: '/dashboard',
    admin: '/admin',
  }

  redirect(redirectMap[utilisateur.role] ?? '/login')
}

