'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Utilisateur } from '@/types'

interface BottomNavProps {
  utilisateur: Utilisateur
  notifCount?: number
}

export default function BottomNav({ utilisateur, notifCount = 0 }: BottomNavProps) {
  const pathname = usePathname()
  const role = utilisateur.role
  const [plusOpen, setPlusOpen] = useState(false)

  const peutVoirStats = role === 'patron' || role === 'admin' || utilisateur.permissions?.voir_stats

  // Items principaux (toujours visibles)
  const mainItems =
    ['secretaire', 'admin'].includes(role)
      ? [
          { href: '/secretaire',          label: 'Accueil',   icon: HomeIcon    },
          { href: '/secretaire/visites',   label: 'Visites',   icon: UsersIcon   },
          { href: '/secretaire/rendez-vous', label: 'RDV',     icon: CalendarIcon },
          { href: '/secretaire/messages',  label: 'Messages',  icon: ChatIcon    },
          { href: '/secretaire/registre',  label: 'Registre',  icon: DocumentIcon },
        ]
      : [
          { href: '/dashboard',           label: 'Accueil',   icon: GridIcon,   badge: notifCount },
          { href: '/dashboard/mes-visites', label: 'Visites', icon: UserIcon    },
          { href: '/dashboard/agenda',    label: 'Agenda',    icon: CalendarIcon },
          { href: '/dashboard/messages',  label: 'Messages',  icon: ChatIcon    },
          { href: '__plus__',             label: 'Plus',      icon: DotsIcon    },
        ]

  // Items dans le menu "Plus" (patron/collaborateur)
  const plusItems = [
    ...(peutVoirStats ? [{ href: '/dashboard/stats', label: 'Statistiques', icon: ChartIcon }] : []),
    { href: '/admin',    label: 'Paramètres',   icon: SettingsIcon  },
    { href: '/rapports', label: 'Rapports',      icon: ReportIcon    },
    { href: '/securite', label: 'Liste noire',   icon: ShieldIcon    },
    { href: '/display',  label: "Écran d'accueil", icon: DisplayIcon },
  ]

  const isActive = (href: string) =>
    pathname === href || (href.length > 1 && pathname.startsWith(href) && href !== '/secretaire' && href !== '/dashboard')

  const anyPlusActive = plusItems.some((i) => isActive(i.href))

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-30 safe-area-pb">
        {mainItems.map((item) => {
          if (item.href === '__plus__') {
            return (
              <button
                key="plus"
                onClick={() => setPlusOpen(true)}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${anyPlusActive ? 'text-primary' : 'text-gray-500'}`}
              >
                <DotsIcon className={`w-5 h-5 ${anyPlusActive ? 'text-primary' : 'text-gray-400'}`} />
                <span>Plus</span>
              </button>
            )
          }

          const active = isActive(item.href)
          const Icon = item.icon
          const badge = 'badge' in item ? (item as { badge?: number }).badge : 0

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${active ? 'text-primary' : 'text-gray-500'}`}
            >
              <span className="relative">
                <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-gray-400'}`} />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                    {badge}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom sheet "Plus" */}
      {plusOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setPlusOpen(false)} />
          <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white rounded-t-2xl z-50 pb-safe">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-4" />
            <div className="grid grid-cols-3 gap-1 px-4 pb-8">
              {plusItems.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setPlusOpen(false)}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-colors ${active ? 'bg-primary/10 text-primary' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Icon className={`w-6 h-6 ${active ? 'text-primary' : 'text-gray-400'}`} />
                    <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}

function HomeIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}
function UsersIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function CalendarIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
function DocumentIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
function GridIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}
function UserIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
function ChatIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  )
}
function ChartIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}
function SettingsIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function ReportIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
function ShieldIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}
function DisplayIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}
function DotsIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  )
}
