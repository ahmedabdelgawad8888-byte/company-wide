# TryGC Workspace Guide

The hub is organised as **four separate workspaces**. Every person belongs to exactly
one of them. Only Management (Group Admin / Executive Management) sees all four.

## Visibility model

Each workspace has a three-level hierarchy. What a person sees is decided by their level:

| Level                  | Sees                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------- |
| **Member**             | Only records they own, created, or are a collaborator on — their own profile of work. |
| **Supervisor**         | Their own records **plus** everything owned by people reporting to them.              |
| **Workspace lead**     | Every record in their own workspace.                                                  |
| **Management / Admin** | Every record in **all four** workspaces.                                              |

Assignment follows the same line: a member can only assign work to themselves, a
supervisor to their direct reports, a lead to anyone in their workspace, an admin to anyone.

Each person's home workspace and level live on their user record (`workspaceId`,
`workspaceLevel`, `managerId` in `src/lib/data/seed.ts`); role names are only a fallback.

## Management Workspace

**Purpose:** the admin and leadership room — cross-team priorities, decisions, blockers,
approvals, analysis requests, automation and full oversight of Sales, Finance and HR.

**Home shows:**

- Shared priorities
- Critical blockers
- Overdue actions
- Upcoming decisions
- Workspace member ownership cards

**Navigation:** Management Home · Shared Priorities · Decisions & Meetings · Blockers & Overdue · Management Calendar · Automation Center · People & Access · Activity & Changes · Group Reports · Files & Data

**Record types:** Project · Decision · Blocker · Analysis Request · Data Issue · Task · Meeting · File · Approval

**Working rule:** meetings produce decisions; decisions produce one owner + one due date; execution is tracked in the shared action queue.

## Sales Workspace

**Purpose:** keep every customer interaction connected to a clear next action.

**Navigation:** Sales Home · Sales Activity · Clients & Follow-ups · Sales Actions · Client Meetings · Sales Calendar · Sales Performance

**Working rule:** every call/meeting needs an outcome; every open commitment needs a next action and deadline.

## Finance Workspace

**Purpose:** protect cash flow and prevent missed due dates.

**Navigation:** Finance Home · Bills & Collections · Payments · Finance Actions · Collection Overdue · Due Calendar · Finance Reports

**Working rule:** bills create pre-due follow-up actions; unpaid items move into overdue control until a financial outcome is confirmed.

## HR Workspace

**Purpose:** make people operations clear and owned.

**Navigation:** HR Home · People Actions · People Directory · Interviews & Meetings · HR Calendar · People Reports

**Working rule:** joining, onboarding, attendance, interviews and employee actions stay assigned with a due date. HR records stay private to their owner unless the HR lead or Management is looking.

## Seeded hierarchy (demo data)

| Workspace  | Lead                                           | Supervisors                                                             | Members                                                                          |
| ---------- | ---------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Management | Ahmed Abdelgawad, Rana Al-Otaibi, Ahmed Essmat | Omar Shalaby, Hessa Al-Sabah, Bader Al-Qahtani, Amr, Data Analysis Lead | Mariam Zaki, Tarek Nabil, Alaa, Abdel Fattah, Sabry, Ahmed Ismail, Ahmed — UI/UX |
| Sales      | Faisal Al-Harbi                                | Youssef Adel                                                            | Layla Mansour, Sara Al-Dossary, Dina Salem                                       |
| Finance    | Mostafa Kamel                                  | —                                                                       | Nourhan Fathy                                                                    |
| HR         | HR Team Lead                                   | —                                                                       | Hala Nasser                                                                      |

Use the **Switch demo user** menu in the profile dropdown to see the model in action.
