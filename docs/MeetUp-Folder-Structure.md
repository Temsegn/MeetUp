# MeetUp — Enterprise Folder Structure

**Version:** 1.0
**Companion to:** [MeetUp-Four-Product-Surfaces.md](MeetUp-Four-Product-Surfaces.md)
**Rule:** structure follows the four product surfaces and the M1–M6 delivery plan. New code lands in the folder named here — no "misc" or "helpers2" folders.

---

## 1. Repository root (monorepo)

```text
Meet/
├── conference-backend/          # Express + Socket.IO + mediasoup control plane
├── conference-frontend/         # React (Vite) — all four UI surfaces
├── packages/
│   └── shared-types/            # (optional, later) API + socket contracts shared FE/BE
├── docs/
│   ├── MeetUp-Four-Product-Surfaces.md
│   ├── MeetUp-Folder-Structure.md
│   └── runbooks/                # deploy, rollback, TURN setup, backup/restore
├── deploy/
│   ├── docker-compose.yml       # local full stack (mongo, backend, frontend, coturn)
│   ├── nginx/                   # reverse proxy: HTTPS/WSS, /api, /socket.io
│   └── k8s/                     # (later) manifests if we outgrow compose
├── .github/
│   └── workflows/               # ci.yml (typecheck, lint, test), deploy.yml
└── README.md
```

Principles:

- Two deployable apps only. The platform dashboard is a **route area** inside the frontend, not a third app (single build, staff-guarded routes).
- Contracts (request/response DTOs, socket payloads) start duplicated; once stable, move to `packages/shared-types`.

---

## 2. Backend — `conference-backend/`

Layered architecture. Dependencies point downward only:

```text
routes/handlers → services → repositories/models → infrastructure
                    ↓
              policy (pure)
```

```text
conference-backend/
├── src/
│   ├── server.ts                        # boot: env → db → mediasoup → http → sockets
│   ├── app.ts                           # express wiring only (routers + middleware)
│   │
│   ├── config/
│   │   ├── env.ts                       # zod-validated env (fail fast in production)
│   │   └── mediasoup.ts                 # codecs, worker, transport options
│   │
│   ├── database/
│   │   ├── db.ts                        # mongoose connect / health
│   │   ├── models/                      # ALL mongoose schemas live here (move existing)
│   │   │   ├── User.model.ts
│   │   │   ├── GuestSession.model.ts
│   │   │   ├── Meeting.model.ts
│   │   │   ├── MeetingInvitation.model.ts
│   │   │   ├── MeetingParticipant.model.ts
│   │   │   ├── JoinRequest.model.ts
│   │   │   ├── Recording.model.ts
│   │   │   ├── Organization.model.ts
│   │   │   ├── OrganizationMember.model.ts
│   │   │   ├── OrganizationInvitation.model.ts
│   │   │   ├── OrganizationPolicy.model.ts
│   │   │   ├── Plan.model.ts
│   │   │   ├── Subscription.model.ts
│   │   │   ├── UsagePeriod.model.ts
│   │   │   └── AuditLog.model.ts
│   │   ├── repositories/                # query logic; services never call models directly
│   │   │   ├── meeting.repository.ts
│   │   │   ├── recording.repository.ts
│   │   │   ├── organization.repository.ts
│   │   │   ├── subscription.repository.ts
│   │   │   └── usage.repository.ts
│   │   └── seeds/
│   │       └── plans.seed.ts            # Free / Pro / Business / Enterprise rows
│   │
│   ├── shared/
│   │   ├── constants/                   # non-env constants (TTLs, floors)
│   │   ├── middleware/                  # global HTTP middleware
│   │   │   ├── rate-limit.ts            # global + auth limiter (ON in production)
│   │   │   ├── error-handler.ts
│   │   │   └── request-context.ts       # request id for log correlation
│   │   ├── policies/                    # PURE functions — no I/O, fully unit-testable
│   │   │   ├── resolve-policy.ts        # Plan → OrgPolicy → Meeting → role
│   │   │   ├── limits.ts                # capacity, duration, quota checks
│   │   │   └── permissions.ts           # can(actor, action, meeting) matrix
│   │   ├── types/                       # cross-module TS types (socket.types.ts …)
│   │   ├── utils/
│   │   ├── errors/AppError.ts
│   │   └── validation/                  # zod helpers, sanitizers (roomId, slugs)
│   │
│   ├── modules/                         # HTTP API — one folder per domain
│   │   ├── auth/
│   │   │   ├── auth.routes.ts           # signup, signin, refresh, verify, reset
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.middleware.ts       # authenticate, requireStaff, requireVerified
│   │   │   └── tokens.ts                # access/refresh/guest token issue + verify
│   │   ├── users/
│   │   │   ├── users.routes.ts          # /me, /me/settings
│   │   │   └── users.service.ts
│   │   ├── meetings/
│   │   │   ├── meetings.routes.ts       # CRUD, /end, /public, invitations
│   │   │   ├── meetings.service.ts      # quota check, status transitions
│   │   │   └── meetings.dto.ts          # zod request/response schemas
│   │   ├── lobby/
│   │   │   ├── lobby.routes.ts          # join-requests, admit, reject, admit-all
│   │   │   └── lobby.service.ts
│   │   ├── guests/
│   │   │   ├── guests.routes.ts         # POST /meetings/:roomId/guest-token
│   │   │   └── guests.service.ts
│   │   ├── moderation/
│   │   │   ├── moderation.routes.ts     # mute, remove, role
│   │   │   └── moderation.service.ts    # shared by HTTP + socket handlers
│   │   ├── recordings/
│   │   │   ├── recordings.routes.ts     # upload, list, get, download-url, delete
│   │   │   ├── recordings.service.ts
│   │   │   └── transcode.ts             # ffmpeg webm→mp4 (moved out of routes)
│   │   ├── organizations/
│   │   │   ├── organizations.routes.ts  # org, members, invitations, policy, usage
│   │   │   └── organizations.service.ts
│   │   ├── billing/
│   │   │   ├── billing.routes.ts        # plans, subscription, checkout, portal
│   │   │   ├── billing.service.ts
│   │   │   └── stripe.webhooks.ts       # idempotent webhook handlers
│   │   ├── usage/
│   │   │   ├── usage.routes.ts          # GET /usage
│   │   │   └── usage.service.ts         # counters: meetings, minutes, storage
│   │   └── platform/                    # STAFF ONLY — mounted under /platform/api
│   │       ├── platform.routes.ts       # users, orgs, meetings, recordings admin
│   │       ├── plans.routes.ts          # plan catalog CRUD
│   │       ├── ops.routes.ts            # metrics, media stats (moved from public)
│   │       └── audit.service.ts         # write + query AuditLog
│   │
│   ├── realtime/                        # Socket.IO
│   │   ├── socket.server.ts             # io setup, namespaces, disconnect cleanup
│   │   ├── middleware/
│   │   │   └── socket.auth.ts           # user JWT OR guest token → socket.data
│   │   ├── handlers/
│   │   │   ├── media.handler.ts         # join-room (policy-gated), transports, produce/consume
│   │   │   ├── lobby.handler.ts         # join-request, admit/reject push
│   │   │   ├── moderation.handler.ts    # mute/remove/role/end/lock events
│   │   │   ├── chat.handler.ts
│   │   │   └── reaction.handler.ts
│   │   └── events/
│   │       └── socket.events.ts         # single source of event names + payload types
│   │
│   ├── media/                           # mediasoup engine — NO business rules here
│   │   ├── media-engine.ts              # single facade the rest of the app talks to
│   │   ├── media.types.ts
│   │   └── managers/
│   │       ├── worker-manager.ts
│   │       ├── router-manager.ts
│   │       ├── transport-manager.ts
│   │       ├── producer-manager.ts
│   │       ├── consumer-manager.ts
│   │       ├── participant-manager.ts
│   │       ├── room-manager.ts
│   │       ├── active-speaker-observer.ts
│   │       └── recording-manager.ts     # server-side RTP capture (optional path)
│   │
│   ├── jobs/                            # background timers / cron
│   │   ├── meeting-duration.job.ts      # warn T-5m, auto-end at cap
│   │   ├── retention.job.ts             # delete expired recordings
│   │   ├── usage-rollup.job.ts          # period counters
│   │   └── scheduler.ts                 # register all jobs on boot
│   │
│   ├── infrastructure/
│   │   ├── logging/logger.ts            # winston JSON
│   │   ├── metrics/metrics.service.ts   # prometheus counters
│   │   ├── storage/
│   │   │   ├── storage.ts               # StoragePort + buckets: recordings | photos | files
│   │   │   ├── local.storage.ts         # launch: disk behind same interface
│   │   │   └── s3.storage.ts            # production object storage
│   │   └── email/
│   │       ├── email.ts                 # EmailPort interface
│   │       └── smtp.email.ts            # verification, invitations, receipts
│
├── tests/
│   ├── unit/                            # shared/policies/, services (no network, no db)
│   ├── integration/                     # supertest against app with test mongo
│   └── e2e/                             # two-socket join, lobby admit, end-for-all
│
├── recordings/                          # local storage root (gitignored)
├── Dockerfile
├── package.json
└── tsconfig.json
```

Migration from today's layout (small, mechanical):

| Today | Moves to |
|---|---|
| `src/models/*.model.ts` | `src/database/models/` |
| `src/modules/meetings.ts` (single file) | `src/modules/meetings/` (routes + service + dto) |
| `src/modules/recordings.ts` ffmpeg code | `src/modules/recordings/transcode.ts` |
| `/metrics`, `/media/stats` in `app.ts` | `src/modules/platform/ops.routes.ts` (staff-guarded) |
| `src/policy/` | `src/shared/policies/` |
| `src/middleware/` | `src/shared/middleware/` |
| `src/constants`, `src/types`, `src/utils` stubs | `src/shared/constants`, `types`, `utils` |

Hard rules:

1. `media/` never imports from `modules/` — the SFU knows nothing about plans, orgs, or billing.
2. Routes never touch mongoose models — always through a service, service through a repository.
3. `shared/policies/` is pure: same inputs, same outputs; every limit check has a unit test.
4. Every socket event name and payload lives once in `realtime/events/socket.events.ts`.
5. Every staff mutation writes an `AuditLog` row inside the same service call.

---

## 3. Frontend — `conference-frontend/`

Feature-sliced with **four surface areas** mapped to route groups. Shared code sits below; surfaces never import from each other.

```text
conference-frontend/
├── src/
│   ├── app/                             # composition root
│   │   ├── providers/                   # AuthProvider, QueryProvider, ToastProvider
│   │   ├── router/
│   │   │   ├── index.tsx                # route table for ALL surfaces
│   │   │   └── guards/
│   │   │       ├── RequireAuth.tsx      # client dashboard + conference
│   │   │       ├── RequireStaff.tsx     # /platform/*
│   │   │       └── ResolveJoinEntry.tsx # /join/:roomId → guest form or pre-join
│   │   └── App.tsx
│   │
│   ├── surfaces/                        # ONE folder per product surface
│   │   │
│   │   ├── platform/                    # 1. Platform dashboard (staff)  /platform/*
│   │   │   ├── layout/PlatformShell.tsx # sidebar: overview, users, orgs, plans, ops
│   │   │   ├── overview/                # signups, live meetings, SFU health widgets
│   │   │   ├── users/                   # search, detail, disable
│   │   │   ├── organizations/           # list, detail, suspend
│   │   │   ├── meetings/                # global search, force-end
│   │   │   ├── recordings/             # global search, force-delete
│   │   │   ├── plans/                   # catalog CRUD forms
│   │   │   ├── subscriptions/           # assign plan, trial state
│   │   │   ├── flags/                   # feature flags
│   │   │   ├── ops/                     # metrics, media stats, TURN check
│   │   │   └── audit/                   # audit log table
│   │   │
│   │   ├── dashboard/                   # 2. Client dashboard  / /meetings /recordings …
│   │   │   ├── layout/DashboardShell.tsx# top nav + workspace switcher (personal/org)
│   │   │   ├── home/                    # overview, usage meters, shortcuts
│   │   │   ├── meetings/
│   │   │   │   ├── list/                # tabs upcoming/live/completed/cancelled
│   │   │   │   ├── create/              # instant + schedule forms
│   │   │   │   ├── settings/            # join policy, permissions, caps
│   │   │   │   ├── detail/              # after-end summary, participants, recording
│   │   │   │   └── invitations/
│   │   │   ├── recordings/              # library: play, download, delete
│   │   │   ├── organization/
│   │   │   │   ├── create/
│   │   │   │   ├── members/
│   │   │   │   ├── invitations/
│   │   │   │   └── policies/
│   │   │   ├── billing/                 # plan, usage, checkout, portal
│   │   │   ├── settings/                # profile, verify email, defaults, devices
│   │   │   └── notifications/
│   │   │
│   │   ├── conference/                  # 3. Conference UI  /room/:roomId
│   │   │   ├── ConferencePage.tsx       # today's MeetingPage, decomposed
│   │   │   ├── stage/                   # gallery rows, presentation, ParticipantTile
│   │   │   ├── prejoin/                 # authenticated pre-join
│   │   │   ├── controls/                # MeetingControls bar
│   │   │   ├── sidebar/                 # chat, people, device settings
│   │   │   ├── host/                    # waiting-room panel, moderation menu, end-for-all
│   │   │   ├── recording/               # record button, banner, state
│   │   │   ├── reactions/               # overlay, raise hand
│   │   │   └── hooks/                   # useMeeting, useResponsiveGrid, useActiveSpeakers
│   │   │
│   │   └── join/                        # 4. Guest UI  /join/:roomId
│   │       ├── JoinLandingPage.tsx      # meeting summary + state (ended/full/invalid)
│   │       ├── GuestForm.tsx            # display name → guest token
│   │       ├── GuestPreJoin.tsx         # device preview
│   │       ├── WaitingRoom.tsx          # "waiting for host…", admit/reject result
│   │       └── AfterCall.tsx            # session ended + create-account CTA
│   │
│   ├── features/                        # cross-surface domain logic (no routes, no shells)
│   │   ├── media/                       # mediasoup-client: media-session, device mgmt
│   │   │   ├── mediasoup/
│   │   │   ├── recording/               # meeting-screen-recorder (canvas → MP4 upload)
│   │   │   └── hooks/                   # useLocalMedia, useAudioLevel
│   │   ├── chat/
│   │   ├── reactions/
│   │   └── presence/                    # peers, active speaker, raised hands state
│   │
│   ├── services/                        # API + socket clients (single fetch wrapper)
│   │   ├── api/
│   │   │   ├── http.ts                  # base client: auth header, refresh, errors
│   │   │   ├── meetings.api.ts
│   │   │   ├── recordings.api.ts
│   │   │   ├── organizations.api.ts
│   │   │   ├── billing.api.ts
│   │   │   ├── guests.api.ts
│   │   │   └── platform.api.ts
│   │   ├── socket/
│   │   │   ├── socket-client.ts
│   │   │   └── socket.events.ts         # mirrors backend event names/payloads
│   │   └── auth/
│   │       └── auth.service.ts          # token storage (single TOKEN_KEY), guest token
│   │
│   ├── components/                      # dumb, reusable UI only
│   │   ├── ui/                          # Button, IconButton, Modal, Tabs, Badge, Table
│   │   ├── forms/                       # Input, Select, DateTimePicker
│   │   ├── video/                       # VideoPlayer
│   │   ├── feedback/                    # Toast, EmptyState, Spinner, ErrorBoundary
│   │   └── layout/                      # PageHeader, SidebarNav
│   │
│   ├── contexts/                        # AuthContext (kept), WorkspaceContext (org/personal)
│   ├── hooks/                           # generic hooks (useDebounce, useMediaQuery)
│   ├── types/                           # DTO types mirroring backend (until shared-types)
│   ├── utils/                           # date/format helpers, roomId parsing
│   ├── constants/
│   └── assets/
│
├── tests/                               # vitest + testing-library
│   ├── unit/
│   └── e2e/                             # playwright: guest join, host admit, record
│
├── Dockerfile                           # nginx static build (production)
├── package.json
└── vite.config.ts
```

Route table (all in `app/router/index.tsx`):

| Route | Surface | Guard |
|---|---|---|
| `/auth` | shared auth pages | none |
| `/`, `/meetings/*`, `/recordings`, `/org/*`, `/billing`, `/settings` | dashboard | `RequireAuth` |
| `/room/:roomId` | conference | `RequireAuth` **or** valid guest token |
| `/join/:roomId` | join (guest) | none — never redirect to `/auth` |
| `/platform/*` | platform | `RequireStaff` |

Migration from today's layout:

| Today | Moves to |
|---|---|
| `src/pages/HomePage.tsx` | `surfaces/dashboard/home/` + `meetings/` (split) |
| `src/pages/AuthPage.tsx` | `src/app` shared auth page (route `/auth`) |
| `src/features/room/MeetingPage.tsx` | `surfaces/conference/ConferencePage.tsx` (decomposed) |
| `src/features/meeting/*` | `surfaces/conference/*` (components) + `features/presence` (state) |
| `src/features/collaboration/*` | `surfaces/conference/sidebar/` + `features/chat` |
| `src/features/media/*` | `features/media/` (unchanged role) |
| empty stubs (`store/`, `features/device-management`, `features/screen-share`…) | delete or fold in |

Hard rules:

1. `surfaces/*` never import from another surface — shared logic goes down into `features/`, `services/`, or `components/`.
2. `components/` has no fetch calls, no socket, no business logic.
3. All HTTP goes through `services/api/http.ts` (one place for auth header, refresh, error mapping) — no inline `fetch` in components.
4. Socket event names come only from `services/socket/socket.events.ts`, kept byte-identical to the backend file.
5. Plan limits are displayed from `GET /me` / `GET /plans` / `GET /usage` — never hardcoded in the UI.

---

## 4. Where each milestone lands

| Milestone | Backend folders | Frontend folders |
|---|---|---|
| M1 control plane | `database/models`, `database/seeds`, `shared/policies/`, `modules/auth` | `services/api/http.ts`, `types/` |
| M2 conference prod | `modules/lobby`, `modules/moderation`, `realtime/handlers`, `jobs/meeting-duration.job.ts` | `surfaces/conference/host`, `controls` |
| M3 guest | `modules/guests`, `realtime/middleware/socket.auth.ts` | `surfaces/join/*` |
| M4 client dashboard | `modules/meetings`, `modules/recordings`, `modules/usage` | `surfaces/dashboard/*` |
| M5 orgs + billing | `modules/organizations`, `modules/billing`, `jobs/usage-rollup` | `surfaces/dashboard/organization`, `billing` |
| M6 platform + hardening | `modules/platform`, `shared/middleware/rate-limit`, `infrastructure/storage`, `jobs/retention` | `surfaces/platform/*`, `app/router/guards/RequireStaff` |
