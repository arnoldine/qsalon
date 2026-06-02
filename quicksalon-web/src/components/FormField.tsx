import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  children: ReactNode
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}
