import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import TopBar from '@/components/layout/TopBar'
import TrialBanner from '@/components/layout/TrialBanner'
import EssaiExpire from '@/components/layout/EssaiExpire'
import { AuthProvider } from '@/contexts/AuthContext'
import ThemeProvider from '@/components/providers/ThemeProvider'

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
  if (!['admin', 'patron', 'collaborateur'].includes(utilisateur.role) && !isResponsableSite) redirect('/dashboard')

  const { data: abonnement } = await supabase
    .from('abonnements')
    .select('statut, date_fin_essai')
    .eq('entreprise_id', utilisateur.entreprise_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const now       = new Date()
  const isEssai   = abonnement?.statut === 'essai'
  const dateFin   = abonnement?.date_fin_essai ? new Date(abonnement.date_fin_essai) : null
  const isExpire  = isEssai && dateFin !== null && dateFin < now
  const joursRestants =
    isEssai && dateFin && !isExpire
      ? Math.max(0, Math.ceil((dateFin.getTime() - now.getTime()) / 86400000))
      : null

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {isEssai && !isExpire && joursRestants !== null && (
        <TrialBanner joursRestants={joursRestants} />
      )}

      <div className="flex flex-1 min-h-0">
        <Sidebar utilisateur={utilisateur} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar utilisateur={utilisateur} />

          <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
            <AuthProvider utilisateur={utilisateur as never}>
              <ThemeProvider />
              {isExpire ? <EssaiExpire role={utilisateur.role} /> : children}
            </AuthProvider>
          </main>
        </div>

        <BottomNav utilisateur={utilisateur} />
      </div>
    </div>
  )
}
