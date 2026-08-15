# MeetUp — Four Product Surfaces (Production Plan)

**Version:** 2.0  
**Product:** MeetUp  
**Type:** Production SaaS specification and delivery plan  
**Scope:** Four UIs + backend models, APIs, enforcement, milestones, and launch criteria  

This document is the product blueprint and the production plan. It is **not** a questionnaire and **not** a 7-page decision pack.

MeetUp is four separate experiences. Do not mix staff tools into the customer dashboard. Do not force guests to create an account.

| # | Surface | Who | Base routes |
|---|---------|-----|-------------|
| 1 | Platform dashboard | MeetUp staff | `/platform/*` |
| 2 | Client dashboard | Logged-in customer (person or org) | `/` `/meetings` `/recordings` `/org` `/billing` `/settings` |
| 3 | Conference UI | Host, co-host, admitted participants | `/room/:roomId` |
| 4 | Guest UI | Anyone with a link who is not signed in | `/join/:roomId` |

```text
Platform dashboard     Client dashboard
        |                      |
        |                      +-- New / Schedule / Join
        |                      +-- Org / Billing
        |                      v
        |                Conference UI  <---- Guest UI (admit)
        v
   Staff ops only
```

Limits, prices, and participant caps live on **Plan** records. They are not hardcoded in the UI.

---

## 1. Platform dashboard

**Purpose:** Operate the whole SaaS. Customers never see this.

**Access:** Staff account + staff role. Separate layout from client dashboard.

### 1.1 Sign-in and access
- Staff sign-in only
- Session timeout
- Every destructive action written to an audit log

### 1.2 Overview
- Signups today / this month
- Live meetings
- Concurrent participants
- SFU worker health
- Failed joins, ICE failures
- Recording storage used
- Stripe/billing health (webhooks failed, past_due count)

### 1.3 Users
- Search by name, email, id
- Profile: plan, org, meeting count, recording storage
- Disable / enable account
- Force password reset
- Cannot see customer meeting media here (metadata only)

### 1.4 Organizations
- List: name, owner, members, plan, status
- Open org: members, meetings, recordings (metadata), usage
- Suspend / unsuspend organization

### 1.5 Meetings (global)
- Search by room ID or title
- Status: scheduled, waiting, live, ended, cancelled
- Force-end a stuck live meeting
- See host, org, participant count, join policy

### 1.6 Recordings (global)
- Find by meeting
- Status: processing, completed, failed
- Force-delete abusive or illegal content
- Do not play internal customer video unless support policy allows

### 1.7 Plans catalog
- Plans: Free, Pro, Business, Enterprise (names configurable)
- Edit without a code deploy:
  - max participants
  - max meeting duration
  - meetings per day / month
  - max concurrent meetings
  - recording on/off
  - recording minutes and storage
  - retention days
  - max org members
  - guest join / screen share / scheduling flags
- Meeting settings may go **below** a plan cap, never above

### 1.8 Subscriptions and usage
- Trial / active / past_due / canceled
- Assign or change plan (support)
- Period usage vs cap (meetings, minutes, storage)
- Invoice / Stripe customer ids

### 1.9 Feature flags
- Guest join globally
- Waiting room globally
- Recording pipeline
- New UI experiments

### 1.10 SFU and operations
- Worker PIDs, room counts, transports
- `/metrics` and media diagnostics **only** from this staff area (not public)
- Announced IP / TURN status checks

### 1.11 System settings
- Default retention
- Email provider
- Object-storage bucket
- TURN credentials reference (secrets stay in env)
- Production CORS origins

### 1.12 Audit log
- Who changed a plan, disabled a user, force-ended a meeting, deleted a recording

### Not in the platform dashboard
- Creating a normal customer meeting
- In-call video/audio
- Guest name entry
- Customer billing checkout (customers use the client dashboard)

---

## 2. Client dashboard

**Purpose:** The customer product after login. Grow today’s Home page into this.

**Access:** User JWT.

**Two workspaces (same modules, different data):**
- **Personal** — my meetings, my recordings, my subscription
- **Organization** — org meetings, org recordings, members, org billing (Owner/Admin)

### 2.1 Home / overview
- Welcome, current plan, trial banner
- Usage meters (meetings, participants cap, storage)
- Shortcuts: New meeting, Schedule, Join with ID
- Next upcoming meeting

### 2.2 Meetings
- Tabs: Upcoming, Live, Completed, Cancelled
- Instant meeting (create + open conference)
- Schedule: title, date, time, timezone, duration
- Copy link, edit scheduled meeting, cancel/delete (owner)
- Meeting detail after end: duration, participants, recording

### 2.3 Meeting settings (create / edit)
- Join policy: open, waiting room, invite only, organization members
- Allow guests
- Allow join before host
- Default participant permissions: microphone, camera, screen share, chat, reactions, raise hand
- Recording on/off if the plan allows
- Max participants field cannot exceed the plan (UI shows cap; server enforces)

### 2.4 Meeting invitations
- Invite people to **one meeting** by email (not the same as org membership)
- Pending / accepted / expired

### 2.5 Recordings library
- List: title, date, duration, size, status (processing / completed / failed)
- Play in browser, download MP4, delete
- Visible only after status = completed
- Share/download according to host or org policy

### 2.6 Organization
- Create organization → creator is Owner
- Roles: Owner, Admin, Member only
- Invite by email → member must **accept** (never auto-join)
- Remove member, change Admin/Member (Owner manages Admins)
- If a member leaves, org **keeps** meetings and recordings
- One organization per user in this release

### 2.7 Organization policies
- Who can create meetings: everyone, admins, owner
- Guest access allowed
- Waiting room required (mandatory override)
- Recording allowed
- Screen share allowed
- Recording access: host, members, admins
- Mandatory org flags beat meeting-level settings

### 2.8 Billing and plan
- Current plan and numeric limits
- Usage this period
- Start trial / subscribe / customer portal
- Upgrade immediately; downgrade does not delete history
- Trial end: account stays; user lands on Free (or blocked paid features)

### 2.9 Personal settings
- Name, photo, timezone, language
- Verify email, change password
- Default devices, default waiting-room, default permissions
- Leave organization

### 2.10 Notifications (in-dashboard)
- Invitation received
- Meeting starting
- Recording ready
- Trial ending
- Failed payment

### Role matrix (client)

| Action | Member | Admin | Owner |
|--------|--------|-------|-------|
| Join org meetings | Yes | Yes | Yes |
| Create meetings | If policy | Yes | Yes |
| Invite org members | No | Yes | Yes |
| Org policies | No | View | Edit mandatory |
| Billing | No | No (unless delegated later) | Yes |
| Delete recordings (org) | Own only | Per policy | Yes |

### Not in the client dashboard
- Staff user search
- Editing the global plan catalog
- SFU worker lists
- Other customers’ data

---

## 3. Conference UI

**Purpose:** The live call. This is today’s meeting page, completed for production.

**Access:** User JWT **or** guest token **after** admit. Route `/room/:roomId`.

### 3.1 Stage and layout
- Gallery: stacked rows (example: 5 above, 4 below). Never one long horizontal strip for 3+ people
- Presentation: large screen share + filmstrip of people
- Names, mute, hand-raised, speaking, overflow “+N”
- Desktop, tablet, mobile web

### 3.2 Authenticated pre-join
- Camera/mic preview, mute, camera off
- Meeting title, host, waiting-room indicator
- Copy invite link
- Join (or enter waiting room if policy requires)

### 3.3 Media controls
- Mute / unmute, camera on / off
- Screen share (one presenter at a time unless policy changes)
- Device picker
- **Leave** — this participant only; meeting continues

### 3.4 Collaboration
- Chat, people list, reactions, raise / lower hand
- Chat is live in the meeting; persist after the meeting only if org/meeting policy says so

### 3.5 Recording
- Start / stop: host and co-host, if plan + org allow
- Everyone sees a Recording banner
- One **MP4**: layout + participant video + audio + screen share + chat
- States: recording → processing → completed | failed
- Save path / library entry on the client dashboard when completed
- Timeline in the file (seekable minutes)

### 3.6 Host and co-host
- Waiting room: Admit, Reject, Admit all
- Mute one, mute all (server-enforced)
- Remove participant
- Make co-host / revoke co-host
- **End meeting for everyone** — not the same as Leave
- Optional lock: no new joins

Host-only (recommended): permanent end meeting, transfer ownership later.

### 3.7 Limit and policy feedback
- Meeting full
- Duration warning, then auto-end from the server
- Recording blocked by plan or org

### Not in the conference UI
- Billing, plan upgrade
- Org member invitations
- Staff ops
- Sign up

---

## 4. Guest UI

**Purpose:** Join a meeting **without** an account.

**Access:** Meeting link only. Route `/join/:roomId`. Must **not** redirect to `/auth`.

If guests are disabled (org or meeting), show: “Sign in or ask the host for access.” Do not show the guest form.

### 4.1 Link landing
- Title, host name, scheduled time
- States: not started, live, ended, full, invalid, expired
- If the visitor is already logged in → conference pre-join (surface 3), not this form

### 4.2 Guest identity
- Display name required
- Email optional (default: not required)
- No password, no dashboard, no recording library
- Issue a **guest meeting token** valid only for this meeting, short TTL

### 4.3 Guest device check
- Same mic/camera preview as registered users
- Join directly **or** Request to join

### 4.4 Waiting room
- “Waiting for the host to let you in…”
- Admit → conference UI as **participant** (never host)
- Reject → “You cannot join this meeting”
- Host not in yet and join-before-host off → wait; do not attach to the SFU yet

### 4.5 Inside the call as guest
- Audio, video, chat, reactions, raise hand if meeting permissions allow
- Cannot: record, end meeting, admit others, assign co-host
- Leave only

### 4.6 After the call
- Guest session destroyed
- Optional: “Create a free account to host your own meetings”
- Guests do not see the recordings library unless someone later shares a recording link

---

## Production rules that apply to all four surfaces

- Backend enforces join, wait, capacity, duration, record, mute, remove, end. UI never “just hides the button.”
- Policy order: Plan → Organization (mandatory) → Meeting → Participant role.
- Production: TURN, announced IP, HTTPS/WSS, explicit CORS, rate limits on, staff-only metrics.
- Recordings: object storage + database metadata, never large files in MongoDB.
- Trial end does not delete the account.

### First production release includes all four surfaces
Platform + client (including org and billing) + conference + guest.

### Not in this release
Breakout rooms, transcription/AI, native iOS/Android apps, calendar sync, SSO/SAML, one user in many organizations, private enterprise deploy.

---

# Part B — Production Delivery Plan

## 5. Current state vs gap

What already works in `conference-backend` + `conference-frontend`:

| Area | Today | Production gap |
|---|---|---|
| Auth | Signup / signin / me, JWT 7d | Refresh rotation, email verification, password reset, staff role |
| Meetings | Create instant/scheduled, list, delete (owner) | Status lifecycle, join policy, edit, meeting detail, invitations |
| In-call | mediasoup SFU, gallery rows, screen share, chat, reactions, raise hand | Host/co-host moderation, waiting room, leave vs end, lock |
| Recording | Composite MP4 upload per meeting (file on disk) | Recording model + library APIs, object storage, retention |
| Guests | None — `/room/:id` requires login | `/join/:roomId`, guest token, waiting room |
| Orgs / plans / billing | None | All models, APIs, Stripe, usage enforcement |
| Platform admin | None (open `/metrics`, `/media/stats`) | Staff dashboard, locked ops endpoints, audit log |

## 6. Data models (MongoDB)

Keep `User` and `Meeting`; extend them. Add the rest. Metadata only in MongoDB — video files go to object storage (local disk acceptable at launch behind the same `storageKey` abstraction).

**Identity**

| Model | Key fields |
|---|---|
| User (extend) | `name, email, passwordHash, emailVerifiedAt, avatarColor, timezone, locale, defaultMeetingSettings, status: active\|disabled, staffRole?: admin\|support` |
| GuestSession | `meetingId, displayName, tokenHash, expiresAt` — never a User row |

**Organization**

| Model | Key fields |
|---|---|
| Organization | `name, slug, ownerId, status: active\|suspended` |
| OrganizationMember | `organizationId, userId, role: owner\|admin\|member, joinedAt` |
| OrganizationInvitation | `organizationId, email, role, invitedBy, tokenHash, status: pending\|accepted\|declined\|expired\|revoked, expiresAt` |
| OrganizationPolicy | `organizationId, allowGuests, requireWaitingRoom, allowRecording, allowScreenShare, whoCanCreateMeetings, whoCanJoin, recordingAccess` |

**Plans and billing**

| Model | Key fields |
|---|---|
| Plan | `code, name, billingInterval, maxParticipants, maxMeetingDurationMinutes, meetingsPerDay, meetingsPerMonth, maxConcurrentMeetings, allowRecording, maxRecordingMinutes, recordingStorageBytes, recordingRetentionDays, maxOrgMembers, allowGuestJoin, allowScreenSharing, allowScheduling` |
| Subscription | `subjectType: user\|organization, subjectId, planId, status: trial\|active\|past_due\|canceled, trialEndsAt, currentPeriodEnd, stripeCustomerId, stripeSubscriptionId` |
| UsagePeriod | `subjectType, subjectId, periodStart, meetingsCreated, meetingMinutes, recordingMinutes, storageBytes` |

**Meetings**

| Model | Key fields |
|---|---|
| Meeting (extend) | `roomId, title, type: instant\|scheduled, status: scheduled\|waiting\|live\|ended\|cancelled, hostUserId, organizationId?, scheduledAt, timezone, plannedDurationMinutes, startedAt, endedAt, joinPolicy: open\|waiting_room\|invite_only\|org_members, allowGuests, allowJoinBeforeHost, permissions (mic/cam/share/chat/reactions/raiseHand), maxParticipants (≤ plan)` |
| MeetingInvitation | `meetingId, email, invitedBy, tokenHash, status, expiresAt` |
| JoinRequest | `meetingId, requesterType: user\|guest, userId?, guestSessionId?, displayName, status: pending\|admitted\|rejected, decidedBy` |
| MeetingParticipant | `meetingId, userId?, guestSessionId?, role: host\|cohost\|participant, joinedAt, leftAt` |
| Recording | `meetingId, ownerUserId, organizationId?, status: processing\|completed\|failed, storageKey, mimeType, durationSeconds, bytes, retentionUntil, accessPolicy` |
| AuditLog | `actorId, actorType: staff\|user, action, targetType, targetId, meta, createdAt` |

## 7. API surface (`/api/v1`)

Existing `/auth`, `/meetings`, `/recordings` move behind `/api/v1` (keep aliases during migration).

**Auth and profile**
- `POST /auth/signup` · `POST /auth/signin` · `POST /auth/refresh` · `POST /auth/signout`
- `POST /auth/verify-email` · `POST /auth/forgot-password` · `POST /auth/reset-password`
- `GET /me` · `PATCH /me` · `PATCH /me/settings`

**Meetings (client dashboard + conference)**
- `GET /meetings?status=&type=` · `POST /meetings` · `GET /meetings/:id` · `PATCH /meetings/:id` · `DELETE /meetings/:id`
- `POST /meetings/:id/end` (host)
- `POST /meetings/:id/invitations` · `POST /meeting-invitations/:token/accept`
- `GET /meetings/:roomId/public` — pre-join/guest landing summary (title, host, state; no secrets)

**Guest**
- `POST /meetings/:roomId/guest-token` `{ displayName }` → scoped short-TTL token

**Lobby (waiting room)**
- `POST /meetings/:id/join-requests` (user or guest token)
- `GET /meetings/:id/join-requests` (host/cohost)
- `POST /meetings/:id/join-requests/:rid/admit` · `.../reject` · `POST /meetings/:id/join-requests/admit-all`

**In-meeting moderation (mirrored on socket)**
- `POST /meetings/:id/participants/:pid/mute` · `.../remove` · `.../role` `{ cohost|participant }`

**Recordings**
- `POST /meetings/:id/recordings` (upload MP4 → processing) — replaces raw `POST /recordings/:roomId`
- `GET /recordings` · `GET /recordings/:id` · `GET /recordings/:id/download-url` · `DELETE /recordings/:id`

**Organizations**
- `POST /organizations` · `GET/PATCH /organizations/current`
- `GET /organizations/current/members` · `PATCH/DELETE .../members/:userId`
- `POST /organizations/current/invitations` · `POST /org-invitations/:token/accept|decline`
- `GET/PATCH /organizations/current/policy` · `GET .../meetings` · `.../recordings` · `.../usage`

**Billing**
- `GET /plans` (public) · `GET /billing/subscription` · `POST /billing/checkout` · `POST /billing/portal` · `POST /billing/webhooks/stripe` (idempotent) · `GET /usage`

**Platform (staff-only, `/platform/api/*`)**
- Users search/disable, orgs list/suspend, meetings search/force-end, recordings force-delete
- Plans CRUD, subscription assignment, feature flags, audit log
- `GET /platform/api/metrics`, `.../media/stats` — **remove public `/metrics` and `/media/stats`**

## 8. Socket events (add to existing media events)

Join flow changes: `join-room` first validates meeting status, identity (user JWT or guest token), join policy, capacity, and duration budget — only then creates the mediasoup peer.

New events:
- `join-request` / `join-approved` / `join-rejected` / `waiting-room-update`
- `participant-muted` / `participant-removed` / `role-changed`
- `meeting-ended` (server tears down room; all clients navigate out)
- `meeting-locked` / `meeting-unlocked`
- `recording-state` (`processing|completed|failed`)

## 9. Enforcement points (server-side, single policy resolver)

One `resolvePolicy(meeting)` helper merges Plan → OrganizationPolicy (mandatory flags) → Meeting → participant role. No scattered `if (minutes > 40)`.

| Rule | Enforced at |
|---|---|
| Meetings per day/month, concurrent | `POST /meetings`, meeting start |
| Max participants | `join-room` + lobby admit |
| Max duration | Server timer: warn at T-5min, auto-end at T |
| Guest allowed / waiting room | Guest token issue + `join-room` |
| Recording allowed / storage cap | Recording start + upload |
| Host-only actions | Every moderation socket/HTTP handler |
| Retention | Daily job deletes expired recordings |

## 10. Delivery milestones (build order)

Each milestone is shippable and testable before the next starts.

**M1 — Control plane foundation**
- New/extended models: Meeting lifecycle+policy, Plan (seeded), Subscription (manual), JoinRequest, GuestSession, MeetingParticipant, Recording, AuditLog
- Policy resolver + join-path rewrite (status, capacity, identity)
- Auth upgrades: refresh tokens, email verification, password reset

**M2 — Conference UI production features**
- Host/co-host moderation (mute, remove, role), leave vs end-for-all
- Waiting room (lobby APIs + socket events + host admit panel)
- Duration warning + auto-end; meeting-full handling
- Recording model wired to existing MP4 pipeline; library entry on complete

**M3 — Guest UI**
- `/join/:roomId` landing (public summary, state handling)
- Guest token issue, guest pre-join, waiting screen
- Guest in-call restrictions; session destroy on leave

**M4 — Client dashboard completion**
- Meetings tabs (upcoming/live/completed/cancelled), edit scheduled, meeting detail
- Recordings library (play, download, delete)
- Meeting settings form (policy + permissions, plan caps shown)
- Personal settings (profile, verify email, defaults)

**M5 — Organizations + billing**
- Org create, members, invitations (accept/decline), policies with mandatory overrides
- Stripe: checkout, portal, webhooks, trial; usage meters; enforcement from Subscription
- Org workspace views (meetings, recordings, usage)

**M6 — Platform dashboard + hardening**
- Staff role, `/platform/*` app: overview, users, orgs, meetings, recordings, plans, flags, audit
- Lock `/metrics`, `/media/stats`, diagnostics behind staff auth
- Rate limits on (auth + API), CORS explicit, helmet audit
- TURN configuration + announced IP validation on boot
- Object storage for recordings + retention job
- Backups documented; graceful shutdown drain

## 11. Hardening checklist (must pass before launch)

**Network / media**
- [ ] `MEDIASOUP_ANNOUNCED_IP` set; boot fails in production without it
- [ ] TURN server configured and verified from a symmetric-NAT client
- [ ] HTTPS + WSS behind reverse proxy on 443; UDP 40000–49999 open

**Security**
- [ ] CORS: explicit origins only
- [ ] Rate limits enabled (global + stricter auth)
- [ ] `/metrics`, `/media/stats`, `/media/diagnostics` staff-only
- [ ] JWT refresh rotation; guest tokens scoped to one meeting, short TTL
- [ ] Email verification required to create meetings
- [ ] All moderation actions authorized server-side
- [ ] Password min 8; secrets only in env; `.env` not committed

**Data**
- [ ] Recordings in object storage; MongoDB metadata only
- [ ] Recording not visible until `completed`
- [ ] Retention job live; org keeps assets when members leave
- [ ] MongoDB backups scheduled and restore-tested

**Reliability**
- [ ] `/health/live` + `/health/ready` wired to load balancer
- [ ] Graceful SIGTERM: stop new joins, close workers, flush recordings
- [ ] Stripe webhooks idempotent; `past_due` policy enforced
- [ ] Duration/participant caps proven under test

## 12. Acceptance tests (quality gates)

1. Two browsers join, exchange audio + video + screen share
2. Guest joins via `/join/:roomId` with name only; waits; host admits; guest has no host tools
3. Host rejects a guest; guest sees rejection; cannot attach to SFU
4. Host ends meeting for everyone; all clients exit; room resources freed
5. Participant cap reached → next join rejected with "Meeting full"
6. Duration cap → warning toast, then server auto-end
7. Recording produces one playable, seekable MP4 that appears in the library only after processing
8. Plan upgrade via Stripe webhook raises caps without redeploy
9. Org mandatory policy (recording off) blocks host recording toggle
10. Staff force-ends a stuck meeting from the platform dashboard; audit log entry written
11. Public `/metrics` returns 401/404; staff route returns data
12. Soak: N concurrent rooms for 1 hour with no worker death (N documented per host size)

## 13. Definition of done

The release is production-ready when: all M1–M6 milestones merged, every hardening checkbox checked, all 12 acceptance tests pass in a staging environment with TURN + HTTPS, and rollback (previous image + DB backup) is documented.
