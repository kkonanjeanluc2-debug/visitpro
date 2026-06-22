import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import TopBar from '@/components/layout/TopBar'
import { AuthProvider } from '@/contexts/AuthContext'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('*, entreprise:entreprises(*), site:site_id(id,nom)')
    .eq('id', user.id)
    .single()

  if (!utilisateur) redirect('/login')

  const isResponsableSite = utilisateur.permissions?.responsable_site === true
  if (!['admin', 'patron'].includes(utilisateur.role) && !isResponsableSite) redirect('/dashboard')

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar utilisateur={utilisateur} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar utilisateur={utilisateur} titre="Paramètres" />

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <AuthProvider utilisateur={utilisateur as never}>
            {children}
          </AuthProvider>
        </main>
      </div>

      <BottomNav utilisateur={utilisateur} />
    </div>
  )
}

