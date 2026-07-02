import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import TopBar from '@/components/layout/TopBar'
import NotificationHandler from '@/components/layout/NotificationHandler'
import TrialBanner from '@/components/layout/TrialBanner'
import EssaiExpire from '@/components/layout/EssaiExpire'
import RdvProchainsBanner from '@/components/layout/RdvProchainsBanner'
import { AuthProvider } from '@/contexts/AuthContext'
import ThemeProvider from '@/components/providers/ThemeProvider'

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

  const { data: abonnement } = await supabase
    .from('abonnements')
    .select('statut, date_fin_essai, date_fin')
    .eq('entreprise_id', utilisateur.entreprise_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const now = new Date()

  const isEssai        = abonnement?.statut === 'essai'
  const dateFinEssai   = abonnement?.date_fin_essai ? new Date(abonnement.date_fin_essai) : null
  const isEssaiExpire  = isEssai && dateFinEssai !== null && dateFinEssai < now
  const joursEssai     = isEssai && dateFinEssai && !isEssaiExpire
    ? Math.max(0, Math.ceil((dateFinEssai.getTime() - now.getTime()) / 86400000))
    : null

  const isActif        = abonnement?.statut === 'actif'
  const dateFinActif   = abonnement?.date_fin ? new Date(abonnement.date_fin) : null
  const isActifExpire  = isActif && dateFinActif !== null && dateFinActif < now
  const joursActif     = isActif && dateFinActif && !isActifExpire
    ? Math.max(0, Math.ceil((dateFinActif.getTime() - now.getTime()) / 86400000))
    : null

  const isExpire          = isEssaiExpire || isActifExpire
  const typeExpire        = isActifExpire ? 'abonnement' : 'essai'
  const showRenewalBanner = isActif && !isActifExpire && joursActif !== null && joursActif <= 14

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {isEssai && !isEssaiExpire && joursEssai !== null && (
        <TrialBanner joursRestants={joursEssai} type="essai" />
      )}
      {showRenewalBanner && joursActif !== null && (
        <TrialBanner joursRestants={joursActif} type="renouvellement" />
      )}

      <div className="flex flex-1 min-h-0">
        <Sidebar utilisateur={utilisateur} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Bandeau coloré secrétaire */}
          <div className="h-1 bg-gradient-to-r from-accent to-primary" />
          <TopBar utilisateur={utilisateur} />
          <NotificationHandler utilisateurId={utilisateur.id} />
          {!isExpire && (
            <RdvProchainsBanner
              entrepriseId={utilisateur.entreprise_id}
              role={utilisateur.role}
              utilisateurId={utilisateur.id}
            />
          )}

          <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
            <AuthProvider utilisateur={utilisateur as never}>
              <ThemeProvider />
              {isExpire ? <EssaiExpire role={utilisateur.role} type={typeExpire} /> : children}
            </AuthProvider>
          </main>
        </div>

        <BottomNav utilisateur={utilisateur} />
      </div>
    </div>
  )
}
