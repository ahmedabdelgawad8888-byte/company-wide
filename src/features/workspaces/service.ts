import {
  getWorkspaceIdsForUser,
  getWorkspaceLevel,
  getHomeWorkspace,
  isAdminUser,
  type WorkspaceId,
  type WorkspaceLevel,
} from "../../lib/workspace-hub.ts";
import {
  recordSchema,
  fields,
  workspaceKinds,
  statuses,
  dayOffset,
  overdue,
  closed,
  type Actor,
  type Draft,
  type HubState,
  type WorkRecord,
  type Rule,
} from "./model.ts";

export const id = (prefix = "REC") => `${prefix}-${crypto.randomUUID()}`;
/** Group Admin / Executive Management: above every workspace, see and steer all of them. */
export const executive = (a: Actor) => isAdminUser(a);
/** Where this person sits in their own workspace. */
export const level = (a: Actor): WorkspaceLevel => getWorkspaceLevel(a);
/** The one workspace this person belongs to. */
export const homeWorkspace = (a: Actor): WorkspaceId => getHomeWorkspace(a);
/** Leads run their whole workspace; admins run all of them. */
export const manager = (a: Actor) => executive(a) || level(a) === "lead";
/** Supervisors sit between a lead and the members reporting to them. */
export const supervisor = (a: Actor) => manager(a) || level(a) === "supervisor";
/** True when the record belongs to this person: owned, created, or shared with them. */
export const ownWork = (a: Actor, r: WorkRecord) =>
  r.ownerId === a.id || r.createdBy === a.id || r.collaborators.includes(a.id);
/** True when the record is owned by somebody reporting to this person. */
export const reportWork = (a: Actor, r: WorkRecord) =>
  (a.reportIds ?? []).includes(r.ownerId) || (a.reportIds ?? []).includes(r.createdBy);
export function access(a: Actor, w: WorkspaceId) {
  return a.status === "active" && getWorkspaceIdsForUser(a).includes(w);
}
/**
 * Record visibility, in one place:
 * admin      - every record in every workspace
 * lead       - every record in their own workspace
 * supervisor - their own records plus their reports'
 * member     - only their own records
 */
export function visible(a: Actor, r: WorkRecord) {
  if (!access(a, r.workspaceId) || r.archived) return false;
  if (executive(a)) return true;
  if (a.scope === "entity" && a.entityId !== r.entityId) return false;
  if (level(a) === "lead") return true;
  if (level(a) === "supervisor") return ownWork(a, r) || reportWork(a, r);
  return ownWork(a, r);
}
/** Who this person may put work on: themselves, plus their reports (supervisor) or anyone (lead/admin). */
export function canAssignTo(a: Actor, ownerId: string) {
  if (ownerId === a.id || manager(a)) return true;
  return level(a) === "supervisor" && (a.reportIds ?? []).includes(ownerId);
}
/** Whether one person's profile card is visible to another inside a workspace. */
export function personVisible(a: Actor, u: Actor, w: WorkspaceId) {
  if (!access(u, w)) return false;
  if (u.id === a.id) return true;
  if (manager(a)) return true;
  if (level(a) === "supervisor") return (a.reportIds ?? []).includes(u.id);
  return u.id === a.managerId;
}
/**
 * Who a person may settle commission for. Same hierarchy as personVisible, with
 * one deliberate difference: someone offboarding still appears, because work they
 * closed before leaving must still be paid out.
 */
export function payeeVisible(a: Actor, u: Actor, w: WorkspaceId) {
  if (!getWorkspaceIdsForUser(u).includes(w)) return false;
  if (u.id === a.id) return true;
  if (manager(a)) return true;
  if (level(a) === "supervisor") return (a.reportIds ?? []).includes(u.id);
  return u.id === a.managerId;
}
export function permission(
  a: Actor,
  w: WorkspaceId,
  action: "view" | "create" | "edit" | "delete" | "assign" | "approve" | "export" | "administer",
  r?: WorkRecord,
) {
  if (!access(a, w) || (r && !visible(a, r))) return false;
  if (action === "view") return true;
  if (a.role === "Viewer") return false;
  if (action === "administer" || action === "delete") return manager(a);
  // Supervisors may hand work to their own reports; leads and admins to anyone.
  if (action === "assign")
    return manager(a) || (level(a) === "supervisor" && (!r || reportWork(a, r)));
  if (action === "approve") return !!r && r.ownerId === a.id && r.createdBy !== a.id;
  if (action === "edit")
    return (
      manager(a) || (!!r && (ownWork(a, r) || (level(a) === "supervisor" && reportWork(a, r))))
    );
  return true;
}
export function requirePermission(
  a: Actor,
  w: WorkspaceId,
  action: Parameters<typeof permission>[2],
  r?: WorkRecord,
) {
  if (!permission(a, w, action, r))
    throw new Error("Permission denied. Ask your workspace manager for access.");
}
export function emptyState(): HubState {
  return {
    version: 2,
    revision: 0,
    records: [],
    comments: [],
    audit: [],
    notifications: [],
    rules: [],
    runs: [],
    views: [],
    attachments: [],
    executions: [],
  };
}
function audit(
  s: HubState,
  a: Actor,
  r: WorkRecord,
  action: string,
  before: unknown,
  after: unknown,
) {
  s.audit.unshift({
    id: id("AUD"),
    recordId: r.id,
    workspaceId: r.workspaceId,
    actorId: a.id,
    action,
    at: new Date().toISOString(),
    before: JSON.stringify(before),
    after: JSON.stringify(after),
  });
}
function notify(s: HubState, r: WorkRecord, userId: string, title: string, key: string) {
  if (s.notifications.some((n) => n.id === key)) return;
  s.notifications.unshift({
    id: key,
    recordId: r.id,
    workspaceId: r.workspaceId,
    userId,
    title,
    at: new Date().toISOString(),
    read: false,
  });
}
function validate(s: HubState, a: Actor, d: Draft, users: Actor[], existing?: WorkRecord) {
  requirePermission(a, d.workspaceId, existing ? "edit" : "create", existing);
  if (!workspaceKinds[d.workspaceId].includes(d.kind))
    throw new Error("This record type belongs to a different workspace.");
  if (!statuses[d.kind].includes(d.status)) throw new Error("Invalid status for this workflow.");
  if (d.dueDate < d.startDate) throw new Error("Due date must be on or after the start date.");
  if (
    d.ownerId !== a.id &&
    (!existing || existing.ownerId !== d.ownerId) &&
    !canAssignTo(a, d.ownerId)
  )
    throw new Error(
      "You can only assign work to yourself or to people who report to you. Ask your workspace lead.",
    );
  const owner = users.find((u) => u.id === d.ownerId);
  if (!owner || !access(owner, d.workspaceId))
    throw new Error("Select an active owner with workspace access.");
  for (const memberId of d.collaborators)
    if (!users.some((u) => u.id === memberId && access(u, d.workspaceId)))
      throw new Error("Collaborators must belong to this workspace.");
  for (const f of fields[d.kind]) {
    const value = d.details[f.key]?.trim() ?? "";
    if (f.required && !value) throw new Error(`${f.en} is required.`);
    if (value && f.type === "number" && (!Number.isFinite(Number(value)) || Number(value) <= 0))
      throw new Error(`${f.en} must be greater than zero.`);
    if (value && f.type === "url" && !/^https?:\/\/\S+$/i.test(value))
      throw new Error(`${f.en} must be an HTTP or HTTPS link.`);
    if (value && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      throw new Error("Enter a valid work email.");
    if (
      value &&
      f.type === "date" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)))
    )
      throw new Error(`${f.en} is not a valid date.`);
    if (value && f.options && !f.options.includes(value)) throw new Error(`Invalid ${f.en}.`);
    if (
      value &&
      f.link &&
      !s.records.some(
        (r) =>
          r.id === value && r.kind === f.link && r.workspaceId === d.workspaceId && visible(a, r),
      )
    )
      throw new Error(`${f.en} is not an accessible record in this workspace.`);
  }
  if (
    ["meeting", "interview"].includes(d.kind) &&
    String(d.details["endTime"]) <= String(d.details["startTime"])
  )
    throw new Error("Meeting end must be after the start time.");
  if (existing && d.details["dependencyId"] === existing.id)
    throw new Error("A record cannot depend on itself.");
  if (d.details["dependencyId"]) {
    const visited = new Set<string>(existing ? [existing.id] : []);
    let ref = d.details["dependencyId"];
    while (ref) {
      if (visited.has(ref)) throw new Error("This dependency would create a cycle.");
      visited.add(ref);
      ref = s.records.find((r) => r.id === ref)?.details["dependencyId"] ?? "";
    }
  }
  if (["Done", "Completed", "Delivered"].includes(d.status) && d.details["dependencyId"]) {
    const dep = s.records.find((r) => r.id === d.details["dependencyId"]);
    if (dep && !closed(dep)) throw new Error("Complete the dependency before closing this work.");
  }
  if (d.kind === "request" && d.status === "Delivered" && !d.details["deliveryUrl"])
    throw new Error("Attach the delivery link before marking this request delivered.");
  if (
    d.kind === "decision" &&
    ["Approved", "Rejected"].includes(d.status) &&
    !d.details["reason"]?.trim()
  )
    throw new Error("Record the decision reason.");
  if (d.kind === "bill") {
    if (Number(d.details["amount"]) < Number(existing?.details["paid"] ?? 0))
      throw new Error("Bill amount cannot be lower than recorded payments.");
    if (
      s.records.some(
        (r) =>
          r.id !== existing?.id &&
          r.kind === "bill" &&
          r.workspaceId === d.workspaceId &&
          r.details["invoice"] === d.details["invoice"],
      )
    )
      throw new Error("Invoice number already exists.");
    if (
      existing &&
      existing.details["currency"] !== d.details["currency"] &&
      Number(existing.details["paid"]) > 0
    )
      throw new Error("Currency cannot change after a payment.");
    if (d.status === "Paid" && Number(d.details["paid"] ?? 0) < Number(d.details["amount"]))
      throw new Error("Record payment to settle a bill.");
  }
}
export function createRecord(s: HubState, a: Actor, d: Draft, users: Actor[]): WorkRecord {
  validate(s, a, d, users);
  if (d.kind === "approval" && d.status !== "Pending")
    throw new Error("New approvals must be submitted as Pending.");
  const stamp = new Date().toISOString();
  const r = recordSchema.parse({
    ...d,
    id: id(d.kind.toUpperCase()),
    createdBy: a.id,
    createdAt: stamp,
    updatedAt: stamp,
    completedAt: "",
    sourceId: "",
    archived: false,
  });
  if (r.kind === "payment") {
    const bill = s.records.find((b) => b.id === r.details["billId"]);
    if (!bill) throw new Error("Bill not found.");
    requirePermission(a, bill.workspaceId, "edit", bill);
    const amount = Number(r.details["amount"]);
    const paid = Number(bill.details["paid"] ?? 0);
    if (amount > Number(bill.details["amount"]) - paid + 0.000001)
      throw new Error("Payment exceeds the outstanding amount.");
    const before = structuredClone(bill);
    r.details["currency"] = bill.details["currency"] ?? "SAR";
    bill.details["paid"] = String(Math.round((paid + amount) * 1000) / 1000);
    bill.status =
      Number(bill.details["paid"]) >= Number(bill.details["amount"]) ? "Paid" : "Partially Paid";
    bill.updatedAt = stamp;
    audit(s, a, bill, "Payment recorded", before, bill);
    if (bill.status === "Paid")
      for (const task of s.records.filter(
        (x) => x.sourceId.startsWith(`${bill.id}:bill:`) && !closed(x),
      )) {
        const old = structuredClone(task);
        task.status = "Done";
        task.progress = 100;
        task.completedAt = stamp;
        audit(s, a, task, "Bill settled", old, task);
      }
  }
  s.records.unshift(r);
  audit(s, a, r, "Created", null, r);
  notify(s, r, r.ownerId, `${r.title} assigned to you`, `${r.id}:assigned`);
  if (r.kind === "bill") {
    r.details["paid"] = "0";
    for (const [days, title] of [
      [-5, "Prepare billing / collection"],
      [-3, "Verify invoice sent"],
      [-1, "Client payment reminder"],
      [0, "Payment due today"],
      [1, "Review unpaid bill"],
    ] as const)
      generatedTask(s, a, r, title, dayOffset(r.dueDate, days), `${r.id}:bill:${days}`);
  }
  if (r.kind === "action" && r.nextAction)
    generatedTask(s, a, r, r.nextAction, r.dueDate, `${r.id}:follow-up`);
  if (r.kind === "onboarding") startOnboarding(s, a, r);
  return r;
}
function generatedTask(
  s: HubState,
  a: Actor,
  source: WorkRecord,
  title: string,
  dueDate: string,
  key: string,
  ownerId = source.ownerId,
) {
  const found = s.records.find((r) => r.sourceId === key);
  if (found) return found;
  const stamp = new Date().toISOString();
  const task: WorkRecord = {
    ...source,
    id: id("TSK"),
    kind: "task",
    title,
    description: `Generated from ${source.title}`,
    ownerId,
    status: "To Do",
    progress: 0,
    startDate: dueDate,
    dueDate,
    nextAction: title,
    details: {},
    createdBy: a.id,
    createdAt: stamp,
    updatedAt: stamp,
    completedAt: "",
    sourceId: key,
    archived: false,
  };
  s.records.unshift(task);
  audit(s, a, task, "Workflow task created", null, task);
  notify(s, task, ownerId, title, `${key}:notice`);
  return task;
}
export function updateRecord(s: HubState, a: Actor, recordId: string, d: Draft, users: Actor[]) {
  const r = s.records.find((x) => x.id === recordId);
  if (!r) throw new Error("Record not found.");
  if (r.workspaceId !== d.workspaceId || r.kind !== d.kind)
    throw new Error("Record identity cannot change.");
  if (r.kind === "payment")
    throw new Error("Payments are immutable. Create a documented adjustment request.");
  if (r.kind === "approval" && r.status !== d.status)
    throw new Error("Use the approval decision action.");
  if (r.kind === "bill" && (r.details["paid"] ?? "0") !== (d.details["paid"] ?? "0"))
    throw new Error("Paid amount can only change through a payment.");
  validate(s, a, d, users, r);
  const before = structuredClone(r);
  Object.assign(r, recordSchema.parse({ ...r, ...d, updatedAt: new Date().toISOString() }));
  if (closed(r)) {
    r.progress = 100;
    r.completedAt = new Date().toISOString();
  } else r.completedAt = "";
  audit(s, a, r, "Updated", before, r);
  if (before.ownerId !== r.ownerId)
    notify(s, r, r.ownerId, `${r.title} assigned to you`, id("NOTICE"));
  if (r.kind === "bill" && before.dueDate !== r.dueDate)
    for (const task of s.records.filter(
      (x) => x.sourceId.startsWith(`${r.id}:bill:`) && !closed(x),
    )) {
      const old = structuredClone(task);
      const offset = Number(task.sourceId.split(":").at(-1));
      task.dueDate = dayOffset(r.dueDate, offset);
      task.startDate = task.dueDate;
      audit(s, a, task, "Bill schedule changed", old, task);
    }
  return r;
}
export function meetingAction(
  s: HubState,
  a: Actor,
  recordId: string,
  title: string,
  ownerId: string,
  dueDate: string,
  users: Actor[],
) {
  const r = s.records.find((x) => x.id === recordId);
  if (!r) throw new Error("Meeting not found.");
  requirePermission(a, r.workspaceId, "edit", r);
  if (!["meeting", "interview"].includes(r.kind) || !title.trim() || !dueDate)
    throw new Error("An action, owner and deadline are required.");
  if (!canAssignTo(a, ownerId))
    throw new Error("You can only assign meeting actions to yourself or to your direct reports.");
  if (!users.some((u) => u.id === ownerId && access(u, r.workspaceId)))
    throw new Error("Action owner must have workspace access.");
  const task = generatedTask(
    s,
    a,
    r,
    title.trim(),
    dueDate,
    `${r.id}:action:${title.trim().toLowerCase()}:${ownerId}:${dueDate}`,
    ownerId,
  );
  audit(s, a, r, "Meeting action captured", null, { taskId: task.id, title, ownerId, dueDate });
  return task;
}
export function startOnboarding(s: HubState, a: Actor, r: WorkRecord) {
  requirePermission(a, r.workspaceId, "edit", r);
  for (const [title, days] of [
    ["HR paperwork", 0],
    ["Company email", 0],
    ["System access", 1],
    ["Equipment setup", 1],
    ["Manager introduction", 1],
    ["Department onboarding", 3],
    ["Training", 7],
    ["Probation review", 90],
  ] as const)
    generatedTask(s, a, r, title, dayOffset(r.startDate, days), `${r.id}:onboarding:${title}`);
}
export function decide(
  s: HubState,
  a: Actor,
  recordId: string,
  status: "Approved" | "Rejected" | "Returned",
  reason: string,
) {
  const r = s.records.find((x) => x.id === recordId);
  if (!r || r.kind !== "approval") throw new Error("Approval not found.");
  requirePermission(a, r.workspaceId, "approve", r);
  if (r.status !== "Pending") throw new Error("This request is no longer pending.");
  if (!reason.trim()) throw new Error("Add a decision reason.");
  const before = structuredClone(r);
  r.status = status;
  r.details["reason"] = reason;
  r.updatedAt = new Date().toISOString();
  audit(s, a, r, `Approval ${status}`, before, r);
  notify(s, r, r.createdBy, `${r.title}: ${status}`, id("NOTICE"));
}
export function addComment(s: HubState, a: Actor, recordId: string, body: string, users: Actor[]) {
  const r = s.records.find((x) => x.id === recordId);
  if (!r) throw new Error("Record not found.");
  requirePermission(a, r.workspaceId, "edit", r);
  if (!body.trim()) throw new Error("Write a comment first.");
  s.comments.push({
    id: id("COM"),
    recordId,
    by: a.id,
    body: body.trim(),
    at: new Date().toISOString(),
  });
  audit(s, a, r, "Comment added", null, body);
  for (const u of users)
    if (body.toLowerCase().includes(`@${u.name.toLowerCase()}`) && visible(u, r))
      notify(s, r, u.id, `${a.name} mentioned you in ${r.title}`, id("NOTICE"));
}
export function archive(s: HubState, a: Actor, recordId: string) {
  const r = s.records.find((x) => x.id === recordId);
  if (!r) throw new Error("Record not found.");
  requirePermission(a, r.workspaceId, "delete", r);
  if (r.kind === "payment" || r.kind === "bill")
    throw new Error("Financial records must be retained. Cancel an unpaid bill instead.");
  const before = structuredClone(r);
  r.archived = true;
  audit(s, a, r, "Archived", before, r);
}
export function runRule(
  s: HubState,
  a: Actor,
  rule: Rule,
  day: string,
  time = "23:59",
  test = false,
) {
  requirePermission(a, rule.workspaceId, "administer");
  const stamp = new Date().toISOString();
  const matching = s.records.filter(
    (r) =>
      r.workspaceId === rule.workspaceId &&
      r.kind === rule.kind &&
      !r.sourceId.startsWith(`${rule.id}:`) &&
      !closed(r) &&
      (rule.trigger === "daily" ||
        (rule.trigger === "blocked" && r.status === "Blocked") ||
        (rule.trigger === "due" && r.dueDate === dayOffset(day, rule.days)) ||
        (rule.trigger === "sla" &&
          Date.parse(stamp) - Date.parse(r.createdAt) >
            Number(r.details["slaHours"] ?? 48) * 3600000)),
  );
  if (test) {
    s.runs.unshift({
      id: id("RUN"),
      ruleId: rule.id,
      at: stamp,
      status: "Test",
      message: `${matching.length} matching records. No tasks or notifications created.`,
    });
    return;
  }
  if (!rule.enabled || time < rule.hour) return;
  if (rule.channel !== "in-app") {
    s.runs.unshift({
      id: id("RUN"),
      ruleId: rule.id,
      at: stamp,
      status: "Failed",
      message: "Integration Ready — Configuration Required. Nothing was sent.",
    });
    rule.lastRun = day;
    return;
  }
  if (rule.trigger === "daily") {
    const key = `${rule.id}:${day}`;
    if (!s.executions.includes(key)) {
      const base = s.records.find((r) => r.workspaceId === rule.workspaceId && visible(a, r));
      if (base) {
        generatedTask(s, a, { ...base, ownerId: rule.ownerId }, rule.title, day, key);
        s.executions.push(key);
      }
    }
  } else
    for (const r of matching) {
      const key = `${rule.id}:${r.id}:${day}`;
      if (s.executions.includes(key)) continue;
      if (rule.action === "task") generatedTask(s, a, r, rule.title, day, key);
      else
        notify(
          s,
          r,
          rule.action === "escalate" ? rule.ownerId : r.ownerId,
          `${rule.title}: ${r.title}`,
          key,
        );
      s.executions.push(key);
    }
  rule.lastRun = day;
  s.runs.unshift({
    id: id("RUN"),
    ruleId: rule.id,
    at: stamp,
    status: "Success",
    message: `Evaluated ${matching.length} matching records. Duplicate actions skipped.`,
  });
}
export function sweep(s: HubState, a: Actor, day: string, time: string) {
  for (const r of s.records.filter((r) => visible(a, r) && !closed(r))) {
    if (
      r.kind === "bill" &&
      !["Promise to Pay", "Partially Paid", "Escalated"].includes(r.status)
    ) {
      const target =
        r.dueDate < day
          ? "Overdue"
          : r.dueDate === day
            ? "Due Today"
            : r.dueDate <= dayOffset(day, 3)
              ? "Due Soon"
              : "Upcoming";
      if (r.status !== target) {
        const before = structuredClone(r);
        r.status = target;
        audit(s, a, r, "Due status updated", before, r);
      }
    }
    if (overdue(r, day) || r.dueDate === day)
      notify(
        s,
        r,
        r.ownerId,
        `${overdue(r, day) ? "Overdue" : "Due today"}: ${r.title}`,
        `${r.id}:due:${day}`,
      );
  }
  for (const rule of s.rules.filter(
    (r) => r.enabled && r.lastRun !== day && permission(a, r.workspaceId, "administer"),
  ))
    runRule(s, a, rule, day, time);
}
