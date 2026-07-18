import { NavLink, Outlet } from 'react-router-dom'
import {
  Dumbbell,
  LayoutDashboard,
  LogOut,
  ShoppingCart,
  UtensilsCrossed,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/training', label: 'Training', short: 'Training', icon: Dumbbell, end: false },
  { to: '/recipes', label: 'Recipes', short: 'Recipes', icon: UtensilsCrossed, end: false },
  { to: '/shopping', label: 'Shopping List', short: 'Shopping', icon: ShoppingCart, end: false },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const name = user?.display_name || user?.email || ''
  const initial = name.charAt(0).toUpperCase() || '?'

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 hidden w-64 flex-col border-r border-line bg-parchment px-4 py-6 md:flex">
        <div className="px-3 text-xl font-semibold tracking-tight text-primary-strong">
          FitPrep
        </div>
        <div className="mt-6 flex items-center gap-3 px-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-tint font-semibold text-primary-strong">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="truncate text-xs text-ink-soft">{user?.email}</div>
          </div>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-ink-soft hover:bg-primary-tint hover:text-ink'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => void logout()}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-primary-tint hover:text-ink"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-line bg-parchment px-4 py-3 md:hidden">
        <div className="text-lg font-semibold tracking-tight text-primary-strong">FitPrep</div>
        <button
          onClick={() => void logout()}
          aria-label="Sign out"
          className="p-1 text-ink-soft"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Content */}
      <main className="px-4 py-6 pb-24 md:ml-64 md:px-10 md:py-10">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-white/95 backdrop-blur md:hidden">
        {navItems.map(({ to, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-xs font-medium ${
                isActive ? 'text-primary' : 'text-ink-soft'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {short}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
