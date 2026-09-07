# Samtal Meet UI — Complete Feature Inventory (Figma)

**File:** [Samtal-meet-UI](https://www.figma.com/design/n6GHl4skJUaAKOGkkGeM4F/Samtal-meet-UI?node-id=0-1)  
**Page:** `0:1` · **File key:** `n6GHl4skJUaAKOGkkGeM4F`  
**Purpose:** One clean reference of **every sidebar item** (client + admin), what each screen contains, and design status.

---

## How to read this doc

| Tag | Meaning |
|-----|---------|
| **Designed** | Full page frame exists in Figma |
| **Partial** | Nav/label exists; page incomplete or wrong context |
| **Missing** | In sidebar only — no page frame |
| **Spec** | Not in Figma; defined for production in ADMIN_PLAN |

Related docs:

- Client build plan → [`PLAN.md`](./PLAN.md)  
- Admin end-to-end spec → [`ADMIN_PLAN.md`](./ADMIN_PLAN.md)  

---

## 1. Two audiences, one product shell

```
┌─────────────────────────────────────────────────────────┐
│  TOP HEADER                                             │
│  Title · Subtitle · Bell · Help · New Meeting · Avatar  │
├──────────────┬──────────────────────────────────────────┤
│  SIDEBAR     │  MAIN CONTENT                            │
│              │                                          │
│  CLIENT NAV  │  Page for selected nav item              │
│  · · ·       │                                          │
│  ─────────   │                                          │
│  ADMIN *     │  * Only if user is platform Admin        │
│  · · ·       │                                          │
│  Upgrade Pro │                                          │
└──────────────┴──────────────────────────────────────────┘
```

| Who | Sees |
|-----|------|
| **Client** (member / workspace owner) | Client sidebar + their pages |
| **Admin** (platform admin) | Client sidebar **+** ADMIN block |

**Sidebar sizes (Figma):** expanded **268px** · collapsed **116px** (icon-only).

---

## 2. CLIENT SIDEBAR — every item

| # | Nav item | Badge | Figma page | Node | Status |
|---|----------|-------|------------|------|--------|
| 1 | Dashboard | — | Samtal Dashboard — Meetings, Recordings & Insights | `1:39` | **Designed** |
| 2 | Meetings | — | Live meeting in shell (not a list) | `1:1128` | **Partial** — in-call UI |
| 3 | Calendar | — | Calendar — Samtal Meeting Workspace | `1:4226` | **Designed** |
| 4 | Contacts | — | — | — | **Missing** |
| 5 | Messages | `3` | Messages | `1:5916` | **Designed** |
| 6 | Recordings | — | Recordings \| Samtal Meeting Workspace | `1:3611` | **Designed** |
| 7 | Templates | — | — | — | **Missing** |
| 8 | Reports | — | Reports — Samtal Meeting Analytics | `1:2795` | **Designed** |
| 9 | Settings | — | Settings — Samtal | `1:1795` | **Designed** (Profile detailed) |

**Also on client sidebar (not route items):**

| Element | Detail |
|---------|--------|
| Logo | Samtal wordmark + collapse arrow |
| Upgrade to Pro | Promo image, title, short copy, CTA button |

**Related pages (opened from Settings / Workspace, not top-level client nav):**

| Page | Node | Status |
|------|------|--------|
| Workspace Settings | `1:6785` | **Designed** |
| Members | `1:5120` | **Designed** |
| Billing (workspace) | `1:7603` | **Designed** (labeled “Admin Console” but content = tenant billing) |

---

## 3. CLIENT FEATURES — detail by sidebar item

### 3.1 Dashboard · `1:39` · Designed

**Header:** “Dashboard” · “Welcome back, {name}…” · notifications · help · New Meeting · avatar  

| Block | What’s on screen |
|-------|------------------|
| KPI cards (4) | Upcoming Meetings · Completed Meetings · Total Hours · Recordings — value, sparkline, “View all” |
| Upcoming Meetings | List: avatars, title, time, **Join** |
| Today’s Schedule | Timeline events (color chips), time range, **Join** |
| Recent Activity | Avatar, action text, relative date, meeting title |
| Quick Actions | Schedule Meeting · Join with ID · Share Screen · Upload Recording |

---

### 3.2 Meetings · `1:1128` · Partial (live call, not list)

Figma shows **in-meeting UI** when Meetings is active — not a meetings catalog.

| Block | What’s on screen |
|-------|------------------|
| Meeting header | Title (e.g. Product Team Weekly Sync) · time range · elapsed timer · Leave · notifications · avatar |
| Video grid | Participant tiles with name overlays, mute indicators |
| Control bar | Mic · Camera · Raise Hand · Screen · Participants · Chat · More · **End Call** |
| Meeting Agenda | Checklist items |
| Participants | Search · list · invite |
| Side panels | Chat / notes style panels |

**Gap:** Dedicated **Meetings list** page (upcoming / past / scheduled) is not a separate frame.

---

### 3.3 Calendar · `1:4226` · Designed

| Block | What’s on screen |
|-------|------------------|
| Header | Calendar title · subtitle · New Meeting · notifications · avatar |
| Toolbar | Month prev/next · Today · Filters · View switcher |
| Month grid | Day cells · multi-day / timed event chips (color by type) |
| Upcoming list | Selected-day meetings · **Join** |
| Empty | “No meetings” · **Schedule a Meeting** CTA |

---

### 3.4 Contacts · Missing

In sidebar only. **No Contacts page frame.**

**Expected for production (to design/build):** contact cards or table · search · Add Contact · detail (email, phone, company) · invite to meeting · message.

*(Members page under Workspace is separate — workspace seats, not personal contacts.)*

---

### 3.5 Messages · `1:5916` · Designed

| Block | What’s on screen |
|-------|------------------|
| Left rail | Search messages · conversation list (avatar, name, preview, time, unread badge) |
| Thread | Header (name, Online/Away) · call / video / more · bubbles · Today divider · composer (attach, emoji, send) |
| Right card | Profile: avatar, role, email, phone, timezone · Shared Files · Shared Meetings |

---

### 3.6 Recordings · `1:3611` · Designed

| Block | What’s on screen |
|-------|------------------|
| Header | Recordings · search · Filters · grid/list toggle · New Meeting |
| Storage | Progress “X GB of Y GB used” |
| Cards | Thumbnail · duration · title · date · size · participants · Play · Download · Share · More |
| Footer | Pagination |

---

### 3.7 Templates · Missing

In sidebar only. **No Templates page frame.**

**Expected:** template gallery · create/edit · categories · use template to schedule meeting.

---

### 3.8 Reports · `1:2795` · Designed

| Block | What’s on screen |
|-------|------------------|
| Toolbar | Date range · Filters · New Meeting |
| KPI strip | Total Meetings · Total Hours · Avg Duration · Participants · Recordings (+ deltas) |
| Charts | Meeting Activity · Participation Rate (donut) · Engagement Score · Meetings by Type · Meetings by Time of Day |
| Top Collaborators | Avatar list + meeting counts |
| Table | Recent Meetings — name, date, duration, participants, recording badge, actions |

---

### 3.9 Settings · `1:1795` · Designed (shell + Profile)

**Settings left nav (all listed in Figma):**

| Settings section | Content in Figma |
|------------------|------------------|
| Profile | **Fully designed** — avatar, camera edit, name fields, job title, email, phone, bio, Save/Cancel |
| Account | Nav only |
| Notifications | Nav (+ some toggles appear in frame) |
| Audio & Video | Nav only |
| Calendar & Sync | Nav only |
| Recording | Nav only |
| Virtual Background | Nav only |
| Security | Nav (+ 2FA style content present) |
| Language | Nav only |
| Appearance | Nav only |
| Integrations | Nav only |
| Billing & Plan | Nav → links toward Billing page |

---

### 3.10 Workspace Settings · `1:6785` · Designed

| Block | What’s on screen |
|-------|------------------|
| Breadcrumb | Workspace / Settings |
| Secondary nav | Profile · Account · … · **Workspace** · Members · Billing |
| Workspace Profile | Logo · name · URL slug · industry · size · description · Save |
| Members preview | Table snippet · Invite · View All |
| Security | Require 2FA · domain restrict · session timeout |
| Danger | Delete Workspace (destructive) |

---

### 3.11 Members · `1:5120` · Designed

| Block | What’s on screen |
|-------|------------------|
| Header | Members (count) · search · role filter · **Invite Members** |
| Table | Member · Role · Status · Joined On · Last Active · Actions |
| Footer | Pagination |

---

### 3.12 Billing (workspace) · `1:7603` · Designed

| Block | What’s on screen |
|-------|------------------|
| KPI cards | Current Plan · Next Billing Date · Amount Due · Payment Method |
| Tabs | Overview · Invoices · Payment Methods · Transactions · Credits & Discounts |
| Overview | Billing cycle, plan, status, workspace seats, next invoice, payment method |
| Usage | Meetings / Storage / Members meters vs limits |
| Payment methods | Card list · Add Payment Method · Set default · Remove |
| Recent invoices | #, date, amount, status, download |
| Available plans | Free · Pro · Enterprise comparison · Upgrade CTAs |

*(This frame also shows the ADMIN sidebar — see §4.)*

---

## 4. ADMIN SIDEBAR — every item

**Figma node:** `1:7695` (ADMIN group)  
**Shown on:** Billing Admin Console frame `1:7603`

| # | Admin nav | Route (proposed) | Figma page body | Status |
|---|-----------|------------------|-----------------|--------|
| 1 | Overview | `/admin` | — | **Missing** (nav only) → full **Spec** in ADMIN_PLAN |
| 2 | Workspaces | `/admin/workspaces` | — | **Missing** → **Spec** |
| 3 | Users | `/admin/users` | — | **Missing** → **Spec** |
| 4 | Subscriptions | `/admin/subscriptions` | — | **Missing** → **Spec** |
| 5 | Billing | `/admin/billing` | Workspace billing body on `1:7603` | **Partial** — tenant UI, not platform admin |
| 6 | Invoices | `/admin/invoices` | Tab on Billing only | **Partial** |
| 7 | Plans | `/admin/plans` | “Available Plans” cards on Billing | **Partial** |
| 8 | Audit Logs | `/admin/audit-logs` | — | **Missing** → **Spec** |
| 9 | System Settings | `/admin/system` | — | **Missing** → **Spec** |

---

## 5. ADMIN FEATURES — clean detail (what each must include)

> Figma only labels these. Production scope is defined below (and expanded in `ADMIN_PLAN.md`).

### 5.1 Overview
Platform KPIs (workspaces, users, live meetings, MRR, trials, failed payments, storage, health) · charts · attention queue · recent admin actions · system health dots.

### 5.2 Workspaces
**List:** search, status/plan filters, table (name, owner, plan, status, members, storage, MRR), bulk actions, create.  
**Detail:** Overview · Members · Meetings · Recordings · Subscription · Invoices · Usage · Security · Audit.  
**Actions:** Edit · Suspend · Delete (type-to-confirm) · Impersonate owner · Change plan.

### 5.3 Users
**List:** search, status/role/workspace filters, table.  
**Detail:** Profile · Security/sessions · Workspaces · Meetings · Recordings · Audit.  
**Actions:** Edit · Reset password · Suspend · Ban · Delete · Impersonate · Force logout.

### 5.4 Subscriptions
**List:** trial/active/past-due/canceled · seats · MRR.  
**Detail:** plan, period, limits, payment method, history.  
**Actions:** Change plan · Extend trial · Apply coupon · Cancel · Reactivate.

### 5.5 Billing (platform)
MRR/ARR/churn KPIs · failed payments queue · credits · revenue charts · export.  
*(Reuse visual language from workspace Billing `1:7603`.)*

### 5.6 Invoices
**List:** #, workspace, amount, status, dates.  
**Detail:** line items, tax, PDF, payment attempts.  
**Actions:** Download · Resend · Void · Refund · Mark paid.

### 5.7 Plans
**Catalog:** Free/Pro/Business/Enterprise cards or table.  
**Editor:** prices, trial days, limits, feature toggles, public/hidden, archive.  
**Detail:** subscribers on this plan.

### 5.8 Audit Logs
Searchable event stream · actor · action · target · IP · result.  
**Detail drawer:** full JSON payload, links to user/workspace.

### 5.9 System Settings
Sections: General · Auth · Security · Email · Storage · Media · Feature flags · Integrations · Compliance · Danger zone.  
Save/Cancel · test email · maintenance mode · audited changes.

---

## 6. Shared UI (all pages)

| Element | Detail |
|---------|--------|
| App header | Page H1 · subtitle · notification bell (count) · help · **New Meeting** (split) · user avatar + menu |
| Sidebar | Logo · nav · collapse · Upgrade card · (Admin: ADMIN section) |
| Status badges | Active · Trial · Past due · Suspended · Banned · Paid · etc. |
| Tables | Search · filters · sort · pagination · row ⋯ menu |
| Cards | White surface · soft shadow · 12–16px radius |
| Empty / loading / error | Required on every list & detail |

---

## 7. Design tokens (quick)

| Token | Value |
|-------|--------|
| Brand | Teal `#14b8a6` / `#0d9488` |
| App BG | `#f5f7fa` |
| Surface | `#ffffff` |
| Text | `#0f172a` / `#64748b` |
| Danger | `#ef4444` |
| Font | Inter (recommended) |
| Sidebar | 268px / 116px |

Full token set → [`PLAN.md` §3](./PLAN.md).

---

## 8. Master checklist — designed vs missing

### Client — designed in Figma
- [x] Dashboard  
- [x] Calendar  
- [x] Messages  
- [x] Recordings  
- [x] Reports  
- [x] Settings (Profile + nav)  
- [x] Workspace Settings  
- [x] Members  
- [x] Workspace Billing  
- [x] Live meeting shell  

### Client — missing / incomplete
- [ ] Contacts page  
- [ ] Templates page  
- [ ] Meetings **list** page (upcoming/past)  
- [ ] All Settings sections beyond Profile (full forms)  

### Admin — in Figma
- [x] ADMIN sidebar labels (9 items)  
- [x] Billing-style page visuals (tenant)  

### Admin — missing pages (use ADMIN_PLAN)
- [ ] Overview  
- [ ] Workspaces (+ detail)  
- [ ] Users (+ detail)  
- [ ] Subscriptions (+ detail)  
- [ ] Platform Billing  
- [ ] Invoices (platform)  
- [ ] Plans CRUD  
- [ ] Audit Logs  
- [ ] System Settings  

---

## 9. One-page sidebar map

```
CLIENT                         ADMIN (admins only)
─────────────────────          ─────────────────────
Dashboard          ✓           Overview           ✗ page
Meetings           △ live      Workspaces         ✗
Calendar           ✓           Users              ✗
Contacts           ✗           Subscriptions      ✗
Messages           ✓           Billing            △ tenant UI
Recordings         ✓           Invoices           △
Templates          ✗           Plans              △
Reports            ✓           Audit Logs         ✗
Settings           ✓           System Settings    ✗

Workspace (via Settings)
  Workspace Settings ✓
  Members            ✓
  Billing            ✓

✓ Designed   △ Partial   ✗ Missing page
```

---

## 10. Suggested build order

1. Tokens + layout (sidebar client + admin block)  
2. Dashboard → Calendar → Recordings → Messages → Reports  
3. Settings Profile → Workspace → Members → Billing  
4. Live meeting restyle  
5. Admin Overview → Workspaces → Users → Plans → Subscriptions → Invoices → Audit → System  
6. Fill gaps: Contacts, Templates, Meetings list  

---

*This inventory is the clean prep reference for all Figma sidebar features (client + admin). Deep admin flows: [`ADMIN_PLAN.md`](./ADMIN_PLAN.md). Client implementation notes: [`PLAN.md`](./PLAN.md).*
