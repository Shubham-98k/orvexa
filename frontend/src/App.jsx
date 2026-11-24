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

// Protected views
import DiscoverView from './views/DiscoverView'
import KnowledgeView from './views/KnowledgeView'
import CirclesView from './views/CirclesView'
import LibraryView from './views/LibraryView'
import ActivityView from './views/ActivityView'
import MessagesView from './views/MessagesView'
import ProfileView from './views/ProfileView'
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
        {/* Public */}
        <Route path="/" element={<StoriesInMotionHero />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Protected — all nested routes share AppLayout (sidebar + content area) */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/app" element={<DiscoverView />} />
          <Route path="/discover" element={<DiscoverView />} />
          <Route path="/knowledge" element={<KnowledgeView />} />
          <Route path="/circles" element={<CirclesView />} />
          <Route path="/library" element={<LibraryView />} />
          <Route path="/activity" element={<ActivityView />} />
          <Route path="/messages" element={<MessagesView />} />
          <Route path="/profile" element={<ProfileView />} />
          <Route path="/admin" element={<AdminView />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
