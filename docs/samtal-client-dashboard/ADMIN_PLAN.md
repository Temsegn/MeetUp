# Samtal Admin Console — Complete End-to-End Spec

**Figma source:** [Samtal-meet-UI · node `1:7695`](https://www.figma.com/design/n6GHl4skJUaAKOGkkGeM4F/Samtal-meet-UI?node-id=1-7695)  
**Related frame:** `Billing — Samtal Admin Console` (`1:7603`)  
**Status:** Spec / plan — Figma is incomplete for Admin; this document defines the full production admin experience.

---

## 0. What Figma actually contains today

### Designed in Figma

| Item | Node | Status |
|------|------|--------|
| **ADMIN sidebar group** | `1:7695` | Complete IA |
| Sidebar links | Overview, Workspaces, Users, Subscriptions, Billing, Invoices, Plans, Audit Logs, System Settings | Labels + icons only |
| **Billing page body** | inside `1:7603` | Designed — but content is **tenant/workspace billing** (Current Plan, Usage, Payment Method, Available Plans), not platform-wide admin billing |

### Not designed in Figma (must be specified here)

- Admin Overview (platform KPIs)
- Workspaces list / detail / edit / suspend / delete
- Users list / detail / impersonate / ban / roles
- Subscriptions list / detail / change / cancel
- Platform Billing (MRR, failed payments across tenants)
- Invoices (platform invoice browser + detail)
- Plans (plan catalog CRUD)
- Audit Logs (searchable event stream + detail)
- System Settings (feature flags, email, storage, security, maintenance)
- All detail drawers/modals, empty/loading/error states, confirmation dialogs

**Important distinction**

| Role | Sees |
|------|------|
| **Workspace member / owner** | Client dashboard (previous plan) + workspace Billing/Members |
| **Platform Admin** (`role: admin` / `super_admin`) | Client dashboard **plus** Admin sidebar section → `/admin/*` |

This spec is for **Platform Admin**. Workspace billing UI from `1:7603` can be reused as patterns for tenant billing cards inside Admin → Subscriptions / Billing.

---

## 1. Admin sidebar (from Figma `1:7695`) — complete feature map

| # | Sidebar item | Route | Purpose |
|---|--------------|-------|---------|
| 1 | Overview | `/admin` | Platform health & KPIs |
| 2 | Workspaces | `/admin/workspaces` | All organizations/tenants |
| 3 | Users | `/admin/users` | All users across workspaces |
| 4 | Subscriptions | `/admin/subscriptions` | Active trials, paid, canceled |
| 5 | Billing | `/admin/billing` | Platform revenue, failed charges |
| 6 | Invoices | `/admin/invoices` | Cross-tenant invoice registry |
| 7 | Plans | `/admin/plans` | Product plan catalog |
| 8 | Audit Logs | `/admin/audit-logs` | Security & change trail |
| 9 | System Settings | `/admin/system` | Global configuration |

**Shell (all admin pages)**

- Same Samtal layout tokens as client dashboard (teal brand, Inter, 268px sidebar)
- Top: “Admin” badge in header subtitle, notifications, admin user menu
- Sidebar: client nav (optional collapse) **+** separated **ADMIN** block (Figma)
- Access gate: only `admin` / `super_admin`; others get 403 page

---

## 2. Shared admin UI kit

Reuse client primitives; add admin-specific:

| Component | Use |
|-----------|-----|
| `AdminPageHeader` | Title, subtitle, primary/secondary actions |
| `AdminKpiCard` | Value, delta %, sparkline, link |
| `AdminDataTable` | Sort, multi-select, column toggle, sticky header |
| `AdminFiltersBar` | Search + filter chips + date range + Export |
| `AdminStatusBadge` | Active / Trial / Past due / Suspended / Banned / Draft |
| `AdminDetailDrawer` | Right drawer 480–560px for quick view |
| `AdminDetailPage` | Full page for deep edit |
| `ConfirmDialog` | Destructive actions (typed confirm for delete) |
| `EmptyState` / `TableSkeleton` / `ErrorBanner` | States |
| `AuditActorCell` | Avatar + name + role |
| `MoneyCell` | Currency formatting |
| `RelativeTime` | “12 days ago” + tooltip absolute |

---

## 3. Feature-by-feature complete design

---

### 3.1 Overview — `/admin`

**Page goal:** At-a-glance platform health.

**KPI cards (row 1)**
- Total Workspaces (active / suspended)
- Total Users (MAU, new this week)
- Active Meetings (live now) + peak today
- MRR / ARR + MoM %
- Trial conversions (this month)
- Failed payments (count + $)
- Storage used (platform)
- Open incidents / system status

**Sections**
1. **Revenue chart** (30/90 days) — line MRR + bar new subs  
2. **Usage chart** — meetings started, participant-minutes  
3. **Attention queue** — cards: past-due workspaces, banned users pending review, storage overages  
4. **Recent admin actions** — mini audit feed (last 10)  
5. **System health** — API latency, mediasoup workers, DB, email queue (green/yellow/red)

**Components:** KPI grid, charts, `AttentionCard`, `HealthDot`, link buttons (“View all workspaces”)

**States:** loading skeletons; error banner with Retry; empty charts “No data yet”

**Clicks**
- KPI → deep-link filtered list  
- Attention card → workspace/user detail  
- Audit row → Audit Logs detail  

---

### 3.2 Workspaces — `/admin/workspaces`

#### 3.2.1 List page

**Header:** Workspaces · “Manage all organizations” · buttons: **Export CSV**, **Create Workspace**

**Filters**
- Search: name, slug, owner email, ID  
- Status: All / Active / Trial / Past due / Suspended / Deleted  
- Plan: Free / Pro / Business / Enterprise  
- Created date range  
- Member count range  
- Sort: Created, Name, Members, MRR  

**Table columns**
| Column | Content |
|--------|---------|
| Workspace | Logo, name, slug |
| Owner | Avatar, name, email |
| Plan | Badge |
| Status | Badge |
| Members | Count |
| Meetings (30d) | Number |
| Storage | Used / quota |
| MRR | $ |
| Created | Date |
| Last active | Relative |
| Actions | ⋯ menu |

**Row actions menu:** View · Edit · Impersonate owner · Change plan · Suspend · Reactivate · Delete  

**Bulk actions:** Suspend selected · Change plan · Export  

**Pagination:** 25/50/100 · page numbers · total count  

**Empty:** “No workspaces match filters” + Clear filters  
**Loading:** table skeleton  
**Error:** banner + Retry  

#### 3.2.2 Create Workspace modal

**Fields:** Name*, Slug* (auto from name), Owner email* (existing user or invite), Plan*, Industry, Company size, Initial seats  
**Validation:** slug unique, email valid  
**Actions:** Cancel · Create  

#### 3.2.3 Workspace detail — `/admin/workspaces/:id`

**Header:** Logo, name, status badge, plan badge · actions: Edit · Suspend · Delete · Impersonate  

**Tabs**
1. **Overview** — ID, slug, created, owner, billing email, industry, size, description, region, SSO enabled Y/N  
2. **Members** — table (user, role, status, joined, last active) + Invite + Remove + Change role  
3. **Meetings** — recent meetings (title, host, started, duration, participants, recording Y/N) → open meeting detail  
4. **Recordings** — list with size, retention, delete recording  
5. **Subscription** — plan, cycle, status, renews, seats used/limit, add-ons · Change plan · Cancel  
6. **Invoices** — nested invoice table for this workspace  
7. **Usage** — meetings, minutes, storage, messages charts  
8. **Security** — 2FA required, allowed domains, session timeout, IP allowlist  
9. **Audit** — filtered audit for this workspace  

**Edit drawer/page fields**
- Name, slug, logo upload, description, industry, size, billing email, technical contact, notes (admin-only internal note)

**Suspend confirm dialog**
- Reason* (required), notify owner checkbox, confirm  
- Effect: users cannot join meetings; data retained  

**Delete confirm dialog**
- Type workspace slug to confirm  
- Options: soft-delete 30 days vs hard delete  
- Warning list: members, recordings, invoices retained policy  

**Detail related drawers**
- Click member → user detail drawer  
- Click invoice → invoice detail  

---

### 3.3 Users — `/admin/users`

#### 3.3.1 List

**Filters:** Search (name, email, ID) · Status (Active / Invited / Suspended / Banned / Deleted) · Role (User / Workspace admin / Platform admin) · Workspace · Verified email · Created range · Last login  

**Table columns:** User (avatar, name, email) · Workspaces (count + primary) · Role · Status · Email verified · Meetings hosted · Last login · Created · Actions  

**Row actions:** View · Edit · Reset password · Verify email · Suspend · Ban · Delete · Impersonate · Add to workspace  

**Bulk:** Suspend · Export · Force logout  

#### 3.3.2 User detail — `/admin/users/:id`

**Header:** Avatar, name, email, status, verified badge · Impersonate · Suspend · Ban  

**Tabs**
1. **Profile** — name, display name, job title, phone, locale, timezone, avatar, bio  
2. **Security** — password last changed, 2FA on/off, sessions list (device, IP, last seen) → Revoke session · Force logout all  
3. **Workspaces** — memberships (workspace, role, joined) · Add / Remove / Change role  
4. **Meetings** — hosted & attended  
5. **Recordings** — owned  
6. **Messages** — optional (privacy: admin may see metadata only)  
7. **Billing** — if personal/owner of workspace billing  
8. **Audit** — actions by this user  

**Edit form fields:** First/last/display name, email (with re-verify), phone, job title, locale, timezone, platform role  

**Ban dialog:** Reason*, duration (permanent / until date), notify user, revoke sessions  

**Reset password:** Send reset email vs temporary password (copy once)  

**Impersonate:** Confirm + banner “Viewing as X” + Exit  

---

### 3.4 Subscriptions — `/admin/subscriptions`

#### List

**Filters:** Status (Trial / Active / Past due / Canceled / Paused) · Plan · Workspace · Renews within N days · Trial ending  

**Columns:** Workspace · Plan · Status · Seats (used/limit) · MRR · Trial ends · Current period · Cancel at period end · Actions  

**Actions:** View · Change plan · Extend trial · Apply coupon · Cancel · Reactivate · Sync with Stripe (if used)  

#### Detail — `/admin/subscriptions/:id`

**Info boxes**
- Workspace link  
- Plan + price + interval  
- Status timeline  
- Seats / limits (meetings, storage, recordings retention)  
- Payment method on file  
- Next invoice estimate  

**Sections**
- **History** — plan changes, coupons  
- **Invoices** linked  
- **Usage vs limits** meters  
- **Notes** admin internal  

**Change plan modal:** New plan*, seat count, prorate Y/N, effective immediately vs period end  

**Cancel modal:** Immediate vs end of period*, reason*, feedback, confirm  

**Extend trial modal:** Days*, reason  

---

### 3.5 Billing (platform) — `/admin/billing`

> Figma `1:7603` shows tenant billing. Platform Billing is broader.

**KPI row:** MRR, ARR, Net new MRR, Churn $, Failed payments (24h), Refunds (MTD)

**Tabs**
1. **Overview** — revenue chart, top plans mix, geographic if available  
2. **Failed payments** — table (workspace, amount, error, retries, last attempt) → Retry charge · Open workspace  
3. **Payouts / Stripe sync** (if applicable) — status  
4. **Credits issued** — admin credits log  
5. **Tax / region settings** link to System Settings  

**Components:** same KPI + charts + tables as Figma Billing Overview pattern (Billing Cycle, Plan, Status, seats, etc.) but aggregated  

**Actions:** Issue credit · Retry payment · Export revenue report  

---

### 3.6 Invoices — `/admin/invoices`

#### List

**Filters:** Search invoice # / workspace · Status (Draft / Open / Paid / Void / Uncollectible) · Date range · Amount range · Plan  

**Columns:** Invoice # · Workspace · Period · Amount · Tax · Status · Issued · Due · Paid at · Actions  

**Actions:** View · Download PDF · Resend email · Void · Mark paid (manual) · Refund  

#### Detail — `/admin/invoices/:id`

**Header:** Invoice #, status badge, amount · Download · Resend · Void · Refund  

**Fields / sections**
- Workspace + billing address  
- Line items (description, qty, unit, amount)  
- Subtotal, tax, discount, total  
- Payment attempts log  
- PDF preview  
- Related subscription  

**Void confirm · Refund modal:** Amount (full/partial)*, reason*, notify customer  

**Empty/loading/error** standard  

---

### 3.7 Plans — `/admin/plans`

#### List / catalog

**Cards or table:** Plan name, price monthly/yearly, seats, features summary, subscribers count, status (Active/Archived), visibility (Public/Hidden)

**Actions:** Create plan · Edit · Duplicate · Archive · Set default  

#### Create / Edit plan — drawer or page

**Fields**
- Name*, slug*, description  
- Price monthly*, yearly (optional)  
- Currency  
- Trial days  
- Limits: max members, max meetings concurrent, max duration, storage GB, recording retention days, SSO Y/N, admin controls Y/N, whiteboard Y/N, remote control Y/N  
- Feature checklist (toggles)  
- Stripe price IDs (optional)  
- Public / hidden  
- Sort order  

**Validation:** unique slug, price ≥ 0  

**Archive confirm:** cannot archive if default; warn if active subscribers  

#### Plan detail

- Subscribers table (workspaces on this plan)  
- Feature matrix  
- Change history  

---

### 3.8 Audit Logs — `/admin/audit-logs`

#### List

**Filters:** Search · Actor · Action type · Target type (User/Workspace/Plan/Invoice/System) · Target ID · Severity · Date range · IP  

**Columns:** Timestamp · Actor · Action · Target · Workspace · IP · Result (Success/Fail) · Actions (View)

**Action types examples:** `user.ban`, `workspace.suspend`, `plan.update`, `invoice.void`, `settings.update`, `auth.login_failed`, `recording.delete`

**Export** CSV/JSON  

#### Detail drawer

- Full payload JSON (diff before/after when applicable)  
- Actor profile link  
- Target link  
- Request ID / correlation ID  
- User agent  
- Copy JSON  

**Empty:** “No events in range”  
**Retention note:** “Logs retained 365 days” (from System Settings)  

---

### 3.9 System Settings — `/admin/system`

**Left sub-nav (settings pattern like client Settings)**

| Section | Contents |
|---------|----------|
| **General** | App name, support email, default locale, default timezone, maintenance mode toggle + message |
| **Authentication** | Password policy, session TTL, max sessions, invite expiry, OAuth providers enable |
| **Security** | Force 2FA for admins, IP allowlist for `/admin`, CORS origins, rate limits |
| **Email** | SMTP/provider, from address, templates preview, send test email |
| **Storage** | Provider, bucket, max upload, recording retention default, CDN |
| **Media** | Mediasoup worker URLs, max bitrate defaults, region |
| **Feature flags** | Table flag name, description, % rollout, enabled workspaces override |
| **Integrations** | Stripe keys (masked), webhooks, Slack alerts |
| **Compliance** | Data retention, DPA text, cookie banner |
| **Danger zone** | Clear cache, reindex search, drain queues — each with confirm |

**Every section:** Save Changes · Cancel · unsaved-changes guard  
**Validation + toast** success/error  
**Audit:** every save writes audit log  

---

## 4. Cross-cutting admin flows

### 4.1 Permissions matrix

| Capability | `admin` | `super_admin` |
|------------|---------|---------------|
| View Overview | ✓ | ✓ |
| Manage workspaces/users | ✓ | ✓ |
| Manage plans/billing | ✓ | ✓ |
| System Settings | read | read/write |
| Delete workspace hard | — | ✓ |
| Manage other admins | — | ✓ |
| Feature flags production | — | ✓ |

### 4.2 Global search (admin header)

Search workspaces, users, invoices, meetings by ID/email/name → jump to detail.

### 4.3 Notifications (admin)

Types: failed payment, trial ending, abuse report, system health alert, new enterprise signup.

### 4.4 Confirmation patterns

| Action | Pattern |
|--------|---------|
| Suspend / Ban | Reason required + Confirm |
| Delete workspace/user | Type name/slug |
| Void invoice / Refund | Amount + reason |
| Impersonate | Explicit consent + sticky exit bar |
| Maintenance mode | Double confirm |

### 4.5 States everywhere

- **Loading:** skeletons for KPIs/tables  
- **Empty:** illustration + CTA  
- **Error:** banner + Retry + error code  
- **Forbidden:** 403 illustration  
- **Not found:** 404 for bad IDs  

---

## 5. Information model (fields reference)

### Workspace
`id, name, slug, logoUrl, status, planId, ownerUserId, billingEmail, industry, companySize, description, region, memberCount, storageUsedBytes, storageQuotaBytes, mrr, createdAt, updatedAt, lastActiveAt, suspendedAt, suspendedReason, internalNotes`

### User
`id, email, emailVerified, firstName, lastName, displayName, avatarUrl, phone, jobTitle, locale, timezone, status, platformRole, lastLoginAt, createdAt, twoFactorEnabled`

### Subscription
`id, workspaceId, planId, status, seats, seatsUsed, currentPeriodStart/End, trialEndsAt, cancelAtPeriodEnd, canceledAt, paymentMethodSummary, mrr`

### Invoice
`id, number, workspaceId, status, currency, subtotal, tax, discount, total, issuedAt, dueAt, paidAt, lineItems[], pdfUrl`

### Plan
`id, name, slug, description, priceMonthly, priceYearly, currency, trialDays, limits{}, features{}, public, archived, subscriberCount`

### AuditLog
`id, at, actorUserId, action, targetType, targetId, workspaceId, ip, userAgent, result, payload`

### SystemSettings
keyed config document with sections above  

---

## 6. Folder structure (frontend)

```
conference-frontend/src/features/admin/
├── layout/
│   ├── AdminLayout.tsx
│   ├── AdminSidebar.tsx          # ADMIN block from Figma 1:7695
│   └── AdminGuard.tsx
├── pages/
│   ├── OverviewPage.tsx
│   ├── WorkspacesPage.tsx
│   ├── WorkspaceDetailPage.tsx
│   ├── UsersPage.tsx
│   ├── UserDetailPage.tsx
│   ├── SubscriptionsPage.tsx
│   ├── SubscriptionDetailPage.tsx
│   ├── BillingPage.tsx
│   ├── InvoicesPage.tsx
│   ├── InvoiceDetailPage.tsx
│   ├── PlansPage.tsx
│   ├── PlanEditPage.tsx
│   ├── AuditLogsPage.tsx
│   └── SystemSettingsPage.tsx
├── components/
│   ├── AdminKpiCard.tsx
│   ├── AdminDataTable.tsx
│   ├── AdminFiltersBar.tsx
│   ├── StatusBadge.tsx
│   ├── ConfirmDeleteDialog.tsx
│   ├── ImpersonationBanner.tsx
│   └── ...
├── hooks/
└── api/
```

**Backend (suggested):** `conference-backend/src/modules/admin/` with routes guarded by admin role — workspaces, users, subscriptions, invoices, plans, audit, system-settings.

---

## 7. Design tokens

Reuse client Samtal tokens from [`PLAN.md`](./PLAN.md). Admin-only additions:

- `--color-admin-badge`: brand-600 background, white text on “ADMIN” label (Figma sidebar)
- Destructive: `--color-danger` for Delete / End / Ban
- Status colors: Active green · Trial blue · Past due amber · Suspended orange · Banned red · Void gray

---

## 8. Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **A** | AdminLayout + Guard + Overview (read-only KPIs) |
| **B** | Workspaces list + detail (read) + Suspend |
| **C** | Users list + detail + Ban/Suspend/Impersonate |
| **D** | Plans CRUD + Subscriptions |
| **E** | Invoices + Platform Billing |
| **F** | Audit Logs |
| **G** | System Settings |
| **H** | Figma polish pass — design missing screens to match Billing visual language |

---

## 9. Figma follow-up (for design team)

Please add frames for each Admin sidebar item (list + detail + key modals), matching Billing visual system:

1. Admin Overview  
2. Workspaces list + Workspace detail (tabs)  
3. Users list + User detail  
4. Subscriptions list + detail + Change/Cancel modals  
5. Platform Billing overview  
6. Invoices list + Invoice detail  
7. Plans catalog + Plan editor  
8. Audit Logs + event detail drawer  
9. System Settings (multi-section)  
10. Shared: Confirm delete, Impersonation banner, Empty/Error  

Until those exist, **this document is the source of truth** for building the complete admin interface.

---

## 10. Summary

| Question | Answer |
|----------|--------|
| Is Admin fully designed in Figma? | **No** — only ADMIN nav + Billing page body |
| What should Admin include? | All 9 sidebar features with list → detail → edit → actions → confirms → states |
| Admin vs client Billing? | Client/workspace billing vs platform admin console — separate routes `/app/billing` vs `/admin/*` |
| Next build step? | AdminLayout + Overview + Workspaces after you approve |

Approve this admin spec (and whether platform admin is a separate app shell or a sidebar section inside the client app) to start implementation.
