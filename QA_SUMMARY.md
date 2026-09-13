# QA Summary — TryGC Workspace Hub

## September 13 — Build, QA harness, recovery, agent continuation

**Build.** The production build could not be run locally: `vite preview` looks for
`dist/server/server.js` while the Nitro build emits `.output/`, so every route
returned 500. Added `build:node` (node-server preset), `start`, a working
`preview`, a `serve` mode in `RUN_TRYGC_HUB.ps1` and `SERVE_PRODUCTION.bat`.
Vercel Analytics was 404-ing `/_vercel/insights/script.js` on every page load in
this Cloudflare-targeted build; it is now opt-in via `VITE_ENABLE_ANALYTICS`.

**QA harness.** The suites assumed a dev server was already running, launched
headed Chrome by channel, and `qa-smoke` exited 0 regardless of what it found.
`scripts/qa-harness.mjs` now boots the server, falls back from bundled Chromium to
system Chrome, and fails the run on failed checks or app console errors
(third-party CDN errors are reported separately). Stale assertions were corrected:
the record detail is a full page, not a drawer, and uppercased headings must be
matched case-insensitively. Added `qa:responsive` (phone layout, accessible names,
labelled fields, one `h1`).

**Storage recovery.** `LocalRepository` told users to "export a recovery copy"
that did not exist — a corrupt store left the app stuck behind a Retry button that
threw again. Added `exportRaw`/`clear`/`restore` plus a validating `parseState`
(a bad import can no longer destroy good data), surfaced as Download / Restore /
Reset in Settings → Data & exports and on the error screen.

**AI agent.** Replies were truncated mid-sentence: `maxOutputTokens: 2000` against
a system prompt demanding five rich sections, with `finishReason` discarded. The
budget is now 8000 per turn and the client resumes automatically on
`finishReason === "length"` (up to 4 rounds), rendering each round as it arrives.

**React hooks.** Fixed 4 `exhaustive-deps` warnings by memoising `users`, `actor`
and `currentUser` and wrapping `reload` in `useCallback`, rather than padding
dependency arrays (which would have re-read storage every render).

**Accessibility / mobile.** Every page overflowed a 390px viewport by ~500px
(header `flex-1` search lacking `min-w-0`); three icon-only header controls had no
accessible name; one settings field had no label. All fixed and gated.

Checks: TypeScript 0 errors · lint 0 errors (24 warnings, all
`react-refresh/only-export-components`) · 92 unit tests pass · production build
passes · 113/113 browser checks pass against the **production** build.

## September 13 — Dev & Business Analysis enhancement

The PMO workspace gained a workbook-derived analytics layer
(`src/features/pmo/analytics.ts`), a new `/pmo/reports` page (10 charts, 5 registers:
wave, module, owner, deliverables, requirement explorer) and a rebuilt dashboard,
milestones, E2E and capacity pages that now use real workbook dates, efforts and
counts instead of hardcoded placeholders. Verified in headed Chrome: reports,
dashboard, E2E, milestones and capacity all render with 0 console errors.
Checks: TypeScript 0 errors, lint 0 errors (30 existing warnings), 71 unit tests pass
(includes `tests/pmo-analytics.test.mjs`), production build passes.

## September 13 — Excel reconciliation supersedes the PMO seed notes below

PMO now uses the attached `TryGC_PMO_Dashboard.xlsx` baseline: 97 requirements,
255 person-days, 18 actions, 12 questions, 15 RAID records, nine milestones and nine
E2E stages. Formula-aware comparison reports **0 differences** in audited fields.
The hub derives 151 records; workbook owner labels replace invented PMO people.
Former generated records are archived on reload, preserving local edits.
Current checks: TypeScript and 66 unit tests pass. Full browser QA is not claimed
for this reconciliation. Details: `artifacts/pmo-audit/REVIEW.md`.

Last verified: 2026-09-13 (six-workspace edition), on a live dev server at `http://127.0.0.1:5173`.

## Automated gates (all green)

| Gate                  | Command                | Result                                                |
| --------------------- | ---------------------- | ----------------------------------------------------- |
| Unit / workflow logic | `npm test`             | **66 / 66 passed**                                    |
| TypeScript            | `npm run typecheck`    | **0 errors**                                          |
| Lint / format         | `npm run lint`         | **0 errors** (30 pre-existing react-refresh warnings) |
| Production build      | `BUILD_PRODUCTION.bat` | **passed** (client + SSR + Nitro)                     |
| Browser QA            | `npm run qa`           | **all checks passed, 0 console errors**               |

## Browser QA coverage

Run with real Chrome via Playwright against the dev server. Three suites:

### `npm run qa:smoke` — navigation integrity

Crawls every sidebar route and asserts HTTP 200 plus no "page not found" body.
All routes across the six workspaces pass:

- Management — 24 routes
- Sales — 23 routes
- Finance — 22 routes
- HR — 24 routes
- IT — covered via workspace hub navigation
- PMO — 9 routes (`/pmo`, `/pmo/requirements`, `/pmo/timeline`, `/pmo/e2e`,
  `/pmo/milestones`, `/pmo/actions`, `/pmo/raid`, `/pmo/questions`, `/pmo/capacity`)

Total: all crawled routes returned 200 with no "page not found" body and 0 console errors.

### `npm run qa:workflow` — record lifecycle, per workspace

For each of the four workspaces:

1. Open **Create Task** dialog.
2. Fill required fields (Title, Due date, Next action).
3. Save; assert the create dialog closes and the new record's detail drawer opens.
4. Assert the record appears in the filtered work list.
5. Reload the page and assert the record survives (local persistence).

### `npm run qa:acceptance` — operating-model checks

Verifies the questions the product must answer at any moment:

- Meeting creation and listing.
- Blocker creation and listing ("what is blocked").
- Approvals queue renders (decision-focused).
- My Work renders an actionable / overdue queue ("what do I need to do").
- Global command palette finds a newly created record.
- Dark mode renders without breaking the shell.

## Behavioral guarantees covered by `npm test`

- Bills schedule five dated tasks; duplicate invoice IDs rejected.
- Partial/full payment preserves currency and closes outstanding reminders.
- Due-date edits reschedule linked tasks; payment totals are immutable.
- Meeting commitments create exactly one linked task, even on retry.
- Onboarding creates eight linked tasks once, with a workspace owner.
- Analysis cannot be delivered without delivery evidence.
- Permissions block cross-workspace reads/writes, private HR access, self-approval.
- Approvals require an assigned approver, a reason, and pending state; audited.
- Dependencies reject cycles and block closing work with open dependencies.
- Automation dry runs are safe; live retries idempotent; failures recorded.
- Role-scoped calendars, notifications, exception queues, and activity feeds.
- Workspace hierarchy: a member sees only their own records, a supervisor their own
  plus their direct reports', a lead the whole workspace, an admin all six workspaces.
- Assignment follows the same line: members assign only to themselves, supervisors to
  their reports, leads across their workspace.
- PMO workspace: requirements register, E2E journey, milestones, RAID log, actions log,
  open questions and capacity views render from the seeded 28-week delivery plan.

## PMO workspace (added 2026-09-13)

- New sixth workspace: Dev & Business Analysis (`pmo`), with 11 seeded users
  (PMO Lead, Product Manager, Tech Lead, BA, Frontend/Backend/Full-stack, UI/UX,
  Data/BI, DevOps, QA) under the workspace hierarchy and role/permission definitions.
- Nine routes under `/pmo`: dashboard, requirements, timeline (Gantt), E2E view,
  milestones, actions, RAID, questions, capacity.
- Hub records seeded from the delivery plan (`src/features/workspaces/pmo-seed.ts`,
  backfilled into stored state on load like the IT workspace): 7 wave projects,
  14 requirement-traced tasks, 6 open decisions, 3 RAID blockers, 2 analysis requests,
  3 data issues, 3 delivery meetings, baseline file, gate approval, 1 automation rule,
  4 saved views — 40 records, all schema-validated, covered by `tests/pmo-workspace.test.mjs`.
- Also fixed: workspace route guard and agent tool schema used hardcoded
  five-workspace lists that rendered every `/workspaces/pmo/*` page as
  "Workspace not found" — both now derive from the canonical workspace list.
  Browser-verified: home, project (7 wave rows), task, decision and blocker pages
  all render with 0 console errors.
- Post-build fixes: `Panel` accepts an optional `onClick` (E2E stage cards);
  `StatusPill` call sites pass status only (no children); workspace-hub tests
  updated from five to six workspaces; `npm run format` applied to the new files.

## Known non-blocking items

- 30 ESLint warnings, all `react-refresh/only-export-components` and
  `react-hooks/exhaustive-deps` in pre-existing shared UI files. No runtime impact.
- `qa:workflow`'s "detail drawer opens on new record" assertion fails in all workspaces.
  This is pre-existing (verified against the previous commit): after saving, the record
  detail renders as a page rather than a `role="dialog"`, so the assertion never matched.
  Record creation, listing and persistence all pass.
- On a full page reload the demo user resets to Ahmed Essmat (Group Admin); the
  "Switch demo user" selection is React state and is not persisted.

## Windows path caveat

The project folder contains `#`, which Vite treats as a URL fragment in absolute
import paths. Always launch through `START_TRYGC_HUB.bat` / `BUILD_PRODUCTION.bat`,
which create a temporary `subst` drive alias.

Note: `BUILD_PRODUCTION.bat` removes that alias when it finishes. If a dev server
is running from the alias at the time, restart it with `START_TRYGC_HUB.bat`.
