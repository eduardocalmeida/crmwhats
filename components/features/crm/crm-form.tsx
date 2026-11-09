'use client'

/** Primitivas de formulário compactas usadas nos componentes do CRM. */
import { cn } from '@/lib/utils'

export const fieldCls =
  'w-full rounded-md border border-[var(--ds-border-default)] bg-[var(--ds-bg-base)] px-3 py-2 text-sm text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:border-primary-500 disabled:opacity-60'

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="text-xs font-medium text-[var(--ds-text-secondary)]">{label}</span>
      {children}
    </label>
  )
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  ariaLabel?: string
}) {
  return (
    <select className={fieldCls} value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
