# Samtal Meet UI — Full Figma Design Spec (Import)

**Source file:** [Samtal-meet-UI](https://www.figma.com/design/n6GHl4skJUaAKOGkkGeM4F/Samtal-meet-UI?node-id=0-1)  
**File key:** `n6GHl4skJUaAKOGkkGeM4F` · **Page:** `0:1`  
**Status:** Spec dump for **later implementation** — do not treat as code yet.  
**Scan note:** Live Figma MCP was rate-limited at import time; measurements and copy below come from a full page metadata export of the same file (frame IDs + text node widths/heights). Re-run live `get_design_context` later to pull exact hex fills / font family names if Figma variables are published.

**Related docs:** [`FEATURE_INVENTORY.md`](./FEATURE_INVENTORY.md) · [`PLAN.md`](./PLAN.md) · [`ADMIN_PLAN.md`](./ADMIN_PLAN.md)

**Brand assets (repo):**
- `logo-15 1.png` — dark logo (black + coral/pink mark)
- `Samtal blue logo.png` — blue field logo (blue + pink/coral mark, white wordmark)
- `left-chevron.png` — sidebar collapse chevron

---

## 1. Global layout (from Figma frames)

### 1.1 Desktop canvas sizes (top-level screens)

| Screen | Node | W × H (px) |
|--------|------|------------|
| Dashboard | `1:39` | **1550 × 1021** |
| Live meeting (shell) | `1:1128` | **1500 × 1267** |
| Settings | `1:1795` | **1500 × 1694** |
| Reports | `1:2795` | **1824 × 1428** |
| Recordings | `1:3611` | **1708 × 1397** |
| Calendar | `1:4226` | **1838 × 1367** |
| Members | `1:5120` | **1550 × 1455** |
| Messages | `1:5916` | **1923 × 1473** |
| Workspace Settings | `1:6785` | **1884 × 1633** |
| Billing / Admin console chrome | `1:7603` | **1550 × 1418** |

### 1.2 Shell chrome (shared)

| Token | Figma measure | Notes |
|-------|---------------|-------|
| Sidebar expanded | **268px** wide | Frames `1:955`, `1:2276`, etc. |
| Sidebar collapsed | **116px** wide | Icon-only variants |
| Sidebar padding (inner nav) | **20px** left/right | Navigation at `x=20` |
| Nav item height | **47px** | Button frames |
| Nav icon | **22 × 22px** | inside item, `x≈16` |
| Icon → label gap | **≈12–14px** | label at `x≈50` |
| Nav label text height | **23px** (some screens **25px**) | |
| Nav item vertical step | **≈51px** (47 + 4 margin) | |
| Logo lockup | **≈223 × 67px** + chevron **24×24** | Frame 64 |
| Main content start | `x = sidebar width` (268) | |
| Header top padding | **≈20–35px** | varies by screen |
| Header title (H1) height | **33–48px** | Dashboard 33 · Settings/Calendar 40 · Reports 48 · Recordings 43 |
| Header subtitle height | **17–25px** | |
| Notification control | **≈46–50 × 46–50** | badge digit height **15–22px** |
| New Meeting CTA | **≈142–169 × 32–48** | label height **15–23px** |
| Avatar | **≈48–49px** circle | online dot **≈13px** |

### 1.3 Spacing scale (derived)

Use 4px base; values observed repeatedly:

| Step | px | Where used |
|------|-----|------------|
| 1 | 4 | Nav item inner margin |
| 2 | 8–9 | Card inner padding (KPI) |
| 3 | 12–14 | Icon/text gaps |
| 4 | 16–18 | Button horizontal padding |
| 5 | 20 | Sidebar gutter |
| 6 | 22–28 | Section gaps, header → content |
| 7 | 32–36 | Large section margins |
| 8 | 43–48 | Header action heights, settings nav items |

### 1.4 Radius & elevation (implementation target)

Figma did not expose named variables. Match UI visually:

| Token | Value |
|-------|--------|
| Radius sm | 8px |
| Radius md | 12px |
| Radius lg | 16px |
| Radius pill | 9999px |
| Shadow soft | `0 4px 12px rgba(15,23,42,0.08)` |

### 1.5 Color tokens (product UI — agreed)

| Role | Hex |
|------|-----|
| Brand | `#14b8a6` |
| Brand strong | `#0d9488` |
| App background | `#f5f7fa` |
| Surface | `#ffffff` |
| Text primary | `#0f172a` |
| Text secondary | `#64748b` |
| Text muted | `#94a3b8` |
| Border | `#e2e8f0` |
| Danger | `#ef4444` |
| Success | `#22c55e` |
| Chart accents | blue `#3b82f6` · purple `#8b5cf6` · pink `#ec4899` · orange `#f97316` · cyan `#06b6d4` |

**Logo (blue asset) accents for marketing only:** field blue ≈ `#2F6FED`–`#3B7CFF` · coral/pink mark ≈ `#E58793` · white wordmark.

### 1.6 Typography (from text node heights)

Figma text `height` ≈ line box. Map to Inter:

| Role | Approx height in Figma | Implement as |
|------|------------------------|--------------|
| Caption / KPI label | 9–14px | `text-xs` 12px |
| Meta / “View all” | 14–15px | `text-sm` 14px |
| Body / nav | 17–23px | `text-md` 15–16px |
| Settings nav | 24–25px | `text-md` medium |
| Section H2 | 27–32px | `text-lg` 18–20px |
| Page H1 | 33–48px | `text-xl`–`text-2xl` 22–32px |
| KPI big number | 25–36px | `text-2xl` 28–36px |

**Font family (implementation):** Inter 400 / 500 / 600 / 700.

---

## 2. Client sidebar — every label (exact copy)

| Order | Label | Badge | Icon size |
|-------|-------|-------|-----------|
| 1 | Dashboard | — | 22 |
| 2 | Meetings | — | 22 |
| 3 | Calendar | — | 22 |
| 4 | Contacts | — | 22 |
| 5 | Messages | **3** (badge Ø≈20, digit h≈17) | 22 |
| 6 | Recordings | — | 22 |
| 7 | Templates | — | 22 |
| 8 | Reports | — | 22 |
| 9 | Settings | — | 22 |

**Upgrade card copy**
- Title: `Upgrade to Pro` (h≈28)
- Body: `Unlock premium features and more insights.` (h≈36, wrap)
- CTA: `Upgrade to Pro` (button h≈40, width≈188)
- Image area: **188 × 103**

**Collapse control:** instance `arrow-circle-left` **24×24** (also `left-chevron.png` in repo).

---

## 3. Admin sidebar — every label (exact copy)

Group header: **`ADMIN`** (h≈18)

| Order | Label |
|-------|-------|
| 1 | Overview |
| 2 | Workspaces |
| 3 | Users |
| 4 | Subscriptions |
| 5 | Billing |
| 6 | Invoices |
| 7 | Plans |
| 8 | Audit Logs |
| 9 | System Settings |

Admin item height ≈ **44px**, icon ≈ **20×20**, label h≈**22**.

---

## 4. Screen-by-screen copy + key measures

### 4.1 Dashboard · `1:39` · 1550×1021

**Header**
- H1: `Dashboard` (113×33)
- Sub: `Welcome back, Sarah! Here's what's happening today` (277×17)
- Bell badge: `8`
- CTA: `New Meeting` (65×15)

**KPI cards** (~217×137 each, padding ≈9)
| Label | Value | Meta | Link |
|-------|-------|------|------|
| Upcoming Meetings | 5 | Today | View all |
| Completed Meetings | 12 | This Week | View all |
| Total Participants | 48 | This Week | View report |
| Total Recordings | 8 | This Week | View all |

**Lists / panels (section titles)**
- `Upcoming Meetings`
- `Today's Schedule` / schedule events + `Join`
- `Recent Activity` (examples: “Leslie Alexander shared a recording”, “Darrell Steward commented on”, “Annette Black uploaded a recording”)
- `Quick Actions`: `Schedule Meeting` · `Join with ID` · `Share Screen` · `Upload Recording`

---

### 4.2 Live meeting · `1:1128` · 1500×1267

**Header**
- Title: `Product Team Weekly Sync` (346×36)
- Sub: `10:30 AM – 11:30 AM • 24:15`
- Actions: notifications `8` · Leave · avatar

**Video tiles:** ~406×292 each (2×2), name overlays (e.g. You, Jacob Jones, Leslie Alexander, Darrell Steward)

**Controls** (each ~90×84): `Mic` · `Camera` · `Raise Hand` · `Screen` · `Participants` · `Chat` · `More`  
**End Call** ≈142×54

**Panels**
- `Meeting Agenda` + items: `Review project updates` · `Discuss roadblocks` · `Plan next steps`
- Participants search: `Search participants`
- CTA: `Invite Participants`

---

### 4.3 Settings · `1:1795` · 1500×1694

**Header**
- H1: `Settings` (130×40)
- Sub: `Manage your account, preferences, and application ` (truncated in file)
- New Meeting · bell `8` · avatar

**Settings nav labels (exact)**  
Profile · Account · Notifications · Audio & Video · Calendar & Sync · Recording · Virtual Background · Security · Language · Appearance · Integrations · Billing & Plan  

Nav item ≈ **246 × 49**, icon ≈20, label h≈24, step ≈54

**Profile section**
- H2: `Profile`
- Sub: `Update your personal information and profile picture` (typo “perconal” in Figma)
- CTA: `Save Changes`
- Fields implied: First name, Last name, Display name, Job title, Email, Phone, Bio  
- Avatar ≈132px + camera button ≈40

---

### 4.4 Reports · `1:2795` · 1824×1428

**Header**
- H1: `Reports` (118×48)
- Sub: `Track your meeting performance and team collaborat` (truncated)
- Date: `Apr 21 – Apr 27, 2025`
- `Filters` · `New Meeting`

**Tabs:** Overview · Meetings · Participants · Engagement · Recordings  

**KPI / chart titles (from design)**  
Meetings · Recordings · Meetings by Type · Meetings by Time of Day · Top Collaborators · Recent Meetings table headers as designed  

---

### 4.5 Recordings · `1:3611` · 1708×1397

**Header**
- H1: `Recordings` (153×43)
- Sub: `View, manage and share your meeting recordings.` (361×22)
- Search placeholder: `Search recordings...`
- `Filters`

**Stat example:** `Total Recordings` · value `24` · `33%` · `vs last 30 days`

---

### 4.6 Calendar · `1:4226` · 1838×1367

**Header**
- H1: `Calendar` (134×40)
- Sub: `View and manage your scheduled meetings.`
- View switch: `Month` · `Week` · `Day`
- `Today` · month label e.g. `May 2024` · `Filters`
- Side list: `Upcoming Meetings` · `Schedule a Meeting` · `Join`

---

### 4.7 Members · `1:5120` · 1550×1455

**Header / breadcrumb**
- H1: `Members`
- Crumb: `Workspace` / `Members`
- Search: `Search members...`
- CTA: `Invite Members`
- Count: `Members (58)`
- Columns include: `Joined On` (+ role, status, last active, actions)

---

### 4.8 Messages · `1:5916` · 1923×1473

- Search: `Search messages...`
- Divider: `Today`
- Right rail: `Profile` (+ shared files/meetings)
- Composer actions implied (attach / emoji / send)

---

### 4.9 Workspace Settings · `1:6785` · 1884×1633

- Secondary nav includes Workspace · Members · Billing & Plan · Audit Logs (workspace-level)
- CTAs: `Invite Members` · `Search members...` · `Delete Workspace` (danger)
- Profile fields: logo, name, URL, industry, size, description

---

### 4.10 Billing · `1:7603` · 1550×1418

**Header**
- H1: `Billing`
- Sub: `Manage billing, payments, invoices, and transactio` (truncated)

**KPI strip**
- Current Plan → e.g. `Business` / `$299.00 /month` (or Pro $49 in some comps)
- Next Billing Date → e.g. `May 22, 2025` · `In 12 days`
- Amount Due → `$299.00` · `Auto-charges on May 22, 2025`
- Payment Method → `VISA` · `•••• 4242` · `Expires 04/28`

**Tabs:** Overview · Invoices · Payment Methods · Transactions · Credits & Discounts  

**Overview fields:** Billing Cycle `Monthly` · Plan · Status `Active` · Workspace seats  

**Other:** Usage meters · `Add Payment Method` · `Recent Invoices` · Available Plans (Free / Pro / Enterprise) · Change Plan / Cancel  

---

## 5. Shared header pattern (all app pages)

Left: **Page H1** + **subtitle**  
Right (LTR): **Notifications (badge)** · **Help** · **New Meeting** (+ dropdown chevron) · **Avatar** (+ status + menu chevron)

---

## 6. Component checklist (for later build)

| Component | Key sizes |
|-----------|-----------|
| AppSidebar expanded | 268 |
| AppSidebar collapsed | 116 |
| NavItem | h 47, icon 22, label 23 |
| UpgradeCard | pad 20, image 188×103, btn h 40 |
| AppHeader | title 33–48, actions 32–48 |
| KpiCard | ~217×137 |
| PrimaryButton | radius 12, brand fill |
| SearchField | h ~46 |
| DataTable | row ~48–56 |
| Badge | pill, digit 15–22 |
| Avatar | 48–49 |
| Modal / Drawer | TBD when designed |

---

## 7. Gaps (nav exists, page missing / incomplete)

| Item | Gap |
|------|-----|
| Contacts | No page frame |
| Templates | No page frame |
| Meetings list | Frame is live call, not list |
| Settings sections | Only Profile fully designed |
| Admin Overview / Workspaces / Users / Subscriptions / Audit / System | Nav only — see ADMIN_PLAN |

---

## 8. Implementation order (later)

1. Tokens CSS (colors, type, space, radius) from §1  
2. `DashboardLayout` + sidebar + header  
3. Dashboard → Calendar → Recordings → Messages → Reports  
4. Settings Profile → Workspace → Members → Billing  
5. Live meeting restyle  
6. Admin pages per ADMIN_PLAN  
7. Fill Contacts / Templates / Meetings list when Figma added  

---

## 9. Re-scan checklist (when MCP quota resets)

- [ ] `get_variable_defs` on each top frame for exact hex + font family  
- [ ] `get_design_context` per screen for CSS reference  
- [ ] Export all icons/SVG from Figma assets  
- [ ] Confirm truncated strings (Settings/Reports/Billing subtitles) full text in Figma  

---

*End of import. Use this file as the single source for sizes, spacing, and copy until live Figma tokens are re-exported.*
