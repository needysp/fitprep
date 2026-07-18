import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09L2.18 7.07C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.86-3c-1.01.68-2.31 1.08-3.42 1.08-2.86 0-5.29-1.93-6.16-4.53l-3.66 2.84C3.99 20.53 7.7 23 12 23z"
      />
    </svg>
  )
}

export function LoginPage() {
  const { loading, user, profile } = useAuth()

  if (loading) return null
  if (user) return <Navigate to={profile ? '/' : '/onboarding'} replace />

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <h1 className="text-2xl font-semibold tracking-tight text-primary-strong">FitPrep</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Training, meal prep and your weekly shopping list — in one place.
        </p>
        <a
          href="/api/auth/login"
          className="mt-8 flex items-center justify-center gap-3 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-primary-tint"
        >
          <GoogleIcon />
          Sign in with Google
        </a>
      </div>
    </div>
  )
}
