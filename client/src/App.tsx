import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { enterApp, goToFrontend, isLocalViteDev, isOnFrontendOrigin } from './lib/frontendUrl';
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
import { LandingPage, MarketingLayout } from './features/landing';
import { HomePage } from './pages/HomePage';
import {
  AppShellLayout,
  AdminOverviewPage,
  DashboardPage,
  RecordingsPage,
  RecordingDetailPage,
} from './features/dashboard';
import { SettingsPage } from './features/settings';
import { CalendarPage } from './features/calendar';
import { ReportsPage } from './features/reports';
import { AiInsightsPage } from './features/ai-insights';
import { MessagesPage } from './features/messages';
import { NotificationsPage } from './features/notifications';
import { MeetingsPage, MeetingDetailPage } from './features/meetings';
import { LiveMeetingPage } from './features/meeting-room';
import { TemplatesPage } from './features/templates';
import {
  BillingPage,
  InvoiceDetailPage,
  ContactsPage,
  InviteJoinPage,
} from './features/workspace';
import {
  AdminGuard,
  AdminLayout,
  AdminOverviewPage as PlatformAdminOverviewPage,
  AdminWorkspacesPage,
  AdminCreateWorkspacePage,
  AdminWorkspaceDetailPage,
  AdminUsersPage,
  AdminCreateUserPage,
  AdminUserDetailPage,
  AdminPlansPage,
  AdminSubscriptionsPage,
  AdminBillingPage,
  AdminInvoicesPage,
  AdminInvoiceDetailPage,
  AdminAuditLogsPage,
  AdminSystemSettingsPage,
} from './features/admin';

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
  if (user) return <RedirectToApp />;
  return <>{children}</>;
};

function CanonicalHost({ children }: { children: React.ReactNode }) {
  const offOrigin =
    typeof window !== 'undefined' && !isLocalViteDev() && !isOnFrontendOrigin();
  React.useEffect(() => {
    if (offOrigin) goToFrontend();
  }, [offOrigin]);
  if (offOrigin) return null;
  return <>{children}</>;
}

function RedirectToApp() {
  React.useEffect(() => {
    enterApp();
  }, []);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CanonicalHost>
        <NotificationCenterProvider>
          <Routes>
            <Route element={<MarketingLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<PublicRoute><SignInPage /></PublicRoute>} />
              <Route path="/auth/sign-up" element={<PublicRoute><SignUpPage /></PublicRoute>} />
              <Route path="/auth/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            </Route>
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
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="ai-insights" element={<AiInsightsPage />} />
              <Route path="settings/members/:userId/edit" element={<SettingsPage />} />
              <Route path="settings/members/:userId" element={<SettingsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/:section" element={<SettingsPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="billing/invoices/:invoiceId" element={<InvoiceDetailPage />} />
              <Route path="workspace" element={<Navigate to="/app/settings/workspace" replace />} />
              <Route path="workspace/members" element={<Navigate to="/app/settings/members" replace />} />
              <Route path="workspace/rooms" element={<Navigate to="/app/settings/rooms" replace />} />
              <Route path="admin" element={<AdminOverviewPage />} />
              <Route path="billing/invoices" element={<BillingPage />} />
            </Route>

            <Route path="/join/:roomId" element={
              <div className="h-[100svh] h-[100dvh] min-h-0 bg-white">
                <LiveMeetingPage />
              </div>
            } />
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminGuard />
                </ProtectedRoute>
              }
            >
              <Route element={<AdminLayout />}>
                <Route index element={<PlatformAdminOverviewPage />} />
                <Route path="workspaces" element={<AdminWorkspacesPage />} />
                <Route path="workspaces/new" element={<AdminCreateWorkspacePage />} />
                <Route path="workspaces/:id" element={<AdminWorkspaceDetailPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="users/new" element={<AdminCreateUserPage />} />
                <Route path="users/:id" element={<AdminUserDetailPage />} />
                <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
                <Route path="billing" element={<AdminBillingPage />} />
                <Route path="invoices" element={<AdminInvoicesPage />} />
                <Route path="invoices/:id" element={<AdminInvoiceDetailPage />} />
                <Route path="plans" element={<AdminPlansPage />} />
                <Route path="audit-logs" element={<AdminAuditLogsPage />} />
                <Route path="system" element={<AdminSystemSettingsPage />} />
              </Route>
            </Route>
            <Route
              path="/room/:roomId"
              element={
                <div className="h-[100svh] h-[100dvh] min-h-0 bg-white">
                  <LiveMeetingPage />
                </div>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationCenterProvider>
        </CanonicalHost>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
