import { WORKSPACES, workspaceOwnsDepartment, type WorkspaceId } from "../../lib/workspace-hub";
import type { Actor, Draft, HubState, Kind, WorkRecord } from "./model";
import { dayOffset, statuses, today } from "./model";
import { emptyState } from "./service";
import type { Task, Invoice, Client, CalendarEvent } from "../../lib/types";

export function seedHub(db: {
  users: Actor[];
  tasks: Task[];
  invoices: Invoice[];
  clients: Client[];
  calendarEvents: CalendarEvent[];
}): HubState {
  const s = emptyState();
  const day = today();
  const stamp = new Date().toISOString();
  const add = (
    kind: Kind,
    workspaceId: WorkspaceId,
    title: string,
    ownerId: string,
    details: Record<string, string> = {},
    offset = 2,
    status = statuses[kind][0] ?? "Open",
    recordId?: string,
  ): WorkRecord => {
    const r: WorkRecord = {
      id: recordId ?? `DEMO-${kind}-${s.records.length + 1}`,
      kind,
      workspaceId,
      title,
      ownerId,
      details,
      description:
        "Illustrative TryGC workflow data. Replace with confirmed operational information.",
      collaborators: [],
      entityId: db.users.find((u) => u.id === ownerId)?.entityId ?? "eg",
      status,
      priority: "High",
      startDate: dayOffset(day, Math.min(-2, offset)),
      dueDate: dayOffset(day, offset),
      progress: status === "In Progress" ? 40 : 0,
      nextAction: "Confirm the next step with the owner",
      createdBy: ownerId,
      createdAt: stamp,
      updatedAt: stamp,
      completedAt: "",
      sourceId: "",
      archived: false,
    };
    s.records.push(r);
    return r;
  };
  for (const t of db.tasks) {
    const w = WORKSPACES.find((w) => workspaceOwnsDepartment(w.id, t.department));
    if (!w) continue;
    const r = add(
      "task",
      w.id,
      t.title,
      t.ownerId,
      { deliverable: t.deliverable, slaHours: String(t.slaHours) },
      0,
      t.status,
      t.id,
    );
    r.status = statuses.task.includes(t.status)
      ? t.status
      : t.status === "Pending Approval"
        ? "Under Review"
        : "Waiting";
    Object.assign(r, {
      description: t.description,
      entityId: t.entityId,
      startDate: t.startDate,
      dueDate: t.dueDate,
      progress: t.percent,
      nextAction: t.notes ?? t.deliverable,
    });
  }
  for (const c of db.clients) {
    const r = add(
      "client",
      "sales",
      c.name,
      c.accountManagerId,
      { contact: "Confirm client contact", industry: c.industry },
      7,
      c.status === "Churned" ? "Closed" : c.status,
      c.id,
    );
    r.entityId = c.entityId;
    r.nextAction = c.nextAction;
  }
  for (const b of db.invoices) {
    const r = add(
      "bill",
      "finance",
      b.number,
      b.ownerId ?? db.users.find((u) => u.department === "Finance")?.id ?? "core-essmat",
      {
        clientName:
          db.clients.find((c) => c.id === b.clientId)?.name ?? "Client pending confirmation",
        invoice: b.number,
        amount: String(b.amount),
        paid: String(b.paid),
        currency: b.currency,
        issueDate: b.issueDate,
        lastContact: b.lastFollowUp ?? "",
        promiseDate: b.promiseToPayDate ?? "",
      },
      0,
      b.paid >= b.amount ? "Paid" : b.paid > 0 ? "Partially Paid" : "Upcoming",
      b.id,
    );
    Object.assign(r, {
      entityId: b.entityId,
      startDate: b.issueDate,
      dueDate: b.dueDate,
      nextAction: b.nextAction ?? "Confirm invoice receipt and payment date",
    });
  }
  for (const e of db.calendarEvents) {
    const u = db.users.find((u) => u.id === e.organizerId);
    const w = WORKSPACES.find((w) => workspaceOwnsDepartment(w.id, u?.department));
    if (!w) continue;
    const r = add(
      "meeting",
      w.id,
      e.title,
      e.organizerId,
      { startTime: e.startTime, endTime: e.endTime, location: e.location ?? "" },
      1,
      e.status === "Cancelled" ? "Cancelled" : "Scheduled",
      e.id,
    );
    r.dueDate = e.date;
    r.startDate = e.date;
    r.collaborators = e.attendeeIds.filter((id) =>
      db.users.some((u) => u.id === id && workspaceOwnsDepartment(w.id, u.department)),
    );
  }
  const projects = [
    "Website Elite",
    "Onboarding Plan Execution",
    "Live Reports",
    "Customer Reports",
    "Finance / Sales Task Manager",
    "Company Profile",
    "Sales Enablement",
    "Back Office Project",
    "WhatsApp Pro Revamp",
    "API Health",
  ];
  const owners = [
    "core-uiux",
    "core-amr",
    "core-ismaiel",
    "core-alaa",
    "core-essmat",
    "core-uiux",
    "core-alaa",
    "core-abdelfattah",
    "core-sabry",
    "core-essmat",
  ];
  projects.forEach((title, i) => {
    const r = add(
      "project",
      "core",
      title,
      owners[i] ?? "core-essmat",
      {
        milestones: "Scope confirmed → implementation → review → handover",
        risk: i === 9 ? "Upstream API validation required" : "Review delivery dependencies",
      },
      i === 9 ? -1 : i + 2,
      i === 9 ? "Blocked" : "In Progress",
    );
    r.collaborators = ["core-amr", "core-essmat"].filter((id) => id !== r.ownerId);
    r.nextAction =
      i === 9
        ? "Confirm API recovery owner and ETA"
        : "Review milestone evidence and confirm the next delivery";
  });
  const p = s.records.find((r) => r.kind === "project" && r.title === "API Health");
  add(
    "blocker",
    "core",
    "API response validation is blocking release",
    "core-essmat",
    {
      projectId: p?.id ?? "",
      impact: "Release readiness cannot be confirmed",
      blockedTeam: "Development",
      escalationOwner: "core-amr",
    },
    -1,
  );
  add(
    "decision",
    "core",
    "Choose the reporting release sequence",
    "core-amr",
    {
      options: "Release internal reports first\nRelease client reports first",
      projectId:
        s.records.find((r) => r.kind === "project" && r.title === "Live Reports")?.id ?? "",
    },
    1,
  );
  const salesOwner = db.users.find((u) => u.department === "Sales")?.id ?? "core-essmat";
  const c = s.records.find((r) => r.kind === "client");
  if (c)
    add(
      "action",
      "sales",
      "Confirm campaign brief and next meeting",
      salesOwner,
      {
        clientId: c.id,
        activity: "Call",
        outcome: "Follow-up",
        lastOutcome: "Client requested scope clarification",
      },
      0,
    );
  const emp = add(
    "employee",
    "hr",
    "New joiner · demonstration profile",
    "hr-lead",
    {
      email: "new-joiner@example.invalid",
      department: "Operations",
      role: "Operations coordinator",
      joinDate: day,
      location: "Cairo",
    },
    7,
    "Onboarding",
  );
  add(
    "people-action",
    "hr",
    "Confirm induction and equipment handover",
    "hr-lead",
    { employeeId: emp.id, category: "Equipment" },
    0,
    "To Do",
  );
  add(
    "request",
    "data",
    "Weekly delivery performance report",
    "data-lead",
    {
      department: "Operations",
      businessQuestion: "Which delivery stages are causing missed deadlines?",
      metrics: "On-time delivery, overdue actions, blocked requests",
      source: "Workspace execution records",
      requestType: "Report",
      slaHours: "48",
    },
    1,
    "In Progress",
  );
  add(
    "data-issue",
    "data",
    "Missing owner mapping in reporting source",
    "data-lead",
    {
      source: "Operations export",
      impact: "Unassigned activity cannot be attributed",
      category: "Wrong mapping",
    },
    0,
  );
  for (const w of WORKSPACES) {
    const owner =
      db.users.find((u) => workspaceOwnsDepartment(w.id, u.department))?.id ?? "core-essmat";
    s.rules.push({
      id: `rule-${w.id}-daily`,
      workspaceId: w.id,
      title: `Review ${w.title} overdue work`,
      trigger: "daily",
      days: 0,
      hour: "08:00",
      kind: "task",
      action: "task",
      channel: "in-app",
      ownerId: owner,
      enabled: true,
      lastRun: "",
    });
  }
  return s;
}
