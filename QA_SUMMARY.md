# QA Summary — TryGC Workspace Hub

Last verified: 2026-09-06, on a live dev server at `http://127.0.0.1:5173`.

## Automated gates (all green)

| Gate                  | Command                | Result                                                |
| --------------------- | ---------------------- | ----------------------------------------------------- |
| Unit / workflow logic | `npm test`             | **40 / 40 passed**                                    |
| TypeScript            | `npm run typecheck`    | **0 errors**                                          |
| Lint / format         | `npm run lint`         | **0 errors** (23 pre-existing react-refresh warnings) |
| Production build      | `BUILD_PRODUCTION.bat` | **passed** (client + SSR + Nitro)                     |
| Browser QA            | `npm run qa`           | **all checks passed, 0 console errors**               |

## Browser QA coverage

Run with real Chrome via Playwright against the dev server. Three suites:

### `npm run qa:smoke` — navigation integrity

Crawls every sidebar route and asserts HTTP 200 plus no "page not found" body.
All routes across the five workspaces pass:

- Core Team — 18 routes
- Sales — 19 routes
- Finance — 18 routes
- HR — 20 routes
- Data Analysis — 16 routes

### `npm run qa:workflow` — record lifecycle, per workspace

For each of the five workspaces:

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

## Known non-blocking items

- 23 ESLint warnings, all `react-refresh/only-export-components` and
  `react-hooks/exhaustive-deps` in pre-existing shared UI files. No runtime impact.

## Windows path caveat

The project folder contains `#`, which Vite treats as a URL fragment in absolute
import paths. Always launch through `START_TRYGC_HUB.bat` / `BUILD_PRODUCTION.bat`,
which create a temporary `subst` drive alias.

Note: `BUILD_PRODUCTION.bat` removes that alias when it finishes. If a dev server
is running from the alias at the time, restart it with `START_TRYGC_HUB.bat`.
