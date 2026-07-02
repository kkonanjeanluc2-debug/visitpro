import Link from 'next/link'

interface Props {
  joursRestants: number
  type?: 'essai' | 'renouvellement'
}

export default function TrialBanner({ joursRestants, type = 'essai' }: Props) {
  const urgent  = joursRestants <= 3
  const warning = joursRestants <= 7 && !urgent

  const bg        = urgent ? 'bg-red-600' : warning ? 'bg-amber-500' : type === 'renouvellement' ? 'bg-orange-600' : 'bg-indigo-700'
  const btnColor  = urgent ? '#dc2626'    : warning ? '#d97706'       : type === 'renouvellement' ? '#c2410c'      : '#3730a3'

  const message = type === 'renouvellement'
    ? joursRestants <= 0
      ? 'Votre abonnement expire aujourd\'hui — renouvelez maintenant'
      : `Abonnement — expire dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`
    : joursRestants <= 0
      ? "Votre période d'essai expire aujourd'hui"
      : `Essai gratuit — ${joursRestants} jour${joursRestants > 1 ? 's' : ''} restant${joursRestants > 1 ? 's' : ''}`

  const btnLabel = type === 'renouvellement' ? 'Renouveler' : 'Souscrire'

  return (
    <div className={`${bg} flex items-center justify-center gap-3 px-4 py-2 text-sm`}>
      <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-white font-medium">{message}</span>
      <Link
        href="/admin/abonnement"
        className="ml-2 bg-white text-xs font-bold px-3 py-1 rounded-lg hover:opacity-90 transition-opacity"
        style={{ color: btnColor }}
      >
        {btnLabel}
      </Link>
    </div>
  )
}
