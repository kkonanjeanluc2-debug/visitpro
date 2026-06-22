import React from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
}

export default function Select({ label, error, hint, options, placeholder, className = '', id, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        {...props}
        id={inputId}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
          ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : 'border-gray-300'}
          ${props.value === '' || props.value === undefined ? 'text-gray-400' : 'text-gray-900'}
          ${className}`}
      >
        {placeholder && (
          <option value="" className="text-gray-400">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-gray-900">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
