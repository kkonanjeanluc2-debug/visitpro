import React from 'react'

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  danger: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  success: 'bg-green-500',
  danger: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
}

export default function Badge({ children, variant = 'default', className = '', dot = false }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}
