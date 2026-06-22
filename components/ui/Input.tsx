import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
}

export default function Input({ label, error, hint, icon, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          {...props}
          id={inputId}
          className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
            placeholder:text-gray-400
            ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : 'border-gray-300'}
            ${icon ? 'pl-9' : ''}
            ${className}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, className = '', id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        {...props}
        id={inputId}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors resize-none
          focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
          placeholder:text-gray-400
          ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : 'border-gray-300'}
          ${className}`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
