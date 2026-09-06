# Trygc Operations OS — build roadmap

## Phase 1 (complete)
- [x] Design system (Trygc purple/orange, Outfit + Inter, light/dark)
- [x] Domain models + seeded Trygc demo data (SA/EG/AE/KW/QA/BH)
- [x] Store with relational actions + audit logging
- [x] Advanced data table (search, sort, columns, selection, bulk, export)
- [x] App shell: sidebar, topbar, entity scope, command palette, quick create, notifications, theme, EN/AR direction
- [x] Executive command center + exceptions
- [x] CRM: leads/deals pipeline, clients, Client 360
- [x] Campaign engine: list, detail, influencer workflow, posting coverage, health
- [x] Community workspace
- [x] Operations queues
- [x] Tasks & PMO (table, kanban, calendar, workload, SLA, automations)
- [x] Finance: entities, COA + requests, invoices, payments, expenses, FX, consolidation
- [x] Reports
- [x] Files
- [x] Admin: users, roles, integrations, migration, SaaS access, audit log
- [x] Brand favicon + logo from uploaded assets

## Phase 2 (architecture ready)
- Advanced accounting/period close, automation builder UI, pCloud live adapter,
  Zoho live import, full Arabic copy translation, deeper analytics.

## Visual pass (Sept 4)
- [x] Fixed pipeline-by-stage chart (funnel bars)
- [x] Use uploaded Trygc logo image everywhere
- [x] Added overview charts to CRM, campaigns, community, ops, tasks, finance and files pages

## Export, drill-down & permissions pass
- [x] Shared export preferences panel (date range, filters, columns, branding) applied to every CSV/PDF
- [x] Click any chart segment to filter the records table on that page (with clearable chip)
- [x] Export buttons hidden for roles without export rights; confidential client profitability gated

## Export queue, drill panel, export audit (done)
- Export queue with progress + ready notifications (top bar)
- Right-side drill-down panel with breadcrumbs and clearable filters
- Every CSV/PDF export written to the audit trail with filters and row counts

## Theme + dashboard analytics (Sep 4)
- [x] Single theme token system (color, type, spacing) used by all components
- [x] Dark mode contrast pass (text, borders, focus rings, status colors)
- [x] Reference chart palette/styling across overview + drill-down charts
- [x] Branding alignment (logo, header, sidebar accents, favicon, metadata)
- [x] Collections performance chart (collected vs invoiced) with drill-down
- [x] KPI metric strip: overdue receivables, cash collected MTD, campaign SLA, open approvals
- [x] Branch performance breakdown visual with global filter
- [x] Recent activity timeline widget linking to records
