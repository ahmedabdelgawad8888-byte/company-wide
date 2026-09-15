# HR and IT workspace configuration

## HR source and pages

`HR_Task_Management_Guide.xlsx`: 56 task definitions, 10 categories, all 560 task fields and 9 instructions retained exactly. Recurring definitions: 28; request-based definitions: 28. Instructions define execution statuses; source example statuses are not presented as work already completed.

HR has no named staff roster in the workbook. Bundled HR demo users and untouched demonstration profiles are removed. The guide starts unassigned until real staff are added; scheduled execution requires an active owner and separate approver. No names or email addresses are invented for HR.

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
- `npm run verify`: typecheck, repository lint and 102 tests.
- `npm run build`: production build.
- `npm run qa:hr`: no runtime errors; verifies add/edit/remove user, no resurrection, actual IT names, task creation, evidence/approval guard, scheduling, reporting, simplified navigation and mobile layout.
