import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AppLayout } from './components/AppLayout'
import { AdminPage } from './pages/AdminPage'
import { BodyweightPage } from './pages/BodyweightPage'
import { DashboardPage } from './pages/DashboardPage'
import { ExerciseHistoryPage } from './pages/ExerciseHistoryPage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipesPage } from './pages/RecipesPage'
import { RoutinesPage } from './pages/RoutinesPage'
import { SessionPage } from './pages/SessionPage'
import { TrainingPage } from './pages/TrainingPage'

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

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/" replace />
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
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/training/routines" element={<RoutinesPage />} />
          <Route path="/training/session/:id" element={<SessionPage />} />
          <Route path="/training/exercise/:id" element={<ExerciseHistoryPage />} />
          <Route path="/bodyweight" element={<BodyweightPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
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
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
