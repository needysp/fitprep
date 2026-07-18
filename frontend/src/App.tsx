import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AppLayout } from './components/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="h-8 w-8 animate-pulse rounded-full bg-primary" />
    </div>
  )
}

function Guarded({
  children,
  requireProfile = true,
}: {
  children: ReactNode
  requireProfile?: boolean
}) {
  const { loading, user, profile } = useAuth()
  if (loading) return <FullScreenSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (requireProfile && !profile) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/onboarding"
          element={
            <Guarded requireProfile={false}>
              <OnboardingPage />
            </Guarded>
          }
        />
        <Route
          element={
            <Guarded>
              <AppLayout />
            </Guarded>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route
            path="/training"
            element={
              <PlaceholderPage
                title="Training"
                description="Build routines, log sets with prefill from your last session, and track history, PRs and bodyweight."
                slice={1}
              />
            }
          />
          <Route
            path="/recipes"
            element={
              <PlaceholderPage
                title="Recipes"
                description="Easy meal-prep recipes by meal type, with macros, tags and photos."
                slice={2}
              />
            }
          />
          <Route
            path="/shopping"
            element={
              <PlaceholderPage
                title="Shopping List"
                description="Plan the week's meals day by day and get an aggregated, department-grouped shopping list."
                slice={3}
              />
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
