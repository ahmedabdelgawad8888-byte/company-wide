import guide from "./hr-guide.json" with { type: "json" };
import { today, type Actor, type Draft, type HubState, type WorkRecord } from "./model.ts";
import { access, createRecord, permission } from "./service.ts";
export { guide };
export const hrFlow = [
  "Not Started",
  "In Progress",
  "Pending Approval",
  "Approved",
  "Completed",
  "Closed",
];
export function initialHRSchedule(cadence: string, title: string, day: string) {
  if (!cadence) return { date: "", anchor: 31 };
  const d = new Date(`${day}T12:00:00Z`);
  let anchor = 31;
  if (cadence === "Daily") {
    while ([5, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
    anchor = d.getUTCDate();
  } else if (cadence === "Weekly") {
    d.setUTCDate(d.getUTCDate() + ((4 - d.getUTCDay() + 7) % 7));
    anchor = d.getUTCDate();
  } else {
    if (title === "Payroll Inputs & Attendance Validation") anchor = 28;
    if (title === "Bonus Processing") anchor = 26;
    const month = d.getUTCMonth();
    d.setUTCDate(1);
    if (cadence === "Quarterly") d.setUTCMonth(Math.floor(month / 3) * 3 + 2);
    if (cadence === "Semi-Annual") d.setUTCMonth(month < 6 ? 5 : 11);
    if (cadence === "Annual") d.setUTCMonth(11);
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(anchor, end));
    if (d.toISOString().slice(0, 10) < day)
      return { date: nextHRDate(d.toISOString().slice(0, 10), cadence, anchor), anchor };
  }
  return { date: d.toISOString().slice(0, 10), anchor };
}
export function ensureHRWorkspace(s: HubState, users: Actor[]) {
  const owner =
    users.find((u) => access(u, "hr") && u.role === "HR Specialist") ??
    users.find((u) => access(u, "hr") && u.role === "HR Manager") ??
    users.find((u) => access(u, "hr") && u.department === "HR");

  let changed = false;
  for (const task of guide.tasks) {
    const existing = s.records.find((r) => r.id === task.id);
    if (existing) {
      if (existing.ownerId === "unassigned" && owner) {
        existing.ownerId = owner.id;
        existing.details["approverId"] =
          users.find((u) => u.id !== owner.id && access(u, "hr") && u.role === "Group Admin")?.id ??
          "";
        existing.details["enabled"] = String(
          !!existing.details["selectedCadence"] && !!existing.details["approverId"],
        );
        changed = true;
      }
      continue;
    }
    const stamp = new Date().toISOString();
    const cadence =
      task.frequency
        .split(" / ")
        .find((c) =>
          ["Daily", "Weekly", "Monthly", "Quarterly", "Semi-Annual", "Annual"].includes(c),
        ) ?? "";
    const approver =
      users.find(
        (u) =>
          u.id !== owner?.id &&
          access(u, "hr") &&
          (task.approver.includes("Management") || task.approver === "Authorized Signatory"
            ? ["Group Admin", "Executive Management"].includes(u.role)
            : u.role === "HR Manager"),
      ) ??
      users.find(
        (u) =>
          u.id !== owner?.id &&
          access(u, "hr") &&
          ["Group Admin", "Executive Management"].includes(u.role),
      );
    const schedule = initialHRSchedule(cadence, task.task, today());
    s.records.push({
      id: task.id,
      workspaceId: "hr",
      kind: "routine",
      title: task.task,
      description: `${task.category}\nSource: ${guide.source}, HR Task Tracker row ${task.sourceRow}`,
      ownerId: owner?.id ?? "unassigned",
      collaborators: [],
      entityId: owner?.entityId ?? "eg",
      status: "In Progress",
      priority:
        task.priority === "High" ? "High" : task.priority === "Low / Normal" ? "Low" : "Medium",
      startDate: today(),
      dueDate: today(),
      progress: 0,
      nextAction: cadence
        ? "Complete the scheduled execution with evidence and approval"
        : "Start a task when a request or case is received",
      details: {
        portfolio: task.category,
        cadence: task.frequency,
        schedule: task.deadline,
        basis: "Confirmed",
        evidence: task.evidence,
        guideId: task.id,
        enabled: String(!!cadence && !!approver && !!owner),
        selectedCadence: cadence,
        nextExecution: schedule.date,
        anchorDay: String(schedule.anchor),
        approverId: approver?.id ?? "",
        calendar: "Sunday–Thursday; holidays require manual adjustment",
        defaultsVersion: "1",
        sourcePriority: task.priority,
        ownerRole: task.owner,
        sla: task.sla,
        approver: task.approver,
        sourceStatus: task.sourceStatus,
      },
      createdBy: owner?.id ?? "system",
      createdAt: stamp,
      updatedAt: stamp,
      completedAt: "",
      sourceId: "hr-guide:v1",
      archived: false,
    });
    changed = true;
  }
  return changed;
}
export function hrDraft(r: WorkRecord, day = today()): Draft {
  const task = guide.tasks.find((t) => t.id === r.id)!;
  return {
    workspaceId: "hr",
    kind: "hr-task",
    title: task.task,
    description: `${task.category}\n${guide.source} — HR Task Tracker row ${task.sourceRow}`,
    ownerId: r.ownerId,
    collaborators: [],
    entityId: r.entityId,
    status: "Not Started",
    priority: r.priority,
    startDate: day,
    dueDate: day,
    progress: 0,
    nextAction: `Provide ${task.evidence}; obtain ${task.approver} approval.`,
    details: {
      guideId: task.id,
      category: task.category,
      frequency: task.frequency,
      sourcePriority: task.priority,
      ownerRole: task.owner,
      deadline: task.deadline,
      sla: task.sla,
      evidence: task.evidence,
      approver: task.approver,
      approverId: r.details["approverId"] ?? "",
      sourceStatus: task.sourceStatus,
    },
  };
}
export function nextHRDate(day: string, cadence: string, anchor: number) {
  const d = new Date(`${day}T12:00:00Z`);
  if (cadence === "Daily" || cadence === "Weekly") {
    d.setUTCDate(d.getUTCDate() + (cadence === "Daily" ? 1 : 7));
    if (cadence === "Daily")
      while ([5, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  } else {
    const months = (
      { Monthly: 1, Quarterly: 3, "Semi-Annual": 6, Annual: 12 } as Record<string, number>
    )[cadence];
    if (!months) throw new Error("Choose a supported calendar frequency.");
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + months);
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(anchor, end));
  }
  return d.toISOString().slice(0, 10);
}
export function runHRSchedules(s: HubState, actor: Actor, users: Actor[], day: string) {
  for (const r of s.records.filter(
    (r) => r.sourceId === "hr-guide:v1" && !r.archived && r.details["enabled"] === "true",
  )) {
    const owner = users.find((u) => u.id === r.ownerId);
    if (!permission(actor, "hr", "administer") || !owner || !access(owner, "hr")) continue;
    let due = r.details["nextExecution"];
    let count = 0;
    while (due && count++ < 366) {
      const key = `${r.id}:${due}`;
      if (!s.records.some((x) => x.sourceId === key)) {
        const task = createRecord(s, actor, hrDraft(r, due), users);
        task.sourceId = key;
        task.startDate = day < due ? day : due;
      }
      if (due > day) break;
      r.details["lastExecution"] = due;
      due = nextHRDate(
        due,
        r.details["selectedCadence"] ?? "",
        Number(r.details["anchorDay"] ?? due.slice(8)),
      );
      r.details["nextExecution"] = due;
    }
  }
}
