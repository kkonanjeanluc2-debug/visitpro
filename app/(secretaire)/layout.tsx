import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import TopBar from '@/components/layout/TopBar'
import NotificationHandler from '@/components/layout/NotificationHandler'
import { AuthProvider } from '@/contexts/AuthContext'

export default async function SecretaireLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('*, entreprise:entreprises(*), site:site_id(id,nom)')
    .eq('id', user.id)
    .single()

  if (!utilisateur) redirect('/login')
  if (!['secretaire', 'admin'].includes(utilisateur.role)) redirect('/dashboard')

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar utilisateur={utilisateur} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Bandeau coloré secrétaire */}
        <div className="h-1 bg-gradient-to-r from-accent to-primary" />
        <TopBar utilisateur={utilisateur} titre="Espace Secrétaire" />
        <NotificationHandler utilisateurId={utilisateur.id} />

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

