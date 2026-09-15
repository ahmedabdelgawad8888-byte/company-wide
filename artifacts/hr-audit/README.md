# HR and IT workspace configuration

## HR source and pages

`HR_Task_Management_Guide.xlsx`: 56 task definitions, 10 categories, all 560 task fields and 9 instructions retained exactly. Recurring definitions: 28; request-based definitions: 28. Instructions define execution statuses; source example statuses are not presented as work already completed.

The user supplied the actual HR team: Menna (UAE), Fatma (KSA), Zakaria and Aya (Egypt). Each country has all 56 definitions, with 28 recurring schedules (168 definitions and 84 schedules overall). Egypt defaults to 28 definitions per person with the other as collaborator. A separate administrator approves executions. Country filters are available in the guide and reports. Emails remain blank because none were supplied. One-time directory import preserves later edits and removals. Previous generic definitions are archived; execution history remains available.

10 relevant navigation entries: HR Overview, Task Guide & Schedules, HR Tasks, Employee Directory, HR Calendar, Approvals, Evidence & Files, HR Reports, Activity & Audit, Notifications. The redundant HR Team page is merged into the editable directory. Old record links remain available for historical data.

The requested long explanation is removed from the interface. HR Tasks has category/frequency filters and saved views. HR Reports summarizes due-date cohorts by category. Evidence & Files surfaces attachments and references from visible HR tasks.

## Calendar defaults

Sunday–Thursday working week, Thursday weekly reports, month-end reviews, payroll validation on the 28th and bonuses on the 26th. Mixed monthly/quarterly schedules default to monthly. Quarterly, semi-annual and annual review checkpoints default to period end. Unknown case, joining, expiry and statutory dates remain per-task inputs. Holidays are not supplied; longer calendar cycles retain their dates and can be adjusted manually.

## Real users and IT ownership

User directory supports add, edit, suspend/reactivate via status, and permanent removal. Email uniqueness, reporting cycles, role permissions, self-removal and last-administrator protection are validated. Removal requires an eligible replacement for open work or approvals; completed history is retained. Removing an imported user does not recreate them on reload.

`trygc_it_manual.html` supplies eight individual names: Adel Hammad, A. Sabri, Mohamed Nasef, Mahmoud Taha, Abdelfatah Hamid, Reda, Raafat and Eslam. Tier-1 Support is a function, not an invented person. The IT directory preserves supplied spelling and roles. A. Sabri leads IT, Mohamed Nasef leads infrastructure/MDM, Mahmoud Taha owns backups, and Abdelfatah Hamid coordinates finance. Shared assignments retain collaborators; rotating router checks retain the documented rotation. No emails are supplied in the manual, so imported email fields are blank.

The manual's 11 task rows preserve titles, reference IDs, source owner labels, priorities, status and completion percentages. Source Completed maps to Done; On Hold maps to Waiting in the existing task workflow, with the source status retained. Dates are not invented. Existing user-edited records are not overwritten on subsequent loads.

## Persistence and verification

The application uses browser-local workspace and directory storage. These changes do not provision external identity-provider accounts or send invitations. Scheduling runs while a lead/admin has the app open and catches up on return. The publish checkout retains the newer PMO and production-readiness work from main at 56b5329.

- `python scripts/audit-hr-workbook.py`: 560 fields and 9 instructions; zero differences.
- `python scripts/audit-it-manual.py`: 8 names and 66 task fields; zero differences.
- `npm run verify`: typecheck, repository lint and 107 tests.
- `npm run build`: production build.
- `npm run qa:hr`: no runtime errors; verifies add/edit/remove user, no resurrection, actual IT names, task creation, evidence/approval guard, scheduling, reporting, simplified navigation and mobile layout.

## Dev & Business Analysis editing

All ten PMO pages provide a management editor. The Requirements Register also has direct row-level Edit / remove controls. Requirements, E2E stages, milestones, actions, RAID items and questions support creation, editing and removal. Dashboard, timeline, capacity and reports provide the same data controls plus delivery-plan settings. Edits persist across reloads, update derived views and synchronize affected operational records. Unrelated operational edits are retained. Requirement removal clears incoming dependency links and retains audit history.

- `npm run qa:country-pmo`: 168 HR definitions, 84 enabled schedules, all six PMO registers pass create/edit/remove/reload checks, and all four analytical pages expose plan editing; no runtime errors.
