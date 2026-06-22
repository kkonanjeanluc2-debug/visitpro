'use client'

import React from 'react'

type Variant = 'primary' | 'accent' | 'danger' | 'ghost' | 'outline' | 'warning'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-600 active:bg-primary-700 border-transparent',
  accent: 'bg-accent text-white hover:bg-accent-600 active:bg-accent-700 border-transparent',
  danger: 'bg-danger text-white hover:bg-red-600 active:bg-red-700 border-transparent',
  warning: 'bg-warning text-white hover:bg-amber-500 active:bg-amber-600 border-transparent',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 border-transparent',
  outline: 'bg-transparent text-primary border-primary hover:bg-primary-50',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
    </button>
  )
}
