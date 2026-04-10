# Havyn — Dashboard & Caseload: Full Context

This document describes the **authenticated “Tools” area**: layout, routes, roles, data sources, UI surfaces, and how **Dashboard** vs **Caseload** differ. It reflects the React app under `havyn/frontend` (as implemented in `DashboardLayout`, `DashboardPage`, `CaseloadPage`).

---

## Shell & navigation

- **Public shell**: `PublicLayout` wraps the site with `PublicNavbar`, `main.site-main`, and footer. The Havyn header is **sticky** (`z-index` above most content).
- **Tools sub-layout**: `DashboardLayout` renders **above** the page content:
  - A **non-sticky** tab bar (`.dashboard-subnav`) with links **Dashboard** and **Caseload** (scrolls away with the page).
  - Tab targets depend on role (see Routes).
- **`<Outlet />`** renders either `DashboardPage` or `CaseloadPage`.

---

## Routes

| Path pattern | Page | Notes |
|--------------|------|--------|
| `/admin`, `/manager`, `/staff`, `/dashboard` | `DashboardPage` | Fallback base `/dashboard` if role mapping differs |
| `/admin/caseload`, `/manager/caseload`, `/staff/caseload`, `/dashboard/caseload` | `CaseloadPage` | Same role-based prefix as dashboard |

All of these live **inside** `PublicLayout` (navbar + main) and **require** a recognized role from auth (`Admin`, `Manager`, or `SocialWorker` as `staff`). Unauthenticated users are sent to login.

---

## Roles & data scoping

### Admin

- **Dashboard**: Can filter aggregated data by **one or more active safehouses** via a **right sidebar** (checkboxes, city-first labels). With **no** safehouses selected, views are **aggregated across all** (client-side filtering of fetched datasets where applicable).
- **Caseload**: Sees **all residents** (subject to API page size); UI groups by **safehouse accordion** (sorted by city). Each accordion shows a **ResidentTable** for that house.

### Manager

- Scoped to **`user.safehouseId`** when present: dashboard API calls and caseload list filter to that safehouse.
- Headers use **city-first** safehouse labeling where data exists.

### Staff (Social Worker)

- Scoped to **`user.socialWorkerCode`**: residents assigned to that worker (client-side filter on caseload; dashboard hook filters residents/predictions/incidents similarly where implemented).
- Dashboard hides some org-wide widgets (e.g. certain donation/safehouse stats) or relabels copy (e.g. “Assigned Residents”, incident list titling).

---

## Dashboard (`DashboardPage.tsx`) — what it contains

**Purpose**: Executive / operational **overview**: KPI-style cards, ML-driven improvement bands, risk visualization, safehouse performance, incidents, donations (role-dependent), and **deep-dive modals**.

### Data loading (`useDashboardData`)

Parallel fetches (partial failures surface as a dismissible-style error list):

| Endpoint (concept) | Content |
|----------------------|---------|
| `GET /api/Residents/AllResidents?...` | Residents (paginated; scope query for manager / single safehouse admin filter) |
| `GET /api/ml/predictions` | Per-resident prediction rows (health/education/emotional/overall, tags, model version) |
| `GET /api/Donations/AllDonations?...` | Donations |
| `GET /api/IncidentReports/AllIncidents?...` | Incidents |
| `GET /api/DonationAllocations/All` | Donation → safehouse allocations |
| `GET /api/Safehouses/AllSafehouses?...` | Safehouse directory |
| `GET /api/Reports/SafehouseComparison` | Comparison metrics rows |

Admin **multi–safe-house** filter: when multiple IDs selected, residents/incidents/comparison/donations are filtered client-side to those houses; predictions filtered by resident membership.

### Main UI blocks (high level)

1. **Role context header** — Welcome line + subtitle (aggregated vs N safehouses selected / manager city / staff worker code).

2. **Stat cards** (row) — Examples: active (or assigned) residents, average progress score, donations (non-staff), high-severity open incidents, top ML performers count, needs-attention count, **active safehouse count** (click opens safehouse list modal for admin).

3. **60 Day Improvement Forecast** (card) — **Distribution bands** (Likely Improving / Uncertain / Needs Attention / Insufficient Data) with counts; clicking a band filters the **resident table** below. Default table: **Top 5 most improving**. Rows show domain bars + overall; click row → **resident detail modal**. “Insufficient data” band can show footnotes about missing domain scores.

4. **Risk Level Distribution** — Recharts **donut** of active residents by `currentRiskLevel` (Low/Medium/High/Critical); center shows active count; slice click → **modal listing residents** at that risk (navigate to resident modal from list).

5. **Recent Incidents** — List of recent incidents (type, severity, resident code, date, resolved); click → **incident detail modal**.

6. **Safehouse performance** — Bar chart of average domain scores **by safehouse** (labels **city-first**); bars clickable → **safehouse detail modal** (metrics, residents, incidents, etc.).

7. **Layout variance**
   - **Admin**: Risk + Incidents side-by-side; performance **full width** below.
   - **Manager / Staff**: Risk + **Performance** side-by-side; **Incidents** full width below (tighter copy).

8. **Recent Donations** (section; **hidden for staff**) — List with drill-in to **donation summary modal** (allocations by safehouse use **city labels**).

9. **Admin-only filter sidebar** — **Sticky** panel (`dashboard-filter-sticky`): “Filter Safehouses” checkboxes by active safehouse (city-first). `top` offset uses CSS variables so it clears the **main public navbar** only (subnav scrolls away).

### Modals / overlays (non-exhaustive but representative)

- **Resident**: demographics, case classification, risk/reintegration, safehouse (city/region), ML scores, counseling notes summary, etc.
- **Incident**: details + linked resident/safehouse (city-first).
- **Donation**: amounts, notes, allocation table.
- **Safehouse list** (from stat card): table → open **safehouse detail**.
- **Safehouse detail** (from chart): general info, chart row, comparison row, resident/incident snippets.
- **Risk level resident list**, **incident summary**, **unresolved high severity** list — contextual drill-downs.

---

## Caseload (`CaseloadPage.tsx`) — what it contains

**Purpose**: **Operational caseload management** — sortable, filterable **resident table(s)**, optional **accordion by safehouse** (admin), and a **slide-in detail panel** for one resident with ML + risk + reintegration context.

### Data loading (`fetchData`)

| Endpoint | Content |
|----------|---------|
| `GET /api/Residents/AllResidents?pageSize=200&pageIndex=1` | Residents |
| `GET /api/Safehouses/AllSafehouses?pageSize=20&pageIndex=1` | Safehouses (smaller page than dashboard) |
| `GET /api/ml/predictions` | Predictions → `Map<residentId, …>` |
| `GET /api/ml/incident-risk` | Per-resident incident risk tier + top factors → `Map` |
| `GET /api/ml/model-meta` | Reintegration reference classes by reintegration type |

### Client-side behavior

- **Role filter**: Manager → `safehouseId`; Staff → `assignedSocialWorker === workerCode`.
- **Filters** (`FilterBar`): case status (active+transferred default, or Active / Transferred / Closed / all), risk level, incident tier (Stable / Monitor Closely / High Alert), search by **internal code**; **Clear filters** when not default.
- **Sort**: columns include code, age, category, risk level, incident risk tier, overall progress %, status, worker (hidden for staff).

### UI by role

- **Admin**: Heading “All Safehouses — Caseload” + resident count; **accordion** per safehouse (header: **city** · name, badge count); each open panel is a `ResidentTable`.
- **Manager / Staff**: Single **card** with one `ResidentTable`.

### Detail panel (`DetailPanel`)

Fixed overlay + **right sliding panel** (blur backdrop). Sections include:

- **A** — Identity header (badges: status, **safehouse as city label**, worker).
- **B** — Case classification (category, subcategory flags, etc.).
- **C** — Risk & reintegration fields.
- **D** — **60-Day Progress Forecast** (health / education / emotional / overall) from predictions.
- **E** — **Incident Risk Assessment** (tier badge, top contributing factors). *(Flagged-for-review was removed from UI.)*
- **F** — **Family & Background** (collapsible).
- **G** — **Reintegration timeline** vs model reference stats by reintegration type.

Escape closes panel; clicking backdrop closes.

### Hooks / constraints

- `clearFilters` `useCallback` is declared **before** early returns to satisfy **Rules of Hooks**.

---

## Styling notes (dashboard filter + nav)

- **`--public-navbar-height`**, **`--dashboard-sticky-filter-gap`**, **`--dashboard-filter-sticky-top`** in `App.css` control sticky filter offset under the **main** navbar.
- **`.dashboard-subnav`**: `position: relative` — **not** sticky; tabs scroll with content.

---

## Files to read in the repo

| Area | Primary files |
|------|----------------|
| Routes | `frontend/src/App.tsx` |
| Tab shell | `frontend/src/layouts/DashboardLayout.tsx` |
| Dashboard | `frontend/src/pages/DashboardPage.tsx` |
| Caseload | `frontend/src/pages/CaseloadPage.tsx` |
| Global nav / tokens | `frontend/src/App.css`, `frontend/src/layouts/PublicLayout.tsx`, `frontend/src/components/PublicNavbar.tsx` |

---

## Summary one-liner

**Dashboard** = org metrics, ML improvement bands, risk donut, safehouse performance, incidents, donations, modals, and (admin) sticky safehouse filter. **Caseload** = filtered/sorted resident lists (accordion by house for admin) and a rich **per-resident** side panel with predictions, incident risk, and reintegration references.
