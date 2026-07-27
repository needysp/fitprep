import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { AdminUser, AllowedEmail, UserRole } from '../api/types'

const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10'

function RoleBadge({ role }: { role: UserRole }) {
  const isAdmin = role === 'admin'
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isAdmin ? 'bg-primary-tint text-primary-strong' : 'bg-parchment text-ink-soft'
      }`}
    >
      {isAdmin ? 'Admin' : 'User'}
    </span>
  )
}

export function AdminPage() {
  const [allowlist, setAllowlist] = useState<AllowedEmail[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    const [a, u] = await Promise.all([
      api.get<AllowedEmail[]>('/api/admin/allowlist'),
      api.get<AdminUser[]>('/api/admin/users'),
    ])
    setAllowlist(a)
    setUsers(u)
  }

  useEffect(() => {
    load()
      .catch(() => setError('Could not load admin data.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/api/admin/allowlist', { email, role, note })
      setEmail('')
      setNote('')
      setRole('user')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add email.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(id: number) {
    setError('')
    try {
      await api.del(`/api/admin/allowlist/${id}`)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove email.')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Admin</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
        Only people on this allowlist can sign in. Add someone's email before they log in with
        Google for the first time; the role you pick is what they'll get.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-danger/20 bg-danger/5 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="mt-8 rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
      >
        <h2 className="font-semibold">Allow a new email</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="friend@example.com"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className={inputCls}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Note (optional)
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputCls}
              placeholder="e.g. gym buddy"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-strong disabled:opacity-60"
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>

      {/* Allowlist */}
      <section className="mt-8">
        <h2 className="font-semibold">Allowlist</h2>
        <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          {loading ? (
            <p className="px-6 py-8 text-center text-sm text-ink-soft">Loading…</p>
          ) : allowlist.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-ink-soft">
              No one is on the allowlist yet.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {allowlist.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{entry.email}</div>
                    {entry.note && (
                      <div className="truncate text-xs text-ink-soft">{entry.note}</div>
                    )}
                  </div>
                  <RoleBadge role={entry.role} />
                  <span
                    className={`hidden text-xs sm:inline ${
                      entry.registered ? 'text-ink-soft' : 'text-primary'
                    }`}
                  >
                    {entry.registered ? 'Signed in' : 'Not yet signed in'}
                  </span>
                  <button
                    onClick={() => handleRemove(entry.id)}
                    aria-label={`Remove ${entry.email}`}
                    className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-danger/5 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Registered users */}
      <section className="mt-8">
        <h2 className="font-semibold">Registered users</h2>
        <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          {loading ? (
            <p className="px-6 py-8 text-center text-sm text-ink-soft">Loading…</p>
          ) : users.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-ink-soft">No one has signed in yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {users.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {u.display_name || u.email}
                    </div>
                    <div className="truncate text-xs text-ink-soft">{u.email}</div>
                  </div>
                  <RoleBadge role={u.role} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
