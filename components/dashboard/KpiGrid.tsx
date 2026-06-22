import type { DashboardStats } from '@/types'
import { formatDuree } from '@/lib/utils'

interface KpiGridProps {
  stats: DashboardStats
  loading?: boolean
}

export default function KpiGrid({ stats, loading = false }: KpiGridProps) {
  const kpis = [
    {
      label: 'Visites aujourd\'hui',
      value: stats.visites_aujourd_hui,
      icon: '👥',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
    },
    {
      label: 'En attente',
      value: stats.visites_en_attente,
      icon: '⏳',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      urgent: stats.visites_en_attente > 3,
    },
    {
      label: 'Acceptées',
      value: stats.visites_acceptees,
      icon: '✓',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
    },
    {
      label: 'Temps attente moyen',
      value: stats.temps_attente_moyen > 0 ? formatDuree(stats.temps_attente_moyen) : '—',
      icon: '⏱',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-200',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-28" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`${kpi.bgColor} border ${kpi.borderColor} rounded-2xl p-4 ${kpi.urgent ? 'ring-2 ring-amber-400' : ''}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-2xl">{kpi.icon}</span>
            {kpi.urgent && (
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            )}
          </div>
          <p className={`text-2xl font-bold mt-2 ${kpi.textColor}`}>{kpi.value}</p>
          <p className="text-xs text-gray-600 mt-1">{kpi.label}</p>
        </div>
      ))}
    </div>
  )
}
