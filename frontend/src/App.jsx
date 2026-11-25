import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { checkAuth } from './store/slices/authSlice'

// Layout & Auth guards
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Public pages
import StoriesInMotionHero from './components/StoriesInMotionHero'
import LoginPage from './views/auth/LoginPage'
import SignupPage from './views/auth/SignupPage'
import ForgotPasswordPage from './views/auth/ForgotPasswordPage'
import ResetPasswordPage from './views/auth/ResetPasswordPage'
import VerifyEmailPage from './views/auth/VerifyEmailPage'

// App views (previewable during 120s guest session or authenticated)
import DiscoverView from './views/DiscoverView'
import KnowledgeView from './views/KnowledgeView'
import KnowledgeStudioView from './views/KnowledgeStudioView'
import KnowledgeReaderView from './views/KnowledgeReaderView'
import CirclesView from './views/CirclesView'
import PeopleView from './views/PeopleView'
import ProfileView from './views/ProfileView'

// Strictly protected views (require logged-in account)
import LibraryView from './views/LibraryView'
import ActivityView from './views/ActivityView'
import MessagesView from './views/MessagesView'
import AdminView from './views/AdminView'

export default function App() {
  const dispatch = useDispatch()

  // On mount, attempt to restore session from stored JWT
  useEffect(() => {
    dispatch(checkAuth())
  }, [dispatch])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing & auth flows */}
        <Route path="/" element={<StoriesInMotionHero />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Orvexa App Layout */}
        <Route element={<AppLayout />}>
          {/* Public Preview & Authenticated Routes */}
          <Route path="/app" element={<DiscoverView />} />
          <Route path="/discover" element={<DiscoverView />} />
          <Route path="/knowledge" element={<KnowledgeView />} />
          <Route path="/knowledge/:articleId" element={<KnowledgeReaderView />} />
          <Route
            path="/knowledge/studio/:draftId"
            element={
              <ProtectedRoute>
                <KnowledgeStudioView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/knowledge/studio"
            element={
              <ProtectedRoute>
                <KnowledgeStudioView />
              </ProtectedRoute>
            }
          />
          <Route path="/circles" element={<CirclesView />} />
          <Route path="/people" element={<PeopleView />} />
          <Route path="/people-companies" element={<Navigate to="/people" replace />} />
          <Route path="/profile/:username" element={<ProfileView />} />
          <Route path="/profile" element={<ProfileView />} />

          {/* Strictly Protected Routes (Require active user session) */}
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <LibraryView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <ProtectedRoute>
                <ActivityView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminView />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
