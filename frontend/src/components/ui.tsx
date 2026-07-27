import type { ReactNode } from 'react'

export const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10'

export const cardCls = 'rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-strong',
    secondary: 'border border-line bg-white text-primary hover:bg-primary-tint',
    ghost: 'text-ink-soft hover:bg-primary-tint hover:text-ink',
    danger: 'text-danger hover:bg-danger/5',
  }
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p className="mt-4 rounded-lg border border-danger/20 bg-danger/5 px-4 py-2 text-sm text-danger">
      {children}
    </p>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center text-sm text-ink-soft">
      {children}
    </div>
  )
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-parchment px-2.5 py-0.5 text-xs font-medium text-ink-soft">
      {children}
    </span>
  )
}

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
