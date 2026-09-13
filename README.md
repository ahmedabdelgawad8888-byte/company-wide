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
breaks Vite imports. Files stay in their original folder.

- `BUILD_PRODUCTION.bat` — produce the deployment build.
- `SERVE_PRODUCTION.bat` — build for Node and serve it at `http://127.0.0.1:3000`,
  to check the real production bundle locally.

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

There are two build targets, and picking the wrong one is the usual cause of a
"broken" production build:

```bash
npm run build        # deployment build (Nitro, Cloudflare preset) -> .output/
npm run build:node   # same app built for a plain Node server
npm run start        # run the Node build (PORT / HOST respected, default 3000)
npm run preview      # build:node + start, in one step
```

`npx vite preview` does **not** work with this project: it looks for
`dist/server/server.js`, while the build emits a Nitro bundle under `.output/`.
Use `npm run preview` (or `SERVE_PRODUCTION.bat` on Windows) instead.

The default `npm run build` produces a Cloudflare worker. Preview it with
`npx wrangler --cwd ./ dev` and deploy it with `npx wrangler --cwd ./ deploy`.

## Checks

```bash
npm run verify   # typecheck + lint + unit tests
npm run test     # unit tests only
npm run qa       # full browser suite (starts its own server)
```

The browser suites boot their own dev server, so nothing needs to be running first.
Useful switches:

- `QA_BASE=http://127.0.0.1:3000 npm run qa` — test an already-running server
  (this is how the production build gets verified).
- `QA_HEADED=1 npm run qa:workflow` — watch the run in a visible browser.

Suites: `qa:smoke` (every route renders), `qa:workflow` (create → detail → persist
→ reload in each workspace), `qa:acceptance` (management queues, search, recovery),
`qa:dashboard` (charts, KPIs, record detail tabs), `qa:responsive` (phone layout,
accessible names, labelled fields, one `h1` per page).

A suite fails on a failed check **or** on any console error the app itself raised.
Errors from third-party origins (the web-font CDN) are reported separately and do
not fail the run.

## Data

The current build is local/demo-first and persists app state in browser storage. The storage key is isolated for this workspace edition so stale data from older Finance/Sales versions does not overwrite the new workspace seed.

Because the browser is the only copy, **Settings → Data & exports → Workspace data**
provides:

- **Download recovery copy** — writes the stored data to a JSON file. It reads
  storage directly, so it still works when the saved data is too damaged to load.
- **Restore from file** — validates a recovery copy before writing it, so importing
  a bad file cannot destroy the good copy it was meant to replace.
- **Reset workspace data** — clears storage and reseeds the demo set.

The same three actions appear on the "Unable to load workspace data" screen, so a
corrupted store can be exported and repaired instead of leaving the app stuck.

## AI Agent

The operating agent at `/agent` answers with metric tiles, a chart, a deep-dive, a
table and an action plan. That does not fit in a small token budget, and the old
2000-token ceiling truncated replies mid-sentence — which looked like the agent
disconnecting partway through an answer.

Long answers are now completed rather than cut:

- The per-turn budget is 8000 tokens (`MAX_OUTPUT_TOKENS` in
  `src/routes/api.agent.chat.ts`).
- The endpoint returns `finishReason`. When it is `"length"` the answer is
  incomplete, and the client automatically asks the agent to carry on, up to
  `MAX_CONTINUATIONS` (4) rounds — so the ceiling bounds a single turn, not the
  whole answer.
- Each round is appended to the same message and rendered as it arrives, so a long
  answer builds up on screen instead of appearing only at the end.
- If it is _still_ unfinished after the last round, the UI says so rather than
  leaving a silently truncated reply.

Joining the pieces is handled by `src/features/agent/continuation.ts`. Whether a
space belongs at the seam cannot be recovered from the text — `"the deliver"` +
`"ables"` must not gain one, `"items are"` + `"still"` must — so the model is
instructed to supply the leading whitespace itself and the halves are concatenated
exactly as given. Covered by `tests/agent-continuation.test.mjs`.

## Analytics

Vercel Analytics is off by default: it fetches `/_vercel/insights/script.js`, which
only exists when Vercel serves the app, so leaving it on made every page load 404 in
the console on any other host. Enable it with `VITE_ENABLE_ANALYTICS=true`.

## Design preservation

The original `src/styles.css`, `src/components/kit.tsx`, and all files under `src/components/ui/` were compared against the attached source build. 48 core design-system files matched byte-for-byte.
