import React from 'react'
import { getInitiales } from '@/lib/utils'

interface AvatarProps {
  nom: string
  prenom?: string
  photoUrl?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

const colors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-amber-500',
]

function getColorIndex(nom: string): number {
  let hash = 0
  for (let i = 0; i < nom.length; i++) {
    hash = nom.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % colors.length
}

export default function Avatar({ nom, prenom, photoUrl, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  const initiales = getInitiales(nom, prenom)
  const colorClass = colors[getColorIndex(nom)]

  if (photoUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={`${prenom ?? ''} ${nom}`}
        className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0 ${className}`}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
    >
      {initiales}
    </div>
  )
}
