import * as baseline from "../../lib/data/pmo-seed.ts";
import type { Actor, HubState, Kind, WorkRecord } from "./model.ts";

const VERSION = "PMO-EXCEL-2026-09-13-v1";
const ownerId = (name: string) => `pmo-sheet:${name}`;
/** Workbook responsibility labels, not invented people or login accounts. */
export const pmoOwners: Actor[] = [
  ...new Set([
    ...baseline.pmoRequirements.map((r) => r.ownerRole),
    ...baseline.pmoMilestones.map((r) => r.owner),
    ...baseline.pmoActions.map((r) => r.owner),
    ...baseline.pmoQuestions.map((r) => r.owner),
    ...baseline.pmoRaidItems.map((r) => r.owner),
  ]),
]
  .filter(Boolean)
  .map((name) => ({
    id: ownerId(name),
    name,
    role: name,
    department: name,
    entityId: "",
    scope: "group",
    status: "active",
    workspaceId: "pmo",
    workspaceLevel: "member",
  }));

export function workbookRecords(): WorkRecord[] {
  const records: WorkRecord[] = [];
  const add = (
    sheet: string,
    key: string,
    kind: Kind,
    title: string,
    owner: string,
    startDate: string,
    dueDate: string,
    status: string,
    source: object,
    progress = 0,
  ) => {
    const details = Object.fromEntries(
      Object.entries(source).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]),
    );
    records.push({
      id: `PMO-XLS-${sheet}-${key}`,
      workspaceId: "pmo",
      kind,
      title,
      description: String(
        details["description"] ?? details["gateCriteria"] ?? details["impact"] ?? "",
      ),
      ownerId: ownerId(owner),
      collaborators: [],
      entityId: "",
      status,
      priority:
        details["priority"] === "P0"
          ? "Critical"
          : details["priority"] === "P1"
            ? "High"
            : "Medium",
      startDate,
      dueDate,
      progress,
      nextAction: details["acceptanceCriteria"] ?? details["mitigation"] ?? "",
      details: { ...details, sourceSheet: sheet, sourceKey: key, sourceOwner: owner },
      createdBy: "workbook-import",
      createdAt: `${baseline.pmoPlanConfig.planStartDate}T00:00:00.000Z`,
      updatedAt: `${baseline.pmoPlanConfig.planStartDate}T00:00:00.000Z`,
      completedAt: "",
      sourceId: VERSION,
      archived: false,
    });
  };
  for (const r of baseline.pmoRequirements) {
    add(
      "Master Register",
      r.id,
      "task",
      `[${r.id}] ${r.title}`,
      r.ownerRole,
      r.startDate!,
      r.etaDate!,
      r.pmoStatus === "Verify & Close"
        ? "Under Review"
        : r.pmoStatus === "Not Started"
          ? "Backlog"
          : r.pmoStatus === "Blocked - Clarification"
            ? "Blocked"
            : r.pmoStatus,
      { ...r, deliverable: r.acceptanceCriteria },
      r.percentDone,
    );
  }
  for (const m of baseline.pmoMilestones)
    add(
      "Milestones",
      m.id,
      "project",
      `[${m.id}] ${m.name}`,
      m.owner,
      baseline.pmoPlanConfig.planStartDate,
      m.forecastDate!,
      m.status === "Not Started" ? "Planned" : m.status,
      { ...m, milestones: m.gateCriteria },
    );
  for (const a of baseline.pmoActions)
    add(
      "Actions Log",
      a.id,
      "task",
      `[${a.id}] ${a.action}`,
      a.owner,
      a.raisedDate,
      a.dueDate,
      a.status === "Open" ? "To Do" : a.status === "Closed" ? "Done" : a.status,
      a,
    );
  for (const q of baseline.pmoQuestions)
    add(
      "Open Questions",
      q.id,
      "decision",
      `[${q.id}] ${q.question}`,
      q.owner,
      "",
      q.dueDate || "",
      q.status === "Deferred" ? "Deferred" : "Needed",
      q,
    );
  for (const r of baseline.pmoRaidItems)
    add(
      "RAID Log",
      r.id,
      "blocker",
      `[${r.id}] ${r.description}`,
      r.owner,
      "",
      "",
      r.status === "Closed" ? "Resolved" : "Open",
      { ...r, blockedTeam: r.owner, dateBasis: "No dates supplied in workbook" },
    );
  return records;
}

/** Import once without resetting local edits; retain legacy records in the archive. */
export function ensurePmoWorkspace(state: HubState, _users: Actor[]): boolean {
  if (state.executions.includes(VERSION)) return false;
  for (const record of state.records) {
    if (record.workspaceId === "pmo" && record.sourceId === "PMO delivery plan baseline") {
      record.archived = true;
      record.details["reconciliationNote"] =
        "Superseded by Excel import; retained with any local edits for recovery.";
    }
  }
  for (const record of workbookRecords()) {
    if (!state.records.some((r) => r.id === record.id)) state.records.push(record);
  }
  state.rules = state.rules.map((r) => (r.workspaceId === "pmo" ? { ...r, enabled: false } : r));
  state.views = state.views.filter((v) => !v.id.startsWith("PMO-VIEW-"));
  state.executions.push(VERSION);
  return true;
}
