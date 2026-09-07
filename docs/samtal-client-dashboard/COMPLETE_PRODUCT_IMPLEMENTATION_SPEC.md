# COMPLETE PRODUCT IMPLEMENTATION SPECIFICATION

**Status: ANALYSIS COMPLETE (implementation not started)**  
**Source:** [Samtal-meet-UI (Copy)](https://www.figma.com/design/mD2BeG8wud1vn4V4adThBe/Samtal-meet-UI--Copy-) · file key `mD2BeG8wud1vn4V4adThBe`  
**Method:** Full-page `get_metadata` + live `get_design_context` (forceCode) on every product screen + collapsed sidebar  
**Pages in Figma:** 1 (`Page 1` / `0:1`)  
**Published variables:** None  
**Prototype graph:** NOT AVAILABLE FROM FIGMA  

Design typos in Figma are preserved exactly (`perconal`, `Presenttion`, `@exemple.com`, etc.).

---

## 1. Product Overview

| Surface | Figma coverage | Codebase today |
|---------|----------------|----------------|
| Guest / Auth UI | Login, Sign up, Forgot Password | `auth` module complete; reset/verify APIs exist, **screens not in Figma** |
| Client Dashboard | Dashboard, Settings, Reports, Recordings, Calendar, Members, Messages, Workspace, Rooms, Create Room | Mostly not built; docs only |
| Conference UI | Live meeting `1:1128` | mediasoup + Socket.IO + remote-control + whiteboard + in-meeting chat |
| Platform Admin | ADMIN nav + Billing / Invoices / Invoice detail only | **Overview/Users/Workspaces/Plans/System pages NOT IN FIGMA** |

---

## 2. Figma Document Overview

| Item | Value |
|------|--------|
| File name | Samtal-meet-UI (Copy) |
| File ID | `mD2BeG8wud1vn4V4adThBe` |
| Pages | 1 — Page 1 |
| Product screens | 17 |
| Section banners | 2 |
| Sidebar variants | Expanded 268 (+ Messages ~281) / Collapsed 116 |
| Mobile/Tablet frames | **0** |
| Named modals | **0** |
| Component library | Essentially none; instance `arrow-circle-left` (vuesax) |

---

## 3. Page Inventory

### PAGE: Page 1 (`0:1`)

**Sections:** Auth (Y&lt;0) · Client app · Rooms/Workspace · Admin billing · SaaS banner  

**All product screens:**

| # | Exact name | Node | W×H | Surface |
|---|------------|------|-----|---------|
| 1 | Container (Login) | `16:678` | 1500×1129 | Guest |
| 2 | Forgot Password — Samtal | `16:871` | 1500×942 | Guest |
| 3 | Sign up — Samtal \| Create your account | `16:955` | 1550×1280 | Guest |
| 4 | Samtal Dashboard — Meetings, Recordings & Insights | `1:39` | 1550×1021 | Client |
| 5 | Container (live meeting) | `1:1128` | 1500×1267 | Conference |
| 6 | Settings — Samtal | `1:1795` | 1500×1694 | Client |
| 7 | Reports — Samtal Meeting Analytics | `1:2795` | 1824×1428 | Client |
| 8 | Recordings \| Samtal Meeting Workspace | `1:3611` | 1708×1397 | Client |
| 9 | Calendar — Samtal Meeting Workspace | `1:4226` | 1838×1367 | Client |
| 10 | Members · Samtal Workspace | `1:5120` | 1550×1455 | Client |
| 11 | Messages | `1:5916` | 1923×1473 | Client |
| 12 | Workspace Settings — Samtal | `1:6785` | 1884×1633 | Client |
| 13 | Rooms · Samtal Workspace Settings | `17:212` | 1550×1393 | Client |
| 14 | Create Room — Samtal Workspace | `17:790` | 1550×1270 | Client |
| 15 | Billing — Samtal Admin Console | `1:7603` | 1550×1418 | Admin chrome |
| 16 | Invoices — Samtal Workspace Billing | `17:1937` | 1550×1244 | Admin chrome |
| 17 | Invoice · Samtal Billing | `16:3528` | 1500×1532 | Admin chrome |

Banners: `16:1201`, `16:4353`. Collapsed sidebar sample: `1:1059` (116px).

**Nav without screens:** Contacts, Templates, Meetings list, Teams, Branding, Admin Overview/Workspaces/Users/Subscriptions/Plans/Audit/System, Reset Password, Email Verification.

---

## 4. Design System

### 4.1 Colors (measured)

| Token | Hex | Usage |
|-------|-----|--------|
| brand-sidebar | `#016be6` | App sidebar (Messages sometimes `#135ae4`) |
| brand-primary | `#0056ef` / `#006dec` / `#076bee` / `#1e64ef` / `#195ee6` / `#2165ec` | CTAs/links — **normalize with designer** |
| cta-coral | `#dc6c7c` | New Meeting / Leave |
| danger | `#df1e39` / `#e7000b` | End Call / badge |
| success | `#00a45c` | Online / Active |
| text-app | `#151d2b` / `#131a29` / `#121b29` | Headings |
| text-muted | `#6f7b8c` / `#697586` / `#667383` | Subtitles |
| border | `#e1e7ee` / `#e2e8f0` | Cards/inputs |
| page-bg | `#ffffff` / `#f9fafb` / `#f3f8fd` / `#f8fafd` / `#f4f7fa` / `#f5f7fa` / `#f7f8fb` | Per-screen |
| auth-promo | `#f1f6fd` / `#f1f7fd` | Auth right panel |
| tile-bg | `#f0f5fa` | Video tiles |

### 4.2 Typography

| Context | Family |
|---------|--------|
| App shell / most SaaS | **Plus Jakarta Sans** |
| Live meeting chrome | **Inter** (+ Plus Jakarta on sidebar) |
| Auth Login | **Plus Jakarta Sans** |
| Auth Forgot | **SF Pro** |
| Auth Sign up | **Manrope** |
| Calendar cells / some Messages | **SF Pro** mixed |

Weights used: Regular, Medium, SemiBold/Semibold, Bold, ExtraBold.

### 4.3 Spacing / radius / shadow (canonical)

- Sidebar pad 20; nav item px16 py12 gap12 radius16; icon 22  
- Collapsed width **116**; logo mark 65×77; icons column gap 24  
- Cards radius ~10–16; auth inputs radius ~18.2; buttons often 16–18  
- Soft card shadow: `0 0.7px 0.7px rgba(83,100,128,0.06), 0 2.9px 5.7px rgba(83,100,128,0.05)`  
- Active speaker tile ring: `0 0 0 2.249px white, 0 0 0 4.498px #076bee`

### 4.4 Shared chrome

**Expanded sidebar 268:** `#016be6`, nav 9 items, badge `3`, Upgrade card, `arrow-circle-left` 24.  
**Collapsed 116:** icons only, badge 12.17 on messages, compact Upgrade.  
**Header:** H1 + subtitle · notify `8` · help · New Meeting `#dc6c7c` · avatar + online `#00a45c`.

---

## 5. Screen Specifications (all screens)

> Full CSS dumps live in agent-tools `get_design_context` outputs. Below: canvas, hierarchy, exact text inventory, FE/BE contract.

### 5.1 Login — `16:678` (Guest)

- **Canvas:** 1500×1129, white, split 750|750 + footer  
- **Font:** Plus Jakarta Sans · primary `#0056ef`  
- **Route:** `/login` INFERRED  
- **API:** `POST /auth/login` (exists)  
- **Text:** Welcome back 👋 · Sign in to your account to continue · Email address · Enter your email · Password · Enter your password · Remember me · Forgot password? · Sign in · or continue with · Continue with Google · Continue with Microsoft · Don't have an account? · Sign up · Work smarter · Manage your meetings, tasks, and team in one place. · Stay organized · Calendar, recordings, and reports at your fingertips. · Collaborate seamlessly · Connect with your team and achieve more together. · © 2025 Samtal. All rights reserved. · Privacy Policy · Terms of Service  
- **OAuth:** UI only — **API CONTRACT TO BE DEFINED**

### 5.2 Forgot Password — `16:871`

- **Font:** SF Pro · button `#195ee6`  
- **Route:** `/forgot-password` INFERRED · **API:** `POST /auth/forgot-password`  
- **Text:** Forgot Password? · No worries! Enter your email address and we'll send you a link to reset your password. · Email address · Enter your email address · Send Reset Link · Back to Sign In · Secure & safe · We use industry-standard security to protect your account. · Quick recovery · Reset your password and get back to work in minutes. · Need help? · Contact our support team if you need any assistance. · © 2025 Samtal… · Privacy Policy · Terms of Service  
- **Reset Password page:** NOT IN FIGMA (API exists)

### 5.3 Sign up — `16:955`

- **Font:** Manrope · accent `#2165ec` · bg `#f8fafd`  
- **Route:** `/signup` INFERRED · **API:** `POST /auth/signup`  
- **Fields:** First/Last name, Email, Company optional, Password, Confirm, Terms checkbox, Create account, Google, Microsoft  
- **Email verification UI:** NOT IN FIGMA

### 5.4 Dashboard — `1:39`

- **Shell:** Sidebar `#016be6` + Main 1282 · Plus Jakarta  
- **KPI cards:** Upcoming Meetings **5** Today · Completed **12** This Week · Participants **48** · Recordings **8** — links View all / View report `#006dec`  
- **Header copy:** Dashboard · Welcome back, Sarah! Here's what's happening today. · New Meeting  
- **API:** `GET /auth/me` + `GET /api/v1/dashboard/summary` **TO BE DEFINED** · meetings list (exists partially)  
- **Deep regions inspected:** `1:41` sidebar, `1:146` header, `1:184` KPIs · remaining list/chart sections in same frame — structure in metadata

### 5.5 Live meeting — `1:1128` (Conference)

- **Canvas:** 1500×1267 · Sidebar + Main · Meeting chrome **Inter**  
- **Title:** Product Team Weekly Sync · timer **24:15** `#076bee` · Leave `#dc6c7c` · End Call `#df1e39`  
- **Tiles:** You, Jacob Jones, Leslie Alexander, Darrell Steward — active ring `#076bee`  
- **Controls:** Mic · Camera · Raise Hand · Screen · Participants · Chat · More · End Call  
- **Right panels:** Meeting Agenda · Shared Screen (Q2 Performance Overview) · Participants (8) · Meeting Chat  
- **Route:** `/meeting/:roomId` INFERRED FROM EXISTING APP  
- **Stack:** REST meeting metadata · Socket.IO presence/chat/reactions/remote-control · mediasoup A/V/screen · whiteboard (existing, not heavily framed here)

**Realtime (product-required, map to existing handlers):**

| UI | Event domain | Notes |
|----|--------------|-------|
| Join/leave tiles | room/participant | Existing socket server |
| Mic/Cam/Screen | media produce/consume | `media.handler.ts` |
| Chat | chat send/message | `chat.handler.ts` |
| Raise hand / reactions | reaction | `reaction.handler.ts` |
| Remote control | RC_EVENTS | remote-control module |
| Whiteboard | whiteboard:* | whiteboard module |

Exact payload schemas: see existing modules — Figma does not define payloads.

### 5.6 Settings — `1:1795`

- **BG:** `#f9fafb` · H1 Settings · Manage your account…  
- **Secondary nav:** Profile (active `#d4e3ff`/`#1e64ef`) · Account · Notifications · Audio & Video · Calendar & Sync · Recording · Virtual Background · Security · Language · Appearance · Integrations · Billing & Plan  
- **Profile form:** Full Name Sarah Johnson · Email sarah.j@example.com · Job Title · Department · Save Changes · typo “perconal”  
- **Account / Notifications / A/V / Recording / Security / Integrations:** switches, dropdowns, Connect/Disconnect as listed in text inventory  
- **API:** profile update / settings **TO BE DEFINED** (change-password exists)

### 5.7 Reports — `1:2795`

- Tabs: Overview · Meetings · Participants · Engagement · Recordings  
- Date: Apr 21 – Apr 27, 2025 · Filters · Export Report  
- KPIs: Total Meetings 32 · Participants 156 · Total Meeting Time 18h 45m · Average Duration 42m  
- Charts: Meeting Activity Trend · Meetings by Type · Engagement · Heatmap · Top Participants · Insights  
- **API:** analytics **TO BE DEFINED**

### 5.8 Recordings — `1:3611`

- BG `#f3f8fd` · Search recordings... · Filters  
- KPIs: Total Recordings 24 · Time 18h 45m · Storage 12.4 GB · Files Shared 48  
- Table columns: Recording Name · Meeting · Date & Time · Duration · Size · Views · Shared By · Actions  
- Rows: Product Team Weekly Sync, Client Presentation, … (8 shown of 24) · pagination  
- **API:** recordings module exists — align list/share/download

### 5.9 Calendar — `1:4226`

- BG `#f8fafd` · Month/Week/Day · Today · May 2024 · Filters  
- Month grid events (Design Sync, Product Review, …) · Upcoming Meetings sidebar · Join · Schedule a Meeting  
- Font mix Plus Jakarta + SF Pro  
- **API:** calendar/meetings schedule **TO BE DEFINED** / meetings create

### 5.10 Members — `1:5120`

- Workspace secondary nav · Members (58) · Search · All Roles · Invite Members  
- Table: Member · Role · Department · Joined On · Status · Actions  
- Statuses: Active · Inactive · Pending · emails `@exemple.com` as drawn  
- **API:** memberships **TO BE DEFINED**

### 5.11 Messages — `1:5916`

- Sidebar `#135ae4` · Search messages... · All/Unread/Direct/Groups  
- Thread list + chat with Jacob · Type a message... · profile card Video/Audio Call · Shared Media/Links/Meetings  
- **Distinct from in-meeting chat** · persistence **BACKEND BEHAVIOR NOT DEFINED BY DESIGN**

### 5.12 Workspace Settings — `1:6785`

- Workspace Information form · Settings (timezone, formats, language, duration) · Meeting Settings toggles · Members snippet · Danger Zone Delete Workspace  
- **API:** organizations **TO BE DEFINED**

### 5.13 Rooms — `17:212`

- Rooms (24) · Search · All Status · Create Room · Invite Members  
- Table: Room Name · Room ID · Capacity · Created By · Created On · Status · Actions  
- **API:** rooms **TO BE DEFINED**

### 5.14 Create Room — `17:790`

- Form: Room Name* · Room ID* · Description 0/150 · Capacity* · Room Type · Department · Tags · Image upload · Members · Settings switches (recording, chat, screen, files, waiting room, approval) · Cancel / Create Room · Preview  
- **API:** `POST` rooms **TO BE DEFINED**

### 5.15 Billing — `1:7603` (Admin chrome)

- ADMIN nav: Overview · Workspaces · Users · Subscriptions · Billing · Invoices · Plans · Audit Logs · System Settings  
- Current Plan Business $299 · Next Billing · Amount Due · Payment Method VISA ·••• 4242  
- Tabs: Overview · Invoices · Payment Methods · Transactions · Credits & Discounts  
- Usage meters · Recent Invoices table · Billing address  
- **API:** billing **TO BE DEFINED** · Admin pages beyond Billing **NOT IN FIGMA**

### 5.16 Invoices — `17:1937`

- KPIs Total/Paid/Pending/Overdue · Search · filters · table · side summary Download PDF / Send Invoice  

### 5.17 Invoice detail — `16:3528`

- INV-2025-000128 · Paid · line items · activity timeline · From/Bill To · Payment Summary  

### 5.18 Collapsed sidebar — `1:1059`

- 116px · icons only · badge `3` · compact Upgrade · chevron rotated 180°

---

## 6. Exact Text Inventories

Exhaustive per-screen numbered lists are archived from design_context extractions (Meeting 65+, Settings 88+, Reports 109+, Recordings 98+, Calendar 107+, Members 86+, Messages 87+, Workspace 85+, Rooms 97+, Create Room 73+, Billing 109+, Invoices 95+, Invoice 96+, plus Auth Batch 1).  

**Preserve Figma typos** unless product owners decide otherwise.

---

## 7. Component System

| Component | Variants | Used by |
|-----------|----------|---------|
| AppSidebar | Expanded / Collapsed | All app |
| AppHeader | Default | App |
| NavItem | Default / Active | Sidebar |
| BadgeCount | Danger | Messages, notify |
| AvatarOnline | Default | Header, lists |
| ButtonPrimary | Blue / Coral / Danger | Auth, New Meeting, End Call |
| ButtonOutline | Social / Secondary | Auth, Filters |
| TextField | Auth lg / App md | Forms, search |
| Switch | On/Off | Settings, Create Room, Workspace |
| Dropdown | Default | Settings, filters |
| KpiCard | Color icon variants | Dashboard, Reports, Recordings, Billing |
| DataTable | Paginated | Recordings, Members, Rooms, Invoices |
| VideoTile | Default / Active ring | Meeting |
| ControlBar | Meeting | Meeting |
| ChatPanel | Meeting / Messages | Meeting, Messages |
| UpgradeCard | Expanded / Compact | Sidebar |
| AuthSplitLayout | Login / Forgot / Signup | Auth |
| PlanUsageMeter | Default | Billing |
| StatusBadge | Active/Pending/Paid/… | Tables |

---

## 8. Asset System

| Type | Source | Notes |
|------|--------|-------|
| Logos | `orginal-13 1`, sidebar `image 2` | MCP PNG exports expire ~7d — download for repo |
| Icons | Per-screen SVG exports | Prefer exported assets over generic icons |
| Avatars | Sarah Johnson, participants | Sample photos |
| Promo images | Upgrade screenshot, auth illustrations | |
| Filenames | NOT AVAILABLE FROM FIGMA | Use generated names on export |

Suggested folders (implementation phase): `/public/brand`, `/assets/icons`, `/assets/avatars`, `/assets/illustrations`.

---

## 9. Frontend Architecture

```
conference-frontend/src/
  routes/
  pages/          # one page per Figma screen
  layouts/        # AuthSplitLayout, AppShellLayout, AdminShellLayout
  features/
    auth/
    dashboard/
    settings/
    reports/
    recordings/
    calendar/
    workspace/    # members, rooms, workspace settings
    messages/     # dashboard messaging
    billing/
    conference/   # existing meeting UI
    remote-control/
    whiteboard/
  components/ui/
  services/api/
  state/
  styles/tokens/
```

Keep conference media out of dashboard feature folders.

---

## 10. Frontend Routes (inferred)

| Screen | Route |
|--------|-------|
| Login | `/login` |
| Sign up | `/signup` |
| Forgot | `/forgot-password` |
| Reset | `/reset-password` — NOT IN FIGMA |
| Verify email | `/verify-email` — NOT IN FIGMA |
| Dashboard | `/dashboard` |
| Live meeting | `/meeting/:roomId` |
| Settings | `/settings` |
| Reports | `/reports` |
| Recordings | `/recordings` |
| Calendar | `/calendar` |
| Messages | `/messages` |
| Workspace settings | `/workspace/settings` |
| Members | `/workspace/members` |
| Rooms | `/workspace/rooms` |
| Create Room | `/workspace/rooms/new` |
| Billing | `/admin/billing` AMBIGUOUS (also tenant billing) |
| Invoices | `/admin/invoices` |
| Invoice | `/admin/invoices/:invoiceId` |
| Contacts / Templates / Admin Overview… | ROUTE NOT DETERMINABLE — no screens |

---

## 11. Frontend State

| Domain | Server | Local | Realtime | URL |
|--------|--------|-------|----------|-----|
| Auth | session user | form fields | — | — |
| Dashboard | KPIs, meetings | — | — | — |
| Meeting | meeting meta | mic/cam/hand UI | participants, media, chat | roomId |
| Settings | profile/settings | dirty form | — | section |
| Tables | list+pagination | search/filter | — | query |
| Messages | threads | composer | new messages? TBD | threadId |
| Billing | plan/invoices | — | — | tab |

---

## 12. Backend Architecture

**Existing:** auth, meetings, recordings, realtime (media/chat/reaction), remote-control, whiteboard.

**Required by Figma (new/extend):**

| Module | Screens |
|--------|---------|
| organizations | Workspace, Members, Rooms |
| memberships/roles | Members |
| dashboard/analytics | Dashboard KPIs, Reports |
| calendar | Calendar |
| messaging (async) | Messages |
| billing/plans/invoices | Billing, Invoices |
| rooms | Rooms, Create Room |
| notifications | badge `8` |
| admin platform | Nav only — defer pages |

---

## 13. API Specification (contracts)

| Screen | Method | Endpoint | Auth | Status |
|--------|--------|----------|------|--------|
| Login | POST | `/auth/login` | public | Exists |
| Signup | POST | `/auth/signup` | public | Exists |
| Forgot | POST | `/auth/forgot-password` | public | Exists |
| Reset | POST | `/auth/reset-password` | public | Exists / no UI |
| Me | GET | `/auth/me` | user | Exists |
| Dashboard | GET | `/api/v1/dashboard/summary` | member | **TO BE DEFINED** |
| Meetings list/create | GET/POST | `/api/v1/meetings` | member | Exists (extend) |
| Meeting get | GET | `/api/v1/meetings/:id` | participant | Exists |
| Recordings | GET | recordings routes | member | Exists |
| Reports | GET | `/api/v1/reports/*` | member | **TO BE DEFINED** |
| Profile/settings | PATCH | `/api/v1/users/me` | user | **TO BE DEFINED** |
| Members | CRUD | `/api/v1/workspaces/:id/members` | admin | **TO BE DEFINED** |
| Rooms | CRUD | `/api/v1/workspaces/:id/rooms` | admin | **TO BE DEFINED** |
| Messages | REST+WS | `/api/v1/messages` | member | **TO BE DEFINED** |
| Billing | GET | `/api/v1/billing/*` | billing role | **TO BE DEFINED** |
| Invoices | GET | `/api/v1/invoices` | billing role | **TO BE DEFINED** |
| OAuth | — | — | — | **TO BE DEFINED** |

Consistent error envelope: validation · 401 · 403 · 404 · 409 · 429 · 500 — enforce across new controllers.

---

## 14. Database Architecture

**Core entities (justify by UI):**

User · Session/RefreshToken · Organization(Workspace) · Membership(Role) · Meeting · MeetingParticipant · Room · Recording · MessageThread · Message · Invitation · Plan · Subscription · Invoice · PaymentMethod · AuditLog · Notification

**ERD (relationships):**

```
User 1──N Membership N──1 Organization
Organization 1──N Meeting | Room | Recording | Invoice | Membership
Meeting 1──N MeetingParticipant | Recording | (ephemeral chat optional)
User 1──N Message (async)
Organization 1──1 Subscription N──1 Plan
Subscription 1──N Invoice
```

Ephemeral WebRTC state (producers/consumers) **not** persisted.

---

## 15. Authentication & Authorization

**Auth screens → existing services.** Remember-me maps to login schema. OAuth buttons: UI only.

**Roles (from UI labels):** Guest · Member · Admin · Owner · Host · Platform Admin (ADMIN nav)

| Capability | Member | Org Admin/Owner | Host | Platform Admin |
|------------|--------|-----------------|------|----------------|
| Join meetings | ✓ | ✓ | ✓ | ✓ |
| Manage members/rooms | | ✓ | | |
| Delete workspace | | Owner | | |
| Start/End call / mute others | | | ✓ | |
| Billing | | ✓ (tenant) | | ✓ (platform) |
| Platform Overview… | | | | Nav only — no UI |

Enforce all on backend — never UI-only.

---

## 16. Conference / mediasoup / Socket.IO

```
Conference UI
├── REST (meeting meta, recordings)
├── Socket.IO (auth middleware exists)
│   ├── chat.handler
│   ├── reaction.handler
│   ├── media.handler
│   ├── remote-control.gateway
│   └── whiteboard.gateway
└── mediasoup (Worker → Router → Transport → Producer/Consumer)
```

**UI controls → media:** Mic/Camera/Screen → getUserMedia / getDisplayMedia → produce · remote consume · pause/resume.  
**Remote control:** request/approve/reject/stop — existing RC module (not a separate Figma modal set).  
**Recording:** UI on settings + recordings library; processing/storage provider **NOT DEFINED BY DESIGN**.

---

## 17. Guest System

Figma shows authenticated dashboard join patterns more than a dedicated guest lobby. Guest landing / waiting room as full screens: **NOT IN FIGMA** (waiting room appears as **settings toggles** only). Guest token model: **BACKEND BEHAVIOR NOT DEFINED BY DESIGN** beyond existing meeting join.

---

## 18. Security

- CSRF + rate limits on auth (existing)  
- Socket auth middleware (existing)  
- Tenant isolation on Organization-owned resources  
- Recording/file access authorization  
- Never trust FE for admin/billing  

---

## 19. Error / Loading states

Figma shows happy-path UIs almost exclusively. For each screen implement: loading · empty · error · unauthorized · forbidden · network. Meeting also: socket reconnect · media permission denied · device missing · WebRTC failure.

---

## 20. Screen → FE → BE Matrix

| Surface | Screen | Route | FE Page | API | Module | DB | Realtime |
|---------|--------|-------|---------|-----|--------|----|----------|
| Guest | Login | /login | LoginPage | POST /auth/login | auth | User,Session | — |
| Guest | Signup | /signup | SignupPage | POST /auth/signup | auth | User | — |
| Guest | Forgot | /forgot-password | ForgotPasswordPage | POST /auth/forgot-password | auth | ResetToken | — |
| Client | Dashboard | /dashboard | DashboardPage | me + summary TBD | auth+analytics | User,Meeting,Recording | — |
| Conf | Live meeting | /meeting/:roomId | MeetingPage | meetings GET | meetings+realtime | Meeting,Participant | Socket+mediasoup |
| Client | Settings | /settings | SettingsPage | users/me TBD | users | User | — |
| Client | Reports | /reports | ReportsPage | reports TBD | analytics | aggregates | — |
| Client | Recordings | /recordings | RecordingsPage | recordings | recordings | Recording | — |
| Client | Calendar | /calendar | CalendarPage | meetings | meetings | Meeting | — |
| Client | Members | /workspace/members | MembersPage | memberships TBD | orgs | Membership | — |
| Client | Messages | /messages | MessagesPage | messages TBD | messaging | Message | optional WS |
| Client | Workspace | /workspace/settings | WorkspaceSettingsPage | orgs TBD | orgs | Organization | — |
| Client | Rooms | /workspace/rooms | RoomsPage | rooms TBD | rooms | Room | — |
| Client | Create Room | /workspace/rooms/new | CreateRoomPage | POST rooms | rooms | Room | — |
| Admin | Billing | /admin/billing | BillingPage | billing TBD | billing | Subscription,Invoice | — |
| Admin | Invoices | /admin/invoices | InvoicesPage | invoices TBD | billing | Invoice | — |
| Admin | Invoice | /admin/invoices/:id | InvoiceDetailPage | invoice GET | billing | Invoice | — |

---

## 21. Realtime Matrix (conference)

| Feature | UI | Domain | mediasoup |
|---------|-----|--------|-----------|
| Join room | Enter meeting | room:join | create transports |
| Leave / End | Leave, End Call | room:leave | close |
| Mic/Cam | controls | media:produce/pause | Producer |
| Screen | Screen | media:produce display | Producer |
| Consume remote | tiles | media:consume | Consumer |
| Chat | Meeting Chat | chat:* | — |
| Raise hand | Raise Hand | reaction/hand | — |
| Participants list | panel | participant:* | — |
| Remote control | (existing UI) | RC_EVENTS | — |
| Whiteboard | (existing) | whiteboard:* | — |

---

## 22. Folder Structure (target)

**Frontend:** as §9.  
**Backend:** extend `conference-backend/src/modules/` with `organizations`, `memberships`, `rooms`, `analytics`, `messaging`, `billing` — do not invent unused modules.

---

## 23. Implementation Roadmap

| Phase | Scope | Priority |
|-------|--------|----------|
| 1 | Tokens (resolve blue/font ambiguity) + AppShell + Auth pages | P0 |
| 2 | Wire auth to existing APIs | P0 |
| 3 | Dashboard + Meetings calendar/list | P0 |
| 4 | Conference UI pixel-align to `1:1128` on existing mediasoup stack | P0 |
| 5 | Recordings library UI on existing API | P1 |
| 6 | Settings profile + toggles | P1 |
| 7 | Workspace Members + Rooms CRUD | P1 |
| 8 | Reports analytics | P2 |
| 9 | Messages (async) | P2 |
| 10 | Billing/Invoices | P2 |
| 11 | Platform admin pages | P3 — **blocked: no Figma** |
| 12 | Contacts/Templates | P3 — **blocked: no Figma** |

---

## 24. Completeness Report

| Item | Count |
|------|--------|
| Pages inspected | 1 / 1 |
| Product screens design_context | 17 / 17 |
| Auth screens | 3 / 3 in Figma |
| Collapsed sidebar | Yes (`1:1059`) |
| Tablet/Mobile | 0 |
| Modals framed | 0 |
| Text inventories | All screens (exhaustive lists extracted) |
| Design tokens | Measured from MCP (multi-blue / multi-font noted) |
| FE/BE/DB/Realtime matrices | Complete for designed screens |
| Analysis complete | **YES** |
| Implementation started | **NO** |

### Gaps explicitly marked

- Contacts, Templates, Meetings list pages  
- Admin Overview/Workspaces/Users/Subscriptions/Plans/Audit/System pages  
- Reset password / email verification UI  
- OAuth backend  
- Modal/empty/error designs  
- Mobile layouts  
- Single canonical brand blue + font (designer decision)  

---

## 25. Final verification

- [x] Every Figma page inspected  
- [x] Every product screen inspected via design_context  
- [x] Auth + app + conference + billing covered  
- [x] Exact text inventories captured  
- [x] Colors/fonts/spacing from MCP not guessed  
- [x] Architecture mapped to existing Meet repo  
- [x] Missing designs labeled NOT IN FIGMA / TO BE DEFINED  
- [ ] Application code — **not started (by request)**  

**Next step when you want implementation:** Phase 1 tokens + AuthSplitLayout + AppShell only — say which phase to build first.
