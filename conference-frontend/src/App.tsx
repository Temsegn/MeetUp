import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationCenterProvider } from './contexts/NotificationCenterContext';
import {
  SignInPage,
  SignUpPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
  SetInvitePasswordPage,
  OAuthCallbackPage,
} from './features/auth';
import { SecuritySettingsPage } from './pages/SecuritySettingsPage';
import { LandingPage } from './features/landing';
import { HomePage } from './pages/HomePage';
import {
  AppShellLayout,
  DashboardPage,
  RecordingsPage,
  RecordingDetailPage,
  PlaceholderPage,
} from './features/dashboard';
import { SettingsPage } from './features/settings';
import { CalendarPage } from './features/calendar';
import { ReportsPage } from './features/reports';
import { AiInsightsPage } from './features/ai-insights';
import { MessagesPage } from './features/messages';
import { NotificationsPage } from './features/notifications';
import { MeetingsPage, MeetingDetailPage } from './features/meetings';
import { LiveMeetingPage } from './features/meeting-room';
import {
  BillingPage,
  ContactsPage,
  InviteJoinPage,
} from './features/workspace';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initializing } = useAuth();
  if (initializing)
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f7fa] text-[#64748b]">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-6 w-6 animate-spin text-[#0056ef]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm" style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
            Loading...
          </span>
        </div>
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initializing } = useAuth();
  if (initializing) return null;
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationCenterProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<PublicRoute><SignInPage /></PublicRoute>} />
            <Route path="/auth/sign-up" element={<PublicRoute><SignUpPage /></PublicRoute>} />
            <Route path="/auth/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
            <Route path="/auth/set-password" element={<SetInvitePasswordPage />} />
            <Route path="/auth/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/auth/invite" element={<InviteJoinPage />} />
            <Route path="/settings/security" element={<ProtectedRoute><SecuritySettingsPage /></ProtectedRoute>} />

            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppShellLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="meetings/:meetingId" element={<MeetingDetailPage />} />
              <Route path="meeting/:roomId" element={<LiveMeetingPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="recordings" element={<RecordingsPage />} />
              <Route path="recordings/:recordingId" element={<RecordingDetailPage />} />
              <Route path="templates" element={<PlaceholderPage title="Templates" blurb="Reusable meeting templates." />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="ai-insights" element={<AiInsightsPage />} />
              <Route path="settings/members/:userId/edit" element={<SettingsPage />} />
              <Route path="settings/members/:userId" element={<SettingsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/:section" element={<SettingsPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="workspace" element={<Navigate to="/app/settings/workspace" replace />} />
              <Route path="workspace/members" element={<Navigate to="/app/settings/members" replace />} />
              <Route path="workspace/rooms" element={<Navigate to="/app/settings/rooms" replace />} />
              <Route path="admin" element={<PlaceholderPage title="Admin" blurb="Admin overview." />} />
              <Route path="billing/invoices" element={<BillingPage />} />
            </Route>

            <Route path="/join/:roomId" element={
              <div className="h-[100dvh] min-h-0 bg-white">
                <LiveMeetingPage />
              </div>
            } />
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route
              path="/room/:roomId"
              element={
                <div className="h-[100dvh] min-h-0 bg-white">
                  <LiveMeetingPage />
                </div>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationCenterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
