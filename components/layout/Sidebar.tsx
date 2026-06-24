'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Utilisateur } from '@/types'
import Avatar from '@/components/ui/Avatar'
import { libelleRole } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: string[]
}

const navItems: NavItem[] = [
  {
    href: '/secretaire',
    label: 'Accueil',
    roles: ['secretaire', 'admin'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/secretaire/visites',
    label: 'Visites du jour',
    roles: ['secretaire', 'admin'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/secretaire/rendez-vous',
    label: 'Rendez-vous',
    roles: ['secretaire', 'admin'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/secretaire/registre',
    label: 'Registre',
    roles: ['secretaire', 'admin'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: '/secretaire/messages',
    label: 'Messages',
    roles: ['secretaire', 'admin'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    href: '/dashboard',
    label: 'Tableau de bord',
    roles: ['collaborateur', 'patron'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/mes-visites',
    label: 'Mes visites',
    roles: ['collaborateur', 'patron'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/agenda',
    label: 'Mon agenda',
    roles: ['collaborateur', 'patron'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/messages',
    label: 'Messages',
    roles: ['collaborateur', 'patron'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/stats',
    label: 'Statistiques',
    roles: ['patron'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/securite',
    label: 'Liste noire',
    roles: ['admin', 'patron'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    href: '/rapports',
    label: 'Rapports',
    roles: ['admin', 'patron'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: '/display',
    label: 'Écran d\'accueil',
    roles: ['admin', 'patron'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/admin',
    label: 'Paramètres',
    roles: ['admin', 'patron'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

interface SidebarProps {
  utilisateur: Utilisateur
  collapsed?: boolean
}

// Constantes géométriques (py-2.5 + leading-5 = 20+20 = 40px, space-y-1 = 4px gap, py-4 = 16px top)
const ITEM_H = 40
const ITEM_GAP = 4
const NAV_PT = 16

export default function Sidebar({ utilisateur, collapsed = false }: SidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()
  const isResponsableSite = utilisateur.permissions?.responsable_site === true && utilisateur.role === 'collaborateur'
  const items = navItems.filter((item) => {
    if (item.roles.includes(utilisateur.role)) return true
    if (item.href === '/dashboard/stats' && (utilisateur.permissions?.voir_stats || isResponsableSite)) return true
    if (item.href === '/admin' && isResponsableSite) return true
    return false
  })
  const [rdvCount, setRdvCount] = useState(0)

  useEffect(() => {
    if (!['collaborateur', 'patron', 'admin'].includes(utilisateur.role)) return
    const today = new Date().toISOString().split('T')[0]
    const isPrimaire = ['patron', 'admin'].includes(utilisateur.role)

    const charger = async () => {
      let q = supabase
        .from('rendez_vous')
        .select('*', { count: 'exact', head: true })
        .eq('entreprise_id', utilisateur.entreprise_id)
        .eq('date_rdv', today)
        .eq('statut', 'confirme')
      if (!isPrimaire) q = q.eq('destinataire_id', utilisateur.id)
      const { count } = await q
      setRdvCount(count ?? 0)
    }

    charger()

    // Realtime : mise à jour du badge quand un RDV change
    const channel = supabase
      .channel(`sidebar-rdv-${utilisateur.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'rendez_vous',
        filter: `entreprise_id=eq.${utilisateur.entreprise_id}`,
      }, charger)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [utilisateur.id])

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}
      style={{ background: 'linear-gradient(180deg, rgb(var(--color-primary-rgb)) 0%, rgb(var(--color-primary-dark-rgb)) 60%, rgb(var(--color-primary-darker-rgb)) 100%)', boxShadow: '2px 0 12px rgb(var(--color-primary-darker-rgb) / 0.45)' }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 h-16 ${collapsed ? 'justify-center' : ''}`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-lg tracking-tight">VisitPro</span>
        )}
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {/* Sliding pill indicator — actif */}
        {(() => {
          const activeIdx = items.findIndex((item) =>
            pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/secretaire' && item.href !== '/admin' && pathname.startsWith(item.href))
          )
          if (activeIdx < 0) return null
          return (
            <div
              aria-hidden
              className="absolute left-3 right-3 rounded-xl z-0 pointer-events-none"
              style={{
                top: NAV_PT + activeIdx * (ITEM_H + ITEM_GAP),
                height: ITEM_H,
                background: 'rgba(255,255,255,0.12)',
                borderLeft: '3px solid rgba(255,255,255,0.7)',
                transition: 'top 280ms cubic-bezier(0.34,1.2,0.64,1)',
              }}
            />
          )
        })()}

        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/secretaire' && item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group relative z-10 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 ease-out
                ${isActive
                  ? 'text-white'
                  : [
                      'text-white/55',
                      'hover:text-white',
                      'hover:translate-x-1.5',
                      'hover:bg-white/[0.13]',
                      'hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.2)]',
                    ].join(' ')
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              {/* Icône — scale + lueur sur hover */}
              <span
                className={`flex-shrink-0 transition-all duration-200 ease-out
                  ${isActive
                    ? 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]'
                    : 'text-white/50 group-hover:text-white group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                  }
                `}
              >
                {item.icon}
              </span>

              {!collapsed && (
                <span className="flex-1 truncate tracking-wide">{item.label}</span>
              )}

              {/* Flèche apparaît au hover */}
              {!collapsed && !isActive && (
                <svg
                  className="w-3.5 h-3.5 text-white/0 group-hover:text-white/50 transition-all duration-200 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 flex-shrink-0"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              )}

              {item.href === '/dashboard/agenda' && rdvCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center transition-transform duration-200 group-hover:scale-110
                  ${isActive ? 'bg-white/25 text-white' : 'bg-white/20 text-white/80'}
                `}>
                  {rdvCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Super Admin */}
      {utilisateur.is_super_admin && !collapsed && (
        <div className="px-3 pb-2">
          <Link
            href="/superadmin"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Espace Super Admin
          </Link>
        </div>
      )}

      {/* Profil utilisateur */}
      <div
        className={`p-3 ${collapsed ? 'flex justify-center' : ''}`}
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)' }}
      >
        <div className={`flex items-center gap-3 ${collapsed ? '' : 'px-1'}`}>
          <Avatar nom={utilisateur.nom} prenom={utilisateur.prenom} photoUrl={utilisateur.photo_url ?? undefined} size="sm" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{utilisateur.prenom} {utilisateur.nom}</p>
              <p className="text-xs text-white/55 truncate">{utilisateur.poste ?? libelleRole(utilisateur.role)}</p>
              <p className="text-[10px] text-white/40 font-medium truncate mt-0.5">
                {utilisateur.site?.nom ?? utilisateur.entreprise?.nom ?? ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
