import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SuperAdminSidebar from '@/components/superadmin/SuperAdminSidebar'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('*, entreprise:entreprises(*)')
    .eq('id', user.id)
    .single()

  if (!utilisateur || !utilisateur.is_super_admin) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <SuperAdminSidebar utilisateur={utilisateur} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
