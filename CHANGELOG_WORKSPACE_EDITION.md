# Workspace Edition — Changes

## Structural change

- Replaced the Finance/Sales-centric information architecture with five primary workspaces: Core Team, Sales, Finance, HR and Data Analysis.
- Added a persistent workspace context to the application store.
- Added workspace access rules and department ownership mapping.
- Changed `/` to land on `/workspace` instead of the old executive/role dashboard behavior.

## Core Team

- Added the requested cross-functional core roster and seeded ownership data.
- Added shared technology, IT/automation, BA, development, UI/UX and operations actions.
- Added core blocker/priority meeting and activity records.
- Added Core-specific navigation, reporting, overdue and automation flows.

## Sales

- Kept Sales activity, client follow-ups and meetings, but isolated them inside Sales workspace.
- Sales Quick Create and search no longer appear in unrelated workspaces.
- Added the Commission Calculator: won deals, accepted quotations/proposals and signed contracts scored against a configurable plan (flat/tiered/progressive rates, target, floor, accelerator, bonus, cap, hold-back and collaborator splits), with a per-line CSV statement.

## Finance

- Removed Finance as a global hub concept.
- Finance pages now belong only to Finance workspace navigation.
- Bills, payments, reminders, collection overdue and Finance reports stay intact.
- Added the Commission Calculator on a cash-collected basis, holding back commission on collections that arrived after the due date.

## HR

- Added HR workspace home, people actions, People Directory, meetings/calendar and reports.
- People Directory is intentionally table/directory-first instead of using decorative charts.

## Data Analysis

- Added Data workspace home, analysis queue, reports, Data Files, delivery calendar and activity.
- Added Data-specific sample tasks, activities and working files.

## Shared UX

- Workspace-specific sidebar.
- Workspace-specific global search.
- Workspace-specific Quick Create.
- Workspace-scoped Tasks, Meetings, Calendar, Overdue and Reports.
- Workspace-aware notifications.
- New local persistence key to prevent older-version stored state from overriding the workspace seed.

## Design system

- No redesign of core visual primitives.
- 48 original design-system files verified byte-for-byte unchanged.
