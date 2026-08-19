'use client'

import type { StatutReunion } from '@/types'

const CONFIG: Record<StatutReunion, { label: string; cls: string; dot?: boolean }> = {
  planifiee: { label: 'Planifiée', cls: 'bg-blue-100 text-blue-700' },
  en_cours:  { label: 'En cours',  cls: 'bg-emerald-100 text-emerald-700', dot: true },
  terminee:  { label: 'Terminée',  cls: 'bg-gray-100 text-gray-500' },
  annulee:   { label: 'Annulée',   cls: 'bg-red-100 text-red-600' },
}

export default function ReunionBadge({ statut, size = 'sm' }: { statut: StatutReunion; size?: 'xs' | 'sm' }) {
  const { label, cls, dot } = CONFIG[statut]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${cls} ${size === 'xs' ? 'px-1.5 py-0 text-[10px]' : 'px-2.5 py-0.5 text-xs'}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
      {label}
    </span>
  )
}
