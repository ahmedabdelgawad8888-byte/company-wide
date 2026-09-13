# Dev & Business Analysis — Excel reconciliation review

Reviewed September 13, 2026. **Reconciliation completed: 0 differences in the audited workbook fields.**

## Reconciliation result

The canonical baseline now imports all 97 requirements (255 person-days), 18 actions,
12 questions, 15 RAID entries, nine milestones and nine E2E stages. Owner labels are
preserved exactly from Excel; generated demo-person assignments have been removed
from the active PMO directory. Dates are evaluated from the workbook formulas.
The hub now derives 151 records directly from this baseline instead of the previous
40 manually authored records. All source fields remain available in record details.

On browser reload, the former generated records are archived with their local edits
intact. Existing canonical-import records are never overwritten by repeated loads.
The old application database is backed up at `trygc-pmo-before-excel-v1` in localStorage
before its read-only PMO baseline collections are replaced. Workbook owner labels are
responsibility labels, not newly created authentication accounts.

Verification: `python scripts/audit-pmo-workbook.py` reports zero compared-field
differences; TypeScript passes, all 66 unit tests pass, lint has zero errors
(30 existing warnings), and the production build passes. This does not claim visual
Excel chart parity, dynamic RAG parity, or verification of a user's existing browser state.

The workbook inconsistencies listed below remain unchanged. Records without dates
in the sheet remain undated rather than being assigned artificial due dates.

## Original findings (before reconciliation)

Source: `.dr-claw/chat-attachments/1789291215264/TryGC_PMO_Dashboard.xlsx`.
The source fingerprint and full comparison inputs are in `evidence.json`.

## Scope and limitations

Compared the attached workbook against the application's PMO seed data and inspected
the separate workspace-hub seed, provider, timeline, capacity and E2E implementations.
This is a source-code/baseline audit, not verification of a user's saved browser state
or a deployed site. No application records, saved user data or workbook cells were changed.
Only an audit script and evidence files were added.

## Findings

### P1 — Most requirements are absent; dashboard totals cannot match

`src/lib/data/pmo-seed.ts` contains 32 of 97 requirements: **65 missing**.
The workbook contains 17 DONE, 77 NEW and 3 TBC requirements; the app contains
5 DONE, 26 NEW and 1 TBC. Total effort is **255 person-days in Excel versus 106
in the app**. Capacity and dashboard summaries use this incomplete app collection.

Even included requirements have effort differences:

| Requirement | Excel person-days | App person-days |
|---|---:|---:|
| APR-08 | 3 | 5 |
| COM-01 | 3 | 5 |
| BRD-03 | 3 | 1 |

All missing IDs and field differences are in `differences.csv`.

### P1 — Questions are missing and existing IDs identify different subjects

There are 6 question records versus 12 workbook records. Q-07 through Q-12 are
absent by ID, but some of their topics were moved onto other IDs:

- App Q-02 concerns page size; Excel Q-02 concerns TikTok Spark Code access.
- App Q-03 concerns WhatsApp statuses; Excel Q-03 concerns page size.
- App Q-05 concerns Influencer History; Excel Q-05 concerns Scanner tabs.
- App Q-06 concerns notification thresholds; Excel Q-06 concerns demo campaign data.

This is not just missing text: ID-based traceability is unreliable. The source's
question kind, Arabic question, rationale and needed-by dates are not faithfully
preserved by the app question model/data.

### P1 — Dates and timeline do not reflect the workbook

All 32 included requirements lack the source start/ETA/week fields, and all nine
milestones lack forecast dates. `src/routes/pmo/timeline.tsx` substitutes fixed
wave week ranges instead of the workbook dates. For example, W1 starts September
21 in Excel (week 1), while the UI uses week 3.

Workbook milestone forecasts, calculated from its formulas:

| Gate | Forecast |
|---|---|
| M0 | 2026-09-21 |
| M1 | 2026-10-05 |
| M2 | 2026-10-09 |
| M3 | 2026-11-12 |
| M4 | 2026-12-22 |
| M5 | 2027-01-14 |
| M6 | 2027-02-03 |
| M7 | 2027-02-23 |
| M8 | 2027-03-09 |

### P1 — General workspace records are a separate, partial, manually authored seed

`src/features/workspaces/pmo-seed.ts` creates 40 records, including just 14 tasks
and seven wave projects. It does not import the canonical requirements collection.
It sets start dates to the date of loading and due dates to offsets from that date,
including the same 90-day due offset for every wave project.

It describes W0 as five delivered items rather than 17. It also adds operational
information not established by Excel: in-progress statuses, meetings with fixed
times, analysis requests and proposed decision options such as a 90-day lookback.
Those may be useful suggestions, but must not be presented as imported source facts.

The seed returns immediately if `PMO-WAVE-W0` exists.
`src/features/workspaces/provider.tsx` calls that seed when loading saved data;
therefore merely correcting the seed will not repair previously saved workspaces.
A migration must preserve user edits and identify conflicts rather than resetting data.

### P2 — Action, RAID and E2E details are incomplete

| Collection | Excel | App | Detail |
|---|---:|---:|---|
| Actions | 18 | 13 | ACT-12 through ACT-16 missing |
| RAID | 15 | 15 | Six records lose source related references |
| Milestones | 9 | 9 | Dates absent; some gate text differs |
| E2E stages | 9 | 9 | Stored counts/effort are zero; dates absent |

App-calculated E2E counts also rely on the incomplete requirements collection.
Some action references lose the second related requirement or Programme context.

## What matches

Plan start September 21, 2026; five working days per week; 28-week horizon;
effort-size mapping S=1, M=3, L=5, XL=8. All nine milestone IDs, nine E2E stage IDs
and 15 RAID IDs are present. Matching counts alone do not establish field parity.

## Workbook issues to preserve and flag, not silently "correct"

- RAID A-03 says 74 NEW requirements; the master register has 77.
- RAID R-02 says 14 clarifications, while the question log has 12 rows.
- ACT-18 has a March 8, 2027 due date, while calculated M8 is March 9, 2027.
- E2E "Start" formulas take the minimum ETA (column R), not the minimum start
  date (column Q). Audit evidence follows the actual formula.

## Verification and recommended correction

Reproduce: `python scripts/audit-pmo-workbook.py`
(requires openpyxl and Node with TypeScript stripping support).

The audit reports 357 missing-record/field differences. This number includes
omitted fields, text differences and model differences; it is not 357 independent
business errors. Reference zero-padding is normalized. Dynamic RAG formulas and
chart rendering are not included in this field comparison.

The three existing PMO workspace tests pass, but assert the current 40-record seed
and its schema/idempotence, not Excel parity.

Recommended next step: import the complete workbook into a single canonical
baseline, derive both PMO screens and hub records from it, add formula-aware
date handling and parity tests, then migrate saved workspaces non-destructively
with explicit handling for user edits and the workbook inconsistencies above.
