import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export default function Card({ children, className = '', noPadding = false }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${noPadding ? '' : 'p-5'} ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-base font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  )
}
