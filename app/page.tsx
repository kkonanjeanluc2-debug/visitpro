import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/LandingPage'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: utilisateur } = await supabase
      .from('utilisateurs')
      .select('role, is_super_admin, permissions')
      .eq('id', user.id)
      .single()

    if (utilisateur) {
      if (utilisateur.is_super_admin) redirect('/superadmin')

      if (utilisateur.role === 'collaborateur' && (utilisateur.permissions as Record<string, boolean>)?.responsable_site) {
        redirect('/admin')
      }

      const redirectMap: Record<string, string> = {
        secretaire: '/secretaire',
        collaborateur: '/dashboard',
        patron: '/dashboard',
        admin: '/admin',
      }
      redirect(redirectMap[utilisateur.role] ?? '/dashboard')
    }
  }

  return <LandingPage />
}
