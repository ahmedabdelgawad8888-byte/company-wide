# TryGC Workspace Hub

A workspace-first operating hub for TryGC. The UI/design system from the provided Trygc Command Center is preserved; the product structure is organized around five focused workspaces instead of a global Finance/Sales-heavy menu.

## Workspaces

Every person belongs to **exactly one** workspace. Only Management (Group Admin /
Executive Management) sees every workspace. See `WORKSPACE_GUIDE.md` for the full model.

### 1) Management (admins & leadership)

The admin command room, with full visibility over every other workspace.

Seed team:

- Ahmed Abdelgawad — Management (Group Admin)
- Rana Al-Otaibi — Management (Executive Management)
- Ahmed Essmat — Technology (Group Admin)
- Amr — Operations
- Alaa — Business Analysis
- Ahmed Ismail — Development
- Ahmed — UI/UX
- Data Analysis Lead — Data Analysis

Management flow: shared priorities → blockers → decisions/meetings → owned actions → due dates → analysis requests → activity/automation review.

### 2) Sales

Daily commercial execution without turning the hub into a CRM suite.

Sales flow: client activity → outcome → next action → follow-up → meeting → commitment → performance.

Commission Calculator: won deals, accepted quotations and signed contracts feed a tiered plan with targets, accelerators, hold-backs and a per-line statement export.

### 3) Finance

A focused accounts and collection workspace.

Finance flow: bill → pre-due reminders → collection action → payment/promise-to-pay → overdue escalation → reporting.

Commission Calculator: the same engine paid on cash actually collected, with a hold-back on collections that landed after the due date.

### 4) HR

People actions, directory, interviews/meetings, HR calendar and people reporting.

### 5) IT

Infrastructure and connectivity, backup and disaster recovery, support, devices, access governance, recurring controls, SOPs and IT reporting. The seeded operating model includes 10 portfolios, daily/weekly/monthly routine definitions, continuous processes, data-quality controls and automation recommendations.

Seed team:

- Mahmoud Taha — IT workspace lead
- Bader Al-Qahtani — IT supervisor / backup owner
- Abdel Fattah — IT support
- Sabry — IT automation

## Role hierarchy

Inside each workspace there are three levels, and visibility follows them:

- **Member** — sees only records they own, created, or collaborate on.
- **Supervisor** — sees their own records plus everything owned by their direct reports.
- **Workspace lead** — sees every record in their own workspace.
- **Management / Admin** — sees every record in all workspaces.

Assignment follows the same line: members assign only to themselves, supervisors to
their reports, leads across their workspace, admins anywhere. A person's workspace and
level are set on their user record (`workspaceId`, `workspaceLevel`, `managerId`).

## UX behavior

- The workspace picker is the main context switch.
- Sidebar navigation changes completely by workspace.
- Quick Create only shows record types relevant to the current workspace.
- Global Search searches only the current workspace context.
- Tasks, Meetings, Calendar and Reports automatically scope themselves to the selected workspace.
- HR People Directory is directory-first, not chart-heavy.
- Files & Data shows Management working files and analysis outputs.
- Notifications are filtered by workspace intent.
- Management prioritizes blockers and shared ownership rather than financial KPIs.

## Run locally

### Windows

Double-click `START_TRYGC_HUB.bat`.

The local preview runs at `http://127.0.0.1:5173`. The Windows launchers automatically
use an available drive alias when the project path contains `#`, which otherwise
breaks Vite imports. Files stay in their original folder. Use `BUILD_PRODUCTION.bat`
to build with the same path handling.

### macOS / Linux

```bash
chmod +x START_TRYGC_HUB.sh
./START_TRYGC_HUB.sh
```

Or run manually:

```bash
npm install
npm run dev
```

Node.js 20+ is recommended.

## Production build

```bash
npm install
npm run build
```

## Data

The current build is local/demo-first and persists app state in browser storage. The storage key is isolated for this workspace edition so stale data from older Finance/Sales versions does not overwrite the new workspace seed.

## Design preservation

The original `src/styles.css`, `src/components/kit.tsx`, and all files under `src/components/ui/` were compared against the attached source build. 48 core design-system files matched byte-for-byte.
