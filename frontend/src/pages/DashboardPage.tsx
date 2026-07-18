import { Link } from 'react-router-dom'
import { Dumbbell, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

const sections = [
  {
    to: '/training',
    title: 'Training',
    description: 'Build routines and log your workouts.',
    icon: Dumbbell,
    slice: 1,
  },
  {
    to: '/recipes',
    title: 'Recipes',
    description: 'Meal-prep recipes with macros.',
    icon: UtensilsCrossed,
    slice: 2,
  },
  {
    to: '/shopping',
    title: 'Shopping List',
    description: "Plan the week and shop once.",
    icon: ShoppingCart,
    slice: 3,
  },
]

export function DashboardPage() {
  const { user } = useAuth()
  const firstName = (user?.display_name || '').split(' ')[0]

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        Welcome back{firstName ? `, ${firstName}` : ''}.
      </h1>
      <p className="mt-2 text-sm text-ink-soft">Ready to crush today's goals?</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ to, title, description, icon: Icon, slice }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-colors hover:bg-primary-tint/40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-tint text-primary-strong">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{description}</p>
            <span className="mt-4 inline-block rounded-full bg-parchment px-3 py-1 text-xs font-medium text-ink-soft">
              Coming in Slice {slice}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
