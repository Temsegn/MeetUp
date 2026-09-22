#!/usr/bin/env python3
"""Samtal QA workbook — derived from inspected source, not marketing copy."""

from __future__ import annotations

import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent
ENV = "Local: http://localhost:5173 + API http://localhost:4002. Production: http://46.246.120.148:8980"
PROD = "http://46.246.120.148:8980"
HEADERS = [
    "Test ID",
    "Module",
    "Feature",
    "Test Type",
    "Priority",
    "Preconditions",
    "Test Scenario",
    "Test Steps",
    "Test Data",
    "Expected Result",
    "Actual Result",
    "Status",
    "Severity",
    "Environment",
    "Bug ID",
    "Notes",
]

CASES: list[dict] = []
COUNTERS: dict[str, int] = {}
ENDPOINTS: list[tuple[str, str, str]] = []  # method, path, auth
SOCKETS: list[tuple[str, str]] = []  # event, direction


def xe(s: object) -> str:
    return escape(str(s), {"'": "&apos;"}).replace("\n", "&#10;")


def col_letter(n: int) -> str:
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def tid(prefix: str) -> str:
    COUNTERS[prefix] = COUNTERS.get(prefix, 0) + 1
    return f"{prefix}-{COUNTERS[prefix]:03d}"


def T(
    prefix: str,
    module: str,
    feature: str,
    typ: str,
    pri: str,
    pre: str,
    scenario: str,
    steps: str,
    data: str,
    exp: str,
    sev: str = "",
    notes: str = "",
    env: str = ENV,
):
    if not sev:
        sev = {"P0": "Critical", "P1": "High", "P2": "Medium"}.get(pri, "Medium")
    CASES.append(
        {
            "Test ID": tid(prefix),
            "Module": module,
            "Feature": feature,
            "Test Type": typ,
            "Priority": pri,
            "Preconditions": pre,
            "Test Scenario": scenario,
            "Test Steps": steps,
            "Test Data": data,
            "Expected Result": exp,
            "Actual Result": "",
            "Status": "Not Run",
            "Severity": sev,
            "Environment": env,
            "Bug ID": "",
            "Notes": notes,
        }
    )


def ep(method: str, path: str, auth: str):
    ENDPOINTS.append((method, path, auth))


def sock(event: str, direction: str):
    SOCKETS.append((event, direction))


# ═══════════════════════════════════════════════════════════════════════════════
# API inventory from server/src/app.ts + *routes.ts (inspected)
# ═══════════════════════════════════════════════════════════════════════════════
for m, p, a in [
    ("GET", "/health/live", "none"),
    ("GET", "/health/ready", "none"),
    ("GET", "/metrics", "none"),
    ("GET", "/media/stats", "none"),
    ("GET", "/media/diagnostics/:roomId/:participantId", "none"),
    ("POST", "/auth/signup", "none"),
    ("POST", "/auth/login", "none"),
    ("POST", "/auth/signin", "none"),
    ("POST", "/auth/refresh", "cookie"),
    ("POST", "/auth/forgot-password", "none"),
    ("POST", "/auth/reset-password", "none"),
    ("GET", "/auth/verify-email", "none"),
    ("GET", "/auth/google", "none"),
    ("GET", "/auth/google/callback", "none"),
    ("GET", "/auth/me", "user"),
    ("PATCH", "/auth/me", "user"),
    ("PATCH", "/auth/me/settings", "user"),
    ("POST", "/auth/logout", "cookie"),
    ("POST", "/auth/logout-all", "user"),
    ("POST", "/auth/change-password", "user"),
    ("POST", "/auth/resend-verification", "user"),
    ("POST", "/auth/resend-verification-email", "none"),
    ("GET", "/auth/sessions", "user"),
    ("DELETE", "/auth/sessions/:sessionId", "user"),
    ("POST", "/auth/guest", "none"),
    ("GET", "/workspaces", "user"),
    ("POST", "/workspaces/invites/accept", "user"),
    ("GET", "/workspaces/invites/preview", "none"),
    ("POST", "/workspaces/invites/join", "none"),
    ("POST", "/workspaces/invites/complete-password", "none"),
    ("GET", "/workspaces/:id", "member"),
    ("PATCH", "/workspaces/:id/settings", "admin"),
    ("GET", "/workspaces/:id/members", "admin"),
    ("GET", "/workspaces/:id/directory", "member"),
    ("GET", "/workspaces/:id/invites", "admin"),
    ("POST", "/workspaces/:id/invites", "admin"),
    ("DELETE", "/workspaces/:id/invites/:inviteId", "admin"),
    ("PATCH", "/workspaces/:id/invites/:inviteId", "admin"),
    ("POST", "/workspaces/:id/invites/:inviteId/resend", "admin"),
    ("PATCH", "/workspaces/:id/members/:userId/role", "owner"),
    ("PATCH", "/workspaces/:id/members/:userId", "admin"),
    ("PATCH", "/workspaces/:id/members/:userId/status", "admin"),
    ("DELETE", "/workspaces/:id/members/:userId", "admin"),
    ("GET", "/workspaces/:id/audit-logs", "member"),
    ("GET", "/billing/plans", "member"),
    ("GET", "/billing/plan", "member"),
    ("GET", "/billing/usage", "member"),
    ("GET", "/billing/usage/meetings", "admin"),
    ("PATCH", "/billing/plan", "owner"),
    ("GET", "/billing/invoices", "member"),
    ("GET", "/billing/invoices/:invoiceId", "member"),
    ("POST", "/billing/invoices/:invoiceId/pay", "admin"),
    ("GET", "/billing/payment-methods", "member"),
    ("GET", "/meetings", "user"),
    ("POST", "/meetings", "user"),
    ("DELETE", "/meetings/:id", "user"),
    ("GET", "/workspace-meetings", "member"),
    ("GET", "/workspace-meetings/stats", "member"),
    ("GET", "/workspace-meetings/notifications/mine", "member"),
    ("POST", "/workspace-meetings/notifications/read", "member"),
    ("GET", "/workspace-meetings/by-room/:roomId", "member"),
    ("POST", "/workspace-meetings", "member"),
    ("POST", "/workspace-meetings/:id/register", "member"),
    ("POST", "/workspace-meetings/:id/participants", "member"),
    ("DELETE", "/workspace-meetings/:id/participants/:userId", "member"),
    ("DELETE", "/workspace-meetings/:id/guest-emails", "member"),
    ("GET", "/workspace-meetings/:id", "member"),
    ("PATCH", "/workspace-meetings/:id", "member"),
    ("POST", "/workspace-meetings/:id/join", "member"),
    ("POST", "/workspace-meetings/:id/end", "member"),
    ("POST", "/workspace-meetings/:id/cancel", "member"),
    ("GET", "/workspace-rooms", "member"),
    ("POST", "/workspace-rooms", "admin"),
    ("GET", "/workspace-teams", "member"),
    ("POST", "/workspace-teams", "admin"),
    ("GET", "/workspace-templates", "member"),
    ("POST", "/workspace-templates", "member"),
    ("PATCH", "/workspace-templates/:id", "member"),
    ("DELETE", "/workspace-templates/:id", "member"),
    ("GET", "/dashboard/summary", "member"),
    ("GET", "/calendar/events", "member"),
    ("GET", "/messages/conversations", "member"),
    ("POST", "/messages/conversations", "member"),
    ("GET", "/messages/search", "member"),
    ("GET", "/messages/conversations/:id/shared", "member"),
    ("GET", "/messages/conversations/:id/messages", "member"),
    ("POST", "/messages/conversations/:id/messages", "member"),
    ("PATCH", "/messages/conversations/:id/messages/:messageId", "member"),
    ("DELETE", "/messages/conversations/:id/messages/:messageId", "member"),
    ("POST", "/messages/conversations/:id/messages/:messageId/react", "member"),
    ("POST", "/messages/conversations/:id/messages/:messageId/pin", "member"),
    ("POST", "/messages/conversations/:id/read", "member"),
    ("POST", "/messages/uploads/init", "member"),
    ("POST", "/messages/uploads/:uploadId/chunk", "member"),
    ("POST", "/messages/uploads/:uploadId/complete", "member"),
    ("GET", "/messages/files", "member"),
    ("GET", "/reports/overview", "member"),
    ("GET", "/recordings", "member"),
    ("GET", "/recordings/stats", "member"),
    ("GET", "/recordings/:id", "member"),
    ("GET", "/recordings/:id/stream", "member"),
    ("PATCH", "/recordings/:id", "member"),
    ("DELETE", "/recordings/:id", "member"),
    ("POST", "/recordings/:roomId", "user"),
    ("POST", "/admin/claim-dev-access", "user"),
    ("GET", "/admin/overview", "platform"),
    ("GET", "/admin/workspaces", "platform"),
    ("GET", "/admin/workspaces/:id", "platform"),
    ("POST", "/admin/workspaces", "platform"),
    ("PATCH", "/admin/workspaces/:id/status", "platform"),
    ("GET", "/admin/users", "platform"),
    ("GET", "/admin/users/:id", "platform"),
    ("POST", "/admin/users", "platform"),
    ("PATCH", "/admin/users/:id/status", "platform"),
    ("GET", "/admin/plans", "platform"),
    ("PATCH", "/admin/plans/:key", "platform"),
    ("GET", "/admin/subscriptions", "platform"),
    ("PATCH", "/admin/subscriptions/:id", "platform"),
    ("GET", "/admin/billing", "platform"),
    ("GET", "/admin/invoices", "platform"),
    ("GET", "/admin/invoices/:id", "platform"),
    ("POST", "/admin/invoices/:id/pay", "platform"),
    ("GET", "/admin/audit-logs", "platform"),
    ("GET", "/admin/system-settings", "platform"),
    ("PATCH", "/admin/system-settings", "platform"),
]:
    ep(m, p, a)

for e, d in [
    ("connection", "C→S"),
    ("disconnect", "C→S"),
    ("join-room", "C→S"),
    ("waiting-join-request", "S→C"),
    ("admit-waiting", "C→S"),
    ("deny-waiting", "C→S"),
    ("waiting-admitted", "S→C"),
    ("waiting-denied", "S→C"),
    ("waiting-request-resolved", "S→C"),
    ("list-waiting", "C→S"),
    ("leave-room", "C→S"),
    ("end-meeting", "C→S"),
    ("meeting-ended", "S→C"),
    ("get-room-state", "C→S"),
    ("create-webrtc-transport", "C→S"),
    ("connect-transport", "C→S"),
    ("restart-ice", "C→S"),
    ("produce", "C→S"),
    ("new-producer", "S→C"),
    ("consume", "C→S"),
    ("resume-consumer", "C→S"),
    ("pause-consumer", "C→S"),
    ("close-consumer", "C→S"),
    ("close-producer", "C→S"),
    ("producer-closed", "S→C"),
    ("pause-producer", "C→S"),
    ("producer-paused", "S→C"),
    ("resume-producer", "C→S"),
    ("producer-resumed", "S→C"),
    ("set-preferred-layers", "C→S"),
    ("set-consumer-priority", "C→S"),
    ("replace-track", "C→S"),
    ("start-recording", "C→S"),
    ("stop-recording", "C→S"),
    ("get-recording-status", "C→S"),
    ("get-peer-diagnostics", "C→S"),
    ("peer-joined", "S→C"),
    ("peer-left", "S→C"),
    ("send-message", "C→S"),
    ("chat-message", "S→C"),
    ("get-chat-history", "C→S"),
    ("send-reaction", "C→S"),
    ("peer-reaction", "S→C"),
    ("raise-hand", "C→S"),
    ("peer-raise-hand", "S→C"),
    ("host-moderate", "C→S"),
    ("moderation-command", "S→C"),
    ("whiteboard:join", "C→S"),
    ("whiteboard:leave", "C→S"),
    ("whiteboard:update", "C→S"),
    ("whiteboard:sync", "S→C"),
    ("whiteboard:cursor", "both"),
    ("whiteboard:clear", "C→S"),
    ("whiteboard:error", "S→C"),
    ("whiteboard:visibility", "both"),
    ("whiteboard:get-visibility", "C→S"),
    ("remote-control:request", "C→S"),
    ("remote-control:respond", "C→S"),
    ("remote-control:action", "C→S"),
    ("remote-control:stop", "C→S"),
    ("remote-control:started", "S→C"),
    ("remote-control:rejected", "S→C"),
    ("remote-control:stopped", "S→C"),
    ("remote-control:revoked", "S→C"),
    ("remote-control:ended", "S→C"),
    ("remote-control:cursor", "C→S"),
    ("remote-control:ui-state", "C→S"),
    ("remote-control:draft", "C→S"),
    ("remote-control:view", "C→S"),
    ("remote-control:history", "S→C"),
    ("remote-control:sync", "C→S"),
    ("dm:join", "C→S"),
    ("dm:leave", "C→S"),
    ("dm:send", "C→S"),
    ("dm:message", "S→C"),
    ("dm:message-update", "S→C"),
    ("dm:edit", "C→S"),
    ("dm:delete", "C→S"),
    ("dm:react", "C→S"),
    ("dm:pin", "C→S"),
    ("dm:forward", "C→S"),
    ("dm:read", "C→S"),
    ("dm:delivered", "C→S"),
    ("dm:typing", "both"),
    ("dm:presence", "S→C"),
    ("dm:call-invite", "C→S"),
    ("dm:call-accept", "C→S"),
    ("dm:call-reject", "C→S"),
    ("dm:call-signal", "C→S"),
    ("dm:call-hangup", "C→S"),
    ("dm:call-ringing", "S→C"),
    ("error", "C→S"),
]:
    sock(e, d)


def build_cases() -> None:
    pwd = "ValidPass12"
    # ── Health ──────────────────────────────────────────────────────────────
    T("API", "Health", "Liveness", "API", "P0",
      "API process is running.",
      "Verify GET /health/live returns 200 without authentication while the Node process is alive.",
      "1) curl -i GET {api}/health/live",
      "No Authorization header.",
      "HTTP 200 JSON { status: 'alive', timestamp }. No auth required.",
      notes="server/src/app.ts")
    T("API", "Health", "Readiness OK", "API", "P0",
      "MongoDB connected and mediasoup workers healthy.",
      "Verify GET /health/ready returns 200 with mongodb=ok and workers=ok.",
      "1) GET /health/ready",
      "",
      "HTTP 200 status=ready, checks.mongodb=ok, checks.workers=ok, worker list present.")
    T("FAIL", "Health", "Readiness Mongo down", "Failure/Recovery", "P0",
      "Stop Mongo or break MONGODB_URI.",
      "Verify GET /health/ready returns 503 when MongoDB is disconnected.",
      "1) Disconnect Mongo. 2) GET /health/ready.",
      "",
      "HTTP 503 status=not_ready checks.mongodb=error. Process remains alive on /health/live.")
    T("API", "Health", "Metrics", "API", "P2",
      "Server up.",
      "Verify GET /metrics returns Prometheus text.",
      "1) GET /metrics",
      "",
      "HTTP 200 Content-Type text/plain; version=0.0.4 with metric lines.")
    T("API", "Health", "Unknown path", "Error handling", "P1",
      "Server up.",
      "Verify an unknown API path returns structured 404.",
      "1) GET /this-is-not-a-route",
      "",
      "HTTP 404 JSON { error: 'Not found', code: 'NOT_FOUND' }.")
    T("API", "Health", "Media stats", "API", "P2",
      "Server up, 0 or more rooms.",
      "Verify GET /media/stats returns rooms/workers/summary without throwing.",
      "1) GET /media/stats",
      "",
      "HTTP 200 JSON rooms, workers, summary. 500 only if mediaEngine throws.")
    T("API", "Health", "Peer diagnostics 404", "Error handling", "P2",
      "No such peer.",
      "Verify GET /media/diagnostics/:roomId/:participantId returns 404 for unknown peer.",
      "1) GET /media/diagnostics/no-room/no-peer",
      "roomId=no-room participantId=no-peer",
      "HTTP 404 { error: 'Peer not found' }. Notes: endpoint is unauthenticated in code (operator debug).")

    # ── Auth ────────────────────────────────────────────────────────────────
    T("AUTH", "Authentication", "Signup success", "Positive", "P0",
      "Email is not registered. SMTP optional (console fallback).",
      "Verify a new user can register with valid name, email, and password meeting policy and is required to verify email before using the app.",
      "1) POST /auth/signup. 2) Open /auth. 3) Attempt login before verify.",
      f"name=QA User; email=unique+ts@example.com; password={pwd} (min 10, upper, lower, digit); rememberMe=false",
      "Account created. Verification token issued. Login returns EMAIL_NOT_VERIFIED until GET /auth/verify-email?token= succeeds. Bootstrap later creates owner workspace + free subscription.",
      notes="SignupSchema: name 1–100, email, password 10–128 with [a-z][A-Z][0-9].")
    T("AUTH", "Authentication", "Signup missing name", "Validation", "P0",
      "Signup endpoint reachable.",
      "Verify POST /auth/signup without name is rejected with VALIDATION_ERROR and no user is inserted.",
      "1) POST /auth/signup with email+password only.",
      f"email=a@b.com password={pwd}",
      "HTTP 400 VALIDATION_ERROR. Mongo User count unchanged.")
    T("AUTH", "Authentication", "Signup invalid email", "Validation", "P0",
      "",
      "Verify signup rejects a non-email string.",
      "1) POST /auth/signup",
      "email=not-an-email",
      "HTTP 400 VALIDATION_ERROR on email.")
    T("AUTH", "Authentication", "Signup short password", "Boundary", "P0",
      "",
      "Verify password shorter than 10 characters is rejected.",
      "1) POST /auth/signup",
      "password=Ab1 (3 chars)",
      "HTTP 400. Message states at least 10 characters.")
    T("AUTH", "Authentication", "Signup password 9 chars", "Boundary", "P1",
      "",
      "Verify 9-character password that otherwise meets complexity still fails minLength.",
      "1) POST /auth/signup",
      "password=Abcdefg1x (9)",
      "HTTP 400 minLength.")
    T("AUTH", "Authentication", "Signup password 10 chars", "Boundary", "P1",
      "Unique email.",
      "Verify a 10-character password with upper, lower, and digit is accepted.",
      "1) POST /auth/signup",
      "password=Abcdefg1xY wait 10: AbcdEfg12X",
      "HTTP success path (user created / verification sent).")
    T("AUTH", "Authentication", "Signup password no uppercase", "Validation", "P1",
      "",
      "Verify password without uppercase is rejected.",
      "1) POST /auth/signup",
      "password=validpass12",
      "HTTP 400 must contain at least one uppercase letter.")
    T("AUTH", "Authentication", "Signup password no digit", "Validation", "P1",
      "",
      "Verify password without a digit is rejected.",
      "1) POST /auth/signup",
      "password=ValidPassword",
      "HTTP 400 must contain at least one number.")
    T("AUTH", "Authentication", "Signup name 101 chars", "Boundary", "P2",
      "",
      "Verify name longer than 100 characters is rejected.",
      "1) POST /auth/signup",
      "name=A*101",
      "HTTP 400 max 100.")
    T("AUTH", "Authentication", "Signup duplicate email", "Negative", "P0",
      "User already exists with that email (normalized lowercase).",
      "Verify registering the same email again (different case) does not create a second user.",
      "1) Signup qa@x.com. 2) Signup QA@x.com.",
      "normalizeEmail trims+lowercases",
      "Conflict/validation error. One User document.")
    T("AUTH", "Authentication", "Signup rate limit", "Security", "P1",
      "authRateLimiter enabled on /auth/signup.",
      "Verify bursting POST /auth/signup is throttled.",
      "1) Send > AUTH_RATE_LIMIT_MAX signups in the window.",
      "",
      "HTTP 429 after the limiter threshold.")
    T("AUTH", "Authentication", "Login success", "Positive", "P0",
      "Verified local user.",
      "Verify POST /auth/login with correct email and password returns an access token, sets HttpOnly cookie ms_refresh, and the SPA can load /app.",
      "1) POST /auth/login. 2) GET /auth/me with Bearer. 3) Open /app.",
      f"email=verified user; password={pwd}; rememberMe=false",
      "200 with user+accessToken. Set-Cookie ms_refresh HttpOnly SameSite=Lax. /app dashboard loads.")
    T("AUTH", "Authentication", "Login alias /signin", "Positive", "P1",
      "Verified user.",
      "Verify POST /auth/signin is a backward-compatible alias of /auth/login.",
      "1) POST /auth/signin with same body as login.",
      f"password={pwd}",
      "Same success behavior as /auth/login.")
    T("AUTH", "Authentication", "Login wrong password", "Negative", "P0",
      "Verified user.",
      "Verify an incorrect password is rejected and no refresh cookie/session is created.",
      "1) POST /auth/login with wrong password. 2) GET /auth/me.",
      "password=WrongPass12",
      "Error response. No ms_refresh. /auth/me 401.")
    T("AUTH", "Authentication", "Login unverified", "Negative", "P0",
      "User signed up, emailVerifiedAt is null.",
      "Verify login is blocked until email verification.",
      "1) POST /auth/login.",
      "",
      "Rejected with EMAIL_NOT_VERIFIED (or equivalent). No session.")
    T("AUTH", "Authentication", "Login Google-only", "Negative", "P1",
      "User.authProvider=google and empty passwordHash.",
      "Verify password login of a Google-created account is rejected with guidance to use Google.",
      "1) POST /auth/login for that email.",
      "",
      "Error. No session. User told to continue with Google.")
    T("AUTH", "Authentication", "Login missing password", "Validation", "P0",
      "",
      "Verify login without password fails validation.",
      "1) POST /auth/login { email only }",
      "",
      "HTTP 400 VALIDATION_ERROR.")
    T("AUTH", "Authentication", "Login lockout", "Security", "P0",
      "LOGIN_MAX_FAILED_ATTEMPTS default 5, window 15 min.",
      "Verify five failed logins for the same email+IP lock further attempts until the window expires.",
      "1) Fail login 5 times. 2) Submit the correct password immediately.",
      "",
      "Step 2 still blocked until lockout window. LoginAttempt records exist.")
    T("AUTH", "Authentication", "Verify email success", "Positive", "P0",
      "Fresh verification token (TTL EMAIL_VERIFICATION_TOKEN_TTL_SECONDS default 1h).",
      "Verify GET /auth/verify-email?token= valid token sets emailVerifiedAt.",
      "1) Open verification URL from email/console.",
      "token from EmailVerificationToken",
      "Success page/JSON. User can login.")
    T("AUTH", "Authentication", "Verify email invalid", "Negative", "P1",
      "",
      "Verify garbage token does not verify any user.",
      "1) GET /auth/verify-email?token=deadbeef",
      "",
      "Error. emailVerifiedAt unchanged.")
    T("AUTH", "Authentication", "Verify email expired", "Negative", "P1",
      "Token older than TTL.",
      "Verify expired verification token is rejected.",
      "1) Use expired token.",
      "",
      "Error. User remains unverified.")
    T("AUTH", "Authentication", "Resend verification auth", "Positive", "P1",
      "Authenticated unverified user (if login allowed) or after signup session.",
      "Verify POST /auth/resend-verification issues a new token.",
      "1) POST with Bearer.",
      "",
      "New EmailVerificationToken. Old token invalidated or superseded per service.")
    T("AUTH", "Authentication", "Resend verification by email", "Positive", "P1",
      "Known unverified email.",
      "Verify POST /auth/resend-verification-email with email body resends without leaking whether the account exists beyond a generic response.",
      "1) POST { email }",
      "",
      "Generic success. Token created only if account exists.")
    T("AUTH", "Authentication", "Forgot password", "Positive", "P0",
      "Verified local user.",
      "Verify POST /auth/forgot-password always returns a generic success and emails a reset link when the account exists.",
      "1) POST { email }. 2) Read console/SMTP.",
      "",
      "Generic response. PasswordResetToken created for existing user. Link uses FRONTEND_URL/auth/reset-password?token=.")
    T("AUTH", "Authentication", "Forgot unknown email", "Security", "P1",
      "",
      "Verify unknown email still returns the generic success and does not create a token.",
      "1) POST unused email.",
      "email=nobody@example.com",
      "Same client-visible success. No PasswordResetToken.")
    T("AUTH", "Authentication", "Reset password success", "Positive", "P0",
      "Valid reset token.",
      "Verify POST /auth/reset-password with matching newPassword/confirmPassword updates the hash, revokes sessions, and allows login with the new password only.",
      "1) POST token + new password. 2) Login old. 3) Login new.",
      f"newPassword={pwd}X; confirmPassword same",
      "Old password fails. New succeeds. passwordChangedAt set; prior access JWTs invalid.")
    T("AUTH", "Authentication", "Reset password mismatch", "Validation", "P1",
      "Valid token.",
      "Verify confirmPassword mismatch is rejected.",
      "1) POST different confirmPassword.",
      "",
      "HTTP 400 Passwords do not match. Hash unchanged.")
    T("AUTH", "Authentication", "Refresh success", "Positive", "P0",
      "Valid ms_refresh cookie.",
      "Verify POST /auth/refresh rotates the refresh token and returns a new access token.",
      "1) Login. 2) POST /auth/refresh with cookie credentials.",
      "Cookie ms_refresh",
      "200 new accessToken. New refresh cookie. Old refresh value unusable.")
    T("AUTH", "Authentication", "Refresh missing cookie", "Authentication", "P0",
      "No cookie.",
      "Verify POST /auth/refresh without ms_refresh fails.",
      "1) POST /auth/refresh",
      "",
      "401. No access token.")
    T("AUTH", "Authentication", "Me requires auth", "Authentication", "P0",
      "",
      "Verify GET /auth/me without Bearer returns 401.",
      "1) GET /auth/me",
      "",
      "HTTP 401 Authentication required.")
    T("AUTH", "Authentication", "Me success", "Positive", "P0",
      "Valid access token.",
      "Verify GET /auth/me returns the current user profile and settings.",
      "1) GET /auth/me Authorization: Bearer",
      "",
      "200 user id, email, name, settings, platformRole, accountStatus.")
    T("AUTH", "Authentication", "Me expired JWT", "Authentication", "P0",
      "Access token past ACCESS_TOKEN_TTL_SECONDS (default 900s).",
      "Verify expired JWT is rejected and the client refresh flow restores the session when cookie is valid.",
      "1) Use expired Bearer. 2) Client retries after /auth/refresh.",
      "",
      "First call 401. After refresh, /auth/me 200.")
    T("AUTH", "Authentication", "Me tampered JWT", "Security", "P0",
      "Alter payload without valid signature.",
      "Verify a tampered JWT is rejected.",
      "1) GET /auth/me with modified token.",
      "",
      "401. No user data.")
    T("AUTH", "Authentication", "Patch profile", "Positive", "P1",
      "Authenticated user.",
      "Verify PATCH /auth/me updates allowed profile fields (name, phone, jobTitle, department, avatarUrl).",
      "1) PATCH /auth/me. 2) GET /auth/me.",
      "name=New Name",
      "Persisted fields returned. Disallowed fields ignored.")
    T("AUTH", "Authentication", "Patch settings", "Positive", "P1",
      "Authenticated user.",
      "Verify PATCH /auth/me/settings merges notification and A/V preference toggles.",
      "1) PATCH settings.notifications.email=false. 2) GET /me.",
      "",
      "email notification false. Other settings retained.")
    T("AUTH", "Authentication", "Change password success", "Positive", "P0",
      "Known current password.",
      "Verify POST /auth/change-password with current+new+confirm updates the hash, keeps this session, and invalidates older access tokens via passwordChangedAt.",
      "1) POST change-password. 2) Use old access token. 3) Login with new password.",
      f"currentPassword={pwd}; newPassword={pwd}New",
      "Success. Old Bearer 401. New login works. Current refresh still valid per service.")
    T("AUTH", "Authentication", "Change password wrong current", "Negative", "P1",
      "",
      "Verify wrong currentPassword is rejected and hash is unchanged.",
      "1) POST change-password.",
      "currentPassword=NopeNope12",
      "Error. Login still uses old password.")
    T("AUTH", "Authentication", "Logout", "Positive", "P0",
      "Logged in with cookie.",
      "Verify POST /auth/logout revokes the current refresh session and clears ms_refresh.",
      "1) POST /auth/logout credentials include. 2) POST /auth/refresh.",
      "",
      "Cookie cleared. Refresh 401. /app redirects to /auth.")
    T("AUTH", "Authentication", "Logout all", "Security", "P1",
      "Two browser sessions.",
      "Verify POST /auth/logout-all (authenticated) revokes every RefreshSession.",
      "1) Login A and B. 2) logout-all from A. 3) Refresh from B.",
      "",
      "B cannot refresh. Forced to login.")
    T("AUTH", "Authentication", "List sessions", "Positive", "P1",
      "At least one session.",
      "Verify GET /auth/sessions lists the caller's sessions only.",
      "1) GET /auth/sessions",
      "",
      "Array of own sessions. No other users' sessions.")
    T("AUTH", "Authentication", "Revoke session", "Positive", "P1",
      "Two sessions.",
      "Verify DELETE /auth/sessions/:sessionId revokes that session if owned.",
      "1) Delete other session id. 2) Refresh from that browser.",
      "",
      "Target refresh fails. Current session remains.")
    T("AUTH", "Authentication", "Revoke others session", "Authorization", "P0",
      "Session id belonging to another user.",
      "Verify a user cannot revoke someone else's session id.",
      "1) DELETE /auth/sessions/{foreignId}",
      "",
      "403/404. Foreign session still valid.")
    T("AUTH", "Authentication", "CSRF origin", "Security", "P0",
      "csrfProtection on auth router. Victim has ms_refresh.",
      "Verify a credentialed auth POST from a disallowed Origin is rejected.",
      "1) From https://evil.example POST /auth/logout with credentials and Origin evil.",
      "",
      "Rejected by CSRF/origin check. Session remains until a same-origin logout.")

    # Google
    T("OAUTH", "Google OAuth", "Start", "Authentication", "P0",
      "GOOGLE_CLIENT_ID and SECRET set.",
      "Verify GET /auth/google redirects to Google authorization and stores OAuth state cookie path /auth.",
      "1) GET /auth/google (browser).",
      "",
      "302 to accounts.google.com. State cookie set.")
    T("OAUTH", "Google OAuth", "Start unset", "Error handling", "P1",
      "GOOGLE_CLIENT_ID unset.",
      "Verify Google start returns 503 when OAuth is not configured.",
      "1) GET /auth/google",
      "",
      "HTTP 503. No redirect to Google.")
    T("OAUTH", "Google OAuth", "Callback success", "Positive", "P0",
      "Valid code+state after consent.",
      "Verify GET /auth/google/callback creates/logs in the user and redirects to the SPA callback.",
      "1) Complete Google consent.",
      "",
      "Session established. Browser lands on public frontend /auth/oauth/callback then /app. FRONTEND_URL is used, not localhost.")
    T("OAUTH", "Google OAuth", "Callback bad state", "Security", "P0",
      "Tamper or omit state.",
      "Verify callback with invalid state does not set a session.",
      "1) Open /auth/google/callback?code=x&state=y",
      "",
      "Error. No ms_refresh.")
    T("OAUTH", "Google OAuth", "Production start URL", "Positive", "P0",
      "Production SPA at 8980, not Vite.",
      "Verify the Google button uses same-origin /auth/google (nginx proxies to API) rather than localhost:4001.",
      "1) View page source/network on " + PROD + " 2) Click Google.",
      "",
      "Request URL starts with " + PROD + "/auth/google. No localhost:5173 or :3000.")
    T("OAUTH", "Google OAuth", "Local Vite start URL", "Positive", "P1",
      "localhost:5173 isLocalViteDev true.",
      "Verify local Vite Google start hits VITE_API_URL /auth/google (default http://localhost:4001).",
      "1) Click Google on Vite.",
      "",
      "Navigates to API origin /auth/google. Allowed only for local dev.")
    T("OAUTH", "Google OAuth", "HTTP public IP", "Compatibility", "P1",
      "FRONTEND_URL is http://public-ip.",
      "Verify Google OAuth fails or is documented invalid because Google disallows HTTP+IP redirect URIs.",
      "1) Start OAuth on production HTTP IP.",
      "",
      "Google invalid_request OR app error. Not a silent login.")
    T("OAUTH", "Google OAuth", "Microsoft disabled", "Frontend", "P2",
      "Sign-in page.",
      "Verify Microsoft button is disabled and does not start OAuth.",
      "1) Inspect Microsoft control on /auth and /auth/sign-up.",
      "",
      "Disabled; title coming soon. No network OAuth.")

    # Guest
    T("GUEST", "Guest auth", "Valid invited email", "Positive", "P0",
      "Meeting status live or scheduled-and-due. guestEmails includes the email. roomId exists.",
      "Verify POST /auth/guest with name, invited email, and roomId returns a 4-hour room-scoped JWT and no refresh cookie.",
      "1) POST /auth/guest. 2) Inspect Set-Cookie. 3) Decode JWT.",
      "GuestSchema: name 1–80, email, roomId 1–128",
      "200 { user, accessToken }. JWT guest=true, roomId set, exp ~4h. No ms_refresh.")
    T("GUEST", "Guest auth", "Uninvited email", "Authorization", "P0",
      "Meeting guestEmails does not include the address.",
      "Verify a different email cannot obtain a guest token.",
      "1) POST /auth/guest",
      "email=other@x.com",
      "403 from assertCanAccessMeeting. No token.")
    T("GUEST", "Guest auth", "Invalid email format", "Validation", "P0",
      "",
      "Verify guest join rejects non-email.",
      "1) POST /auth/guest",
      "email=not-email",
      "HTTP 400 VALIDATION_ERROR.")
    T("GUEST", "Guest auth", "Missing name", "Validation", "P0",
      "",
      "Verify empty name is rejected.",
      "1) POST /auth/guest name=''",
      "",
      "HTTP 400 Name, invitation email, and roomId are required.")
    T("GUEST", "Guest auth", "Unknown room", "Negative", "P0",
      "",
      "Verify unknown roomId returns 404.",
      "1) POST /auth/guest",
      "roomId=does-not-exist",
      "HTTP 404 Meeting not found.")
    T("GUEST", "Guest auth", "Cancelled meeting", "State transition", "P0",
      "Meeting.status=cancelled.",
      "Verify guest token is refused for cancelled meetings.",
      "1) POST /auth/guest",
      "",
      "HTTP 403 Meeting is not available.")
    T("GUEST", "Guest auth", "Ended meeting", "State transition", "P0",
      "Meeting.status=ended.",
      "Verify guest cannot join ended meetings.",
      "1) POST /auth/guest",
      "",
      "HTTP 403 Meeting is not available.")
    T("GUEST", "Guest auth", "Too early", "State transition", "P1",
      "Scheduled meeting with scheduledAt in the future; isMeetingJoinable false.",
      "Verify guest cannot join before the meeting is joinable.",
      "1) POST /auth/guest",
      "",
      "HTTP 403 Meeting has not started yet.")
    T("GUEST", "Guest auth", "Token room scope", "Security", "P0",
      "Guest JWT for room A.",
      "Verify the guest token cannot join-room socket for room B or call workspace APIs.",
      "1) Socket join-room room B. 2) GET /workspace-meetings with guest Bearer.",
      "",
      "join-room rejected. REST 401/403.")
    T("GUEST", "Guest auth", "Name max 80", "Boundary", "P2",
      "Valid meeting/email.",
      "Verify name of 81 characters is rejected and 80 is accepted.",
      "1) POST name length 81. 2) POST name length 80.",
      "",
      "81 → 400. 80 → 200.")

    # Frontend routes smoke
    routes = [
        ("/", "Landing", "Public landing renders without auth."),
        ("/auth", "Sign-in page loads."),
        ("/auth/sign-up", "Sign-up page loads."),
        ("/auth/forgot-password", "Forgot password page loads."),
        ("/auth/reset-password", "Reset password page loads (token query)."),
        ("/auth/verify-email", "Verify email page loads."),
        ("/auth/set-password", "Invite set-password page loads."),
        ("/auth/oauth/callback", "OAuth callback page handles query params."),
        ("/auth/invite", "Invite join page loads."),
        ("/app", "Dashboard requires auth and loads summary."),
        ("/app/meetings", "Meetings list."),
        ("/app/calendar", "Calendar."),
        ("/app/contacts", "Contacts directory."),
        ("/app/messages", "Messages."),
        ("/app/notifications", "Notifications."),
        ("/app/recordings", "Recordings."),
        ("/app/templates", "Templates."),
        ("/app/reports", "Reports."),
        ("/app/ai-insights", "AI insights honest empty."),
        ("/app/settings/profile", "Profile settings."),
        ("/app/billing", "Billing."),
        ("/admin", "Platform admin (guarded)."),
        ("/join/:roomId", "Guest live meeting."),
        ("/room/:roomId", "Live meeting alias."),
        ("/settings/security", "Standalone security settings."),
        ("/home", "Legacy home launcher."),
    ]
    for path, feat in [
        ("/", "Landing"),
        ("/auth", "Sign in"),
        ("/auth/sign-up", "Sign up"),
        ("/auth/forgot-password", "Forgot password"),
        ("/auth/reset-password", "Reset password"),
        ("/auth/verify-email", "Verify email"),
        ("/auth/set-password", "Set invite password"),
        ("/auth/oauth/callback", "OAuth callback"),
        ("/auth/invite", "Invite join"),
        ("/app", "Dashboard"),
        ("/app/meetings", "Meetings"),
        ("/app/calendar", "Calendar"),
        ("/app/contacts", "Contacts"),
        ("/app/messages", "Messages"),
        ("/app/notifications", "Notifications"),
        ("/app/recordings", "Recordings"),
        ("/app/templates", "Templates"),
        ("/app/reports", "Reports"),
        ("/app/ai-insights", "AI Insights"),
        ("/app/settings/profile", "Profile"),
        ("/app/settings/workspace", "Workspace settings"),
        ("/app/settings/members", "Members"),
        ("/app/settings/rooms", "Rooms"),
        ("/app/settings/teams", "Teams"),
        ("/app/settings/branding", "Branding"),
        ("/app/settings/security", "In-app security"),
        ("/app/settings/billing", "Settings billing"),
        ("/app/settings/integrations", "Integrations"),
        ("/app/settings/audit", "Audit"),
        ("/app/billing", "Billing"),
        ("/admin", "Admin overview"),
        ("/admin/workspaces", "Admin workspaces"),
        ("/admin/users", "Admin users"),
        ("/admin/plans", "Admin plans"),
        ("/admin/subscriptions", "Admin subscriptions"),
        ("/admin/invoices", "Admin invoices"),
        ("/admin/audit-logs", "Admin audit"),
        ("/admin/system", "Admin system"),
        ("/join/:roomId", "Guest join"),
        ("/room/:roomId", "Room alias"),
        ("/settings/security", "Security page"),
        ("/home", "Home launcher"),
        ("/app/meetings/:meetingId", "Meeting detail"),
        ("/app/meeting/:roomId", "Authenticated live meeting"),
        ("/app/recordings/:recordingId", "Recording detail"),
        ("/app/billing/invoices/:invoiceId", "Invoice document"),
        ("/app/billing/invoices", "Invoice list alias"),
        ("/app/settings/members/:userId", "Member profile"),
        ("/app/settings/members/:userId/edit", "Member edit"),
        ("/app/workspace", "Legacy workspace redirect"),
        ("/app/workspace/members", "Legacy members redirect"),
        ("/app/workspace/rooms", "Legacy rooms redirect"),
        ("/app/admin", "In-app admin overview"),
        ("/admin/workspaces/new", "Admin create workspace"),
        ("/admin/workspaces/:id", "Admin workspace detail"),
        ("/admin/users/new", "Admin create user"),
        ("/admin/users/:id", "Admin user detail"),
        ("/admin/invoices/:id", "Admin invoice detail"),
        ("/admin/billing", "Admin billing overview"),
    ]:
        need_auth = path.startswith("/app") or path.startswith("/admin") or path.startswith("/settings") or path.startswith("/home")
        T("FE", "Frontend", feat, "Frontend", "P1" if path in ("/", "/auth", "/app", "/app/meetings") else "P2",
          "Matching session: none for public, user for /app, platformRole for /admin.",
          f"Verify route {path} loads the implemented page (not a blank crash) with loading then success or empty/error states as designed.",
          f"1) Open {path} at the appropriate origin. 2) Refresh. 3) Use browser Back.",
          path,
          ("Redirect to /auth if unauthenticated. " if need_auth else "Public render. ")
          + "No uncaught overlay. Empty states are not demo catalogs. /app/ai-insights remains honest empty. /app/settings/integrations does not fake OAuth connected.")

    T("FE", "Frontend", "Protected route bounce", "Authorization", "P0",
      "Logged out.",
      "Verify anonymous navigation to /app/meetings redirects to /auth.",
      "1) Clear cookies. 2) Open /app/meetings.",
      "",
      "Navigate to /auth. No meeting data flash of other tenants.")
    T("FE", "Frontend", "Admin guard", "Authorization", "P0",
      "Signed-in user with platformRole=none.",
      "Verify /admin is blocked by AdminGuard.",
      "1) Open /admin.",
      "",
      "Forbidden UI. No overview KPIs.")
    T("FE", "Frontend", "Catch-all", "Frontend", "P2",
      "",
      "Verify unknown SPA path redirects to landing.",
      "1) Open /not-a-real-page.",
      "",
      "Router Navigate to /.")
    T("FE", "Frontend", "Settings default", "Frontend", "P2",
      "Authenticated.",
      "Verify /app/settings redirects to /app/settings/profile.",
      "1) Open /app/settings.",
      "",
      "Profile section shown.")
    T("FE", "Frontend", "Loading state", "Frontend", "P1",
      "Slow network (throttle).",
      "Verify dashboard/meetings show a loading indicator before data.",
      "1) Throttle to Slow 3G. 2) Open /app/meetings.",
      "",
      "Skeleton/spinner then real rows or empty state.")
    T("FE", "Frontend", "API failure UI", "Error handling", "P1",
      "Stop API or return 500.",
      "Verify meetings page shows an error message rather than a white crash.",
      "1) Break API. 2) Open /app/meetings.",
      "",
      "Error copy. App shell still visible.")

    # URL production
    T("URL", "Public URLs", "Invite email FRONTEND_URL", "Positive", "P0",
      "Production FRONTEND_URL=" + PROD,
      "Verify workspace invite emails and API joinUrl use FRONTEND_URL/auth/invite?token= and never localhost, :3000, or :5173.",
      "1) Admin sends invite. 2) Read email/console joinUrl.",
      "Inspect workspace.service joinUrl builder",
      "URL host is 46.246.120.148:8980. Query has token. No 127.0.0.1.")
    T("URL", "Public URLs", "Meeting guest email", "Positive", "P0",
      "Host adds guestEmails.",
      "Verify meeting invite email join link is FRONTEND_URL/join/{roomId}?email=",
      "1) Invite guest email. 2) Read meeting-invite-email template output.",
      "",
      "http://46.246.120.148:8980/join/{roomId}?email= encoded. No localhost.")
    T("URL", "Public URLs", "Password reset link", "Positive", "P0",
      "Forgot password on production.",
      "Verify reset email uses FRONTEND_URL/auth/reset-password?token=",
      "1) Request reset. 2) Read link.",
      "",
      "Public host only.")
    T("URL", "Public URLs", "Verify email link", "Positive", "P0",
      "Signup on production.",
      "Verify verification email uses FRONTEND_URL/auth/verify-email?token=",
      "1) Signup. 2) Read link.",
      "",
      "Public host only.")
    T("URL", "Public URLs", "Copy guest link UI", "Positive", "P0",
      "Meeting detail on production SPA.",
      "Verify copied guest join URL from MeetingsList/MeetingRoomHeader/HomePage uses guestJoinUrl → VITE_FRONTEND_URL.",
      "1) Copy invite. 2) Paste.",
      "VITE_FRONTEND_URL baked at Docker build",
      "Copied URL is " + PROD + "/join/... not localhost:5173.")
    T("URL", "Public URLs", "Recording share URL", "Positive", "P1",
      "Recording exists.",
      "Verify recordingShareUrl uses public frontend origin.",
      "1) Copy share on recordings table/detail.",
      "",
      PROD + "/app/recordings/{id}")
    T("URL", "Public URLs", "CanonicalHost bounce", "Positive", "P1",
      "Open SPA on docker localhost:80 while VITE_FRONTEND_URL is public.",
      "Verify CanonicalHost redirects off-canonical hosts to the public origin except local Vite 5173/4173.",
      "1) Hit http://127.0.0.1 (port 80). 2) Hit localhost:5173.",
      "",
      "Port 80 bounces to " + PROD + ". Vite 5173 stays local.")
    T("URL", "Public URLs", "Post-login enterApp production", "Positive", "P0",
      "Production SPA.",
      "Verify successful login uses enterApp → FRONTEND_URL/app not localhost.",
      "1) Login on " + PROD,
      "",
      "Address bar " + PROD + "/app")
    T("URL", "Public URLs", "OAuth callback redirect", "Positive", "P0",
      "Google OAuth configured with public redirect.",
      "Verify Google authorized redirect and app callback stay on the public host.",
      "1) Complete Google login on production.",
      "GOOGLE_REDIRECT_URI derived from FRONTEND_URL",
      "Callback on public origin. server.ts logs error if production redirect is localhost.")

    # Workspace / members / invites
    T("WS", "Workspace", "List mine", "Positive", "P0",
      "User is member of workspace A only.",
      "Verify GET /workspaces returns only memberships for the authenticated user.",
      "1) GET /workspaces with Bearer.",
      "X-Workspace-Id optional",
      "Array contains A only.")
    T("WS", "Workspace", "Get workspace member", "Positive", "P1",
      "Member of id.",
      "Verify GET /workspaces/:id succeeds for a member.",
      "1) GET /workspaces/{id} with X-Workspace-Id",
      "",
      "200 workspace document.")
    T("WS", "Workspace", "Get workspace outsider", "Authorization", "P0",
      "User not a member of id.",
      "Verify GET /workspaces/:id is forbidden for non-members.",
      "1) GET foreign id",
      "",
      "403 NOT_WORKSPACE_MEMBER.")
    T("WS", "Workspace", "Patch settings admin", "Positive", "P0",
      "Workspace admin.",
      "Verify PATCH /workspaces/:id/settings persists waitingRoom, autoRecord, joinBeforeHost, muteOnEntry, maxMeetingDurationMinutes, language.",
      "1) PATCH toggles. 2) GET workspace.",
      "",
      "Values stored on Workspace.settings.")
    T("WS", "Workspace", "Patch settings member", "Authorization", "P0",
      "role=member.",
      "Verify member cannot PATCH workspace settings.",
      "1) PATCH as member",
      "",
      "403 Insufficient role.")
    T("INV", "Invites", "Preview public", "Positive", "P0",
      "Valid invite token.",
      "Verify GET /workspaces/invites/preview?token= works without auth and returns org name.",
      "1) GET preview",
      "token from invite",
      "200 preview. No password yet.")
    T("INV", "Invites", "Preview invalid", "Negative", "P1",
      "",
      "Verify bad token preview fails.",
      "1) GET preview?token=nope",
      "",
      "404/400. No org leak beyond error.")
    T("INV", "Invites", "Create invite admin", "Positive", "P0",
      "Admin session, unused email, role member.",
      "Verify POST /workspaces/:id/invites creates WorkspaceInvite and joinUrl uses FRONTEND_URL.",
      "1) POST { name, email, role:'member' }",
      "",
      "Invite persisted status pending. Email/console contains public join URL.")
    T("INV", "Invites", "Create invite admin-role as admin", "Authorization", "P0",
      "Caller role=admin not owner.",
      "Verify only owner can invite role=admin.",
      "1) POST role=admin as admin",
      "",
      "403 Only the owner can invite admins.")
    T("INV", "Invites", "Create invite member", "Authorization", "P0",
      "role=member.",
      "Verify member cannot POST invites.",
      "1) POST invites",
      "",
      "403.")
    T("INV", "Invites", "Accept signed-in", "Positive", "P0",
      "Invite email matches authenticated user.",
      "Verify POST /workspaces/invites/accept attaches membership.",
      "1) POST accept { token }",
      "",
      "WorkspaceMember active. Workspace listed.")
    T("INV", "Invites", "Join complete password", "Positive", "P0",
      "New email invite.",
      "Verify POST /workspaces/invites/complete-password creates the user, sets password, and activates membership.",
      "1) complete-password token + password policy.",
      f"password={pwd}",
      "User exists. Can login. Member of org.")
    T("INV", "Invites", "Expired invite", "State transition", "P1",
      "Invite past expiresAt.",
      "Verify join/accept of expired invite fails.",
      "1) Use expired token.",
      "",
      "Error. No membership.")
    T("INV", "Invites", "Revoke invite", "Positive", "P1",
      "Pending invite.",
      "Verify DELETE /workspaces/:id/invites/:inviteId then join fails.",
      "1) DELETE. 2) Preview/join old token.",
      "",
      "Join fails.")
    T("INV", "Invites", "Resend", "Positive", "P2",
      "Pending invite.",
      "Verify POST .../invites/:inviteId/resend re-sends email.",
      "1) POST resend",
      "",
      "200. Console/SMTP log.")
    T("MEM", "Members", "List admin", "Positive", "P0",
      "Admin.",
      "Verify GET /workspaces/:id/members lists members.",
      "1) GET members",
      "",
      "200 array with roles/status.")
    T("MEM", "Members", "List as member", "Authorization", "P0",
      "role=member.",
      "Verify member cannot GET /members (admin+).",
      "1) GET members as member",
      "",
      "403. Directory endpoint remains available.")
    T("MEM", "Members", "Directory member", "Positive", "P1",
      "role=member.",
      "Verify GET /workspaces/:id/directory returns active members for DM/contacts.",
      "1) GET directory",
      "",
      "Active members only.")
    T("MEM", "Members", "Change role owner", "Positive", "P0",
      "Owner.",
      "Verify PATCH .../members/:userId/role to admin succeeds.",
      "1) PATCH { role:'admin' }",
      "",
      "Role admin persisted.")
    T("MEM", "Members", "Change role as admin", "Authorization", "P0",
      "Admin not owner.",
      "Verify admin cannot PATCH role (owner only).",
      "1) PATCH role",
      "",
      "403.")
    T("MEM", "Members", "Set inactive", "State transition", "P0",
      "Admin, target not owner.",
      "Verify PATCH .../status inactive then that user cannot pass requireWorkspace.",
      "1) Set inactive. 2) Target GET /workspace-meetings.",
      "MemberStatus inactive",
      "findMember only status=active → 403 NOT_WORKSPACE_MEMBER.")
    T("MEM", "Members", "Remove member", "Positive", "P0",
      "Admin.",
      "Verify DELETE member removes membership.",
      "1) DELETE .../members/:userId",
      "",
      "User no longer in list/directory.")
    T("ROOM", "Rooms", "List", "Positive", "P1",
      "Member.",
      "Verify GET /workspace-rooms lists rooms.",
      "1) GET /workspace-rooms",
      "X-Workspace-Id",
      "200 rooms array.")
    T("ROOM", "Rooms", "Create admin", "Positive", "P0",
      "Admin.",
      "Verify POST /workspace-rooms creates a room.",
      "1) POST name, room id, capacity, flags.",
      "",
      "201/200 room persisted.")
    T("ROOM", "Rooms", "Create member", "Authorization", "P0",
      "Member.",
      "Verify member cannot POST rooms.",
      "1) POST /workspace-rooms",
      "",
      "403.")
    T("TEAM", "Teams", "List", "Positive", "P1",
      "Member.",
      "Verify GET /workspace-teams lists teams.",
      "1) GET /workspace-teams",
      "",
      "200.")
    T("TEAM", "Teams", "Create admin", "Positive", "P0",
      "Admin.",
      "Verify POST /workspace-teams creates a team.",
      "1) POST name, members, lead.",
      "",
      "Team stored. Used later for meeting visibility.")
    T("TEAM", "Teams", "Create member", "Authorization", "P0",
      "Member.",
      "Verify member cannot POST teams.",
      "1) POST",
      "",
      "403.")
    T("TPL", "Templates", "CRUD member", "Positive", "P1",
      "Member.",
      "Verify member can GET/POST/PATCH/DELETE /workspace-templates for their workspace.",
      "1) Create. 2) Patch. 3) Delete.",
      "title, duration, agenda, waitingRoom, autoRecord, muteOnEntry",
      "Template lifecycle works. 404 on foreign id.")
    T("DASH", "Dashboard", "Summary", "Positive", "P0",
      "Member.",
      "Verify GET /dashboard/summary returns live counts for the workspace.",
      "1) GET /dashboard/summary",
      "",
      "JSON stats from Mongo, not Figma constants.")
    T("CAL", "Calendar", "Events", "Positive", "P0",
      "Scheduled meetings exist.",
      "Verify GET /calendar/events returns workspace meetings as calendar events.",
      "1) GET /calendar/events",
      "",
      "Events correspond to meetings. Empty array if none — no demo events.")
    T("RPT", "Reports", "Overview", "Positive", "P1",
      "Member.",
      "Verify GET /reports/overview returns aggregates.",
      "1) GET /reports/overview",
      "",
      "200. Note: Plan.features.reports is not checked.")

    # Meetings
    T("MEET", "Meetings", "Create instant", "Positive", "P0",
      "Workspace member.",
      "Verify POST /workspace-meetings with type=instant creates a meeting, unique roomId, host as creator, status live or joinable, participantCount>=1.",
      "1) POST { type:'instant', title }. 2) GET by id.",
      "title=Standup",
      "Meeting persisted. roomId unique. createdBy=user. Appears in list for host.")
    T("MEET", "Meetings", "Create scheduled", "Positive", "P0",
      "Member.",
      "Verify scheduled meeting stores scheduledAt, duration (default 30), agenda, settings flags, guestEmails lowercase.",
      "1) POST type=scheduled, scheduledAt ISO, duration, agenda[], guestEmails, settings.",
      "duration=45 waitingRoom=true",
      "status=scheduled. guestEmails lowercased. Calendar shows it.")
    T("MEET", "Meetings", "Duplicate roomId", "Database", "P1",
      "Existing roomId unique index.",
      "Verify inserting the same roomId fails uniquely.",
      "1) Create with explicit roomId. 2) Create again with same roomId.",
      "Meeting.roomId unique",
      "Second create errors. One document.")
    T("MEET", "Meetings", "List visibility member", "Authorization", "P0",
      "Member not invited, different team from host.",
      "Verify GET /workspace-meetings hides meetings the member is not allowed to see.",
      "1) As unrelated member GET list/detail.",
      "meeting-join-authz.service",
      "Meeting absent from list. GET :id 403/404.")
    T("MEET", "Meetings", "List visibility teammate", "Authorization", "P0",
      "Two members same WorkspaceTeam; host created meeting.",
      "Verify teammate of host can see the meeting without explicit invite.",
      "1) GET list as teammate.",
      "",
      "Meeting visible.")
    T("MEET", "Meetings", "List visibility admin", "Authorization", "P0",
      "Workspace admin.",
      "Verify admin sees all workspace meetings.",
      "1) GET list as admin.",
      "",
      "All meetings returned.")
    T("MEET", "Meetings", "Stats", "Positive", "P1",
      "Mixed statuses.",
      "Verify GET /workspace-meetings/stats matches list filters (no fake KPI).",
      "1) GET /stats. 2) Compare with list.",
      "",
      "Counts consistent.")
    T("MEET", "Meetings", "Pagination", "Boundary", "P2",
      "Many meetings.",
      "Verify page/limit query paging.",
      "1) GET page=1 limit=1. 2) page=2.",
      "limit=1",
      "Different items. Total reported.")
    T("MEET", "Meetings", "Add participant", "Positive", "P0",
      "Host, other member userId.",
      "Verify POST /workspace-meetings/:id/participants adds the user and they can see the meeting.",
      "1) POST participants. 2) As invitee GET list.",
      "",
      "MeetingParticipant created. Invitee sees meeting.")
    T("MEET", "Meetings", "Remove participant", "Positive", "P1",
      "Participant added.",
      "Verify DELETE /:id/participants/:userId removes access.",
      "1) DELETE. 2) Invitee GET detail.",
      "",
      "403/hidden.")
    T("MEET", "Meetings", "Add/remove guest email", "Positive", "P0",
      "Host.",
      "Verify guestEmails can be added via participants API/body and removed via DELETE /:id/guest-emails.",
      "1) Add guest@x.com. 2) Guest token succeeds. 3) Remove. 4) Guest token fails.",
      "email lowercase",
      "Access follows guestEmails.")
    T("MEET", "Meetings", "Register", "Positive", "P2",
      "Invited member, scheduled meeting.",
      "Verify POST /:id/register records RSVP.",
      "1) POST register",
      "",
      "200 registration recorded.")
    T("MEET", "Meetings", "Join authenticated", "State transition", "P0",
      "Member with access. Meeting joinable.",
      "Verify POST /workspace-meetings/:id/join transitions scheduled→live when appropriate and returns join payload.",
      "1) POST join",
      "status enum scheduled|live|ended|cancelled",
      "200. status live. startedAt set on first join.")
    T("MEET", "Meetings", "End meeting", "State transition", "P0",
      "Host, status live.",
      "Verify POST /:id/end sets ended, endedAt, and socket meeting-ended disconnects peers.",
      "1) POST end. 2) Guest/member rejoin.",
      "",
      "status=ended. Further join 403. Media room gone.")
    T("MEET", "Meetings", "Cancel", "State transition", "P0",
      "Host, scheduled.",
      "Verify POST /:id/cancel sets cancelled and blocks join.",
      "1) POST cancel. 2) POST join / guest.",
      "",
      "status=cancelled. Join forbidden.")
    T("MEET", "Meetings", "Patch title", "Positive", "P1",
      "Host, scheduled.",
      "Verify PATCH /:id updates title/time.",
      "1) PATCH title",
      "",
      "Persisted.")
    T("MEET", "Meetings", "Join unauthorized", "Authorization", "P0",
      "Unrelated member.",
      "Verify POST join is forbidden.",
      "1) POST join",
      "",
      "403.")
    T("MEET", "Meetings", "By room id", "Positive", "P1",
      "Known roomId.",
      "Verify GET /workspace-meetings/by-room/:roomId returns the meeting if authorized.",
      "1) GET by-room",
      "",
      "200 meeting. Unauthorized 403.")
    T("MEET", "Meetings", "Unknown id", "Error handling", "P1",
      "",
      "Verify GET /workspace-meetings/:id with random ObjectId is not found.",
      "1) GET /workspace-meetings/000000000000000000000000",
      "",
      "404.")
    T("MEET", "Meetings", "Legacy list/create/delete", "API", "P2",
      "Authenticated (legacy /meetings router).",
      "Verify legacy GET/POST/DELETE /meetings still function for compatibility.",
      "1) POST /meetings. 2) GET /. 3) DELETE /:id",
      "meetings.routes.ts",
      "CRUD works or documented 401 if unused. Do not break if UI uses workspace-meetings.")
    T("MEET", "Meetings", "Notifications mine", "Positive", "P1",
      "User was invited.",
      "Verify GET /workspace-meetings/notifications/mine lists AppNotifications.",
      "1) GET notifications/mine",
      "",
      "Array. POST notifications/read marks ids read.")

    # Live / WebRTC
    T("JOIN", "Live meeting", "Host join-room", "Positive", "P0",
      "Valid access token. Meeting joinable. Socket.IO connected with auth.",
      "Verify socket event join-room as host completes immediately (no waiting) and get-room-state lists the host peer.",
      "1) io({ auth: { token } }). 2) emit join-room { roomId }. 3) get-room-state.",
      "media.handler.ts join-room",
      "Callback success with participantId. peer-joined to others. Host not in waiting.")
    T("JOIN", "Live meeting", "Member waiting room on", "State transition", "P0",
      "meeting.settings.waitingRoom=true. Member not host.",
      "Verify join-room places the member in waiting and emits waiting-join-request to host.",
      "1) Member join-room. 2) Host list-waiting.",
      "",
      "Member sees waiting UI. Host receives waiting-join-request.")
    T("JOIN", "Live meeting", "Admit waiting", "State transition", "P0",
      "Pending waiting request.",
      "Verify host emit admit-waiting completes join for the target (waiting-admitted + waiting-request-resolved).",
      "1) Host admit-waiting { requestId }.",
      "",
      "Target joins media. Waiting list cleared for that request.")
    T("JOIN", "Live meeting", "Deny waiting", "State transition", "P0",
      "Pending request.",
      "Verify deny-waiting emits waiting-denied and does not create producers for the target.",
      "1) Host deny-waiting.",
      "",
      "Target does not appear in room-state peers.")
    T("JOIN", "Live meeting", "Guest always waits", "Positive", "P0",
      "Guest JWT. Even if waitingRoom=false.",
      "Verify guests always require admit.",
      "1) Guest join-room.",
      "code comment guests always wait",
      "waiting-join-request to host. Guest not in media until admit.")
    T("JOIN", "Live meeting", "join-room invalid room", "Negative", "P0",
      "Socket authenticated.",
      "Verify join-room for unknown roomId fails.",
      "1) emit join-room { roomId:'nope' }",
      "",
      "Callback error. Not in room.")
    T("JOIN", "Live meeting", "join-room unauthenticated socket", "Authentication", "P0",
      "Connect Socket.IO without JWT.",
      "Verify connection is rejected or join-room fails.",
      "1) io() no auth. 2) join-room.",
      "socket.server.ts handshake",
      "Handshake error or join forbidden.")
    T("JOIN", "Live meeting", "Rejoin same user", "Failure/Recovery", "P1",
      "Already in room.",
      "Verify refreshing the tab leaves then rejoins without duplicating identity forever.",
      "1) Host in call. 2) Refresh. 3) Rejoin.",
      "",
      "Old peer-left. New participantId. One live peer for the user.")
    T("JOIN", "Live meeting", "leave-room", "State transition", "P0",
      "In room.",
      "Verify leave-room emits peer-left and closes transports.",
      "1) emit leave-room. 2) Other peer get-room-state.",
      "",
      "Peer absent. Camera light off.")
    T("JOIN", "Live meeting", "end-meeting socket", "State transition", "P0",
      "Host in room.",
      "Verify host emit end-meeting broadcasts meeting-ended and disconnects all.",
      "1) end-meeting. 2) Others receive meeting-ended.",
      "",
      "All sockets leave. Meeting.status ended.")
    T("JOIN", "Live meeting", "Non-host end-meeting", "Authorization", "P0",
      "Plain member in room.",
      "Verify non-host cannot end-meeting via socket.",
      "1) Member emit end-meeting.",
      "",
      "Error. Meeting still live.")

    T("WEBRTC", "mediasoup", "Create send transport", "Positive", "P0",
      "Joined room.",
      "Verify create-webrtc-transport returns iceParameters, iceCandidates, dtlsParameters for a send transport.",
      "1) emit create-webrtc-transport { direction:'send' }.",
      "media.handler.ts",
      "Callback with transport params. Server transport created.")
    T("WEBRTC", "mediasoup", "Create recv transport", "Positive", "P0",
      "Joined.",
      "Verify recv transport creation succeeds.",
      "1) create-webrtc-transport recv.",
      "",
      "Params returned.")
    T("WEBRTC", "mediasoup", "Connect transport", "Positive", "P0",
      "Transport created. Client DTLS ready.",
      "Verify connect-transport with dtlsParameters succeeds.",
      "1) emit connect-transport.",
      "",
      "Callback ok. DTLS connected.")
    T("WEBRTC", "mediasoup", "Connect invalid transport", "Negative", "P1",
      "Joined.",
      "Verify connect-transport with unknown id fails.",
      "1) emit connect-transport { transportId:'nope' }",
      "",
      "Callback error. No throw crash.")
    T("WEBRTC", "mediasoup", "Produce mic", "Positive", "P0",
      "Send transport connected. Mic track.",
      "Verify produce { kind:'audio' } creates a producer and notifies others via new-producer.",
      "1) produce audio. 2) Other peer consume.",
      "",
      "producerId returned. Remote new-producer event.")
    T("WEBRTC", "mediasoup", "Produce camera", "Positive", "P0",
      "Camera track.",
      "Verify produce video creates a producer.",
      "1) produce video",
      "",
      "producerId. Others can consume.")
    T("WEBRTC", "mediasoup", "Produce screen", "Positive", "P0",
      "getDisplayMedia track.",
      "Verify screen share is produced (appData source=screen or equivalent) and remotes consume it.",
      "1) Start share. 2) produce. 3) Remote consume.",
      "",
      "Remote sees screen. stop → close-producer → producer-closed.")
    T("WEBRTC", "mediasoup", "Consume", "Positive", "P0",
      "Remote producer exists. Recv transport connected.",
      "Verify consume returns consumer parameters and resume-consumer enables media.",
      "1) consume { producerId }. 2) resume-consumer.",
      "",
      "Media plays. pause-consumer silences without closing.")
    T("WEBRTC", "mediasoup", "Pause/resume producer", "Positive", "P0",
      "Audio producer live.",
      "Verify pause-producer emits producer-paused and resume-producer emits producer-resumed (mute sync).",
      "1) Mute UI → pause-producer. 2) Unmute → resume-producer.",
      "",
      "Remote stops/starts hearing. UI state matches.")
    T("WEBRTC", "mediasoup", "Close producer", "Positive", "P0",
      "Video producer.",
      "Verify close-producer emits producer-closed and remotes close consumers.",
      "1) Camera off → close-producer.",
      "",
      "Remote video placeholder. No orphan consumer.")
    T("WEBRTC", "mediasoup", "Restart ICE", "Failure/Recovery", "P1",
      "Connected transport, then ICE fail.",
      "Verify restart-ice returns new iceParameters.",
      "1) Simulate ICE fail. 2) restart-ice.",
      "",
      "Callback with iceParameters. Connection recovers or UI shows reconnecting.")
    T("WEBRTC", "mediasoup", "Replace track", "Positive", "P1",
      "Producer exists, device change.",
      "Verify replace-track is accepted for a live producer.",
      "1) Switch camera device. 2) replace-track.",
      "",
      "Remote sees new camera without full reproducer if supported.")
    T("WEBRTC", "mediasoup", "Layers/priority", "Positive", "P2",
      "Simulcast/svc consumer if enabled.",
      "Verify set-preferred-layers and set-consumer-priority do not crash.",
      "1) emit both with valid consumerId.",
      "",
      "Callback success or documented unsupported. No server crash.")
    T("WEBRTC", "mediasoup", "Produce without join", "Negative", "P0",
      "Socket connected, not in room.",
      "Verify produce is rejected with NOT_IN_ROOM.",
      "1) produce without join-room.",
      "",
      "Error. No producer.")
    T("WEBRTC", "mediasoup", "Announced IP", "Compatibility", "P0",
      "Docker MEDIASOUP_ANNOUNCED_IP set to public host IPv4.",
      "Verify remote browsers receive ICE candidates with the announced public IP, not 127.0.0.1.",
      "1) Join from a second machine. 2) Inspect iceCandidates.",
      "docker-compose MEDIASOUP_ANNOUNCED_IP",
      "Candidates use public IP. Two-machine call connects.")

    T("AUDIO", "Audio", "Mic allow", "Positive", "P0",
      "HTTPS or localhost. Permission grant.",
      "Verify allowing microphone captures audio and remote participant hears it after produce.",
      "1) Allow mic. 2) Join. 3) Speak.",
      "",
      "Remote hears audio. Mute pause-producer stops it.")
    T("AUDIO", "Audio", "Mic deny", "Negative", "P0",
      "Permission dismissed/denied.",
      "Verify user can still join with mic off and a clear error from mediaErrors.ts.",
      "1) Deny mic. 2) Join.",
      "",
      "Joined muted. No crash.")
    T("AUDIO", "Audio", "Device unavailable", "Negative", "P1",
      "No microphone hardware.",
      "Verify NotFoundError is surfaced in UI.",
      "1) Join on a machine with no mic.",
      "",
      "Friendly error. Join still possible.")
    T("AUDIO", "Audio", "Device switch", "Positive", "P2",
      "Two input devices.",
      "Verify switching mic uses replace-track or new produce.",
      "1) Change mic in pre-join/in-call.",
      "",
      "Audio continues from new device.")
    T("VIDEO", "Video", "Camera allow", "Positive", "P0",
      "HTTPS/localhost, camera granted.",
      "Verify local preview and remote tile show camera frames.",
      "1) Allow camera. 2) Join.",
      "",
      "Remote sees video. Off → placeholder.")
    T("VIDEO", "Video", "Camera deny", "Negative", "P0",
      "Permission denied.",
      "Verify join continues with avatar placeholder.",
      "1) Deny camera. 2) Join.",
      "",
      "Joined. No thrown overlay.")
    T("VIDEO", "Video", "HTTP public camera", "Compatibility", "P0",
      "Production http://46.246.120.148:8980 (insecure context).",
      "Verify getUserMedia is blocked and mediaErrors.ts explains HTTPS or localhost is required.",
      "1) Join meeting on public HTTP. 2) Request camera.",
      "isSecureContext false on public HTTP",
      "Clear insecure-page message. No silent hang.")
    T("VIDEO", "Video", "Device change", "Positive", "P2",
      "Two cameras.",
      "Verify camera switch updates remote video.",
      "1) Switch device.",
      "",
      "Remote sees new camera.")
    T("SHARE", "Screen share", "Start/stop", "Positive", "P0",
      "Browser display-capture permission (nginx Permissions-Policy camera/microphone/display-capture self).",
      "Verify start share produces a video producer and stop closes it for remotes.",
      "1) Share window. 2) Remote observes. 3) Stop.",
      "client/nginx.conf Permissions-Policy",
      "Remote sees pixels. Stop → producer-closed.")
    T("SHARE", "Screen share", "Permission denied", "Negative", "P0",
      "User cancels picker.",
      "Verify canceling getDisplayMedia does not leave a stuck sharing state.",
      "1) Start share. 2) Cancel picker.",
      "",
      "UI not stuck on sharing. No empty producer.")
    T("SHARE", "Screen share", "Second sharer", "Boundary", "P1",
      "A already sharing.",
      "Verify B starting share is allowed or documented as replace — no crash.",
      "1) A shares. 2) B shares.",
      "",
      "Either both visible or last-writer; record actual. Server stays up.")

    T("CHAT", "Meeting chat", "Send", "Positive", "P0",
      "Both joined same room.",
      "Verify send-message with content 1–2000 chars broadcasts chat-message to the room with senderId from JWT not client.",
      "1) emit send-message { roomId, content:'hello' }.",
      "SendMessageSchema content/text min1 max2000",
      "Others receive chat-message. senderId is JWT userId.")
    T("CHAT", "Meeting chat", "Empty", "Validation", "P0",
      "In room.",
      "Verify empty/whitespace content is rejected.",
      "1) send-message content='   '",
      "",
      "VALIDATION_ERROR. No broadcast.")
    T("CHAT", "Meeting chat", "Long 2000", "Boundary", "P1",
      "In room.",
      "Verify 2000-char message succeeds and 2001 fails.",
      "1) 2000 chars. 2) 2001 chars.",
      "",
      "2000 delivered. 2001 validation error.")
    T("CHAT", "Meeting chat", "XSS", "Security", "P0",
      "In room.",
      "Verify HTML/script in chat is not executed in the SPA.",
      "1) Send <img src=x onerror=alert(1)> and <script>alert(1)</script>.",
      "",
      "Rendered as text. No alert.")
    T("CHAT", "Meeting chat", "Rate limit", "Negative", "P1",
      "In room.",
      "Verify more than 5 messages/second is RATE_LIMITED.",
      "1) Burst 8 send-message.",
      "MAX_MESSAGES_PER_SECOND=5",
      "Later callbacks RATE_LIMITED.")
    T("CHAT", "Meeting chat", "History cap", "Boundary", "P2",
      "Room with >200 messages.",
      "Verify get-chat-history returns at most 200 in-memory messages.",
      "1) Send 201. 2) get-chat-history.",
      "MAX_MESSAGES_PER_ROOM=200",
      "History length ≤200. Oldest dropped.")
    T("CHAT", "Meeting chat", "Not in room", "Authorization", "P0",
      "Socket connected, not joined.",
      "Verify send-message returns NOT_IN_ROOM.",
      "1) send-message",
      "",
      "code NOT_IN_ROOM.")
    T("CHAT", "Meeting chat", "History on join", "Positive", "P1",
      "Existing history.",
      "Verify get-chat-history returns prior messages for the room.",
      "1) Late joiner get-chat-history.",
      "",
      "Array of ChatMessagePayload.")
    T("CHAT", "Reactions", "Send reaction", "Positive", "P1",
      "In room.",
      "Verify send-reaction broadcasts peer-reaction.",
      "1) send-reaction { reaction:'👍' }",
      "max 64 chars",
      "Others see peer-reaction.")
    T("CHAT", "Reactions", "Raise hand", "Positive", "P1",
      "In room.",
      "Verify raise-hand { isRaised:true/false } broadcasts peer-raise-hand.",
      "1) Raise. 2) Lower.",
      "",
      "Room sees both states.")

    T("MOD", "Moderation", "Host mute", "Positive", "P1",
      "Host + participant in room.",
      "Verify host-moderate action=mute emits moderation-command to the target.",
      "1) emit host-moderate { action:'mute', targetParticipantId }.",
      "actions: mute,unmute,camera-off,camera-on,disable-chat,enable-chat,kick",
      "Target receives moderation-command. Client applies mute.")
    T("MOD", "Moderation", "Kick", "Positive", "P1",
      "Host.",
      "Verify action=kick instructs the target to leave.",
      "1) host-moderate kick.",
      "",
      "Target leaves / cannot stay in media.")
    T("MOD", "Moderation", "Member cannot moderate", "Authorization", "P0",
      "Plain member.",
      "Verify host-moderate from a non-host/non-admin fails.",
      "1) Member host-moderate mute.",
      "canModerateRoom host or workspace admin/owner",
      "Error Only the host or an admin can moderate.")
    T("MOD", "Moderation", "Invalid action", "Validation", "P2",
      "Host.",
      "Verify unknown action is rejected.",
      "1) action='explode'",
      "",
      "Invalid moderation request.")

    T("WB", "Whiteboard", "Join/update/sync", "Positive", "P0",
      "Both in meeting room. Excalidraw panel open.",
      "Verify whiteboard:join then whiteboard:update broadcasts whiteboard:sync to others with server revision.",
      "1) A whiteboard:join. 2) A draw → whiteboard:update. 3) B receives whiteboard:sync.",
      "WB_EVENTS in whiteboard.constants.ts; max update 512000 bytes",
      "B sees strokes. Persistence in WhiteboardDocument if implemented.")
    T("WB", "Whiteboard", "Not in room", "Authorization", "P0",
      "Socket not in meeting.",
      "Verify whiteboard:join without meeting binding returns NOT_IN_ROOM.",
      "1) whiteboard:join",
      "getMeetingBinding",
      "error Not in room.")
    T("WB", "Whiteboard", "Clear", "Positive", "P1",
      "Board has strokes.",
      "Verify whiteboard:clear syncs empty scene to all.",
      "1) whiteboard:clear",
      "",
      "All clients clear.")
    T("WB", "Whiteboard", "Cursor", "Positive", "P2",
      "Two users on board.",
      "Verify whiteboard:cursor is throttled and relayed, not persisted.",
      "1) Move pointer rapidly.",
      "WB_CURSOR_RATE_LIMIT",
      "Remote cursors move. Excess events dropped. No DB writes.")
    T("WB", "Whiteboard", "Visibility", "Positive", "P1",
      "A opens board.",
      "Verify whiteboard:visibility and whiteboard:get-visibility let late joiners open the panel.",
      "1) A open board. 2) B join meeting. 3) B get-visibility.",
      "",
      "B told board is active.")
    T("WB", "Whiteboard", "Oversized update", "Boundary", "P1",
      "In board.",
      "Verify update > 512000 bytes is rejected.",
      "1) Send oversized payload.",
      "WB_MAX_UPDATE_BYTES=512000",
      "whiteboard:error or callback error. Server stays up.")
    T("WB", "Whiteboard", "Rate limit updates", "Negative", "P2",
      "In board.",
      "Verify exceeding WB_UPDATE_RATE_LIMIT in the window is rejected.",
      "1) Burst updates.",
      "",
      "Later updates dropped/errored.")
    T("WB", "Whiteboard", "Reconnect", "Failure/Recovery", "P1",
      "Scene drawn, then refresh.",
      "Verify rejoining loads snapshot or last sync so work is not silently lost for the same meeting.",
      "1) Draw. 2) Refresh. 3) whiteboard:join.",
      "WhiteboardDocument model",
      "Scene restored or documented reset — record actual.")

    T("RC", "Remote control", "Request/accept", "Positive", "P1",
      "Two peers in meeting. PENDING_REQUEST_TTL_MS=45s.",
      "Verify remote-control:request then respond accept emits remote-control:started.",
      "1) A request. 2) B respond accept.",
      "RC_EVENTS",
      "A can send remote-control:action. Session in remote-control-session model.")
    T("RC", "Remote control", "Reject", "Negative", "P1",
      "Pending request.",
      "Verify reject emits remote-control:rejected and no actions work.",
      "1) B reject.",
      "",
      "A cannot control B.")
    T("RC", "Remote control", "Stop", "Positive", "P1",
      "Active session.",
      "Verify remote-control:stop emits stopped/ended.",
      "1) Either side stop.",
      "",
      "Further action rejected.")
    T("RC", "Remote control", "TTL expire", "Boundary", "P2",
      "Request not answered for 45s.",
      "Verify pending request expires.",
      "1) Request. 2) Wait 45s. 3) Accept.",
      "PENDING_REQUEST_TTL_MS=45000",
      "Accept fails. Request gone.")
    T("RC", "Remote control", "Action rate limit", "Negative", "P2",
      "Active session.",
      "Verify ACTION_RATE_LIMIT 20/sec is enforced.",
      "1) Burst remote-control:action.",
      "ACTION_RATE_LIMIT=20 / 1000ms",
      "Excess ignored/errored.")
    T("RC", "Remote control", "Unauthorized action", "Authorization", "P0",
      "No session.",
      "Verify remote-control:action without a session fails.",
      "1) emit action.",
      "",
      "Error. No UI command on target.")

    T("REC", "Recording", "Socket start/stop", "Positive", "P1",
      "In room. FFmpeg available if server-side path used.",
      "Verify start-recording / get-recording-status / stop-recording callbacks succeed or return a clear error if FFmpeg missing.",
      "1) start-recording. 2) get-recording-status. 3) stop-recording.",
      "RECORDING_FFMPEG_PATH",
      "Status reflects recording. Failure is explicit, not hang.")
    T("REC", "Recording", "Client upload", "Positive", "P0",
      "Host recorded a webm via meeting-screen-recorder. Authenticated.",
      "Verify POST /recordings/:roomId raw body up to 500mb stores a recording and it appears in GET /recordings.",
      "1) Upload webm. 2) GET /recordings. 3) GET /:id/stream.",
      "legacy recordings.routes POST /:roomId raw 500mb",
      "Recording document. Stream 200 for workspace member.")
    T("REC", "Recording", "List empty", "Frontend", "P0",
      "No recordings.",
      "Verify recordings page empty state has no demo rows.",
      "1) Open /app/recordings",
      "",
      "Empty UI.")
    T("REC", "Recording", "Stream unauthorized", "Authorization", "P0",
      "Recording in workspace A.",
      "Verify workspace B member cannot GET /recordings/:id/stream.",
      "1) Stream with B workspace header.",
      "",
      "403/404. No file bytes.")
    T("REC", "Recording", "Patch title", "Positive", "P1",
      "Owner or admin.",
      "Verify PATCH /recordings/:id updates title.",
      "1) PATCH { title }",
      "",
      "List shows new title.")
    T("REC", "Recording", "Delete owner", "Positive", "P1",
      "Uploader.",
      "Verify DELETE /recordings/:id removes DB row and storage object.",
      "1) DELETE. 2) stream.",
      "Only uploader or admin+",
      "success true. Stream 404.")
    T("REC", "Recording", "Delete other member", "Authorization", "P0",
      "Member not uploader, not admin.",
      "Verify delete is forbidden.",
      "1) DELETE",
      "",
      "403 Only the uploader or an admin can delete.")
    T("REC", "Recording", "Unknown id", "Error handling", "P2",
      "",
      "Verify GET /recordings/:id unknown ObjectId 404s.",
      "1) GET random id",
      "",
      "404.")

    # Messages
    T("MSG", "Messages", "Create conversation", "Positive", "P0",
      "Two workspace members.",
      "Verify POST /messages/conversations with the other userId opens/returns a conversation.",
      "1) POST conversations. 2) GET messages.",
      "",
      "201/200 conversation. Both are members.")
    T("MSG", "Messages", "Send text", "Positive", "P0",
      "Conversation member.",
      "Verify POST .../messages stores text and socket DM notify.",
      "1) POST { text:'hi' }",
      "",
      "201 message. Other user notification/socket.")
    T("MSG", "Messages", "Edit own", "Positive", "P1",
      "Own message.",
      "Verify PATCH message text as author.",
      "1) PATCH { text }",
      "",
      "Updated. Other user sees update event.")
    T("MSG", "Messages", "Edit others", "Authorization", "P0",
      "Message by A, caller B.",
      "Verify B cannot edit A's message.",
      "1) PATCH as B",
      "",
      "403.")
    T("MSG", "Messages", "Delete own", "Positive", "P1",
      "Own message.",
      "Verify DELETE marks/removes message.",
      "1) DELETE",
      "",
      "Deleted state. Emit update.")
    T("MSG", "Messages", "React/pin/read", "Positive", "P1",
      "Message exists.",
      "Verify react, pin, and read endpoints update the message.",
      "1) POST react emoji. 2) pin true. 3) read messageIds.",
      "",
      "Emoji present. Pinned. Read receipts updated.")
    T("MSG", "Messages", "Search", "Positive", "P1",
      "Unique phrase sent.",
      "Verify GET /messages/search finds it.",
      "1) GET /messages/search?q=",
      "",
      "Hit returned.")
    T("MSG", "Messages", "Shared media", "Positive", "P2",
      "Image attachment sent.",
      "Verify GET .../shared lists it.",
      "1) GET shared",
      "",
      "Attachment listed.")
    T("MSG", "Messages", "Chunked upload", "Positive", "P1",
      "Member.",
      "Verify uploads/init → chunk → complete then GET /messages/files returns bytes.",
      "1) init. 2) chunk. 3) complete. 4) GET files.",
      "JSON body limit 8mb; files via storage",
      "File stored. Authorized GET returns content.")
    T("MSG", "Messages", "Foreign conversation", "Authorization", "P0",
      "Conversation in another workspace.",
      "Verify messages APIs 403 via assertConversationMember.",
      "1) GET messages with other workspace header/id.",
      "",
      "403/404.")
    T("CALL", "Chat calls", "Start/accept", "Positive", "P1",
      "DM open. useChatCall.",
      "Verify in-thread A/V call connects using the same media stack.",
      "1) A start call. 2) B accept.",
      "client messages useChatCall",
      "Both audio. Hang up stops tracks.")
    T("CALL", "Chat calls", "Reject", "Negative", "P1",
      "Incoming call.",
      "Verify reject notifies caller and creates no lingering room.",
      "1) B reject.",
      "",
      "Caller sees rejected. No media.")

    T("NTF", "Notifications", "Meeting invite ntf", "Positive", "P1",
      "Host added participant.",
      "Verify GET notifications/mine includes the invite and UI /app/notifications shows it.",
      "1) Invite. 2) Open notifications.",
      "",
      "Unread item. Mark read works.")
    T("NTF", "Notifications", "Empty", "Frontend", "P2",
      "New user.",
      "Verify empty notifications is not a demo list.",
      "1) Open /app/notifications",
      "",
      "Empty state.")

    # Billing
    T("BIL", "Billing", "List plans", "Positive", "P0",
      "Plans seeded DEFAULT_PLANS.",
      "Verify GET /billing/plans returns free/pro/enterprise with monthlyPrice 0/49/299 unless admin edited.",
      "1) GET /billing/plans",
      "Plan.model.ts DEFAULT_PLANS",
      "Three plans. Features flags present.")
    T("BIL", "Billing", "Get plan+usage", "Positive", "P0",
      "Member.",
      "Verify GET /billing/plan and /billing/usage match Subscription meters.",
      "1) GET both",
      "",
      "used/included/overage/period dates live.")
    T("BIL", "Billing", "Usage meetings admin", "Authorization", "P1",
      "Admin vs member.",
      "Verify GET /billing/usage/meetings is admin+.",
      "1) Member GET. 2) Admin GET.",
      "",
      "Member 403. Admin 200.")
    T("BIL", "Billing", "Owner change plan", "Positive", "P0",
      "Owner on free.",
      "Verify PATCH /billing/plan { planKey:'pro' } updates subscription and syncs invoice.",
      "1) PATCH. 2) GET invoices.",
      "planKey free|pro|enterprise",
      "planKey=pro. Invoice line item Pro monthly.")
    T("BIL", "Billing", "Member change plan", "Authorization", "P0",
      "Member.",
      "Verify PATCH /billing/plan is owner only.",
      "1) PATCH as member",
      "",
      "403.")
    T("BIL", "Billing", "Admin change plan", "Authorization", "P0",
      "Workspace admin not owner.",
      "Verify admin cannot PATCH /billing/plan.",
      "1) PATCH as admin",
      "",
      "403.")
    T("BIL", "Billing", "Invoices list", "Positive", "P0",
      "After plan sync.",
      "Verify GET /billing/invoices returns Invoice documents for the workspace.",
      "1) GET /billing/invoices",
      "unique workspaceId+periodStart",
      "Array of invoices. Numbers INV-YYYYMM-suffix.")
    T("BIL", "Billing", "Free auto paid", "State transition", "P0",
      "Free plan, total<=0.",
      "Verify $0 invoice status=paid automatically.",
      "1) Open invoice.",
      "invoice.helpers autoPaid",
      "status paid. paidAt set. total 0.")
    T("BIL", "Billing", "Pro issued", "State transition", "P0",
      "Pro, no provider.",
      "Verify invoice status=issued until mark paid.",
      "1) GET invoice",
      "",
      "issued. total>=49 unless price edited.")
    T("BIL", "Billing", "Get invoice IDOR", "Security", "P0",
      "Invoice belongs to workspace A.",
      "Verify workspace B cannot GET that invoiceId.",
      "1) GET /billing/invoices/{id} with B header",
      "",
      "404.")
    T("BIL", "Billing", "Pay admin", "Positive", "P0",
      "Issued invoice. Caller owner or admin (hasMinRole admin includes owner).",
      "Verify POST /billing/invoices/:id/pay sets paid.",
      "1) POST pay",
      "",
      "status paid.")
    T("BIL", "Billing", "Pay member", "Authorization", "P0",
      "Member.",
      "Verify member cannot pay.",
      "1) POST pay",
      "",
      "403.")
    T("BIL", "Billing", "Pay void", "Negative", "P1",
      "Invoice status=void.",
      "Verify markInvoicePaid rejects void.",
      "1) POST pay",
      "",
      "Validation error Void invoices cannot be paid.")
    T("BIL", "Billing", "Pay already paid", "Boundary", "P2",
      "Paid invoice.",
      "Verify second pay is idempotent success.",
      "1) POST pay again",
      "",
      "Returns paid. No duplicate side effect.")
    T("BIL", "Billing", "Payment methods empty", "Positive", "P0",
      "Member.",
      "Verify GET /billing/payment-methods returns { paymentMethods: [] }.",
      "1) GET payment-methods. 2) View Billing UI.",
      "",
      "Empty array. UI has no Visa 4242.")
    T("BIL", "Billing", "Print invoice", "Frontend", "P1",
      "Invoice detail page.",
      "Verify Print/Save PDF opens print dialog with line items.",
      "1) /app/billing/invoices/:id Print",
      "",
      "window.print. No fake catalog items.")

    # Settings / AI
    T("SET", "Settings", "Integrations honest", "Frontend", "P0",
      "Open /app/settings/integrations.",
      "Verify the page states Google Calendar, Slack, and Outlook are not wired — no fake Connected toggles.",
      "1) Open Integrations.",
      "SettingsSections IntegrationsSection",
      "Honest later copy only.")
    T("SET", "Settings", "2FA absent", "Frontend", "P1",
      "/settings/security.",
      "Verify there is no TOTP enrollment; password/sessions/verify work.",
      "1) Open security page.",
      "",
      "No authenticator setup. Change password and sessions work.")
    T("AI", "AI Insights", "Honest empty", "Frontend", "P0",
      "/app/ai-insights",
      "Verify AI page does not render DEMO_AI_MEETING transcript and explains AI is not enabled.",
      "1) Open AI Insights. 2) Search for demo speaker names.",
      "AiInsightsPage.tsx",
      "Empty later state. Links to meetings/recordings.")

    # Admin
    T("ADM", "Platform admin", "Guard API", "Authorization", "P0",
      "User platformRole=none.",
      "Verify GET /admin/overview returns 403 Platform admin access required.",
      "1) GET /admin/overview as normal user",
      "requirePlatformAdmin",
      "403.")
    T("ADM", "Platform admin", "Overview live KPIs", "Positive", "P0",
      "platform admin.",
      "Verify overview numbers are live and trend labels are not fake +12%.",
      "1) GET /admin/overview. 2) Open /admin UI.",
      "",
      "Counts match Mongo. No Figma MRR fallback.")
    T("ADM", "Platform admin", "Create workspace", "Positive", "P0",
      "Platform admin. Unused owner email.",
      "Verify POST /admin/workspaces creates org, owner, membership, subscription.",
      "1) POST org+owner+planKey.",
      "",
      "Workspace active. Owner can login.")
    T("ADM", "Platform admin", "Suspend workspace", "State transition", "P0",
      "Active org.",
      "Verify PATCH /admin/workspaces/:id/status { status:'suspended' } stores suspended.",
      "1) PATCH status. 2) Member calls meetings.",
      "Workspace.status enum active|suspended",
      "Stored suspended. NOTE: requireWorkspace currently does not block — see Known Gaps.")
    T("ADM", "Platform admin", "Create user", "Positive", "P1",
      "Platform admin.",
      "Verify POST /admin/users creates a user.",
      "1) POST email/name/password.",
      "",
      "User in GET /admin/users.")
    T("ADM", "Platform admin", "Ban confirm UI", "Positive", "P0",
      "Admin users page.",
      "Verify Ban shows confirm and PATCH accountStatus=banned.",
      "1) Ban. 2) Cancel first. 3) Confirm.",
      "User.accountStatus banned",
      "Cancel no change. Confirm banned. NOTE: login lockout incomplete — Known Gaps.")
    T("ADM", "Platform admin", "Cannot status self", "Negative", "P0",
      "Admin targeting own id.",
      "Verify PATCH own status is rejected.",
      "1) PATCH own id banned",
      "admin.service You cannot change your own account status",
      "Validation error.")
    T("ADM", "Platform admin", "Plans edit price", "Positive", "P0",
      "Admin.",
      "Verify PATCH /admin/plans/pro { monthlyPrice } persists and seedPlans $setOnInsert does not overwrite on restart.",
      "1) PATCH price. 2) Restart API. 3) GET plans.",
      "org.bootstrap seedPlans",
      "Price remains edited.")
    T("ADM", "Platform admin", "Invalid plan key", "Validation", "P1",
      "",
      "Verify PATCH /admin/plans/business is 400 Invalid plan key.",
      "1) PATCH key=business",
      "only free|pro|enterprise",
      "400.")
    T("ADM", "Platform admin", "Subscriptions patch", "Positive", "P0",
      "Admin.",
      "Verify PATCH /admin/subscriptions/:id { planKey, status } updates and syncs invoice.",
      "1) Change plan. 2) Cancel with UI confirm.",
      "status active|past_due|cancelled",
      "Subscription updated. Invoice synced.")
    T("ADM", "Platform admin", "Invoices pay", "Positive", "P0",
      "Issued invoice.",
      "Verify POST /admin/invoices/:id/pay marks paid and audit log invoice.pay.",
      "1) POST pay. 2) GET audit-logs.",
      "",
      "Paid. Audit row.")
    T("ADM", "Platform admin", "System settings", "Positive", "P1",
      "Admin.",
      "Verify GET/PATCH /admin/system-settings round-trip.",
      "1) GET. 2) PATCH. 3) GET.",
      "",
      "Persisted. Feature flags stored even if not gating runtime.")
    T("ADM", "Platform admin", "Claim dev access", "Positive", "P2",
      "Non-production claim path.",
      "Verify POST /admin/claim-dev-access promotes when allowed, else 403.",
      "1) POST claim-dev-access",
      "AdminGuard",
      "promoted true or forbidden. Document env rules.")

    # Security extra
    T("SEC", "Security", "Helmet", "Security", "P2",
      "API up.",
      "Verify security headers from helmet() on API responses.",
      "1) curl -I /health/live",
      "app.use(helmet())",
      "X-Content-Type-Options nosniff and related helmet defaults.")
    T("SEC", "Security", "CORS allowlist", "Security", "P0",
      "CORS_ORIGINS explicit in production (wildcard forbidden by env.ts).",
      "Verify a credentialed XHR from https://evil.example is blocked.",
      "1) Browser fetch from evil origin with credentials.",
      "createApp cors origin callback",
      "Browser CORS error. Server logs Origin not allowed.")
    T("SEC", "Security", "JSON 8mb limit", "Boundary", "P2",
      "API up.",
      "Verify JSON body larger than 8mb is rejected.",
      "1) POST /messages with >8mb JSON.",
      "express.json limit 8mb",
      "413/400. Process alive.")
    T("SEC", "Security", "XSS meeting title", "Security", "P0",
      "Create meeting.",
      "Verify meeting title HTML is escaped in list, detail, live header, calendar.",
      "1) Title <img src=x onerror=alert(1)>",
      "",
      "Text only. No script.")
    T("SEC", "Security", "IDOR recording", "Security", "P0",
      "Recording id from A.",
      "Verify B cannot PATCH/GET stream.",
      "1) As B GET stream",
      "",
      "403/404.")
    T("SEC", "Security", "Role manipulation body", "Security", "P0",
      "Member PATCH /auth/me with platformRole super_admin.",
      "Verify profile update cannot self-promote platformRole.",
      "1) PATCH /auth/me { platformRole:'super_admin' }",
      "UpdateProfileSchema",
      "Field ignored. platformRole unchanged.")
    T("SEC", "Security", "Guest JWT admin", "Security", "P0",
      "Guest token.",
      "Verify guest cannot GET /admin/overview.",
      "1) GET /admin/overview guest Bearer",
      "",
      "401/403.")

    # DB
    T("DB", "Database", "User email unique", "Database", "P0",
      "Existing user.",
      "Verify duplicate email insert fails on unique index.",
      "1) Insert second User same email.",
      "User.email unique",
      "E11000 duplicate key.")
    T("DB", "Database", "Meeting roomId unique", "Database", "P0",
      "",
      "Verify duplicate Meeting.roomId fails.",
      "1) Two meetings same roomId.",
      "",
      "Duplicate key error.")
    T("DB", "Database", "Invoice unique period", "Database", "P1",
      "Existing invoice workspace+periodStart.",
      "Verify unique index workspaceId+periodStart prevents duplicates; sync helper catches dup.",
      "1) Invoice.create same pair.",
      "Invoice.model index",
      "Duplicate key. syncInvoiceForWorkspace returns existing.")
    T("DB", "Database", "Subscription one per workspace", "Database", "P1",
      "",
      "Verify Subscription.workspaceId unique.",
      "1) Second subscription same workspace.",
      "",
      "Duplicate key.")
    T("DB", "Database", "Plan keys enum", "Database", "P1",
      "",
      "Verify Plan.key only free|pro|enterprise.",
      "1) Insert key=starter",
      "",
      "Validation error.")
    T("DB", "Database", "Meeting status enum", "Database", "P1",
      "",
      "Verify invalid Meeting.status is rejected.",
      "1) status=active (not in enum)",
      "enum scheduled|live|ended|cancelled",
      "Validation error. Use real states in tests.")
    T("DB", "Database", "Member status enum", "Database", "P2",
      "",
      "Verify WorkspaceMember.status enum active|inactive|invited|removed.",
      "1) Invalid status",
      "",
      "Validation error.")
    T("DB", "Database", "Refresh session revoke", "Database", "P1",
      "Logout.",
      "Verify RefreshSession is revoked/deleted so token reuse fails.",
      "1) Login. 2) Logout. 3) Present old refresh.",
      "ms_refresh cookie",
      "Refresh fails.")

    # Failure / recovery
    T("FAIL", "Failure", "Socket disconnect UI", "Failure/Recovery", "P0",
      "In live meeting.",
      "Verify turning network off shows reconnecting and turning it on restores socket+media or a recoverable error.",
      "1) Offline 10s. 2) Online.",
      "",
      "No duplicate ghosts. User can speak again or is told to rejoin.")
    T("FAIL", "Failure", "Tab close peer-left", "Failure/Recovery", "P1",
      "Two peers.",
      "Verify closing the tab emits peer-left to the other.",
      "1) A closes tab.",
      "socket disconnect handler",
      "B sees A leave.")
    T("FAIL", "Failure", "Server restart mid-call", "Failure/Recovery", "P0",
      "Live call.",
      "Verify API/socket restart: clients reconnect or show meeting ended/rejoin.",
      "1) Restart server container/process. 2) Observe clients.",
      "",
      "No infinite spinner. Rejoin or error. /health/ready comes back 200.")
    T("FAIL", "Failure", "API timeout", "Failure/Recovery", "P1",
      "Throttle/block API.",
      "Verify SPA shows failure on meetings fetch timeout.",
      "1) Drop API packets. 2) Open /app/meetings.",
      "",
      "Error state. Retry works when API returns.")
    T("FAIL", "Failure", "DB unavailable login", "Failure/Recovery", "P0",
      "Mongo down.",
      "Verify login fails closed (5xx/error) and does not issue a token.",
      "1) Stop Mongo. 2) POST /auth/login.",
      "",
      "Error. No cookie. /health/ready 503.")
    T("FAIL", "Failure", "FFmpeg missing recording", "Error handling", "P2",
      "RECORDING_FFMPEG_PATH invalid.",
      "Verify start-recording returns a failure payload instead of hanging.",
      "1) start-recording",
      "",
      "Callback error. Meeting continues.")
    T("FAIL", "Failure", "Slow network call", "Failure/Recovery", "P1",
      "Slow 3G.",
      "Verify join still completes or times out visibly.",
      "1) Join on slow network.",
      "",
      "Progress UI. Eventual connect or retry.")
    T("FAIL", "Failure", "Google unavailable", "Failure/Recovery", "P1",
      "Block accounts.google.com.",
      "Verify OAuth start surfaces a recoverable error.",
      "1) Click Google with Google blocked.",
      "",
      "Error/timeout. App still serves password login.")

    # Docker / nginx
    T("DOCK", "Deployment", "Client nginx socket.io", "Positive", "P0",
      "Docker client nginx.",
      "Verify /socket.io/ is proxied with Upgrade headers and 86400s timeouts.",
      "1) Join meeting through " + PROD,
      "client/nginx.conf location /socket.io/",
      "Socket connects. No 404 HTML for engine.io.")
    T("DOCK", "Deployment", "Nginx Google prefix", "Positive", "P0",
      "Production.",
      "Verify location ^~ /auth/google proxies to API so SPA regex does not swallow OAuth.",
      "1) GET " + PROD + "/auth/google as browser navigation.",
      "nginx ^~ /auth/google",
      "API handles OAuth, not index.html.")
    T("DOCK", "Deployment", "Nginx Accept split", "Positive", "P1",
      "Production.",
      "Verify HTML GET /auth serves SPA and XHR GET /auth/me hits API.",
      "1) Browser open /auth. 2) fetch /auth/me with JSON accept.",
      "nginx map Accept text/html",
      "SPA for document. API JSON for XHR.")
    T("DOCK", "Deployment", "healthz", "Positive", "P2",
      "Client container.",
      "Verify GET /healthz returns ok.",
      "1) curl client /healthz",
      "",
      "200 ok.")
    T("DOCK", "Deployment", "Permissions-Policy", "Positive", "P1",
      "Production nginx.",
      "Verify Permissions-Policy allows camera/microphone/display-capture self.",
      "1) Response headers on " + PROD,
      "nginx add_header Permissions-Policy",
      "Header present so browsers may prompt for media on this origin (still needs HTTPS for public IP).")
    T("DOCK", "Deployment", "Compose ports", "Positive", "P1",
      "docker-compose.yml.",
      "Verify client publishes 127.0.0.1:8080:80 (host nginx owns 8980) and server UDP 40000-40199.",
      "1) docker compose ps / inspect",
      "Do not bind 8980 on the client container",
      "No port fight with host nginx. UDP range published for mediasoup.")
    T("DOCK", "Deployment", "VITE_API_URL empty prod", "Positive", "P1",
      "Client Docker build args.",
      "Verify production build uses empty VITE_API_URL (same-origin nginx proxy) while local .env uses http://localhost:4001.",
      "1) Inspect built client env. 2) Network tab on production.",
      "docker-compose build args VITE_API_URL: \"\"",
      "Production XHR same origin. Local Vite hits :4001/:4002.")
    T("DOCK", "Deployment", "client_max_body_size 32m", "Boundary", "P2",
      "Nginx client.",
      "Verify uploads through nginx larger than 32m fail at nginx while API raw recording allows 500mb if hit directly.",
      "1) Upload >32m via public origin. 2) Upload via API direct if allowed.",
      "nginx client_max_body_size 32m",
      "Public 413 at 32m. Document API direct 500mb legacy path.")

    T("FE", "Frontend", "Responsive 375 meetings", "Compatibility", "P1",
      "375px viewport.",
      "Verify meetings list and join remain tappable.",
      "1) Chrome device mode 375. 2) Open /app/meetings.",
      "Chrome",
      "No overflow hiding Join.")
    T("FE", "Frontend", "Responsive live controls", "Compatibility", "P0",
      "Phone viewport in call.",
      "Verify mute/camera/leave are reachable (hamburger not covering hang-up).",
      "1) Join live at 375px.",
      "Chrome/Safari mobile",
      "Controls usable.")
    T("FE", "Frontend", "Firefox WebRTC", "Compatibility", "P1",
      "Firefox latest, HTTPS/localhost.",
      "Verify two-party audio/video in Firefox.",
      "1) Host Chrome. 2) Guest Firefox.",
      "Firefox",
      "Media works or documented getUserMedia difference.")
    T("FE", "Frontend", "Edge WebRTC", "Compatibility", "P2",
      "Edge latest.",
      "Verify join+camera on Edge.",
      "1) Join on Edge.",
      "Edge",
      "Call works.")
    T("FE", "Frontend", "Tablet calendar", "Compatibility", "P2",
      "768px.",
      "Verify calendar week/month usable on tablet.",
      "1) /app/calendar at 768px.",
      "",
      "Grid readable. Events tappable.")

    T("FE", "Frontend", "Authenticated live vs guest path", "Positive", "P0",
      "Logged-in host with a live meeting roomId.",
      "Verify host opens /app/meeting/:roomId (AppShell live page) while guests use /join/:roomId without the app chrome.",
      "1) Host Join from meetings list. 2) Guest open /join/{roomId}. 3) Open /room/{roomId} alias.",
      "App.tsx LiveMeetingPage on three paths",
      "Host stays in authenticated layout. Guest/join and /room render full-viewport meeting. Same media room.")
    T("FE", "Frontend", "Meeting detail 404", "Error handling", "P1",
      "Authenticated.",
      "Verify /app/meetings/{unknownId} shows not found, not another tenant's meeting.",
      "1) Open /app/meetings/000000000000000000000000",
      "",
      "Not-found/error. No crash.")
    T("FE", "Frontend", "Invoice detail print", "Frontend", "P1",
      "Owner with an invoice id.",
      "Verify /app/billing/invoices/:invoiceId loads InvoiceDocument and Print works.",
      "1) Open invoice. 2) Print.",
      "InvoiceDetailPage",
      "Line items from API. window.print.")
    T("FE", "Frontend", "Admin create workspace page", "Frontend", "P1",
      "Platform admin.",
      "Verify /admin/workspaces/new form posts POST /admin/workspaces and lands on detail.",
      "1) Fill org+owner email. 2) Submit.",
      "",
      "201 then /admin/workspaces/:id with live data.")
    T("FE", "Frontend", "Landing bilingual", "Frontend", "P1",
      "Public /.",
      "Verify language toggle switches landing copy without requiring login.",
      "1) Open /. 2) Switch language.",
      "landing i18n",
      "Copy changes. Auth links still /auth.")
    T("FE", "Frontend", "Missing workspace header", "Validation", "P0",
      "Valid Bearer, omit X-Workspace-Id on a requireWorkspace route.",
      "Verify GET /workspace-meetings without X-Workspace-Id fails closed.",
      "1) GET /workspace-meetings Authorization only.",
      "workspace.middleware",
      "400/403 missing workspace. No all-tenant dump.")
    T("FE", "Frontend", "Malformed JSON", "Validation", "P1",
      "API up.",
      "Verify POST /auth/login with Content-Type application/json and a truncated body returns 400 not 500.",
      "1) POST body '{'",
      "",
      "4xx. Process remains healthy.")
    T("JOIN", "Live meeting", "joinBeforeHost setting", "State transition", "P1",
      "Workspace or meeting joinBeforeHost=true. Host not yet in the room.",
      "Verify whether a member can join-room before the host is present (code currently does not enforce this flag).",
      "1) Set joinBeforeHost true. 2) Member join-room before host. 3) Record admit/waiting behavior.",
      "settings persisted; media.handler does not check joinBeforeHost",
      "Document actual: member may wait or enter. Do not fail solely because the flag is ignored — log Known Gaps if ignored.")
    T("ROOM", "Rooms", "No PATCH/DELETE API", "Known gap", "P2",
      "Admin created a room.",
      "Verify there is no PATCH or DELETE /workspace-rooms/:id in the router — UI cannot persist room edits/deletes via API.",
      "1) Inspect OPTIONS/PATCH /workspace-rooms/{id}. 2) Attempt edit in Settings → Rooms.",
      "workspace-rooms.routes.ts only GET+POST",
      "API 404 on PATCH/DELETE. If UI appears to edit, it does not persist — Known Gaps.")
    T("TEAM", "Teams", "No PATCH/DELETE API", "Known gap", "P2",
      "Admin created a team.",
      "Verify workspace-teams router only implements GET list and POST create.",
      "1) PATCH /workspace-teams/{id}.",
      "workspace-teams.routes.ts",
      "404. Team membership for meeting visibility still uses created teams.")
    T("MSG", "Messages", "Socket dm:join/send", "Positive", "P0",
      "Two members, existing conversation, authenticated Socket.IO.",
      "Verify dm:join then dm:send delivers dm:message to the other member and REST GET messages matches.",
      "1) Both dm:join. 2) A dm:send. 3) B receives dm:message. 4) GET REST messages.",
      "DM_EVENTS in messages.events.ts",
      "Realtime + REST consistent. sender is JWT user.")
    T("MSG", "Messages", "Socket dm:typing", "Positive", "P2",
      "Both joined DM room.",
      "Verify dm:typing is relayed to the other client and not persisted.",
      "1) A emit dm:typing. 2) B UI. 3) GET messages — no typing artifact.",
      "",
      "B shows typing. History unchanged.")
    T("MSG", "Messages", "Socket dm:forward unauthorized", "Authorization", "P0",
      "Conversation B is in another workspace.",
      "Verify dm:forward to a conversation the user is not a member of fails.",
      "1) dm:forward targetConversationId foreign.",
      "",
      "Error. No message created.")
    T("CALL", "Chat calls", "Socket invite ringing", "Positive", "P0",
      "Two online members in a conversation.",
      "Verify dm:call-invite emits dm:call-ringing to the target user room.",
      "1) A dm:call-invite. 2) B receives ringing. 3) B dm:call-accept. 4) Signal/hangup.",
      "CALL_INVITE/ACCEPT/REJECT/SIGNAL/HANGUP",
      "B rings. Accept starts media. Hangup stops and may insert a call message.")
    T("CALL", "Chat calls", "Hangup without invite", "Negative", "P2",
      "No active call.",
      "Verify dm:call-hangup without a session is a no-op or error, not a crash.",
      "1) emit dm:call-hangup",
      "",
      "Callback error or ignored. Server stays up.")
    T("ADM", "Platform admin", "Invalid workspace status", "Validation", "P1",
      "Platform admin.",
      "Verify PATCH /admin/workspaces/:id/status with status=deleted returns 400.",
      "1) PATCH { status:'deleted' }",
      "only active|suspended",
      "400 status must be active or suspended.")
    T("ADM", "Platform admin", "Invalid user status", "Validation", "P1",
      "Platform admin.",
      "Verify PATCH /admin/users/:id/status with accountStatus=archived returns 400.",
      "1) PATCH { accountStatus:'archived' }",
      "only active|suspended|banned",
      "400 Invalid accountStatus.")
    T("ADM", "Platform admin", "List filters paging", "Boundary", "P2",
      "Many workspaces/users.",
      "Verify admin list query search/status/plan/page/limit paginate.",
      "1) GET /admin/workspaces?limit=1&page=1. 2) page=2.",
      "",
      "Different items. Search filters name/email.")
    T("ADM", "Platform admin", "Audit logs", "Positive", "P1",
      "After an admin pay-invoice action.",
      "Verify GET /admin/audit-logs returns the invoice.pay (or equivalent) row.",
      "1) Pay invoice. 2) GET /admin/audit-logs",
      "",
      "Audit entry with actor and target. Empty is only if logging failed — then fail.")
    T("WS", "Workspace", "Audit logs member", "Positive", "P2",
      "Member.",
      "Verify GET /workspaces/:id/audit-logs is allowed for members (member+).",
      "1) GET audit-logs as member",
      "",
      "200 array (may be empty). Not 403.")
    T("INV", "Invites", "Public join existing user", "Positive", "P0",
      "Invite email already has an account.",
      "Verify POST /workspaces/invites/join attaches membership without complete-password.",
      "1) preview. 2) join with token while logged in or via join API.",
      "workspace.routes invites/join",
      "Membership active. Password unchanged.")
    T("MEET", "Meetings", "Guest email case", "Validation", "P1",
      "Host invites Guest@Example.com.",
      "Verify guestEmails are stored lowercase and POST /auth/guest with mixed case still matches.",
      "1) Add Guest@Example.com. 2) Guest auth email=guest@example.com.",
      "",
      "Token issued.")
    T("SEC", "Security", "JWT alg none", "Security", "P0",
      "Forge a token with alg none and a valid-looking payload.",
      "Verify GET /auth/me rejects alg=none tokens.",
      "1) Authorization Bearer forged.",
      "",
      "401. No user.")
    T("SEC", "Security", "X-Workspace-Id swap", "Security", "P0",
      "User is member of A only. Valid meeting id in B.",
      "Verify sending X-Workspace-Id of B does not grant access.",
      "1) GET /workspace-meetings/{bId} with header B.",
      "",
      "403 NOT_WORKSPACE_MEMBER.")
    T("SEC", "Security", "Guest chat injection", "Security", "P1",
      "Guest admitted to room.",
      "Verify guest send-message cannot spoof senderName/senderId in payload.",
      "1) send-message extra fields senderId=host.",
      "chat.handler uses JWT",
      "Broadcast uses JWT identity.")
    T("DB", "Database", "Whiteboard persistence", "Database", "P2",
      "Drawn board then all clients leave.",
      "Verify WhiteboardDocument (if written) reloads after a new join to the same meeting.",
      "1) Draw. 2) All leave. 3) Rejoin whiteboard:join.",
      "WhiteboardDocument model",
      "Restored or empty — record actual in Notes.")
    T("FAIL", "Failure", "Socket error event", "Failure/Recovery", "P2",
      "Connected socket.",
      "Verify socket.on(error) on the server does not disconnect the whole namespace.",
      "1) Trigger a handler exception (bad produce). 2) Subsequent get-room-state.",
      "socket.server.ts error handler",
      "Client may get callback error. Later events still work or reconnect cleanly.")
    T("DOCK", "Deployment", "FRONTEND_URL required prod", "Positive", "P0",
      "Production compose/env.",
      "Verify FRONTEND_URL is http://46.246.120.148:8980 and cookie/CORS/emails use it.",
      "1) Read env in server container. 2) Signup verification link.",
      "env.ts FRONTEND_URL",
      "No localhost in emails. CORS includes that origin.")
    T("DOCK", "Deployment", "JWT_SECRET length", "Negative", "P1",
      "Local .env JWT_SECRET shorter than 32.",
      "Verify the API process refuses to start (env validation) rather than signing with a weak secret.",
      "1) Start with 21-char JWT_SECRET.",
      "env.ts min 32",
      "Process exits with validation error. Local override needed (≥32).")

    # E2E
    T("E2E", "End-to-end", "Register to live call", "E2E", "P0",
      "Fresh email. Two browsers. HTTPS or localhost.",
      "Verify the full path: signup → verify email → login → dashboard → create instant meeting → copy guest link using public FRONTEND_URL → add workspace participant → both join media → mute/camera → meeting chat → screen share → leave → meeting ended/list shows ended.",
      "1) Signup+verify+login as Host. 2) Invite Member. 3) Instant meeting. 4) Member joins. 5) A/V, chat, share. 6) Host ends.",
      f"password={pwd}; production links must be {PROD}",
      "Every step succeeds. Copied link is not localhost. Recording optional. No demo data.")
    T("E2E", "End-to-end", "Guest invitation", "E2E", "P0",
      "Host logged in. Guest has no account.",
      "Verify host adds guestEmails → email/console link /join/{roomId}?email= → guest POST /auth/guest → waiting → host admit → talk → guest leave.",
      "1) Schedule/live meeting. 2) Add guest email. 3) Open production join URL in private window. 4) Admit. 5) Leave.",
      "GuestSchema email must match guestEmails",
      "Guest never gets ms_refresh. Waiting always. Media works after admit. Ended meeting blocks re-entry.")
    T("E2E", "End-to-end", "Google to meeting", "E2E", "P1",
      "Google OAuth configured. Public redirect URI registered.",
      "Verify Google login callback → /app → create meeting → invitation → second user joins.",
      "1) Google sign-in on production. 2) Create meeting. 3) Invite. 4) Join.",
      "Callback must not be localhost in production",
      "User in dashboard. Meeting works. OAuth state valid.")
    T("E2E", "End-to-end", "Network drop restore", "E2E", "P0",
      "Two-party live call.",
      "Verify participant network disconnect then reconnect restores socket and media or shows a rejoin path.",
      "1) Start call. 2) Offline 15s. 3) Online.",
      "",
      "Recovered audio/video or explicit rejoin. No duplicate avatars stuck forever.")
    T("E2E", "End-to-end", "Invalid invitation", "E2E", "P0",
      "Expired or revoked token / wrong email.",
      "Verify invalid invitation shows an error and the user can navigate back to landing or auth without a crash.",
      "1) Open bad /auth/invite?token=. 2) Open /join/bad-room. 3) Guest wrong email.",
      "",
      "Error UI. Links to / or /auth. No authenticated session created.")
    T("E2E", "End-to-end", "Billing invoice path", "E2E", "P0",
      "Owner on free then pro.",
      "Verify owner switches to Pro → invoice issued with plan line → mark paid → invoice paid; member cannot pay; payment methods empty.",
      "1) /app/billing switch Pro. 2) Open invoice. 3) Mark paid as owner. 4) Repeat pay as member (expect 403).",
      "monthlyPrice from Plan",
      "No Visa 4242. Totals match plan+overage.")
    T("E2E", "End-to-end", "Admin suspend user", "E2E", "P1",
      "Platform admin + victim user.",
      "Verify admin bans user in UI with confirm, then attempt victim login — record actual vs intended lockout.",
      "1) /admin/users Ban confirm. 2) Victim POST /auth/login.",
      "accountStatus banned",
      "UI shows banned. Intended: login denied. If login succeeds, fail this test and log Known Gap.")
    T("E2E", "End-to-end", "Whiteboard + chat together", "E2E", "P1",
      "Two participants in live meeting.",
      "Verify simultaneous meeting chat and whiteboard sync.",
      "1) Open board. 2) Draw. 3) Send chat. 4) Other user sees both.",
      "",
      "Strokes and chat both arrive ordered-enough for humans.")
    T("E2E", "End-to-end", "DM then meeting", "E2E", "P2",
      "Two members.",
      "Verify contacts → DM message → start chat call or jump to scheduled meeting.",
      "1) /app/contacts. 2) Message. 3) Call or join meeting.",
      "",
      "DM delivered. Call or meeting join works.")
    T("E2E", "End-to-end", "Refresh during waiting", "E2E", "P1",
      "Guest in waiting room.",
      "Verify guest refresh returns to waiting (or re-auth guest) rather than a stuck blank page.",
      "1) Guest waiting. 2) F5.",
      "",
      "Waiting UI restored or clear error to re-enter email.")
    T("E2E", "End-to-end", "Host duration auto-end", "E2E", "P1",
      "Workspace maxMeetingDurationMinutes small; live meeting.",
      "Verify duration job ends the meeting and clients receive meeting-ended.",
      "1) Set short max duration. 2) Start. 3) Wait past duration.",
      "meeting duration auto-end job 15s interval",
      "status ended. Clients kicked.")
    T("E2E", "End-to-end", "Local vs production URLs", "E2E", "P0",
      "Compare Vite 5173 vs production 8980.",
      "Verify local Vite may use localhost API, but any copied invitation from a production build/session uses " + PROD + ".",
      "1) Copy invite on production. 2) Copy on local Vite (may be localhost:5173 by isLocalViteDev).",
      "frontendUrl.ts isLocalViteDev",
      "Production copies never contain localhost:3000/5173/127.0.0.1. Local Vite copies may use 5173 only while developing.")

    # Generic API unauth sweep for remaining high-risk endpoints
    for method, path, auth in ENDPOINTS:
        if auth in ("none", "cookie"):
            continue
        T("API", "API authz", f"{method} {path}", "Authentication", "P1",
          "No Authorization header.",
          f"Verify {method} {path} without a valid access token is rejected (401) and does not return tenant data.",
          f"1) {method} {{api}}{path} with placeholder ids if needed (000000000000000000000000).",
          f"auth={auth}",
          "HTTP 401 Authentication required (or 403). Empty or error body only.")

    for method, path, auth in ENDPOINTS:
        if auth not in ("admin", "owner", "platform"):
            continue
        actor = "workspace member" if auth in ("admin", "owner") else "non-platform user"
        T("API", "API authz", f"{method} {path} forbidden", "Authorization", "P1",
          f"Authenticated as {actor} with a valid workspace where applicable.",
          f"Verify {method} {path} is forbidden for a caller below required role {auth}.",
          f"1) Authenticate as {actor}. 2) {method} {path} with real ids from their tenant.",
          f"require {auth}",
          "HTTP 403 Insufficient role / Platform admin access required. Resource unchanged.")


def sheet_xml(rows, freeze=True, validations=None, cf=None, extra=""):
    max_c = max(len(r) for r in rows)
    max_r = max(len(rows), 2)
    last = f"{col_letter(max_c)}{max_r}"
    dim = f"A1:{last}"
    widths = [14, 18, 22, 16, 10, 36, 48, 52, 32, 48, 22, 12, 12, 28, 12, 28]
    cols = "".join(
        f'<col min="{i}" max="{i}" width="{w}" customWidth="1"/>' for i, w in enumerate(widths[:max_c], 1)
    )
    sheetviews = ""
    if freeze:
        sheetviews = """<sheetViews><sheetView workbookViewId="0">
      <pane ySplit="1" xSplit="1" topLeftCell="B2" activePane="bottomRight" state="frozen"/>
      <selection pane="bottomRight" activeCell="B2" sqref="B2"/>
    </sheetView></sheetViews>"""
    body = []
    for ri, row in enumerate(rows, 1):
        cells = []
        for ci, val in enumerate(row, 1):
            ref = f"{col_letter(ci)}{ri}"
            if isinstance(val, str) and val.startswith("="):
                cells.append(f'<c r="{ref}" t="str"><f>{xe(val[1:])}</f></c>' if False else
                             f'<c r="{ref}"><f>{xe(val[1:])}</f></c>')
                continue
            style = ' s="1"' if ri == 1 else ' s="2"'
            cells.append(f'<c r="{ref}" t="inlineStr"{style}><is><t xml:space="preserve">{xe(val)}</t></is></c>')
        body.append(f'<row r="{ri}" ht="48" customHeight="1">{"".join(cells)}</row>')
    dv = validations or ""
    cfmt = cf or ""
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="{dim}"/>
  {sheetviews}
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>{cols}</cols>
  <sheetData>{"".join(body)}</sheetData>
  {cfmt}
  <autoFilter ref="{dim}"/>
  {dv}
  {extra}
</worksheet>
"""


def formula_sheet(rows):
    """Allow cells starting with = to be formulas (Summary)."""
    max_c = max(len(r) for r in rows)
    max_r = len(rows)
    last = f"{col_letter(max_c)}{max_r}"
    cols = "".join(f'<col min="{i}" max="{i}" width="36" customWidth="1"/>' for i in range(1, max_c + 1))
    body = []
    for ri, row in enumerate(rows, 1):
        cells = []
        for ci, val in enumerate(row, 1):
            ref = f"{col_letter(ci)}{ri}"
            if isinstance(val, str) and val.startswith("="):
                cells.append(f'<c r="{ref}" s="2"><f>{xe(val[1:])}</f></c>')
            else:
                st = ' s="1"' if ri == 1 or ci == 1 else ' s="2"'
                cells.append(f'<c r="{ref}" t="inlineStr"{st}><is><t xml:space="preserve">{xe(val)}</t></is></c>')
        body.append(f'<row r="{ri}">{"".join(cells)}</row>')
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:{last}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>{cols}</cols>
  <sheetData>{"".join(body)}</sheetData>
</worksheet>
"""


DV_STATUS = """<dataValidations count="3">
  <dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="L2:L5000">
    <formula1>"Not Run,Pass,Fail,Blocked"</formula1>
  </dataValidation>
  <dataValidation type="list" allowBlank="1" sqref="E2:E5000">
    <formula1>"P0,P1,P2"</formula1>
  </dataValidation>
  <dataValidation type="list" allowBlank="1" sqref="M2:M5000">
    <formula1>"Critical,High,Medium,Low"</formula1>
  </dataValidation>
</dataValidations>"""

CF = """<conditionalFormatting sqref="L2:L5000">
  <cfRule type="containsText" operator="containsText" dxfId="0" priority="1">
    <formula>NOT(ISERROR(SEARCH("Pass",L2)))</formula>
    <text>Pass</text>
  </cfRule>
  <cfRule type="containsText" operator="containsText" dxfId="1" priority="2">
    <formula>NOT(ISERROR(SEARCH("Fail",L2)))</formula>
    <text>Fail</text>
  </cfRule>
  <cfRule type="containsText" operator="containsText" dxfId="2" priority="3">
    <formula>NOT(ISERROR(SEARCH("Blocked",L2)))</formula>
    <text>Blocked</text>
  </cfRule>
  <cfRule type="containsText" operator="containsText" dxfId="3" priority="4">
    <formula>NOT(ISERROR(SEARCH("Not Run",L2)))</formula>
    <text>Not Run</text>
  </cfRule>
</conditionalFormatting>"""

STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F2744"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="3">
    <xf xfId="0"/>
    <xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1" applyAlignment="1">
      <alignment wrapText="1" vertical="center"/>
    </xf>
    <xf xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
  </cellXfs>
  <dxfs count="4">
    <dxf><font><color rgb="FF0B6A0B"/></font><fill><patternFill><fgColor rgb="FFC6EFCE"/></patternFill></fill></dxf>
    <dxf><font><color rgb="FF9C0006"/></font><fill><patternFill><fgColor rgb="FFFFC7CE"/></patternFill></fill></dxf>
    <dxf><font><color rgb="FF9C5700"/></font><fill><patternFill><fgColor rgb="FFFFEB9C"/></patternFill></fill></dxf>
    <dxf><font><color rgb="FF1F4E79"/></font><fill><patternFill><fgColor rgb="FFD6DCE4"/></patternFill></fill></dxf>
  </dxfs>
</styleSheet>
"""


def write_xlsx(path: Path, sheets: dict[str, str]):
    names = list(sheets.keys())
    overrides = "\n".join(
        f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        for i in range(1, len(names) + 1)
    )
    content_types = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  {overrides}
</Types>"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""
    wb_sheets = "\n".join(
        f'<sheet name="{xe(n)[:31]}" sheetId="{i}" r:id="rId{i}"/>' for i, n in enumerate(names, 1)
    )
    workbook = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>{wb_sheets}</sheets>
</workbook>"""
    wb_rels = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">\n" + "\n".join(
        f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>'
        for i in range(1, len(names) + 1)
    ) + """
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("xl/workbook.xml", workbook)
        z.writestr("xl/_rels/workbook.xml.rels", wb_rels)
        z.writestr("xl/styles.xml", STYLES)
        for i, name in enumerate(names, 1):
            z.writestr(f"xl/worksheets/sheet{i}.xml", sheets[name])


def main():
    build_cases()
    ids = [c["Test ID"] for c in CASES]
    assert len(ids) == len(set(ids)), "duplicate ids"

    master_rows = [HEADERS] + [[c[h] for h in HEADERS] for c in CASES]
    exec_headers = ["Test ID", "Execution Date", "Tester", "Environment", "Status", "Actual Result", "Bug ID", "Comments"]
    exec_rows = [exec_headers] + [[c["Test ID"], "", "", ENV, "Not Run", "", "", ""] for c in CASES]
    bug_headers = ["Bug ID", "Test ID", "Module", "Bug Title", "Description", "Steps to Reproduce", "Expected Result", "Actual Result", "Severity", "Priority", "Status", "Assigned To", "Notes"]
    bug_rows = [bug_headers] + [["", "", "", "", "", "", "", "", "Medium", "P2", "Open", "", ""] for _ in range(15)]

    # Coverage
    cov = [["Requirement/Feature", "Source in code", "Related Test ID prefixes", "Coverage Status", "Notes"]]
    mapping = [
        ("Public landing + i18n nav", "client/src/features/landing, App.tsx /", "FE, URL", "Covered", ""),
        ("Email/password auth lifecycle", "auth.routes.ts, validators, login.service", "AUTH", "Covered", "Password 10–128 + complexity"),
        ("Google OAuth + nginx proxy", "google-auth.controller, nginx ^~ /auth/google", "OAUTH, DOCK, URL", "Covered", "HTTP+IP Google limitation"),
        ("Guest JWT join", "guest-auth.routes.ts", "GUEST, JOIN, E2E", "Covered", "Always waiting room"),
        ("Workspace RBAC", "workspace.middleware hasMinRole", "WS, INV, MEM, API", "Covered", "member < admin < owner"),
        ("Meetings CRUD + visibility", "workspace-meetings.routes, meeting-join-authz", "MEET", "Covered", "status scheduled|live|ended|cancelled"),
        ("Live join/waiting/moderation", "media.handler.ts, moderation.handler.ts", "JOIN, MOD", "Covered", ""),
        ("mediasoup transports/producers", "media.handler produce/consume/*", "WEBRTC, AUDIO, VIDEO, SHARE", "Covered", ""),
        ("Meeting chat + reactions", "chat.handler.ts, reaction.handler.ts", "CHAT", "Covered", "max 2000, 5/s, history 200"),
        ("Whiteboard Excalidraw", "whiteboard.gateway.ts", "WB", "Covered", ""),
        ("Remote control", "remote-control.gateway.ts", "RC", "Covered", "45s pending TTL"),
        ("Recordings upload/stream", "recordings.routes.ts", "REC", "Covered", "delete owner/admin"),
        ("DMs + uploads + chat calls", "messages.routes.ts, useChatCall", "MSG, CALL", "Covered", ""),
        ("Calendar/dashboard/reports", "calendar/dashboard/reports.routes", "CAL, DASH, RPT", "Covered", "reports flag not enforced"),
        ("Billing invoices manual pay", "billing.routes, invoice.helpers", "BIL, E2E", "Covered", "no card provider"),
        ("Platform admin SaaS", "admin.routes.ts", "ADM", "Covered", ""),
        ("Public URL generation", "frontendUrl.ts, email templates, FRONTEND_URL", "URL, E2E", "Covered", PROD),
        ("Docker/nginx/mediasoup ports", "docker-compose.yml, client/nginx.conf", "DOCK", "Covered", ""),
        ("AI insights", "AiInsightsPage.tsx", "AI", "Covered as later", "Do not implement AI"),
        ("Integrations OAuth", "SettingsSections IntegrationsSection", "SET", "Covered as later", ""),
        ("Ban/suspend/quota enforcement", "login.service vs admin.middleware", "ADM, E2E, Known Gaps", "Gap tests", "Must fail if lockout required"),
    ]
    for row in mapping:
        cov.append(list(row))

    gaps = [
        ["Area", "Observed implementation", "Missing/incomplete behavior", "Recommended test", "Risk/Impact", "Notes"],
        ["User ban/suspend", "accountStatus stored; requirePlatformAdmin checks it; login.service and authenticate.middleware do not.", "Banned/suspended users can still login and use /app.", "E2E admin ban then login; AUTH after ban.", "Critical if production needs lockout", "Do not pretend lockout exists."],
        ["Workspace suspend", "Workspace.status can be suspended via admin PATCH; requireWorkspace ignores it.", "Members of suspended orgs still call APIs.", "ADM suspend then GET meetings.", "High", ""],
        ["Plan maxMembers", "Plan.maxMembers displayed; invite POST does not count against it.", "6th member on Free (max 5) can be invited.", "Invite past cap.", "Medium billing integrity", ""],
        ["maxConcurrentMeetings", "Stored on Plan; create/join does not enforce.", "Two live meetings on Free (max 1) allowed.", "Start second live meeting.", "Medium", ""],
        ["recordingStorageGb", "Shown on plans; upload path has no quota check found.", "Storage can exceed plan.", "Upload past GB cap.", "Low/Medium", ""],
        ["joinBeforeHost", "Persisted on workspace/meeting settings; join-room does not require host present.", "Toggle does not change join behavior.", "JOIN joinBeforeHost exploratory.", "Low", "Setting-only"],
        ["Plan.features.reports", "Free has reports:false; GET /reports/overview only requires member.", "Free workspaces still load reports.", "RPT overview on Free.", "Low", ""],
        ["Global rate limit", "rateLimit block commented out in app.ts; auth limiters still on.", "Non-auth APIs unthrottled globally.", "Burst GET /workspace-meetings.", "Medium abuse", ""],
        ["2FA", "UI copy; no TOTP models/routes.", "Cannot enroll authenticator.", "SET 2FA absent.", "Low", "Later"],
        ["Card payments", "listPaymentMethods returns [].", "No Stripe/card capture.", "BIL payment methods empty.", "Expected", "Manual mark paid"],
        ["Microsoft OAuth", "Buttons disabled coming soon.", "No Microsoft IdP.", "OAUTH Microsoft disabled.", "Expected", ""],
        ["AI", "Honest empty page; DEMO_AI_MEETING unused.", "No summaries/transcripts.", "AI honest empty.", "Expected later", "Do not implement"],
        ["media/diagnostics unauthenticated", "GET /media/diagnostics/:roomId/:participantId has no authenticate.", "Operator debug endpoint is public on the API port.", "API Health peer diagnostics.", "Medium info leak on :4001", "Should be locked down in production"],
        ["User.settings.integrations defaults", "DEFAULT_USER_SETTINGS googleCalendar/slack true in User.model — UI no longer shows Connect.", "Stale defaults in DB unused by Integrations UI.", "Ignore for UI; optional data cleanup.", "Low", ""],
        ["Rooms/teams mutate", "workspace-rooms and workspace-teams routers are GET list + POST create only.", "No PATCH/DELETE to edit or remove a room or team.", "ROOM/TEAM Known gap tests.", "Medium if Settings UI implies edit", ""],
    ]

    api_inv = [["Method", "Path", "Auth gate (from code)"]] + [[m, p, a] for m, p, a in ENDPOINTS]
    sock_inv = [["Event", "Direction"]] + [[e, d] for e, d in SOCKETS]

    summary = [
        ["Metric", "Value"],
        ["Total Tests", f"=COUNTA('Test Cases'!A:A)-1"],
        ["Passed", f"=COUNTIF('Test Cases'!L:L,\"Pass\")"],
        ["Failed", f"=COUNTIF('Test Cases'!L:L,\"Fail\")"],
        ["Blocked", f"=COUNTIF('Test Cases'!L:L,\"Blocked\")"],
        ["Not Run", f"=COUNTIF('Test Cases'!L:L,\"Not Run\")"],
        ["Pass Rate", f"=IF((B3+B4)=0,0,B3/(B3+B4))"],
        ["Critical fails", f"=COUNTIFS('Test Cases'!L:L,\"Fail\",'Test Cases'!M:M,\"Critical\")"],
        ["High fails", f"=COUNTIFS('Test Cases'!L:L,\"Fail\",'Test Cases'!M:M,\"High\")"],
        ["Medium fails", f"=COUNTIFS('Test Cases'!L:L,\"Fail\",'Test Cases'!M:M,\"Medium\")"],
        ["Low fails", f"=COUNTIFS('Test Cases'!L:L,\"Fail\",'Test Cases'!M:M,\"Low\")"],
        ["API endpoints inventoried", str(len(ENDPOINTS))],
        ["Socket events inventoried", str(len(SOCKETS))],
        ["Frontend routes smoke-tested", str(COUNTERS.get("FE", 0))],
        ["Production frontend URL", PROD],
        ["Catalog generated from", "Inspected server/src/app.ts, *routes.ts, socket handlers, models, nginx, docker-compose, frontendUrl.ts"],
        ["How to execute", "Filter Test Cases by Priority=P0 first. Mark Status dropdown. Log bugs on Bug Tracker. Refresh Summary counts."],
    ]

    exec_dv = """<dataValidations count="1">
      <dataValidation type="list" allowBlank="1" sqref="E2:E5000"><formula1>"Not Run,Pass,Fail,Blocked"</formula1></dataValidation>
    </dataValidations>"""
    bug_dv = """<dataValidations count="3">
      <dataValidation type="list" sqref="I2:I50"><formula1>"Critical,High,Medium,Low"</formula1></dataValidation>
      <dataValidation type="list" sqref="J2:J50"><formula1>"P0,P1,P2"</formula1></dataValidation>
      <dataValidation type="list" sqref="K2:K50"><formula1>"Open,In Progress,Fixed,Verified,Won't Fix"</formula1></dataValidation>
    </dataValidations>"""

    sheets = {
        "Test Cases": sheet_xml(master_rows, validations=DV_STATUS, cf=CF),
        "Test Execution": sheet_xml(exec_rows, validations=exec_dv),
        "Bug Tracker": sheet_xml(bug_rows, validations=bug_dv),
        "Requirements Coverage": sheet_xml(cov),
        "Summary": formula_sheet(summary),
        "Known Gaps": sheet_xml(gaps),
        "API Inventory": sheet_xml(api_inv),
        "Socket Inventory": sheet_xml(sock_inv),
    }
    xlsx = OUT / "Samtal-QA-Test-Workbook.xlsx"
    write_xlsx(xlsx, sheets)

    by_mod = {}
    by_type = {}
    by_pri = {}
    for c in CASES:
        by_mod[c["Module"]] = by_mod.get(c["Module"], 0) + 1
        by_type[c["Test Type"]] = by_type.get(c["Test Type"], 0) + 1
        by_pri[c["Priority"]] = by_pri.get(c["Priority"], 0) + 1
    print("FILE", xlsx)
    print("TOTAL", len(CASES))
    print("PREFIXES", dict(COUNTERS))
    print("PRIORITY", by_pri)
    print("ENDPOINTS", len(ENDPOINTS))
    print("SOCKETS", len(SOCKETS))
    print("MODULES", len(by_mod))
    sec = sum(1 for c in CASES if c["Test Type"] == "Security" or c["Test ID"].startswith("SEC-"))
    fail = sum(1 for c in CASES if c["Test Type"] == "Failure/Recovery" or c["Test ID"].startswith("FAIL-"))
    e2e = COUNTERS.get("E2E", 0)
    print("SECURITY", sec)
    print("FAIL", fail)
    print("E2E", e2e)
    # CSV for Google Sheets import
    import csv
    csv_path = OUT / "Samtal-QA-Test-Cases.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=HEADERS)
        w.writeheader()
        w.writerows(CASES)
    print("CSV", csv_path)


if __name__ == "__main__":
    main()
