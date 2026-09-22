#!/usr/bin/env python3
"""Build the Samtal scenario test catalog as XLSX + CSV (Google Sheets import)."""

from __future__ import annotations

import csv
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent
HEADERS = [
    "Test ID",
    "Suite",
    "Module",
    "Feature",
    "Scenario",
    "Priority",
    "Type",
    "Persona",
    "Preconditions",
    "Test steps",
    "Expected result",
    "Test data",
    "Environment",
    "Automation",
    "Status",
    "Actual result",
    "Defect ID",
    "Notes",
]


def C(
    tid,
    suite,
    module,
    feature,
    scenario,
    pri,
    typ,
    persona,
    pre,
    steps,
    exp,
    data="",
    env="Local Vite :5173 / API :4002 and Production :8980",
    auto="Manual",
    notes="",
):
    return {
        "Test ID": tid,
        "Suite": suite,
        "Module": module,
        "Feature": feature,
        "Scenario": scenario,
        "Priority": pri,
        "Type": typ,
        "Persona": persona,
        "Preconditions": pre,
        "Test steps": steps,
        "Expected result": exp,
        "Test data": data,
        "Environment": env,
        "Automation": auto,
        "Status": "Not run",
        "Actual result": "",
        "Defect ID": "",
        "Notes": notes,
    }


CASES = []


def add(prefix, suite, module, rows):
    for i, r in enumerate(rows, 1):
        CASES.append(
            C(
                tid=f"{prefix}-{i:03d}",
                suite=suite,
                module=module,
                feature=r[0],
                scenario=r[1],
                pri=r[2],
                typ=r[3],
                persona=r[4],
                pre=r[5],
                steps=r[6],
                exp=r[7],
                data=r[8] if len(r) > 8 else "",
                notes=r[9] if len(r) > 9 else "",
            )
        )


# ── Landing ──────────────────────────────────────────────────────────────────
add("SAM-LND", "Smoke", "Landing", [
    ("Home", "Public landing loads without auth", "P0", "Happy path", "Anonymous",
     "Browser, no session", "1) Open /. 2) Wait for first paint.",
     "Hero, nav, pricing, and footer render. No app shell. No 500/blank page."),
    ("Navigation", "Anchor links scroll to product/platform/security/pricing", "P1", "UX", "Anonymous",
     "Landing open", "1) Click each header section. 2) Use EN/AR if shown.",
     "Page scrolls to the matching section. Language toggle changes visible copy."),
    ("CTA sign in", "Sign in CTA opens /auth", "P0", "Happy path", "Anonymous",
     "Landing open", "1) Click Sign in.", "URL is /auth. Sign-in form is visible."),
    ("CTA sign up", "Sign up CTA opens /auth/sign-up", "P0", "Happy path", "Anonymous",
     "Landing open", "1) Click Sign up / Get started.", "URL is /auth/sign-up. Sign-up form is visible."),
    ("Signed-in bounce", "Authenticated visit to /auth redirects into app", "P1", "Happy path", "Signed-in user",
     "Valid session", "1) Open /auth.", "User is sent to /app (local Vite) or public frontend /app."),
    ("Canonical host", "Off-origin host bounces to public frontend URL", "P1", "Compatibility", "Anonymous",
     "Open site on a non-canonical host that is not localhost:5173/4173",
     "1) Load the SPA on an unexpected host.",
     "Browser is redirected to the configured public frontend origin.",
     "", "Local Vite 5173/4173 must NOT bounce."),
    ("404 catch-all", "Unknown path returns to landing", "P2", "Negative", "Anonymous",
     "None", "1) Open /this-does-not-exist.", "Router navigates to /."),
    ("Mobile layout", "Landing is usable at 375px width", "P1", "UX", "Anonymous",
     "Mobile viewport", "1) Open /. 2) Open nav. 3) Hit CTAs.",
     "No horizontal overflow. Nav and CTAs remain tappable."),
])

# ── Auth ─────────────────────────────────────────────────────────────────────
add("SAM-AUTH", "Functional", "Authentication", [
    ("Sign up", "New user can create an account with valid work email", "P0", "Happy path", "Anonymous",
     "Email not registered", "1) Open /auth/sign-up. 2) Fill name, email, company, password, confirm. 3) Submit.",
     "Account is created. User is prompted to verify email and cannot use /app until verified.",
     "Unique email; password meeting policy"),
    ("Sign up validation", "Empty required fields are rejected", "P0", "Negative", "Anonymous",
     "Sign-up page", "1) Submit empty form.", "Inline validation; no API account created."),
    ("Sign up password mismatch", "Confirm password must match", "P1", "Negative", "Anonymous",
     "Sign-up page", "1) Enter two different passwords. 2) Submit.", "Error shown; no account created."),
    ("Sign up duplicate email", "Existing email cannot register again", "P0", "Negative", "Anonymous",
     "Email already exists", "1) Sign up with that email.", "Clear error. Original account unchanged."),
    ("Workspace bootstrap", "First login/session creates a personal workspace as owner", "P0", "Happy path", "New owner",
     "Verified new user", "1) Complete verification. 2) Enter app.",
     "A workspace exists. User role is owner. Free plan subscription is created."),
    ("Login success", "Verified user signs in with email and password", "P0", "Happy path", "Signed-in user",
     "Verified account", "1) /auth. 2) Email + password. 3) Submit.",
     "Lands in /app. Access token in memory. Refresh cookie set."),
    ("Login wrong password", "Invalid password is rejected", "P0", "Negative", "Anonymous",
     "Existing account", "1) Submit wrong password.", "Error. Stay on /auth. No session."),
    ("Login unknown email", "Unknown email is rejected without leaking existence unnecessarily", "P1", "Security", "Anonymous",
     "None", "1) Login with unused email.", "Generic auth error. No stack traces."),
    ("Unverified login", "Unverified email cannot sign in", "P0", "Negative", "Unverified user",
     "Signed up, not verified", "1) Attempt login.",
     "Blocked with EMAIL_NOT_VERIFIED (or equivalent). Prompt to resend verification."),
    ("Verify email", "Valid verification link activates the account", "P0", "Happy path", "Unverified user",
     "Valid token from email/console", "1) Open /auth/verify-email with token.",
     "Email marked verified. User can sign in."),
    ("Verify invalid token", "Expired or garbage token fails clearly", "P1", "Negative", "Anonymous",
     "None", "1) Open verify URL with bad token.", "Error state. Account remains unverified."),
    ("Resend verification", "User can request a new verification email", "P1", "Happy path", "Unverified user",
     "Unverified account", "1) Request resend.", "New token issued. Console/SMTP delivers link."),
    ("Forgot password", "Valid email issues a reset token", "P0", "Happy path", "Signed-out user",
     "Verified account", "1) /auth/forgot-password. 2) Submit email.",
     "Success message. Token in email/console."),
    ("Forgot unknown email", "Unknown email does not reveal account list", "P1", "Security", "Anonymous",
     "None", "1) Submit unused email.", "Same generic success or safe error. No enumeration dump."),
    ("Reset password", "Valid token sets a new password", "P0", "Happy path", "Signed-out user",
     "Fresh reset token", "1) /auth/reset-password. 2) New password + confirm.",
     "Password updated. Old password no longer works. User can login with new one."),
    ("Reset expired token", "Expired reset token is rejected", "P1", "Negative", "Anonymous",
     "Expired token", "1) Submit new password.", "Error. Password unchanged."),
    ("Change password", "Signed-in user changes password from security page", "P0", "Happy path", "Signed-in user",
     "Known current password", "1) /settings/security or /app/settings/security. 2) Current + new. 3) Save.",
     "Success. Subsequent API calls with old access token fail after iat invalidation. New login works."),
    ("Change password wrong current", "Wrong current password is rejected", "P1", "Negative", "Signed-in user",
     "On security page", "1) Submit incorrect current password.", "Error. Password unchanged."),
    ("Remember me", "Remember-me uses longer refresh TTL", "P2", "Happy path", "Signed-in user",
     "Login form", "1) Check Remember me. 2) Login. 3) Inspect cookie Max-Age vs unchecked.",
     "Remember-me cookie lasts ~7 days; without it ~12 hours (per server defaults)."),
    ("Refresh session", "Expired access token is refreshed via cookie", "P0", "Happy path", "Signed-in user",
     "Valid refresh cookie", "1) Wait/force access expiry. 2) Call an authenticated API.",
     "Client refreshes once. Request succeeds. User stays signed in."),
    ("Refresh missing cookie", "No refresh cookie forces re-login", "P0", "Negative", "Signed-in user",
     "Clear ms_refresh cookie", "1) Reload /app.", "Redirected to /auth."),
    ("Logout", "Logout clears session", "P0", "Happy path", "Signed-in user",
     "In app", "1) Logout.", "Refresh cookie cleared. /app redirects to /auth."),
    ("Logout all", "Logout-all revokes every session", "P1", "Security", "Signed-in user",
     "Two browsers/sessions", "1) Logout all from security page. 2) Use other session.",
     "Other session cannot refresh. Forced to sign in."),
    ("Sessions list", "Active sessions are listed", "P1", "Happy path", "Signed-in user",
     "At least one session", "1) Open security sessions.", "Current session visible with device/time metadata."),
    ("Revoke session", "User can revoke a specific other session", "P1", "Happy path", "Signed-in user",
     "Two sessions", "1) Revoke the other session id.", "Revoked session dies; current remains."),
    ("Lockout", "Repeated failed logins lock the account+IP window", "P0", "Security", "Anonymous",
     "Known email", "1) Fail login 5+ times quickly.",
     "Further attempts blocked until lockout window (15 min default)."),
    ("Rate limit auth", "Auth endpoints rate-limit abusive traffic", "P1", "Security", "Anonymous",
     "None", "1) Burst POST /auth/login beyond AUTH/LOGIN limits.",
     "HTTP 429 or equivalent. App remains up."),
    ("CSRF origin", "Cross-origin credentialed auth POST is rejected", "P0", "Security", "Attacker site",
     "Victim has refresh cookie", "1) From a foreign origin, POST /auth/logout or /auth/refresh with credentials.",
     "Rejected by origin/CSRF checks."),
    ("Password field", "Password is masked and toggleable", "P2", "UX", "Anonymous",
     "Sign-in page", "1) Type password. 2) Toggle visibility.", "Characters hidden by default; toggle reveals."),
    ("Microsoft button", "Microsoft sign-in is disabled as coming soon", "P2", "Happy path", "Anonymous",
     "Sign-in page", "1) Inspect Microsoft button.", "Disabled. Tooltip/title says coming soon. No OAuth start."),
])

# ── Google OAuth ─────────────────────────────────────────────────────────────
add("SAM-OAUTH", "Functional", "Google OAuth", [
    ("Start", "Google button starts OAuth on local Vite via API origin", "P0", "Happy path", "Anonymous",
     "GOOGLE_CLIENT_ID configured", "1) Click Continue with Google on localhost:5173.",
     "Browser goes to Google consent. State cookie stored."),
    ("Callback success", "Successful Google login lands in app", "P0", "Happy path", "Google user",
     "Allowed Google account", "1) Complete consent. 2) Hit /auth/oauth/callback.",
     "Session established. User in /app. Workspace exists."),
    ("Callback mismatch", "OAuth state mismatch is rejected", "P0", "Security", "Anonymous",
     "Tamper state cookie or skip start", "1) Open callback with junk state/code.",
     "Error page. No session."),
    ("HTTP+IP Google", "Google rejects HTTP IP redirect in Google console", "P1", "Compatibility", "Anonymous",
     "FRONTEND_URL is http://IP", "1) Start Google OAuth.",
     "Google invalid_request OR documented limitation. App shows a recoverable error.",
     "", "Known Google rule: HTTP + public IP is not a legal redirect URI."),
    ("Google-only account", "Password login of a Google-created account is blocked", "P1", "Negative", "Google user",
     "User created only via Google", "1) Try email/password login.", "Clear error to use Google."),
    ("Production proxy", "Production Google start uses public SPA /auth/google", "P1", "Happy path", "Anonymous",
     "Production origin", "1) Click Google on public site.",
     "Request stays on public origin (nginx proxies to API). Callback returns to same origin."),
])

# ── Invites ──────────────────────────────────────────────────────────────────
add("SAM-INV", "Functional", "Workspace invites", [
    ("Send invite", "Admin can invite a member by email", "P0", "Happy path", "Workspace admin",
     "Admin session, unused email", "1) Settings → Invite. 2) Name, email, role member. 3) Send.",
     "Invite created. Join URL/token issued. Email sent or logged to console."),
    ("Invite admin role", "Only owner can invite an admin", "P0", "Access control", "Workspace admin",
     "Admin (not owner)", "1) Try invite with role admin.", "Forbidden. Invite not created."),
    ("Owner invite admin", "Owner can invite an admin", "P0", "Happy path", "Workspace owner",
     "Owner session", "1) Invite with role admin.", "Invite created with admin role."),
    ("Preview invite", "Invite preview works without being signed in", "P0", "Happy path", "Invitee",
     "Valid token", "1) Open /auth/invite?token=…", "Shows org name and inviter. Does not require password yet."),
    ("Accept signed-in", "Signed-in user can accept an invite to their email", "P0", "Happy path", "Signed-in user",
     "Invite to that email", "1) Accept.", "Membership active. Workspace appears in switcher."),
    ("Join complete password", "New invitee sets password and joins", "P0", "Happy path", "Invitee",
     "Valid token, new email", "1) /auth/set-password or complete-password. 2) Set password.",
     "User exists, verified as needed, member of workspace, can login."),
    ("Expired invite", "Expired token cannot join", "P1", "Negative", "Invitee",
     "Expired invite", "1) Open join URL.", "Error. No membership."),
    ("Revoke invite", "Admin can revoke a pending invite", "P1", "Happy path", "Workspace admin",
     "Pending invite", "1) Revoke. 2) Invitee uses old link.", "Join fails."),
    ("Resend invite", "Admin can resend invite", "P2", "Happy path", "Workspace admin",
     "Pending invite", "1) Resend.", "New email/console log. Token still usable or rotated per API."),
    ("Wrong email guest", "Invite cannot be completed with a different signed-in email", "P1", "Security", "Signed-in user",
     "Logged in as user B, invite for user A", "1) Accept.", "Rejected."),
    ("Duplicate invite", "Second invite to same pending email is handled", "P2", "Boundary", "Workspace admin",
     "Pending invite exists", "1) Invite same email again.", "Conflict or resend — no duplicate active memberships."),
    ("Member cannot invite", "Plain member cannot send invites", "P0", "Access control", "Workspace member",
     "Member session", "1) POST invite or use Invite UI.", "UI hidden or 403."),
])

# ── Workspace ────────────────────────────────────────────────────────────────
add("SAM-WS", "Functional", "Workspace", [
    ("List mine", "User sees only workspaces they belong to", "P0", "Access control", "Signed-in user",
     "Member of A, not B", "1) GET /workspaces / switcher.", "Only A listed."),
    ("Header selection", "X-Workspace-Id selects the active workspace", "P0", "Happy path", "Signed-in user",
     "Two memberships if possible", "1) Switch workspace. 2) Load meetings.",
     "Data is scoped to selected workspace."),
    ("Missing header", "API bootstraps or uses first membership", "P1", "Happy path", "New user",
     "No header", "1) Call a workspace-scoped API.", "Uses existing membership or creates one."),
    ("Update settings", "Admin can change waiting room, auto-record, mute on entry, duration, language", "P0", "Happy path", "Workspace admin",
     "Admin", "1) Settings → Workspace. 2) Toggle each. 3) Save.",
     "Values persist after reload."),
    ("Member cannot update workspace", "Member cannot PATCH workspace settings", "P0", "Access control", "Workspace member",
     "Member", "1) Attempt PATCH settings.", "403. Values unchanged."),
    ("Branding logo", "Owner/admin can upload a compressed logo", "P1", "Happy path", "Workspace admin",
     "Image file", "1) Branding. 2) Upload large PNG.", "Logo stored as compressed data URL. Appears in UI."),
    ("Branding name/email", "Workspace name and email update", "P1", "Happy path", "Workspace admin",
     "Admin", "1) Change name and email. 2) Save.", "Persisted. Visible in billing bill-to later."),
    ("Slug uniqueness", "Conflicting slug is rejected", "P2", "Negative", "Platform admin / owner",
     "Slug taken", "1) Set duplicate slug.", "Validation error."),
    ("Language", "Workspace language preference persists", "P2", "Happy path", "Workspace admin",
     "Admin", "1) Change language. 2) Reload.", "Stored on workspace settings."),
    ("Audit log", "Workspace audit events appear for members", "P1", "Happy path", "Workspace member",
     "Some admin actions done", "1) Settings → Audit.", "Recent actions listed with actor, action, time."),
    ("Inactive member lockout", "Inactive membership cannot call workspace APIs", "P0", "Access control", "Inactive member",
     "Admin set member inactive", "1) Member loads /app meetings.", "403 not a member. No data leak."),
])

# ── Members ──────────────────────────────────────────────────────────────────
add("SAM-MEM", "Functional", "Members", [
    ("List members", "Admin sees member list with roles and status", "P0", "Happy path", "Workspace admin",
     "Several members", "1) Settings → Members.", "Names, emails, roles, status shown."),
    ("Search members", "Search filters by name/email", "P1", "Happy path", "Workspace admin",
     "Multiple members", "1) Type a unique name.", "Only matching rows."),
    ("View member", "Member detail page loads", "P1", "Happy path", "Workspace admin",
     "Known userId", "1) Open /app/settings/members/:userId.", "Profile fields visible."),
    ("Edit member", "Admin can edit job title, phone, department", "P1", "Happy path", "Workspace admin",
     "Edit page", "1) Change fields. 2) Save.", "Persisted on reload."),
    ("Deactivate member", "Admin sets member inactive", "P0", "Happy path", "Workspace admin",
     "Active member (not self owner)", "1) Set inactive.", "Status inactive. User loses workspace API access."),
    ("Reactivate member", "Admin reactivates member", "P1", "Happy path", "Workspace admin",
     "Inactive member", "1) Set active.", "Access restored."),
    ("Remove member", "Admin removes a member", "P0", "Happy path", "Workspace admin",
     "Non-owner member", "1) Remove.", "Membership gone. User no longer lists workspace."),
    ("Change role owner", "Owner can promote member to admin", "P0", "Happy path", "Workspace owner",
     "Member user", "1) Set role admin.", "Role persists. Admin can invite."),
    ("Change role admin", "Admin cannot change roles", "P0", "Access control", "Workspace admin",
     "Admin not owner", "1) PATCH role.", "403."),
    ("Cannot remove owner", "Owner cannot be removed by admin", "P0", "Negative", "Workspace admin",
     "Owner exists", "1) Try delete owner.", "Rejected."),
    ("Directory", "Members see directory of active people", "P1", "Happy path", "Workspace member",
     "Several active members", "1) Contacts or directory API.", "Active members listed; inactive hidden."),
    ("Member cannot open invite UI", "Invite actions hidden from members", "P1", "Access control", "Workspace member",
     "Member", "1) Open settings members.", "No Create/Invite primary action, or it 403s."),
])

# ── Rooms ────────────────────────────────────────────────────────────────────
add("SAM-ROOM", "Functional", "Rooms", [
    ("List rooms", "Member can list workspace rooms", "P0", "Happy path", "Workspace member",
     "Rooms exist", "1) Settings → Rooms.", "Rooms listed with name and id."),
    ("Search rooms", "Search filters rooms", "P2", "Happy path", "Workspace member",
     "Several rooms", "1) Search unique name.", "Only matches."),
    ("Create room", "Admin can create a room with capacity and flags", "P0", "Happy path", "Workspace admin",
     "Admin", "1) Create room: name, id, capacity, waiting/chat/share flags. 2) Save.",
     "Room exists and appears in list."),
    ("Member cannot create room", "Member POST room is forbidden", "P0", "Access control", "Workspace member",
     "Member", "1) Attempt create.", "403. UI disabled."),
    ("Duplicate room id", "Duplicate room ID is rejected", "P1", "Negative", "Workspace admin",
     "Room id taken", "1) Create with same id.", "Validation error."),
    ("Assign members", "Room can include selected members", "P2", "Happy path", "Workspace admin",
     "Members exist", "1) Add members while creating.", "Saved member list on room."),
    ("Empty name", "Room name required", "P2", "Negative", "Workspace admin",
     "Create form", "1) Submit empty name.", "Client/server validation."),
])

# ── Teams ────────────────────────────────────────────────────────────────────
add("SAM-TEAM", "Functional", "Teams", [
    ("List teams", "Member can list teams", "P0", "Happy path", "Workspace member",
     "Teams exist", "1) Settings → Teams.", "Teams listed."),
    ("Create team", "Admin creates a team with lead and members", "P0", "Happy path", "Workspace admin",
     "Admin + members", "1) Create team. 2) Set lead and members.", "Team persisted."),
    ("Member cannot create team", "Member cannot POST team", "P0", "Access control", "Workspace member",
     "Member", "1) Create team.", "403 / hidden."),
    ("Meeting visibility team", "Member sees meetings hosted by a teammate", "P0", "Access control", "Workspace member",
     "Two members same team; host creates meeting", "1) Other member opens Meetings.",
     "Teammate-hosted meeting is visible."),
    ("Meeting visibility non-team", "Member does not see unrelated member meetings unless invited", "P0", "Access control", "Workspace member",
     "Different teams, not invited", "1) Open Meetings.", "Unrelated meeting hidden."),
    ("Admin sees all meetings", "Admin/owner see all workspace meetings", "P0", "Access control", "Workspace admin",
     "Meetings by various hosts", "1) Open Meetings.", "All workspace meetings listed."),
])

# ── Meetings ─────────────────────────────────────────────────────────────────
add("SAM-MTG", "Functional", "Meetings", [
    ("Instant meeting", "User can start an instant meeting", "P0", "Happy path", "Workspace member",
     "Signed in", "1) Create instant meeting. 2) Join.", "Meeting status live. Room id assigned. User is host."),
    ("Schedule meeting", "User can schedule a future meeting", "P0", "Happy path", "Workspace member",
     "Signed in", "1) Set title, time, duration, agenda. 2) Save.",
     "Status scheduled. Appears in list and calendar."),
    ("Agenda", "Agenda items persist", "P1", "Happy path", "Workspace member",
     "Create form", "1) Add two agenda topics. 2) Save. 3) Open detail.", "Agenda listed."),
    ("Invite participants", "Host can add workspace participants", "P0", "Happy path", "Host",
     "Meeting exists, members exist", "1) Detail → add participant.", "Participant listed. They can see the meeting."),
    ("Invite guest email", "Host can add a guest email", "P0", "Happy path", "Host",
     "Meeting exists", "1) Add guest@example.com.", "Guest email stored. Guest join allowed with that email."),
    ("Remove participant", "Host can remove a participant", "P1", "Happy path", "Host",
     "Participant added", "1) Remove.", "User no longer in list; loses access if they were only invitee."),
    ("Remove guest email", "Host can remove a guest email", "P1", "Happy path", "Host",
     "Guest email added", "1) Remove guest.", "That email can no longer guest-join."),
    ("Register", "Invited member can register/RSVP", "P2", "Happy path", "Invitee member",
     "Invited to scheduled meeting", "1) Register.", "Registration recorded."),
    ("Cancel meeting", "Host can cancel", "P0", "Happy path", "Host",
     "Scheduled meeting", "1) Cancel.", "Status cancelled. Join blocked."),
    ("End meeting", "Host can end a live meeting", "P0", "Happy path", "Host",
     "Live meeting", "1) End.", "Status ended. Media room torn down. Rejoin blocked."),
    ("Patch meeting", "Host can edit title/time before start", "P1", "Happy path", "Host",
     "Scheduled meeting", "1) Change title and time.", "Updates persist."),
    ("Delete meeting", "Host/admin can delete where API allows", "P2", "Happy path", "Host",
     "Meeting exists", "1) Delete.", "Removed from list."),
    ("Search meetings", "Toolbar search matches title/host", "P1", "Happy path", "Workspace member",
     "Several meetings", "1) Search unique title.", "Only matches."),
    ("Filter status", "Filters live/upcoming/ended work", "P1", "Happy path", "Workspace member",
     "Mixed statuses", "1) Each filter.", "Correct subset. Empty state if none."),
    ("Stats cards", "Meeting stats reflect real counts", "P1", "Data integrity", "Workspace member",
     "Known meetings", "1) Open /app/meetings.", "Cards match list (no fake Figma numbers)."),
    ("Detail 404", "Unknown meeting id shows not found", "P1", "Negative", "Workspace member",
     "Signed in", "1) Open /app/meetings/not-a-real-id.", "Not found / error. No crash."),
    ("Member hidden meeting", "Unrelated member cannot open meeting by id", "P0", "Access control", "Workspace member",
     "Meeting they should not see", "1) Open detail URL.", "403/404. No title leak if possible."),
    ("Waiting room flag", "Create honors waitingRoom setting", "P1", "Happy path", "Host",
     "Create form", "1) Enable waiting room. 2) Member joins.", "Member waits until host admits."),
    ("Auto record flag", "Create stores autoRecord", "P2", "Happy path", "Host",
     "Create form", "1) Enable auto record. 2) Start.", "Setting persisted on meeting (recording still depends on client/host)."),
    ("Duration job", "Live meeting auto-ends after max duration", "P1", "Boundary", "Host",
     "Short max duration (workspace or meeting)", "1) Start meeting. 2) Wait past duration.",
     "Server duration job ends the meeting. Participants disconnected."),
    ("Empty list", "No meetings shows empty state not demo data", "P0", "Happy path", "New workspace",
     "No meetings", "1) Open Meetings.", "Empty state. No Sarah Lee / fake catalog."),
])

# ── Live meeting ─────────────────────────────────────────────────────────────
add("SAM-LIVE", "Functional", "Live meeting", [
    ("Pre-join preview", "Pre-join shows camera/mic toggles and name", "P0", "Happy path", "Host",
     "Meeting joinable", "1) Join. 2) Stay on pre-join.", "Local preview. Name field. Ask-for-access prompts."),
    ("Camera permission allow", "Allowing camera shows local video", "P0", "Happy path", "Host",
     "HTTPS or localhost", "1) Allow camera.", "Local tile shows camera."),
    ("Camera permission deny", "Denying camera still allows join with placeholder", "P0", "Negative", "Host",
     "HTTPS or localhost", "1) Deny camera. 2) Join.", "Joined. Avatar/placeholder. Mic-only possible."),
    ("HTTP public camera", "Insecure public HTTP blocks getUserMedia with a clear message", "P0", "Compatibility", "Host",
     "http://public-ip (not localhost)", "1) Join and request camera.",
     "Error explains HTTPS or localhost is required. No silent failure.",
     "", "Production :8980 HTTP is affected; localhost Vite is not."),
    ("Mic mute/unmute", "Mute toggle stops sending audio", "P0", "Happy path", "Two participants",
     "Both in call", "1) A mutes. 2) A unmutes.", "B stops then resumes hearing A."),
    ("Camera on/off", "Camera toggle stops video", "P0", "Happy path", "Two participants",
     "Both in call", "1) A turns camera off then on.", "B sees placeholder then video."),
    ("Screen share", "Participant can share a screen/window", "P0", "Happy path", "Presenter + viewer",
     "Browser share picker", "1) Share screen. 2) Viewer observes. 3) Stop.",
     "Viewer sees shared content. Stop returns to camera tiles."),
    ("Multiple tiles", "Two users see each other", "P0", "Happy path", "Two participants",
     "Both joined", "1) Enable cameras.", "Each sees the remote tile. Names match."),
    ("Meeting chat", "In-meeting chat delivers to others", "P0", "Happy path", "Two participants",
     "Both in call", "1) A sends a message.", "B receives it in meeting sidebar."),
    ("Reactions", "Reactions appear for others", "P1", "Happy path", "Two participants",
     "Both in call", "1) A sends reaction.", "B sees reaction overlay/feed."),
    ("Waiting admit", "Host admits waiting participant", "P0", "Happy path", "Host + waiting user",
     "Waiting room on", "1) Guest/member waits. 2) Host admits.", "Admitted user joins media. Waiting UI clears."),
    ("Waiting deny", "Host denies waiting participant", "P0", "Happy path", "Host + waiting user",
     "Someone waiting", "1) Host deny.", "Denied user does not join media. Informed in UI."),
    ("Host moderation mute", "Host can mute a participant", "P1", "Happy path", "Host + participant",
     "Both in call", "1) Host mute other.", "Participant audio stops. UI reflects muted."),
    ("Host remove", "Host can remove a participant", "P1", "Happy path", "Host + participant",
     "Both in call", "1) Host remove.", "Removed user leaves the room. Cannot silently stay on media."),
    ("Whiteboard open", "Whiteboard opens and strokes sync", "P0", "Happy path", "Two participants",
     "Both in call", "1) Open whiteboard. 2) Draw. 3) Other user views.", "Remote user sees strokes."),
    ("Whiteboard persist session", "Whiteboard scene survives a brief leave/rejoin in same meeting", "P2", "Happy path", "Two participants",
     "Scene drawn", "1) A leaves and rejoins.", "Scene still present or documented reset — record actual."),
    ("Remote control request", "Viewer can request remote control", "P1", "Happy path", "Controller + host",
     "Host sharing or in call", "1) Request control. 2) Host accept.", "Controller events reach host. Cursor/commands applied."),
    ("Remote control deny", "Host can deny remote control", "P1", "Negative", "Controller + host",
     "Request pending", "1) Host deny.", "Requester notified. No control."),
    ("Remote control stop", "Either side can stop control", "P1", "Happy path", "Controller + host",
     "Control active", "1) Stop.", "Control session ends."),
    ("Reconnect", "Network blip reconnects socket and media", "P1", "Compatibility", "Participant",
     "In call", "1) Toggle network off 5s. 2) On.", "Rejoins or shows reconnecting. Does not duplicate identity."),
    ("Leave meeting", "Leave returns to app meetings", "P0", "Happy path", "Signed-in user",
     "In /app/meeting/:roomId", "1) Leave.", "Media stopped. Tracks released. Back in app."),
    ("Mobile controls", "Live controls usable on a phone", "P0", "UX", "Participant",
     "Narrow viewport", "1) Join. 2) Mute, camera, leave.", "Control bar reachable. No overlapping hamburger over hang-up."),
    ("Join cancelled meeting", "Cannot join cancelled meeting", "P0", "Negative", "Invitee",
     "Meeting cancelled", "1) Open join.", "Blocked with status message."),
    ("Join ended meeting", "Cannot join ended meeting", "P0", "Negative", "Invitee",
     "Meeting ended", "1) Open join.", "Blocked."),
    ("Join too early guest", "Guest cannot join before start", "P1", "Negative", "Guest",
     "Scheduled in the future", "1) Guest join now.", "Blocked until joinable time."),
    ("Mute on entry", "muteOnEntry mutes joiners", "P1", "Happy path", "Participant",
     "Meeting muteOnEntry true", "1) Join.", "Joiner starts muted."),
    ("joinBeforeHost not required", "Members can join when host is absent if product currently allows it", "P2", "Exploratory", "Member",
     "Scheduled/live, host not connected", "1) Member joins.",
     "Document actual: join succeeds today because join-before-host is not enforced. Log if this contradicts workspace toggle.",
     "", "Workspace setting is persisted but not enforced in join path."),
])

# ── Guest ────────────────────────────────────────────────────────────────────
add("SAM-GST", "Functional", "Guest join", [
    ("Invited guest join", "Guest with invited email can request join", "P0", "Happy path", "Guest",
     "Meeting has guestEmails including that address; meeting joinable",
     "1) /join/:roomId. 2) Name + invited email. 3) Continue.",
     "Guest JWT issued. Waiting room shown. No app shell."),
    ("Uninvited email", "Different email cannot guest-join", "P0", "Security", "Guest",
     "Guest list has other email", "1) Enter another email.", "Rejected. No token."),
    ("Missing email", "Guest form requires invitation email", "P0", "Negative", "Guest",
     "Join page", "1) Submit name only.", "Validation error."),
    ("Guest waiting always", "Guests always hit waiting room", "P0", "Happy path", "Guest + host",
     "Even if waitingRoom false for members", "1) Guest continues.", "Waiting UI until host admits."),
    ("Guest 4h token", "Guest token does not mint a refresh cookie", "P1", "Security", "Guest",
     "After /auth/guest", "1) Inspect cookies. 2) Reload after closing tab later.",
     "No ms_refresh for guest. Token is room-scoped."),
    ("Guest room scope", "Guest JWT cannot call other rooms or workspace APIs", "P0", "Security", "Guest",
     "Guest token for room A", "1) Call meetings list or join room B.", "Forbidden."),
    ("Guest leave", "Guest leave stops tracks", "P1", "Happy path", "Guest",
     "In call after admit", "1) Leave.", "Camera light off. Cannot hear room."),
    ("Guest mobile waiting", "Waiting UI is usable on a phone", "P1", "UX", "Guest",
     "Mobile viewport, waiting", "1) Wait on /join/:id.", "Layout readable. No clipped controls."),
    ("Signed-in user guest path", "Logged-in user can still use /join if invited as guest email", "P2", "Happy path", "Signed-in user",
     "Their email is on guestEmails or participants", "1) Open /join/:roomId.", "Join/waiting works; no crash."),
])

# ── Calendar ─────────────────────────────────────────────────────────────────
add("SAM-CAL", "Functional", "Calendar", [
    ("Month view", "Month grid shows meetings on the correct days", "P0", "Happy path", "Workspace member",
     "Scheduled meetings this month", "1) /app/calendar Month.", "Events on scheduled dates. No demo avatars if empty."),
    ("Week view", "Week view lists the week’s meetings", "P1", "Happy path", "Workspace member",
     "Meetings this week", "1) Switch Week.", "Correct events."),
    ("Day / side panel", "Selecting a day shows that day’s meetings", "P1", "Happy path", "Workspace member",
     "Meeting on a known day", "1) Click the day.", "Side panel lists that meeting."),
    ("Empty calendar", "No meetings → empty, not fake events", "P0", "Data integrity", "New workspace",
     "No meetings", "1) Open calendar.", "Empty grid. No Sarah Lee demo events."),
    ("Type filters", "Event type filters hide/show", "P2", "Happy path", "Workspace member",
     "Mixed types if present", "1) Toggle filters.", "Visible set matches."),
    ("Month navigation", "Prev/next month updates label and days", "P1", "Happy path", "Workspace member",
     "Calendar open", "1) Next. 2) Prev.", "Month label and grid change. No crash at year boundary."),
    ("Click through", "Event opens meeting detail or join", "P1", "Happy path", "Workspace member",
     "Event exists", "1) Click event.", "Navigates to the real meeting."),
    ("No Google sync", "Calendar does not pull Google Calendar", "P2", "Happy path", "Workspace member",
     "Google Calendar has unrelated events", "1) Open Samtal calendar.",
     "Only Samtal meetings. Integrations page says Google Calendar is not wired."),
])

# ── Contacts / messages ──────────────────────────────────────────────────────
add("SAM-CON", "Functional", "Contacts", [
    ("Directory list", "Contacts shows workspace people", "P0", "Happy path", "Workspace member",
     "Several members", "1) /app/contacts.", "Real members. Search works."),
    ("Open DM", "Contact opens a conversation", "P0", "Happy path", "Workspace member",
     "Another member exists", "1) Message / click person.", "Land on /app/messages with that thread."),
    ("Search people", "Search filters contacts", "P1", "Happy path", "Workspace member",
     "Multiple people", "1) Search unique name.", "Only matches. Empty state if none."),
])

add("SAM-MSG", "Functional", "Messages", [
    ("Send text", "DM text is delivered", "P0", "Happy path", "Two members",
     "Conversation open", "1) A sends hi. 2) B opens thread.", "B sees hi in order."),
    ("Edit message", "Sender can edit", "P1", "Happy path", "Member",
     "Own message exists", "1) Edit text.", "Updated body. Edited marker if designed."),
    ("Delete message", "Sender can delete", "P1", "Happy path", "Member",
     "Own message", "1) Delete.", "Removed for both or replaced with deleted state."),
    ("React", "Reaction toggles", "P1", "Happy path", "Two members",
     "Message exists", "1) A reacts. 2) B sees.", "Reaction visible. Toggle off works."),
    ("Pin", "Pin appears in conversation", "P2", "Happy path", "Member",
     "Message exists", "1) Pin.", "Pinned section/list updates."),
    ("Read receipts", "Read marks the thread", "P2", "Happy path", "Two members",
     "Unread DM", "1) B opens thread.", "A sees read / unread count drops."),
    ("Attachment image", "Image upload appears", "P0", "Happy path", "Member",
     "Small PNG", "1) Attach. 2) Send.", "Image preview in thread. Other user can open."),
    ("Attachment file", "Non-image file can be downloaded", "P1", "Happy path", "Two members",
     "PDF/txt", "1) Upload. 2) Other downloads.", "File matches original."),
    ("Chunked large file", "Larger file uses chunked upload and completes", "P1", "Boundary", "Member",
     "File near allowed size", "1) Upload.", "Progress then success. Failure is a clear error if over limit."),
    ("Search messages", "Search finds text in threads", "P1", "Happy path", "Member",
     "Known unique phrase", "1) Search.", "Matching conversation/message listed."),
    ("Shared media", "Shared media list shows attachments", "P2", "Happy path", "Member",
     "Images sent", "1) Open shared.", "Those files listed."),
    ("Empty inbox", "No conversations shows empty state", "P1", "Happy path", "New user",
     "No DMs", "1) /app/messages.", "Empty, not demo chat."),
    ("Unauthorized thread", "User cannot open another workspace’s conversation by id", "P0", "Security", "Member",
     "Guess id", "1) Request messages for foreign conversation.", "403/404."),
])

add("SAM-CALL", "Functional", "Chat calls", [
    ("Start call", "User can start an in-chat A/V call", "P0", "Happy path", "Two members",
     "DM open", "1) Start call. 2) Callee accepts.", "Both have audio. Video if allowed."),
    ("Reject call", "Callee can reject", "P1", "Happy path", "Two members",
     "Incoming call", "1) Reject.", "Caller sees ended/rejected. No media."),
    ("Hang up", "Either party can hang up", "P0", "Happy path", "Two members",
     "Active call", "1) Hang up.", "Both leave. Tracks stop."),
    ("Screen share in call", "Chat call can share screen", "P1", "Happy path", "Two members",
     "Active call", "1) Share. 2) Other views.", "Remote sees share."),
    ("Busy / second call", "Second incoming call is handled", "P2", "Boundary", "Three members",
     "A in call with B", "1) C calls A.", "Busy, queue, or reject — no crash."),
])

# ── Notifications ────────────────────────────────────────────────────────────
add("SAM-NTF", "Functional", "Notifications", [
    ("Meeting notification", "New meeting invite appears in inbox", "P0", "Happy path", "Invitee",
     "Host adds participant", "1) Invitee opens /app/notifications.", "Meeting notification present."),
    ("DM notification", "Incoming DM creates a notification", "P0", "Happy path", "Member",
     "A messages B while B is elsewhere", "1) B opens notifications or bell.", "Message notification appears."),
    ("Mark read", "Single notification can be marked read", "P1", "Happy path", "Member",
     "Unread item", "1) Mark read.", "Unread styling/count updates."),
    ("Mark all", "Mark all read clears badge", "P1", "Happy path", "Member",
     "Several unread", "1) Mark all.", "Badge 0. All read."),
    ("Clear", "Clear removes items from inbox", "P2", "Happy path", "Member",
     "Items exist", "1) Clear.", "List empty or items gone."),
    ("Empty", "No notifications shows empty state", "P2", "Happy path", "New user",
     "None", "1) Open page.", "Empty, not demo list."),
])

# ── Recordings ───────────────────────────────────────────────────────────────
add("SAM-REC", "Functional", "Recordings", [
    ("List", "Recordings page lists real uploads", "P0", "Happy path", "Workspace member",
     "At least one recording", "1) /app/recordings.", "Real titles/dates. No demo catalog."),
    ("Empty", "No recordings empty state", "P0", "Happy path", "New workspace",
     "None", "1) Open recordings.", "Empty state."),
    ("Search", "Search filters recordings", "P1", "Happy path", "Member",
     "Multiple recordings", "1) Search unique title.", "Only matches."),
    ("Detail", "Detail page plays or shows metadata", "P0", "Happy path", "Member",
     "Known recordingId", "1) Open detail.", "Title, date, duration. Player or download."),
    ("Stream", "Authorized user can stream the file", "P0", "Happy path", "Member",
     "Recording exists", "1) Play/download.", "Media plays. HTTP 200 on stream."),
    ("Rename", "User can patch title", "P1", "Happy path", "Owner/host",
     "Recording exists", "1) Rename.", "New title in list and detail."),
    ("Delete", "Authorized user can delete", "P1", "Happy path", "Owner/host",
     "Recording exists", "1) Delete. 2) Confirm.", "Gone from list. Stream 404."),
    ("Unauthorized stream", "Outsider cannot stream by id", "P0", "Security", "Other workspace user",
     "Valid id from workspace A", "1) As user in B, GET stream.", "403/404."),
    ("Upload from meeting", "Client recorder can upload a recording", "P1", "Happy path", "Host",
     "In live meeting, recorder available", "1) Record a short clip. 2) Stop/upload.",
     "Appears under Recordings for the workspace."),
    ("Broken id", "Unknown recording id is not found", "P2", "Negative", "Member",
     "Signed in", "1) /app/recordings/deadbeef.", "Not found."),
])

# ── Templates / reports ──────────────────────────────────────────────────────
add("SAM-TPL", "Functional", "Templates", [
    ("Create template", "Member can create a meeting template", "P0", "Happy path", "Workspace member",
     "Signed in", "1) Templates → create title, duration, agenda, flags.", "Template listed."),
    ("Edit template", "Owner can patch template", "P1", "Happy path", "Workspace member",
     "Template exists", "1) Edit duration/agenda.", "Persisted."),
    ("Delete template", "Owner can delete", "P1", "Happy path", "Workspace member",
     "Template exists", "1) Delete.", "Removed."),
    ("Use template", "Creating a meeting can apply template defaults if UI supports it", "P2", "Happy path", "Member",
     "Template exists", "1) Start meeting from template or copy fields.",
     "Title/duration/agenda/waiting flags match template or documented manual copy."),
    ("Empty", "No templates empty state", "P2", "Happy path", "New workspace",
     "None", "1) Open templates.", "Empty, not demo."),
])

add("SAM-RPT", "Functional", "Reports", [
    ("Overview loads", "Reports page loads live aggregates", "P0", "Happy path", "Workspace member",
     "Meetings with duration exist", "1) /app/reports.", "Charts/tables use API data. Not Figma constants."),
    ("Empty reports", "No meetings → zeros/empty charts", "P0", "Data integrity", "New workspace",
     "No meetings", "1) Open reports.", "Zero counts. No fake 312 minutes."),
    ("Date range", "Date range filter changes series", "P1", "Happy path", "Member",
     "Meetings across days", "1) Change range.", "Series updates."),
    ("Tabs", "Meetings/engagement/participants/recordings tabs work", "P1", "Happy path", "Member",
     "Data exists", "1) Switch tabs.", "Each tab renders without crash."),
    ("Free plan reports", "Reports route is reachable even on Free (current product)", "P2", "Exploratory", "Free plan owner",
     "Plan features.reports is false", "1) Open reports.",
     "Page loads. Note: plan flag is not enforced on the route today.",
     "", "If product intent is to block Free, this is a gap."),
])

# ── Billing ──────────────────────────────────────────────────────────────────
add("SAM-BIL", "Functional", "Billing", [
    ("Plan cards", "Billing shows Free/Pro/Enterprise from API with real prices", "P0", "Happy path", "Workspace member",
     "Plans seeded", "1) /app/billing.", "Prices 0 / 49 / 299 unless admin changed them. Current plan marked."),
    ("Usage meters", "Used/included/remaining/overage match subscription", "P0", "Data integrity", "Member",
     "Known usage", "1) View current plan section.", "Numbers match /billing/usage. Period dates correct."),
    ("Owner change plan", "Owner can switch to Pro", "P0", "Happy path", "Workspace owner",
     "Currently free", "1) Switch to Pro.", "Subscription planKey pro. Invoice regenerated for period."),
    ("Member cannot change plan", "Member cannot PATCH plan", "P0", "Access control", "Workspace member",
     "Member", "1) Switch plan control hidden or API PATCH.", "403. Plan unchanged."),
    ("Admin cannot change plan", "Workspace admin (not owner) cannot change plan", "P0", "Access control", "Workspace admin",
     "Admin not owner", "1) PATCH /billing/plan.", "403."),
    ("Invoice generated", "Active plan period produces an invoice", "P0", "Happy path", "Owner",
     "After plan load/change", "1) Open Invoices list.", "At least one invoice INV-YYYYMM-xxxxxx."),
    ("Free auto-paid", "Zero-total invoice is auto paid", "P0", "Happy path", "Free owner",
     "Free plan, no overage", "1) Open invoice.", "Status paid. Total $0.00."),
    ("Pro issued", "Paid plan invoice is issued until marked paid", "P0", "Happy path", "Pro owner",
     "Pro, no payment provider", "1) Open invoice.", "Status issued (due). Total includes monthly price + overage."),
    ("Invoice detail", "Invoice detail shows line items, bill-to, period", "P0", "Happy path", "Member",
     "Invoice id", "1) /app/billing/invoices/:id.", "Org name, line items, subtotal, tax 0, total. No Visa 4242."),
    ("Mark paid owner", "Owner can mark issued invoice paid", "P0", "Happy path", "Owner",
     "Issued invoice", "1) Mark paid.", "Status paid. paidAt set."),
    ("Mark paid admin", "Workspace admin can mark paid", "P1", "Happy path", "Workspace admin",
     "Issued invoice", "1) POST pay.", "Paid."),
    ("Member cannot pay", "Member cannot mark paid", "P0", "Access control", "Member",
     "Issued invoice", "1) POST pay.", "403."),
    ("Void cannot pay", "Void invoice cannot be paid", "P1", "Negative", "Owner",
     "Void invoice if present", "1) Pay.", "Validation error."),
    ("Idempotent pay", "Paying an already-paid invoice is a no-op success", "P2", "Boundary", "Owner",
     "Paid invoice", "1) Pay again.", "Still paid. No double charge (there is no provider)."),
    ("Print PDF", "Print / Save PDF opens print dialog", "P1", "Happy path", "Member",
     "Invoice detail", "1) Print / Save PDF.", "Browser print dialog. Layout readable."),
    ("Payment methods empty", "Payment method section is honest", "P0", "Happy path", "Member",
     "Billing page", "1) Read payment method.", "No fake card. States provider not connected."),
    ("Usage by meeting", "Admin sees usage by meeting", "P1", "Happy path", "Workspace admin",
     "Metered meetings this period", "1) Billing page.", "Meeting titles and minutes listed."),
    ("Overage line", "Overage minutes appear as a line item", "P1", "Data integrity", "Owner",
     "Used > included", "1) Open invoice.", "Overage quantity × rate = amount. Total = plan + overage."),
    ("Settings billing panel", "Settings → Billing shows same plan/usage", "P1", "Regression", "Member",
     "Known usage", "1) Settings billing. 2) Full billing.", "Counts match."),
    ("Unknown invoice", "Bad invoice id is not found", "P2", "Negative", "Member",
     "Signed in", "1) Open random id.", "404."),
])

# ── Settings / AI ────────────────────────────────────────────────────────────
add("SAM-SET", "Functional", "Settings", [
    ("Profile", "User can update name and avatar", "P0", "Happy path", "Signed-in user",
     "Profile section", "1) Change name. 2) Save.", "Name updates in header/avatar."),
    ("Account toggles", "Account notification toggles persist", "P1", "Happy path", "Signed-in user",
     "Account section", "1) Toggle email/push/messages. 2) Reload.", "Same values."),
    ("Security toggles", "meetingPassword / waitingRoom user prefs persist", "P2", "Happy path", "Signed-in user",
     "Security section", "1) Toggle. 2) Reload.", "Persisted on /me/settings."),
    ("2FA link", "Enable 2FA goes to security page but does not enroll TOTP", "P1", "Happy path", "Signed-in user",
     "Settings security", "1) Click Enable 2FA if shown. 2) Look for authenticator enroll.",
     "No TOTP enrollment. Password/sessions/verify email work. Document as not implemented."),
    ("Integrations honest", "Integrations does not fake Google/Slack/Outlook connected", "P0", "Happy path", "Signed-in user",
     "Settings → Integrations", "1) Open section.", "Copy says not wired yet. No Connect that pretends OAuth."),
    ("Rooms/teams/members deep links", "Nav sections route correctly", "P1", "Happy path", "Admin",
     "Signed in", "1) Click each settings nav item.", "Correct panel. Invite/create routes work."),
    ("Redirect default", "/app/settings redirects to profile", "P2", "Happy path", "User",
     "Signed in", "1) Open /app/settings.", "Lands on profile."),
])

add("SAM-AI", "Functional", "AI insights", [
    ("Empty page", "AI Insights is an honest later state", "P0", "Happy path", "Signed-in user",
     "None", "1) Open /app/ai-insights.",
     "No fake transcript. Explains AI is not enabled. Links to meetings and recordings."),
    ("No demo meeting", "Page does not render DEMO_AI_MEETING content", "P0", "Data integrity", "Signed-in user",
     "AI page", "1) Search page text for demo quotes/speakers.", "Those demo strings are absent."),
    ("Nav still works", "Sidebar AI item is reachable and does not crash", "P1", "Regression", "User",
     "Signed in", "1) Click AI Insights.", "Page renders."),
])

# ── Platform admin ───────────────────────────────────────────────────────────
add("SAM-ADM", "Functional", "Platform admin", [
    ("Guard", "Non-admin cannot open /admin", "P0", "Access control", "Signed-in user",
     "platformRole none", "1) Open /admin.", "Forbidden / bounce. No console data."),
    ("Claim dev", "Dev claim-dev-access promotes when allowed", "P1", "Happy path", "Local user",
     "Non-production or configured", "1) Hit claim if UI offers it.", "platformRole admin/super_admin or documented deny."),
    ("Overview KPIs", "Overview counts match real orgs/users/meetings", "P0", "Data integrity", "Platform admin",
     "Known seed data", "1) Open /admin.", "KPIs are live. Trends are factual labels, not fake +12%."),
    ("Overview empty activity", "No activity shows empty, not demo orgs", "P1", "Data integrity", "Platform admin",
     "Fresh DB", "1) Overview recent orgs/activity.", "Empty states."),
    ("List workspaces", "Workspaces table is live", "P0", "Happy path", "Platform admin",
     "Orgs exist", "1) /admin/workspaces.", "Real names/slugs/status."),
    ("Create workspace", "Admin can create an organization with owner", "P0", "Happy path", "Platform admin",
     "Unused owner email", "1) /admin/workspaces/new. 2) Fill org + owner. 3) Submit.",
     "Org created. Owner user exists or is attached. Subscription on selected plan."),
    ("Workspace detail", "Detail shows live org", "P1", "Happy path", "Platform admin",
     "Known id", "1) Open detail.", "Name, status, members."),
    ("Suspend workspace", "Admin can suspend an org", "P0", "Happy path", "Platform admin",
     "Active org", "1) Set suspended.",
     "Status stored as suspended. NOTE: API lockout is currently incomplete — record whether members still access."),
    ("Reactivate workspace", "Admin can set org active", "P1", "Happy path", "Platform admin",
     "Suspended org", "1) Set active.", "Status active."),
    ("List users", "Users table is live with search", "P0", "Happy path", "Platform admin",
     "Users exist", "1) /admin/users. 2) Search email.", "Real users. Empty search state works."),
    ("Create user", "Admin can create a user", "P0", "Happy path", "Platform admin",
     "Unused email", "1) /admin/users/new.", "User created. Appears in list."),
    ("User detail", "User detail loads", "P1", "Happy path", "Platform admin",
     "Known id", "1) Open user.", "Email, role, status."),
    ("Suspend user", "Suspend updates accountStatus", "P0", "Happy path", "Platform admin",
     "Active user not self", "1) Suspend.",
     "Status suspended. NOTE: login may still succeed today — fail as P0 if product requires lockout."),
    ("Ban user", "Ban requires confirm and sets banned", "P0", "Happy path", "Platform admin",
     "Users page", "1) Ban. 2) Confirm dialog.", "Status banned. Cancel leaves user unchanged."),
    ("Unban", "Banned user can be set active", "P1", "Happy path", "Platform admin",
     "Banned user", "1) Unban/reactivate.", "Status active."),
    ("Cannot ban self", "Admin cannot change own account status", "P0", "Negative", "Platform admin",
     "Own row", "1) Ban/suspend self via API.", "Validation error."),
    ("Plans list", "Plans are Free/Pro/Enterprise with live subscriber counts", "P0", "Data integrity", "Platform admin",
     "/admin/plans", "1) Open plans.", "No Business/Starter Figma rows. Prices from API."),
    ("Edit plan price", "Admin can change monthly price and included minutes", "P0", "Happy path", "Platform admin",
     "Plans page", "1) Edit Pro price. 2) Save.", "New price shown. MRR recalculates. Restart does not reset (seed uses $setOnInsert)."),
    ("Subscriptions list", "Subscriptions are live workspaces", "P0", "Data integrity", "Platform admin",
     "/admin/subscriptions", "1) Open.", "No fake Samtal Technologies / Visa 4242. Amounts from plans."),
    ("Filter subscriptions", "Plan and status filters work", "P1", "Happy path", "Platform admin",
     "Mixed plans", "1) Filter Pro. 2) Filter cancelled.", "Rows match."),
    ("Change subscription plan", "Admin can change a workspace plan", "P0", "Happy path", "Platform admin",
     "Selected sub", "1) Change plan dropdown.", "planKey updates. Invoice syncs."),
    ("Cancel subscription", "Admin can cancel with confirm", "P0", "Happy path", "Platform admin",
     "Active sub", "1) Cancel. 2) Confirm.", "Status cancelled. Next billing shows cancelled."),
    ("Reactivate subscription", "Cancelled sub can be reactivated", "P1", "Happy path", "Platform admin",
     "Cancelled", "1) Reactivate.", "Status active."),
    ("Admin billing KPIs", "Billing page MRR/ARR/past due are live", "P0", "Data integrity", "Platform admin",
     "/admin/billing", "1) Open.", "Matches subscriptions math. No $24560 fallback."),
    ("Invoices list", "Admin invoices list live documents", "P0", "Happy path", "Platform admin",
     "Invoices synced", "1) /admin/invoices.", "Real numbers/orgs. Search and status filter work."),
    ("Invoice detail pay", "Platform admin can mark invoice paid", "P0", "Happy path", "Platform admin",
     "Issued invoice", "1) Open /admin/invoices/:id. 2) Mark paid.", "Paid. Activity/status update."),
    ("Audit logs", "Platform audit logs record admin actions", "P1", "Happy path", "Platform admin",
     "After a plan/user change", "1) /admin/audit-logs.", "Action, actor email, target, timestamp."),
    ("System settings", "System settings load and save", "P1", "Happy path", "Platform admin",
     "/admin/system", "1) Change a safe general field. 2) Save. 3) Reload.", "Persisted."),
    ("Create workspace validation", "Missing org name/owner email blocked", "P1", "Negative", "Platform admin",
     "Create form", "1) Submit empty.", "Validation. No half-created org."),
])

# ── Security / network / mobile ──────────────────────────────────────────────
add("SAM-SEC", "Security", "Platform security", [
    ("Unauthenticated /app", "Protected routes require login", "P0", "Security", "Anonymous",
     "No session", "1) Open /app/meetings.", "Redirect /auth."),
    ("Bearer missing", "API without token is 401", "P0", "Security", "Anonymous",
     "None", "1) GET /dashboard/summary.", "401."),
    ("Guest token on admin", "Guest JWT cannot call /admin", "P0", "Security", "Guest",
     "Guest token", "1) GET /admin/overview.", "401/403."),
    ("IDOR meeting", "Cannot fetch another workspace meeting by id", "P0", "Security", "Member workspace B",
     "Meeting id from A", "1) GET meeting.", "403/404."),
    ("IDOR invoice", "Cannot fetch another workspace invoice", "P0", "Security", "Member workspace B",
     "Invoice id from A", "1) GET /billing/invoices/:id with B header.", "404."),
    ("Path traversal recording", "Recording stream rejects path tricks", "P0", "Security", "Member",
     "Signed in", "1) Request stream with ../ in id.", "404/400. No file leak."),
    ("XSS message", "Chat XSS is escaped", "P0", "Security", "Two members",
     "DM", "1) Send <script>alert(1)</script> and <img onerror>.", "Rendered as text. No script run."),
    ("XSS meeting title", "Meeting title HTML is escaped", "P0", "Security", "Member",
     "Create meeting", "1) Title with HTML/script.", "Escaped in list/detail/live."),
    ("CORS production star", "Production CORS is explicit origins only", "P0", "Security", "Attacker origin",
     "Production API", "1) XHR from https://evil.example with credentials.", "Browser blocks. No * with credentials."),
    ("Secure cookie HTTPS", "HTTPS frontend sets Secure refresh cookie", "P1", "Security", "Signed-in user",
     "https frontend", "1) Login. 2) Inspect cookie.", "Secure; HttpOnly; SameSite=Lax."),
    ("HTTP cookie local", "Local HTTP can set cookie when COOKIE_SECURE=false", "P1", "Compatibility", "Local user",
     "Local API NODE_ENV development", "1) Login on localhost:5173.", "Session works."),
    ("Helmet headers", "Security headers present on API", "P2", "Security", "Anonymous",
     "None", "1) curl -I /health/live.", "Helmet defaults present."),
    ("Health live", "GET /health/live is 200 without auth", "P0", "Smoke", "Anonymous",
     "Server up", "1) curl /health/live.", "200."),
    ("Health ready", "GET /health/ready reflects mongo + workers", "P0", "Smoke", "Anonymous",
     "Server up", "1) curl /health/ready.", "200 with mongodb ok and workers ok."),
])

add("SAM-MOB", "UX", "Responsive / i18n", [
    ("App shell mobile", "Sidebar becomes a drawer on small screens", "P0", "UX", "Signed-in user",
     "375px", "1) Open /app. 2) Open menu. 3) Navigate Meetings.", "Drawer works. Content usable."),
    ("Meetings cards mobile", "Meeting cards stack and remain tappable", "P1", "UX", "Member",
     "375px", "1) /app/meetings.", "No overflow. Join/detail reachable."),
    ("Live overlay mobile", "In-call overlay does not hide hang-up", "P0", "UX", "Participant",
     "Phone", "1) Join live.", "Mute/camera/leave reachable with one thumb."),
    ("Guest pre-join mobile", "Guest pre-join fields usable", "P0", "UX", "Guest",
     "Phone", "1) /join/:id.", "Name/email/toggles not covered by keyboard incorrectly."),
    ("Admin tables mobile", "Admin tables scroll horizontally", "P1", "UX", "Platform admin",
     "375px", "1) Users/subscriptions.", "Table usable via horizontal scroll."),
    ("Landing AR", "Arabic locale flips copy if toggle exists", "P2", "UX", "Anonymous",
     "Landing", "1) Switch to AR.", "Copy changes. Layout remains intact."),
    ("Print invoice mobile", "Invoice detail readable on phone", "P2", "UX", "Owner",
     "Invoice open, 375px", "1) View invoice.", "Line items readable."),
])

# ── Regression / known gaps as explicit tests ────────────────────────────────
add("SAM-GAP", "Known gaps", "Current vs production intent", [
    ("Ban lockout", "Banned user must not use the product", "P0", "Negative", "Banned user",
     "accountStatus=banned", "1) Login. 2) Call /me and /app.",
     "Intended: login and API denied. If login succeeds, log P0 defect (authenticate currently does not check accountStatus)."),
    ("Suspend lockout", "Suspended user must not use the product", "P0", "Negative", "Suspended user",
     "accountStatus=suspended", "1) Login.", "Intended: blocked. Record actual."),
    ("Org suspend lockout", "Suspended workspace members should be blocked", "P0", "Negative", "Member of suspended org",
     "Workspace.status=suspended", "1) List meetings.", "Intended: blocked. requireWorkspace currently ignores org status."),
    ("Max members", "Inviting past plan maxMembers should fail", "P1", "Boundary", "Owner on Free",
     "Free maxMembers=5, already 5 active", "1) Invite 6th.",
     "Intended: validation error. Currently not enforced — log defect if invite succeeds."),
    ("Concurrent meetings", "Exceeding maxConcurrentMeetings should fail", "P1", "Boundary", "Owner on Free",
     "maxConcurrentMeetings=1, one live", "1) Start second live meeting.",
     "Intended: blocked. Currently not enforced — log defect if second starts."),
    ("Recording storage cap", "Upload past recordingStorageGb should fail", "P2", "Boundary", "Owner",
     "Near plan storage cap", "1) Upload another recording.", "Intended: blocked with quota error. Record actual."),
])

# ── Traceability ─────────────────────────────────────────────────────────────
MODULES = [
    ("Landing", "Public marketing", "Live", "SAM-LND"),
    ("Authentication", "Signup, login, verify, reset, sessions", "Live", "SAM-AUTH"),
    ("Google OAuth", "Google start/callback", "Live (HTTP+IP limitation)", "SAM-OAUTH"),
    ("Microsoft OAuth", "Social button", "Out of scope / coming soon", "SAM-AUTH"),
    ("Workspace invites", "Token invite/join/password", "Live", "SAM-INV"),
    ("Workspace settings", "Org prefs, branding, audit", "Live", "SAM-WS"),
    ("Members", "Roles, status, directory", "Live", "SAM-MEM"),
    ("Rooms", "Workspace rooms", "Live", "SAM-ROOM"),
    ("Teams", "Teams + meeting visibility", "Live", "SAM-TEAM"),
    ("Meetings", "Schedule, invite, cancel, end", "Live", "SAM-MTG"),
    ("Live meeting", "WebRTC, chat, share, whiteboard, remote control", "Live", "SAM-LIVE"),
    ("Guest join", "Unauthenticated waiting room", "Live", "SAM-GST"),
    ("Calendar", "Meetings calendar", "Live (no external sync)", "SAM-CAL"),
    ("Contacts", "Directory to DM", "Live", "SAM-CON"),
    ("Messages", "DMs, files, search", "Live", "SAM-MSG"),
    ("Chat calls", "In-thread A/V", "Live", "SAM-CALL"),
    ("Notifications", "Inbox + bell", "Live", "SAM-NTF"),
    ("Recordings", "List, stream, delete", "Live", "SAM-REC"),
    ("Templates", "Meeting templates", "Live", "SAM-TPL"),
    ("Reports", "Aggregates", "Live (plan flag not enforced)", "SAM-RPT"),
    ("Billing & invoices", "Plans, usage, manual pay", "Live (no card provider)", "SAM-BIL"),
    ("Settings", "Profile, security, integrations", "Live / integrations later", "SAM-SET"),
    ("AI Insights", "Summaries/transcripts", "Later — honest empty", "SAM-AI"),
    ("Platform admin", "Orgs, users, plans, subs, invoices", "Live", "SAM-ADM"),
    ("Security & health", "Authz, CORS, cookies, XSS", "Live", "SAM-SEC"),
    ("Responsive", "Mobile layouts", "Live", "SAM-MOB"),
    ("Plan/quota gaps", "Ban, suspend, caps", "Partial — must fail if unlocked", "SAM-GAP"),
]

PERSONAS = [
    ("Anonymous visitor", "No session", "Landing, auth, invite preview, guest join"),
    ("Unverified user", "Signed up, email not verified", "Cannot login; can resend verify"),
    ("Workspace member", "role=member, status=active", "Meetings they host/are invited to/teammate; no invites/plan change"),
    ("Workspace admin", "role=admin", "Invites (member), rooms/teams, pay invoice, all meetings; cannot change plan or invite admins"),
    ("Workspace owner", "role=owner", "All admin plus plan change and role changes"),
    ("Guest invitee", "POST /auth/guest, room-scoped JWT", "/join/:roomId waiting room; no workspace APIs"),
    ("Platform admin", "platformRole admin/super_admin", "/admin console"),
    ("Banned user", "accountStatus=banned", "Must be locked out; currently a known gap"),
    ("Suspended user", "accountStatus=suspended", "Must be locked out; currently a known gap"),
    ("Inactive member", "MemberStatus inactive", "Cannot call workspace APIs"),
    ("Invitee (new email)", "Invite token only", "Preview, set password, join org"),
]


def xe(s: str) -> str:
    return escape(str(s), {"'": "&apos;"}).replace("\n", "&#10;")


def col_letter(n: int) -> str:
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def sheet_xml(rows: list[list[str]], freeze=True, widths=None) -> str:
    max_c = max(len(r) for r in rows)
    max_r = len(rows)
    last = f"{col_letter(max_c)}{max_r}"
    dim = f"A1:{last}"
    cols = ""
    if widths:
        for i, w in enumerate(widths, 1):
            cols += f'<col min="{i}" max="{i}" width="{w}" customWidth="1"/>'
    sheetviews = ""
    if freeze:
        sheetviews = """<sheetViews><sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A2" sqref="A2"/>
    </sheetView></sheetViews>"""
    cells = []
    for ri, row in enumerate(rows, 1):
        cxml = []
        for ci, val in enumerate(row, 1):
            ref = f"{col_letter(ci)}{ri}"
            style = ' s="1"' if ri == 1 else ""
            cxml.append(
                f'<c r="{ref}" t="inlineStr"{style}><is><t xml:space="preserve">{xe(val)}</t></is></c>'
            )
        cells.append(f'<row r="{ri}">{"".join(cxml)}</row>')
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="{dim}"/>
  {sheetviews}
  <cols>{cols}</cols>
  <sheetData>{"".join(cells)}</sheetData>
  <autoFilter ref="{dim}"/>
</worksheet>
"""


def write_xlsx(path: Path, sheets: dict[str, list[list[str]]]):
    names = list(sheets.keys())
    ct_overrides = "\n".join(
        f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        for i in range(1, len(names) + 1)
    )
    content_types = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  {ct_overrides}
</Types>
"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
"""
    wb_sheets = "\n".join(
        f'<sheet name="{xe(n)[:31]}" sheetId="{i}" r:id="rId{i}"/>' for i, n in enumerate(names, 1)
    )
    workbook = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>{wb_sheets}</sheets>
</workbook>
"""
    wb_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
""" + "\n".join(
        f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>'
        for i in range(1, len(names) + 1)
    ) + """
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"""
    styles = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F2744"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="2">
    <xf xfId="0"/>
    <xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1" applyAlignment="1">
      <alignment wrapText="1" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>
"""
    widths_main = [14, 14, 18, 22, 42, 10, 16, 20, 36, 52, 52, 28, 28, 12, 12, 24, 12, 36]
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("xl/workbook.xml", workbook)
        z.writestr("xl/_rels/workbook.xml.rels", wb_rels)
        z.writestr("xl/styles.xml", styles)
        for i, name in enumerate(names, 1):
            rows = sheets[name]
            z.writestr(f"xl/worksheets/sheet{i}.xml", sheet_xml(rows, widths=widths_main if i == 5 else None))


def main():
    cases = CASES
    by_pri = {}
    by_mod = {}
    for c in cases:
        by_pri[c["Priority"]] = by_pri.get(c["Priority"], 0) + 1
        by_mod[c["Module"]] = by_mod.get(c["Module"], 0) + 1

    cover = [
        ["Field", "Value"],
        ["Application", "Samtal (MeetUp)"],
        ["Catalog version", "1.0 — 22 Sep 2026"],
        ["Build / commit reference", "main @ 20aa6e9 (billing/invoices live-data pass)"],
        ["Purpose", "Professional scenario test catalog covering every live UI/API path plus later/out-of-scope honesty checks"],
        ["Environments", "Local: Vite http://localhost:5173 + API http://localhost:4002. Production: http://46.246.120.148:8980 (HTTP; camera needs HTTPS or localhost)"],
        ["Total scenarios", str(len(cases))],
        ["P0 Critical", str(by_pri.get("P0", 0))],
        ["P1 High", str(by_pri.get("P1", 0))],
        ["P2 Medium/Low", str(by_pri.get("P2", 0))],
        ["Pass criteria", "Observed behavior matches Expected result. Any P0 fail blocks release."],
        ["Fail criteria", "Wrong data, crash, 500, authz bypass, fake/demo content on a live screen, or silent permission/media failure."],
        ["Not a fail", "Microsoft OAuth, AI transcripts, card checkout, Google Calendar/Slack/Outlook — those are later. The UI must stay honest."],
        ["How to import to Google Sheets", "Drive → New → Google Sheets → File → Import → Upload this .xlsx (or the CSV) → Replace spreadsheet."],
        ["Execution columns", "Set Status to Pass / Fail / Blocked / Not run. Fill Actual result and Defect ID when failed."],
        ["Priority legend", "P0 = release blocker (auth, join, pay, data leak). P1 = core workflow. P2 = polish/edge."],
        ["Type legend", "Happy path, Negative, Boundary, Security, Access control, Data integrity, UX, Compatibility, Regression, Exploratory, Smoke"],
    ]

    strategy = [
        ["#", "Practice", "How we test Samtal"],
        ["1", "Role matrix", "Repeat meeting, billing, and settings flows as member, admin, owner, guest, platform admin."],
        ["2", "Empty vs populated", "Every list (meetings, calendar, recordings, invoices, messages, admin tables) must be tested with zero rows AND real rows — never demo catalogs."],
        ["3", "Authz IDOR", "Use a second workspace/user and paste IDs into URLs and APIs."],
        ["4", "Media reality", "Camera/mic on localhost or HTTPS only. Public HTTP :8980 must show the insecure-context message."],
        ["5", "Billing honesty", "No Visa 4242. Free invoices auto-paid $0. Pro invoices issued until Mark paid."],
        ["6", "Later surfaces", "AI Insights and Integrations must not fake connected providers or transcripts."],
        ["7", "Known gaps", "SAM-GAP cases capture ban/suspend/quota that the API does not yet enforce. Fail them if lockout is required for go-live."],
        ["8", "Regression", "After invoice/admin work, re-run P0 auth, join, guest waiting, and recordings stream."],
        ["9", "Mobile", "375px guest waiting, live controls, meetings list, admin tables."],
        ["10", "Evidence", "For each P0, keep URL, role, screenshot or HAR, and timestamp in Actual result."],
    ]

    persona_rows = [["Persona", "How identified", "Primary surfaces"]] + [list(p) for p in PERSONAS]

    rtm = [["Module", "What is in scope", "Implementation status", "Case prefix", "Case count"]]
    counts = {}
    for c in cases:
        counts[c["Test ID"].rsplit("-", 1)[0]] = counts.get(c["Test ID"].rsplit("-", 1)[0], 0) + 0
    prefix_count = {}
    for c in cases:
        pfx = "-".join(c["Test ID"].split("-")[:2])
        prefix_count[pfx] = prefix_count.get(pfx, 0) + 1
    for mod, scope, status, pfx in MODULES:
        rtm.append([mod, scope, status, pfx, str(prefix_count.get(pfx, 0))])

    master = [HEADERS] + [[c[h] for h in HEADERS] for c in cases]

    later = [
        ["Item", "UI today", "Test requirement", "Related cases"],
        ["AI summaries / transcripts / action items", "Honest empty page", "Must not show DEMO_AI_MEETING. Links to meetings/recordings work.", "SAM-AI-001..003"],
        ["Card payments / Stripe", "Empty payment methods; manual Mark paid", "No fake Visa 4242. Pay is owner/admin only.", "SAM-BIL-016, SAM-BIL-010"],
        ["Google Calendar / Slack / Outlook", "Integrations says not wired", "No fake Connected toggles.", "SAM-SET-005, SAM-CAL-008"],
        ["Microsoft OAuth", "Button disabled, coming soon", "Must not start an OAuth flow.", "SAM-AUTH-030"],
        ["TOTP 2FA", "Copy/link only", "No authenticator enrollment required to pass; document absence.", "SAM-SET-004"],
        ["joinBeforeHost enforcement", "Setting saved, join does not require host", "Exploratory — record actual vs toggle.", "SAM-LIVE-026"],
        ["Plan feature.reports gate", "Reports API does not check flag", "Document; optional product defect.", "SAM-RPT-005"],
    ]

    exec_log = [
        ["Date", "Build", "Environment", "Tester", "P0 pass", "P0 fail", "P1 fail", "Blocked", "Notes"],
        ["", "20aa6e9", "Local 5173/4002", "", "", "", "", "", ""],
        ["", "20aa6e9", "Production 8980", "", "", "", "", "", "Camera on HTTP will fail by design"],
    ]

    sheets = {
        "00-Cover": cover,
        "01-Strategy": strategy,
        "02-Personas": persona_rows,
        "03-Traceability": rtm,
        "04-Test-Cases": master,
        "05-Later-Out-of-Scope": later,
        "06-Execution-Log": exec_log,
    }

    xlsx = OUT / "Samtal-Scenario-Test-Catalog.xlsx"
    csv_path = OUT / "Samtal-Scenario-Test-Cases.csv"
    write_xlsx(xlsx, sheets)
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=HEADERS)
        w.writeheader()
        for c in cases:
            w.writerow(c)
    print(f"cases={len(cases)}")
    print(f"xlsx={xlsx}")
    print(f"csv={csv_path}")
    print("by_priority", by_pri)
    print("by_module")
    for k, v in sorted(by_mod.items(), key=lambda kv: (-kv[1], kv[0])):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
