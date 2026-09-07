# Samtal-meet-UI (Copy) — Complete Screen & Component Inventory

**File:** [Samtal-meet-UI (Copy)](https://www.figma.com/design/mD2BeG8wud1vn4V4adThBe/Samtal-meet-UI--Copy-)  
**File key:** `mD2BeG8wud1vn4V4adThBe`  
**Team access:** Live MCP reads succeed (Pro / TOM D) — confirmed Aug 22, 2026  
**Pages in file:** **1** (`Page 1` / `0:1`)  
**Inspection only** — no code.

**Published Figma variables:** none (`get_variable_defs` → empty). Tokens below are observed from screenshots + structure.

---

## A. Pages

| Page | ID | Contents |
|------|-----|----------|
| Page 1 | `0:1` | Auth, app shell screens, SaaS/admin billing, rooms |

No FigJam / Slides / extra design pages.

---

## B. Every screen / frame

### B1. Section labels (not product screens)

| Name | Node | Size | Role |
|------|------|------|------|
| Login - Create account - Forget password | `16:1201` | 4273×241 | Section banner |
| SaaS Screens | `16:4353` | 4273×241 | Section banner |

### B2. Auth screens (new vs original file)

| # | Screen | Node | Size | Layout |
|---|--------|------|------|--------|
| 1 | Login (`Container`) | `16:678` | 1500×1129 | Split: form left + product promo right + footer |
| 2 | Forgot Password — Samtal | `16:871` | 1500×942 | Split: reset form + promo |
| 3 | Sign up — Samtal \| Create your account | `16:955` | 1550×1280 | Split: registration form + promo |

### B3. App / workspace screens

| # | Screen | Node | Size |
|---|--------|------|------|
| 4 | Samtal Dashboard — Meetings, Recordings & Insights | `1:39` | 1550×1021 |
| 5 | Container *(live meeting)* | `1:1128` | 1500×1267 |
| 6 | Settings — Samtal | `1:1795` | 1500×1694 |
| 7 | Reports — Samtal Meeting Analytics | `1:2795` | 1824×1428 |
| 8 | Recordings \| Samtal Meeting Workspace | `1:3611` | 1708×1397 |
| 9 | Calendar — Samtal Meeting Workspace | `1:4226` | 1838×1367 |
| 10 | Members · Samtal Workspace | `1:5120` | 1550×1455 |
| 11 | Messages | `1:5916` | 1923×1473 |
| 12 | Workspace Settings — Samtal | `1:6785` | 1884×1633 |
| 13 | Rooms · Samtal Workspace Settings | `17:212` | 1550×1393 |
| 14 | Create Room — Samtal Workspace | `17:790` | 1550×1270 |
| 15 | Billing — Samtal Admin Console | `1:7603` | 1550×1418 |
| 16 | Invoices — Samtal Workspace Billing | `17:1937` | 1550×1244 |
| 17 | Invoice · Samtal Billing | `16:3528` | 1500×1532 |

### B4. Shared sidebar variants (paired)

| Variant | Width | Notes |
|---------|-------|--------|
| Expanded | **268px** (Messages ≈281) | Logo + full labels + Upgrade card |
| Collapsed | **116px** | Icons only + collapse chevron |

Many standalone `Sidebar` frames sit beside each main screen (expanded + collapsed pairs).

### B5. Reference / export bitmaps on canvas

| Name | Node | Notes |
|------|------|--------|
| samtal meet Billing 1 | `1:8231` | Large bitmap |
| image 72 / 73 | `16:869`, `16:870` | Auth reference images |

---

## C. Navigation

### C1. Client primary sidebar

Dashboard · Meetings · Calendar · Contacts · Messages (badge `3`) · Recordings · Templates · Reports · Settings  
+ Upgrade to Pro card + collapse (`arrow-circle-left` 24×24)

**Nav item:** ~228×47 · icon 22 · label step ~51

### C2. User Settings secondary (`1:1795`)

Profile · Account · Notifications · Audio & Video · Calendar & Sync · Recording · Virtual Background · Security · Language · Appearance · Integrations · Billing & Plan

### C3. Workspace secondary (Rooms / Create Room / Workspace Settings)

Profile · Account · Workspace · Members · Teams · **Rooms** · Branding · Security · Billing & Plan · Integrations · Audit Logs

### C4. Admin block (Billing / Invoices)

**ADMIN** · Overview · Workspaces · Users · Subscriptions · Billing · Invoices · Plans · Audit Logs · System Settings

### C5. App header (shared)

H1 + subtitle · Notifications · Help · **New Meeting** (split + chevron) · Avatar menu

### C6. In-page tabs / local nav

| Screen | Controls |
|--------|----------|
| Reports | Overview · Meetings · Participants · Engagement · Recordings |
| Billing | Overview · Invoices · Payment Methods · Transactions · Credits & Discounts |
| Calendar | Month · Week · Day |
| Live meeting | Agenda · Participants · Chat panels |
| Invoices | Filters / search / date / Export |
| Rooms | Search · All Status · Create Room |

### C7. Auth cross-links

Login ↔ Sign up · Forgot password · Back to Sign In · Privacy / Terms footer

---

## D. Shared components (patterns)

| Component | Where |
|-----------|--------|
| AppSidebar expanded/collapsed | All app screens |
| AppHeader | All app screens |
| NavItem + icon + active state | Sidebars |
| Badge (count) | Messages, notifications |
| Avatar + online dot | Header, tables, chat |
| Primary CTA / split New Meeting | Headers |
| KPI / stat card | Dashboard, Reports, Recordings, Billing, Invoices |
| List row + Join | Dashboard, Calendar |
| Search field | Recordings, Messages, Members, Rooms, meeting participants |
| Filters / All Status dropdown | Reports, Recordings, Calendar, Rooms, Invoices |
| Upgrade card | Sidebar |
| Settings / Workspace secondary nav | Settings, Workspace, Rooms |
| Data table | Members, Recordings, Rooms, Billing invoices, Invoices list, Invoice line items |
| Text Input / Email / Password inputs | Auth, Settings, Create Room |
| Checkbox | Auth Remember me / Terms |
| Switch / Toggle | Settings, Create Room permissions |
| Dropdown | Settings language, Rooms status, Create Room capacity/timezone |
| Progress / usage meter | Billing, Recordings storage |
| Video tile + control bar | Live meeting |
| Chat list / bubbles / composer | Messages |
| Profile side card | Messages |
| Calendar month grid + event chips | Calendar |
| Plan cards | Billing |
| Payment method row | Billing |
| Breadcrumb | Rooms, Create Room (`Workspace › Rooms › …`) |
| Auth split layout | Login / Sign up / Forgot |
| Social auth buttons | Google, Microsoft |
| Invoice document block | Invoice detail |
| Danger button | Delete Workspace (Workspace Settings) |
| **Library instance** | `arrow-circle-left` only (repeated) |

File is mostly framed groups, not a large published component library.

---

## E. Forms

| Form | Screen | Fields / actions |
|------|--------|------------------|
| Sign in | Login `16:678` | Email, Password (+ show), Remember me, Forgot link, Sign in, Google, Microsoft |
| Forgot password | `16:871` | Email, Send Reset Link, Back to Sign In |
| Sign up | `16:955` | First / Last name, Email, Company (opt), Password, Confirm password, Terms checkbox, Create account, Google, Microsoft |
| Profile | Settings | Avatar, names, job, email, phone, bio · Save / Cancel |
| Workspace profile | Workspace Settings | Logo, name, slug, industry, size, description |
| Create Room | `17:790` | Room name, description, capacity, timezone, location; permissions switches; Create Room / Cancel · breadcrumb |
| Search / filters | Multiple | Text inputs + filter dropdowns |
| Message composer | Messages | Text + send |
| Invite Members | Members / Rooms CTAs | CTA present |
| Add Payment Method | Billing | CTA present |

**Missing as full forms:** Contacts, Templates, Meetings list, most Settings sub-pages, Admin CRUD.

---

## F. Tables

| Table | Node / screen | Columns (from design) |
|-------|---------------|------------------------|
| Members | `1:5398` | Member, Role, Status, Joined, Last Active, Actions |
| Recordings | `1:3871` | Recording library table/grid |
| Billing recent invoices | `1:8012` | Invoice #, date, amount, status, download |
| Rooms | `17:481` | Room Name, Room ID, Capacity, Created By, Created On, Status, Actions |
| Invoices list | `17:2235` | Invoice list (~860×698) |
| Invoice line items | `16:3777` | On Invoice detail |
| Reports recent meetings | Reports | Meeting analytics |

---

## G. Modals / dialogs / drawers

| Type | Present? |
|------|----------|
| Named Modal / Dialog / Drawer frames | **No** |
| Dropdown menus | Yes (Settings, filters, New Meeting chevron implied) |
| Inline danger | Delete Workspace button |
| Create Room | **Full page**, not modal |

---

## H. Responsive variants

| Variant | Present? |
|---------|----------|
| Desktop screens (1500–1923 wide) | Yes |
| Sidebar 268 ↔ 116 | Yes |
| Auth split 50/50 | Desktop only |
| Mobile / tablet artboards | **No** |

---

## I. Design tokens (observed)

No Figma variable library. From live screenshots:

| Token | Observed |
|-------|----------|
| Brand primary | Teal / cyan ≈ `#14b8a6`–`#0d9488` (buttons, links, active nav, focus rings) |
| Auth promo panel | Deeper teal ≈ `#0f766e` / `#115e59` |
| App background | Light gray ≈ `#f5f7fa` |
| Surface | White cards |
| Text primary | Near-black / slate ≈ `#0f172a` |
| Text muted | ≈ `#64748b` / `#94a3b8` |
| Borders | ≈ `#e2e8f0` |
| Success | Green (Active, Paid badges) |
| Warning | Amber (Pending) |
| Danger | Red (Failed, End call, delete) |
| Chart / event accents | Blue, purple, pink, orange, cyan |

---

## J. Typography

| Role | Approx size (from text box heights) |
|------|-------------------------------------|
| Caption / badge / meta | 12–14 |
| Body / nav / form labels | 14–16 (boxes often 22–26 tall) |
| Section H2/H3 | 18–24 |
| Page H1 | 28–36 (auth “Welcome back” ~47 box) |
| KPI numbers | 28–36 |
| Section banners | Display ~189 tall |

**Family:** not named in export → appears Inter / system-sans.  
**Weights:** 400 / 500 / 600 / 700.

---

## K. Spacing / layout chrome

| Element | Size |
|---------|------|
| Sidebar expanded | 268 (Messages ~281) |
| Sidebar collapsed | 116 |
| Sidebar inner pad | 20 |
| Nav item | h ≈ 47, step ≈ 51 |
| Icon (client) | 22 |
| Icon (settings/admin) | ~18–20 |
| Auth form column | ~500–610 content width |
| Auth field height | ~48–62 |
| Auth primary button | full-width × ~48–62 |
| Main content pad | ~20–35 |
| Card / table radius | ~8–16 |
| Soft card shadow | Present on cards |

---

## L. Interactions (inferred from UI)

| Interaction | Evidence |
|-------------|----------|
| Sidebar collapse/expand | Paired frames + chevron |
| Route / nav active state | Per-screen highlighted item |
| Auth: sign in / sign up / reset / OAuth | Forms + CTAs + links |
| Show/hide password | Eye button on password fields |
| New Meeting | Header split CTA |
| Join meeting | List Join buttons |
| Calendar view switch | Month / Week / Day |
| Filters / search / date range | Toolbars |
| Settings / Workspace section switch | Secondary nav |
| Create Room flow | Rooms → Create Room page |
| Room row actions | ⋮ menu |
| Invoice view / download / export | Invoices + Invoice detail |
| Meeting controls | Mic, Camera, Hand, Screen, Participants, Chat, More, End/Leave |
| Upgrade | Sidebar CTA |
| Invite members | Header / table CTAs |
| Admin navigation | ADMIN block |
| Delete workspace | Danger button (confirm not framed) |

No separate prototype-edge export in metadata.

---

## M. Gaps (nav without dedicated screens)

| Item | Status |
|------|--------|
| Contacts | Nav only |
| Templates | Nav only |
| Meetings list (upcoming/past) | Live call used instead |
| Teams, Branding, most Settings subsections | Nav / partial |
| Admin Overview, Workspaces, Users, Subscriptions, Plans, Audit, System | Nav only |
| Modal library | Missing |
| Mobile / tablet | Missing |

---

## N. What’s new vs original file (`n6GHl4skJUaAKOGkkGeM4F`)

| Added in this Copy | Node |
|--------------------|------|
| Login | `16:678` |
| Forgot Password | `16:871` |
| Sign up | `16:955` |
| Rooms list | `17:212` |
| Create Room | `17:790` |
| Invoices list | `17:1937` |
| Invoice detail | `16:3528` |
| Section banners | `16:1201`, `16:4353` |

---

## O. Completeness

| Category | Coverage |
|----------|----------|
| Pages | 1/1 |
| Product screens | 17 designed frames + 2 banners |
| Sidebars | Expanded/collapsed pairs catalogued |
| Navigation | Client + Settings + Workspace + Admin + header + tabs + auth links |
| Shared components | Pattern catalog |
| Forms / tables | Catalogued |
| Modals | None as frames |
| Responsive | Sidebar collapse only |
| Tokens | Observed (no Figma variables) |

*End of inventory. No code written.*
