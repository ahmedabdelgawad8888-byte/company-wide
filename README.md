# TryGC Workspace Hub

A workspace-first operating hub for TryGC. The UI/design system from the provided Trygc Command Center is preserved; the product structure is reorganized around five focused workspaces instead of a global Finance/Sales-heavy menu.

## Workspaces

### 1) Core Team
A shared command room for cross-functional execution.

Core seed team:
- Ahmed Essmat — Technology
- Amr — Operations
- Alaa — Business Analysis
- Abdel Fattah — IT
- Sabry — IT & Automation
- Ahmed Ismail — Development
- Ahmed — UI/UX

Core flow: shared priorities → blockers → decisions/meetings → owned actions → due dates → activity/automation review.

### 2) Sales
Daily commercial execution without turning the hub into a CRM suite.

Sales flow: client activity → outcome → next action → follow-up → meeting → commitment → performance.

### 3) Finance
A focused accounts and collection workspace.

Finance flow: bill → pre-due reminders → collection action → payment/promise-to-pay → overdue escalation → reporting.

### 4) HR
People actions, directory, interviews/meetings, HR calendar and people reporting.

### 5) Data Analysis
Analysis requests, blocked-data work, report delivery, data files, delivery calendar and insight reporting.

## UX behavior

- The workspace picker is the main context switch.
- Sidebar navigation changes completely by workspace.
- Quick Create only shows record types relevant to the current workspace.
- Global Search searches only the current workspace context.
- Tasks, Meetings, Calendar and Reports automatically scope themselves to the selected workspace.
- HR People Directory is directory-first, not chart-heavy.
- Data Files shows Data Analysis working files only.
- Notifications are filtered by workspace intent.
- Core Team prioritizes blockers and shared ownership rather than financial KPIs.

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
