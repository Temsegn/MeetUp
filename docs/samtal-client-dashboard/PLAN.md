# Samtal Client Dashboard — Implementation Plan (from Figma)

**Figma:** [Samtal-meet-UI](https://www.figma.com/design/n6GHl4skJUaAKOGkkGeM4F/Samtal-meet-UI?node-id=0-1)  
**Scope:** Client dashboard + conference shell UI only (not admin-only backend).  
**Status:** Plan only — no implementation in this step.  
**File key:** `n6GHl4skJUaAKOGkkGeM4F` · **Page:** `0:1`

Figma has **no published variable library** (`get_variable_defs` returned empty). Tokens below are extracted from frames, screenshots, and layout measurements.

---

## 1. Screens found in Figma (complete list)

| # | Frame name | Node ID | Route (proposed) | Notes |
|---|------------|---------|------------------|-------|
| 1 | Samtal Dashboard — Meetings, Recordings & Insights | `1:39` | `/app` or `/app/dashboard` | Home KPIs + lists + activity |
| 2 | Container (live meeting in shell) | `1:1128` | `/app/meeting/:roomId` | Video grid + controls inside dashboard chrome |
| 3 | Settings — Samtal | `1:1795` | `/app/settings` | Nested settings nav + Profile panel |
| 4 | Reports — Samtal Meeting Analytics | `1:2795` | `/app/reports` | Charts, filters, tables |
| 5 | Recordings \| Samtal Meeting Workspace | `1:3611` | `/app/recordings` | Library grid + filters |
| 6 | Calendar — Samtal Meeting Workspace | `1:4226` | `/app/calendar` | Month grid + upcoming list |
| 7 | Members · Samtal Workspace | `1:5120` | `/app/workspace/members` | Members table (under Workspace Settings) |
| 8 | Messages | `1:5916` | `/app/messages` | Conversation list + thread |
| 9 | Workspace Settings — Samtal | `1:6785` | `/app/workspace` | Workspace profile, members snippet, security |
| 10 | Billing — Samtal Admin Console | `1:7603` | `/app/billing` | Plan, usage, invoices, payment |

### Sidebar nav items (every screen)

1. Dashboard  
2. Meetings  
3. Calendar  
4. Contacts  
5. Messages (badge count e.g. `3`)  
6. Recordings  
7. Templates  
8. Reports  
9. Settings  

Plus: **Samtal logo**, **collapse** control, **Upgrade to Pro** promo card (expanded sidebar).

### Design gaps (in nav, no dedicated page frame)

| Nav item | Status |
|----------|--------|
| **Contacts** | Listed in sidebar; **no full Contacts page frame** found. Members page exists under Workspace. Decide: build Contacts from Members patterns, or ask designer for frame. |
| **Templates** | Listed in sidebar; **no Templates page frame** found. Placeholder route until design arrives. |
| **Meetings list** | Nav “Meetings” on frame `1:1128` is actually **in-call UI**, not a meetings list. Need a Meetings list page (or reuse Dashboard “Upcoming”) — confirm with design. |

### Shared chrome (all pages)

- **Expanded sidebar** ~`268px` · **Collapsed sidebar** ~`116px` (icon-only variants exist)  
- **Top header:** page title + subtitle, notification bell (badge), help, primary CTA (`New Meeting` split button), user avatar + chevron  
- **Canvas width** typically `1550–1920px` desktop  
- Light theme throughout (white / soft gray)

---

## 2. Feature inventory by screen

### 2.1 Dashboard (`1:39`)

**Features**
- Welcome header (“Welcome back, {name}”)
- KPI cards (4): Upcoming Meetings, Completed Meetings, Total Hours, Recordings (icon + value + sparkline + “View all”)
- Upcoming Meetings list (avatar stack, title, time, Join)
- Today’s Schedule timeline (color-coded events, Join)
- Recent Activity feed (avatar, action text, relative date, meeting title)
- Quick Actions grid: Schedule Meeting, Join with ID, Share Screen, Upload Recording
- Header: notifications, help, New Meeting, profile menu
- Sidebar + Upgrade to Pro

**Reusable components:** `KpiCard`, `MeetingListItem`, `ScheduleEventItem`, `ActivityItem`, `QuickActionButton`, `AppHeader`, `AppSidebar`, `UpgradeCard`

---

### 2.2 Live meeting (in dashboard shell) (`1:1128`)

**Features**
- Meeting title + time range + elapsed timer
- Notifications / help / Leave / avatar
- 2×2 (or N) participant video tiles with name overlays + mute indicators
- Control bar: Mic, Camera, Raise Hand, Screen, Participants, Chat, More
- End Call (destructive)
- Meeting Agenda checklist
- Participants panel (search, list, invite)
- Chat / notes panel (as designed in lower section)

**Maps to existing:** `MeetingPage`, `ParticipantTile`, `MeetingControls`, chat/reactions — **restyle** to Samtal shell, not rewrite mediasoup.

---

### 2.3 Settings (`1:1795`)

**Left settings nav**
- Profile (designed in detail)
- Account
- Notifications
- Audio & Video
- Calendar & Sync
- Recording
- Virtual Background
- Security
- Language
- Appearance
- Integrations
- Billing & Plan → can deep-link to Billing page

**Profile panel (designed)**
- Avatar + camera edit + Save Changes  
- Fields: First name, Last name, Display name, Job title, Email, Phone, Bio  
- Cancel / Save Changes  

**Other settings sections:** present as nav items; content panels may be incomplete in Figma — implement Profile first, stub others with same shell.

---

### 2.4 Reports (`1:2795`)

**Features**
- Date range picker, Filters
- KPI strip: Total Meetings, Total Hours, Avg Duration, Participants, Recordings (+ deltas)
- Meeting Activity (line/area chart)
- Participation Rate (donut + legend)
- Engagement Score (bar chart)
- Meetings by Type (horizontal bars)
- Meetings by Time of Day (histogram)
- Top Collaborators (avatar list + meeting counts)
- Recent Meetings table (name, date, duration, participants, recording badge, actions)

---

### 2.5 Recordings (`1:3611`)

**Features**
- Search recordings, Filters, View toggle (grid/list)
- Storage used progress (“X GB of Y GB”)
- Recording cards: thumbnail, duration, title, date, size, participants, Play / Download / Share / More
- Pagination

---

### 2.6 Calendar (`1:4226`)

**Features**
- Month navigation, Today, Filters, View switcher
- Month grid with multi-day / timed event chips (color by type)
- Selected day “Upcoming Meetings” list + Join
- Empty state CTA: Schedule a Meeting

---

### 2.7 Messages (`1:5916`)

**Features**
- Search messages
- Conversation list (avatar, name, preview, time, unread badge)
- Thread header (name, status Online/Away, call / video / more)
- Message bubbles (sent/received), timestamps, Today divider
- Composer (attach, emoji, text, send)
- Right profile card: avatar, role, email, phone, timezone, Shared Files, Shared Meetings

---

### 2.8 Workspace Settings (`1:6785`)

**Features**
- Breadcrumb Workspace / Settings  
- Secondary nav: Profile, Account, …, **Workspace**, Members, Billing  
- Workspace Profile: logo, name, URL slug, industry, size, description, Save  
- Members preview table + Invite + View All  
- Security: 2FA require, domain restrict, session timeout  

---

### 2.9 Members (`1:5120`)

**Features**
- Members (count), search, role filter, Invite Members  
- Table: Member, Role, Status, Joined On, Last Active, Actions  
- Pagination  

---

### 2.10 Billing (`1:7603`)

**Features**
- Current Plan card (Pro, price, features, Change Plan / Cancel)  
- Usage meters (meetings, storage, members)  
- Payment Method (+ Add)  
- Billing History table (invoice download)  
- Available Plans comparison (Free / Pro / Enterprise)  

---

## 3. Design tokens config (clear)

Put these in `conference-frontend/src/styles/tokens/` (CSS variables + TS mirror). No Figma variables existed — treat this as the **source of truth** until design publishes a library.

### 3.1 Color

```css
:root {
  /* Brand — teal primary from Samtal UI */
  --color-brand-50:  #f0fdfa;
  --color-brand-100: #ccfbf1;
  --color-brand-200: #99f6e4;
  --color-brand-300: #5eead4;
  --color-brand-400: #2dd4bf;
  --color-brand-500: #14b8a6;   /* primary actions, active nav */
  --color-brand-600: #0d9488;
  --color-brand-700: #0f766e;

  /* Neutrals */
  --color-bg-app:       #f5f7fa;   /* page background */
  --color-bg-surface:   #ffffff;   /* cards, sidebar */
  --color-bg-muted:     #f1f5f9;
  --color-border:       #e2e8f0;
  --color-border-strong:#cbd5e1;

  --color-text-primary:   #0f172a;
  --color-text-secondary: #64748b;
  --color-text-muted:     #94a3b8;
  --color-text-inverse:   #ffffff;

  /* Semantic */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger:  #ef4444;     /* End Call, destructive */
  --color-info:    #3b82f6;

  /* KPI / chart accents (from Dashboard & Reports) */
  --color-accent-blue:   #3b82f6;
  --color-accent-green:  #22c55e;
  --color-accent-purple: #8b5cf6;
  --color-accent-pink:   #ec4899;
  --color-accent-orange: #f97316;
  --color-accent-cyan:   #06b6d4;

  /* Meeting event chip colors (Calendar) */
  --color-event-teal:   #14b8a6;
  --color-event-blue:   #3b82f6;
  --color-event-purple: #8b5cf6;
  --color-event-pink:   #ec4899;
  --color-event-orange: #f97316;
}
```

### 3.2 Typography

Visual system is a clean **sans UI** (Figma export did not embed a named family). Recommend:

| Token | Value | Use |
|-------|-------|-----|
| `--font-sans` | `"Inter", "Segoe UI", system-ui, sans-serif` | All UI |
| `--font-mono` | `"JetBrains Mono", ui-monospace, monospace` | IDs, times optional |

| Token | Size | Weight | Line | Use |
|-------|------|--------|------|-----|
| `--text-xs` | 12px | 400/500 | 16px | Meta, badges, captions |
| `--text-sm` | 13–14px | 400/500 | 20px | Body secondary, table cells |
| `--text-md` | 15–16px | 400/500 | 24px | Body, nav items (~23px in Figma) |
| `--text-lg` | 18px | 600 | 28px | Section titles (H2) |
| `--text-xl` | 22–24px | 600/700 | 32px | Page titles |
| `--text-2xl` | 28–32px | 700 | 40px | KPI big numbers / Settings H1 (~40px) |
| `--text-3xl` | 36–40px | 700 | 44px | Large KPI |

**Weights:** Regular 400 · Medium 500 · Semibold 600 · Bold 700

Load Inter via `@fontsource/inter` or Google Fonts once at app root.

### 3.3 Spacing (4px base)

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;   /* sidebar padding, common gutters */
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
}
```

**Layout from Figma**
- Sidebar expanded width: **268px** (`--layout-sidebar-expanded`)
- Sidebar collapsed width: **116px** (`--layout-sidebar-collapsed`)
- Main content padding: **~24–28px**
- Card padding: **16–24px**
- Nav item height: **~47px**, icon **22px**, gap icon→label **~12px**
- Header control height: **~32–48px**
- Card gap in grids: **16–20px**

### 3.4 Radius & elevation

```css
:root {
  --radius-sm:  8px;
  --radius-md:  12px;   /* cards, inputs */
  --radius-lg:  16px;   /* large panels */
  --radius-xl:  20px;
  --radius-full: 9999px; /* pills, avatars */

  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 8px 24px rgba(15, 23, 42, 0.10);
}
```

### 3.5 Motion

```css
:root {
  --motion-fast: 120ms;
  --motion-base: 200ms;
  --motion-slow: 320ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

Sidebar collapse, page fade, chart draw — keep subtle.

### 3.6 TS mirror (example)

```ts
// src/styles/tokens/index.ts
export const samtalTokens = {
  color: {
    brand: { 500: '#14b8a6', 600: '#0d9488' },
    bg: { app: '#f5f7fa', surface: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#64748b' },
    danger: '#ef4444',
  },
  layout: {
    sidebarExpanded: 268,
    sidebarCollapsed: 116,
  },
  font: {
    sans: 'Inter, Segoe UI, system-ui, sans-serif',
  },
} as const;
```

Wire into Tailwind via `theme.extend` mapping to CSS variables.

---

## 4. Professional folder structure (modular)

Build **client dashboard** as a feature area beside existing meeting/media code. Do **not** dump screens into flat `pages/`.

```
conference-frontend/src/
├── app/                          # routes, providers, shell
│   ├── routes/
│   │   └── AppRoutes.tsx
│   └── providers/
│
├── styles/
│   ├── tokens/
│   │   ├── colors.css
│   │   ├── typography.css
│   │   ├── spacing.css
│   │   ├── radii.css
│   │   └── index.css             # imports all tokens
│   └── tailwind.samtal.css       # @theme / CSS var bridge
│
├── shared/                       # design-system primitives (no business logic)
│   ├── components/
│   │   ├── Button/
│   │   ├── IconButton/
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Card/
│   │   ├── Table/
│   │   ├── Tabs/
│   │   ├── Modal/
│   │   ├── Dropdown/
│   │   ├── SearchField/
│   │   ├── ProgressBar/
│   │   ├── EmptyState/
│   │   ├── Pagination/
│   │   └── Skeleton/
│   ├── icons/                    # Samtal icon set (from Figma exports)
│   └── hooks/
│
├── layouts/
│   ├── DashboardLayout/
│   │   ├── DashboardLayout.tsx   # sidebar + header + outlet
│   │   ├── AppSidebar.tsx
│   │   ├── AppHeader.tsx
│   │   ├── UpgradeProCard.tsx
│   │   └── UserMenu.tsx
│   └── MeetingShellLayout/       # optional: meeting inside shell (1:1128)
│
├── features/
│   ├── dashboard/
│   │   ├── pages/DashboardPage.tsx
│   │   ├── components/
│   │   │   ├── KpiCard.tsx
│   │   │   ├── UpcomingMeetingsList.tsx
│   │   │   ├── TodaySchedule.tsx
│   │   │   ├── RecentActivity.tsx
│   │   │   └── QuickActions.tsx
│   │   ├── hooks/
│   │   └── api/
│   │
│   ├── meetings/                 # list + schedule (when designed)
│   │   ├── pages/
│   │   └── components/
│   │
│   ├── calendar/
│   ├── contacts/                 # stub until Figma page exists
│   ├── messages/
│   ├── recordings/
│   ├── templates/                # stub
│   ├── reports/
│   ├── settings/
│   │   ├── pages/SettingsPage.tsx
│   │   ├── components/SettingsNav.tsx
│   │   └── sections/
│   │       ├── ProfileSection.tsx
│   │       ├── AccountSection.tsx
│   │       └── ...
│   ├── workspace/
│   │   ├── pages/WorkspaceSettingsPage.tsx
│   │   └── pages/MembersPage.tsx
│   ├── billing/
│   │
│   ├── room/                     # EXISTING in-call (restyle controls to match)
│   ├── meeting/
│   ├── media/
│   ├── whiteboard/
│   ├── remote-control/
│   └── collaboration/
│
├── pages/                        # thin route wrappers only (optional)
│   └── auth/                     # keep existing auth pages
│
└── services/
```

**Rules**
- One feature folder = pages + components + hooks + api types  
- `shared/components` = dumb UI only  
- `layouts` = chrome only  
- Existing `features/room` keeps WebRTC; dashboard only hosts / restyles it  

---

## 5. Routing map

```
/app                      → Dashboard
/app/meetings             → Meetings list (TBD design) | or redirect
/app/meeting/:roomId      → Live meeting (shell or fullscreen)
/app/calendar             → Calendar
/app/contacts             → Contacts (stub / TBD)
/app/messages             → Messages
/app/messages/:threadId   → Messages thread
/app/recordings           → Recordings
/app/templates            → Templates (stub)
/app/reports              → Reports
/app/settings/*           → Settings sections
/app/workspace            → Workspace settings
/app/workspace/members    → Members
/app/billing              → Billing
```

Guard with existing auth (`AuthContext`).

---

## 6. Component checklist (build order)

### Phase A — Foundations
1. Tokens CSS + Tailwind bridge + Inter font  
2. `Button`, `IconButton`, `Input`, `Avatar`, `Badge`, `Card`, `SearchField`  
3. `DashboardLayout` + `AppSidebar` (expanded/collapsed) + `AppHeader` + `UpgradeProCard`  

### Phase B — Core pages
4. Dashboard page + KPI / lists / activity / quick actions  
5. Calendar  
6. Recordings  
7. Messages  
8. Settings Profile (+ settings shell nav)  

### Phase C — Workspace & analytics
9. Workspace Settings  
10. Members  
11. Billing  
12. Reports (charts — use Recharts/Chart.js)  

### Phase D — Conference alignment
13. Restyle live meeting chrome (`1:1128`) to Samtal tokens  
14. Wire New Meeting / Join / Leave to existing meeting APIs  

### Phase E — Gaps
15. Contacts page (need Figma or invent from Members)  
16. Templates page (need Figma)  
17. Dedicated Meetings list page if required  

---

## 7. Shared UI atoms → where they appear

| Component | Used on |
|-----------|---------|
| AppSidebar / NavItem / Badge | All |
| AppHeader / NewMeetingButton / NotificationBell / UserMenu | All |
| KpiCard | Dashboard, Reports |
| MeetingRow + JoinButton | Dashboard, Calendar, Reports |
| RecordingCard | Recordings, Dashboard |
| DataTable | Members, Billing, Reports |
| SearchField + FiltersButton | Recordings, Messages, Members, Reports, Calendar |
| ChatBubble / Composer | Messages (+ in-meeting chat) |
| PlanCard / UsageMeter | Billing, sidebar Upgrade |
| SettingsNav + FormField | Settings, Workspace |
| CalendarMonthGrid / EventChip | Calendar |
| VideoTile / ControlBar | Live meeting |

---

## 8. Mapping to current codebase

| Figma | Existing code | Action |
|-------|---------------|--------|
| Live meeting `1:1128` | `features/room/MeetingPage.tsx` | Restyle; optional shell layout |
| Controls | `MeetingControls` | Match Mic/Camera/… icons & teal accents |
| Chat | `useChat` / sidebar | Restyle to Messages patterns |
| Auth pages | `pages/AuthPage.tsx` | Out of this Figma file — keep separate |
| Whiteboard / Remote control | existing features | Keep; not in this dashboard Figma |

---

## 9. Open questions for you / designer

1. Confirm **Contacts** and **Templates** pages — missing frames.  
2. Is **Meetings** nav meant to open a **list** or the **in-call** layout (`1:1128`)?  
3. Exact **font family** name from Figma (if not Inter)?  
4. Should **live meeting** stay inside dashboard sidebar or go fullscreen?  
5. Brand teal hex — approve `#14b8a6` / `#0d9488` or provide brand guide?

---

## 10. Next step after you approve this plan

1. Add `styles/tokens/*` + Tailwind theme.  
2. Build `DashboardLayout` + Sidebar/Header.  
3. Implement Dashboard page pixel-close to `1:39`.  
4. Proceed screen-by-screen (Calendar → Recordings → Messages → Settings → …).  

Reply with approval (and answers to §9) to start implementation.
