import { getWorkspace, type WorkspaceId } from "../../lib/workspace-hub";
import {
  attentionScore,
  closed,
  dayOffset,
  fields,
  href,
  overdue,
  statuses,
  titles,
  today,
  workspaceKinds,
  type Actor,
  type Draft,
  type HubState,
  type Kind,
  type WorkRecord,
} from "../workspaces/model";
import {
  addComment as addCommentAction,
  archive,
  createRecord,
  decide,
  meetingAction,
  updateRecord,
  visible,
} from "../workspaces/service";

/**
 * Executes a model tool call against the live workspace.
 *
 * Reads return compact, citation-friendly shapes; writes go through the same
 * service functions the UI uses, so validation, role gating, and the audit trail
 * all behave identically to a human performing the action.
 */

export interface ToolRunResult {
  ok: boolean;
  /** Rendered by the interface as generative UI when present. */
  render?: RenderPayload;
  data?: unknown;
  message?: string;
  citations?: Citation[];
}

export interface Citation {
  id: string;
  label: string;
  href: string;
}

export type RenderPayload =
  | { kind: "metrics"; tiles: { label: string; value: string; hint?: string }[] }
  | { kind: "table"; columns: string[]; rows: (string | number)[][]; ids: string[] }
  | {
      kind: "chart";
      variant: "bar" | "donut";
      title: string;
      unit: string;
      data: { label: string; value: number }[];
    }
  | {
      kind: "record";
      title: string;
      subtitle?: string;
      fields: { label: string; value: string }[];
      href?: string;
    }
  | { kind: "exceptions"; items: { title: string; detail: string; severity: string; href: string }[] }
  | { kind: "navigate"; path: string };

/** Everything a tool call needs from the running app. */
export interface AgentContext {
  state: HubState;
  actor: Actor;
  users: Actor[];
  transact: <T>(fn: (s: HubState) => T) => T;
  navigate: (path: string) => void;
  setActiveWorkspace: (id: WorkspaceId) => void;
  activeWorkspace: WorkspaceId;
}

const num = (value: number) => new Intl.NumberFormat("en").format(Math.round(value));
const compact = (value: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const percent = (value: number, of: number) => (of > 0 ? Math.round((value / of) * 100) : 0);

/** Records that represent actual work, not reference data such as clients or files. */
const workable = (r: WorkRecord) =>
  !["employee", "client", "file", "payment"].includes(r.kind) && !r.archived;

const blocked = (r: WorkRecord) =>
  !closed(r) && (r.status === "Blocked" || r.status === "Escalated" || r.kind === "blocker");

function scopeRecords(ctx: AgentContext, workspaceId?: string) {
  return ctx.state.records.filter(
    (r) => visible(ctx.actor, r) && (!workspaceId || r.workspaceId === workspaceId),
  );
}

function userName(ctx: AgentContext, id: string) {
  return ctx.users.find((u) => u.id === id)?.name ?? id;
}

/** Accepts a user id or a name, because the model usually has the name. */
function resolveUserId(ctx: AgentContext, value: string): string {
  const raw = value.trim();
  if (!raw) return ctx.actor.id;
  const exact = ctx.users.find((u) => u.id === raw);
  if (exact) return exact.id;
  const lower = raw.toLowerCase();
  if (lower === "me" || lower === "myself") return ctx.actor.id;
  const byName = ctx.users.find((u) => u.name.toLowerCase() === lower);
  if (byName) return byName.id;
  const partial = ctx.users.filter((u) => u.name.toLowerCase().includes(lower));
  if (partial.length === 1 && partial[0]) return partial[0].id;
  throw new Error(
    partial.length > 1
      ? `"${raw}" matches ${partial.length} people. Use the full name.`
      : `No workspace user matches "${raw}".`,
  );
}

function findRecord(ctx: AgentContext, id: string): WorkRecord {
  const exact = ctx.state.records.find((r) => r.id === id && visible(ctx.actor, r));
  if (exact) return exact;
  const partial = ctx.state.records.filter(
    (r) => visible(ctx.actor, r) && (r.id.startsWith(id) || r.title.toLowerCase() === id.toLowerCase()),
  );
  if (partial.length === 1 && partial[0]) return partial[0];
  throw new Error(`Record "${id}" was not found, or you do not have access to it.`);
}

const asDraft = (r: WorkRecord): Draft => ({
  workspaceId: r.workspaceId,
  kind: r.kind,
  title: r.title,
  description: r.description,
  ownerId: r.ownerId,
  collaborators: r.collaborators,
  entityId: r.entityId,
  status: r.status,
  priority: r.priority,
  startDate: r.startDate,
  dueDate: r.dueDate,
  progress: r.progress,
  nextAction: r.nextAction,
  details: r.details,
});

// --------------------------------------------------------------------- reads

function metricsResult(ctx: AgentContext, workspaceId?: string): ToolRunResult {
  const rows = scopeRecords(ctx, workspaceId).filter(workable);
  const open = rows.filter((r) => !closed(r));
  const late = open.filter((r) => overdue(r));
  const dueToday = open.filter((r) => r.dueDate === today());
  const dueWeek = open.filter((r) => r.dueDate >= today() && r.dueDate <= dayOffset(today(), 7));
  const done = rows.filter((r) => closed(r));
  const onTime = done.filter((r) => r.completedAt && r.completedAt.slice(0, 10) <= r.dueDate);
  const bills = scopeRecords(ctx, workspaceId).filter(
    (r) => r.kind === "bill" && r.status !== "Cancelled",
  );
  const outstanding = bills.reduce(
    (n, r) => n + Number(r.details["amount"] ?? 0) - Number(r.details["paid"] ?? 0),
    0,
  );
  const overdueValue = bills
    .filter((r) => overdue(r))
    .reduce((n, r) => n + Number(r.details["amount"] ?? 0) - Number(r.details["paid"] ?? 0), 0);

  return {
    ok: true,
    data: {
      workspace: workspaceId ?? "all accessible workspaces",
      openWork: open.length,
      overdue: late.length,
      dueToday: dueToday.length,
      dueThisWeek: dueWeek.length,
      blocked: open.filter(blocked).length,
      completed: done.length,
      completedToday: rows.filter((r) => r.completedAt.startsWith(today())).length,
      onTimeDeliveryPercent: percent(onTime.length, done.length),
      outstandingBillValue: Math.round(outstanding),
      overdueBillValue: Math.round(overdueValue),
    },
    render: {
      kind: "metrics",
      tiles: [
        {
          label: "Open work",
          value: String(open.length),
          hint: `${dueWeek.length} due within 7 days`,
        },
        {
          label: "Overdue",
          value: String(late.length),
          hint: `${percent(late.length, open.length)}% of open work`,
        },
        {
          label: "Blocked",
          value: String(open.filter(blocked).length),
          hint: `${dueToday.length} due today`,
        },
        {
          label: "On-time delivery",
          value: done.length ? `${percent(onTime.length, done.length)}%` : "—",
          hint: outstanding > 0 ? `${compact(outstanding)} outstanding` : `${done.length} completed`,
        },
      ],
    },
  };
}

function matchesQuery(ctx: AgentContext, r: WorkRecord, query?: string) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return `${r.id} ${r.title} ${r.nextAction} ${r.description} ${Object.values(r.details).join(" ")} ${userName(ctx, r.ownerId)}`
    .toLowerCase()
    .includes(needle);
}

function listResult(ctx: AgentContext, input: Record<string, unknown>): ToolRunResult {
  const limit = Math.min(Number(input["limit"] ?? 15) || 15, 50);
  const state = String(input["state"] ?? "all");
  const owner = input["owner"] ? resolveUserId(ctx, String(input["owner"])) : null;

  const rows = scopeRecords(ctx, input["workspaceId"] as string | undefined)
    .filter((r) => !r.archived)
    .filter((r) => (input["kind"] ? r.kind === input["kind"] : true))
    .filter((r) => (input["status"] ? r.status === input["status"] : true))
    .filter((r) => (owner ? r.ownerId === owner || r.collaborators.includes(owner) : true))
    .filter((r) => {
      if (state === "open") return !closed(r);
      if (state === "overdue") return overdue(r);
      if (state === "blocked") return blocked(r);
      if (state === "dueToday") return !closed(r) && r.dueDate === today();
      if (state === "closed") return closed(r);
      return true;
    })
    .filter((r) => matchesQuery(ctx, r, input["query"] as string | undefined))
    .sort((a, b) => attentionScore(b) - attentionScore(a))
    .slice(0, limit);

  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      title: r.title,
      kind: r.kind,
      status: r.status,
      owner: userName(ctx, r.ownerId),
      dueDate: r.dueDate,
      overdue: overdue(r),
      progress: r.progress,
    })),
    render: {
      kind: "table",
      columns: ["Record", "Type", "Owner", "Status", "Due"],
      ids: rows.map((r) => r.id),
      rows: rows.map((r) => [
        r.title,
        titles[r.kind][0],
        userName(ctx, r.ownerId),
        overdue(r) ? `${r.status} · overdue` : r.status,
        r.dueDate,
      ]),
    },
    citations: rows.slice(0, 8).map((r) => ({ id: r.id, label: r.title, href: href(r) })),
  };
}

function recordResult(ctx: AgentContext, id: string): ToolRunResult {
  const r = findRecord(ctx, id);
  const custom = fields[r.kind]
    .filter((f) => r.details[f.key])
    .map((f) => ({ label: f.en, value: String(r.details[f.key]) }));
  const comments = ctx.state.comments.filter((c) => c.recordId === r.id).slice(-5);
  const history = ctx.state.audit.filter((a) => a.recordId === r.id).slice(0, 5);

  return {
    ok: true,
    data: {
      ...r,
      ownerName: userName(ctx, r.ownerId),
      comments: comments.map((c) => ({ by: userName(ctx, c.by), body: c.body, at: c.at })),
      history: history.map((a) => ({ action: a.action, by: userName(ctx, a.actorId), at: a.at })),
    },
    render: {
      kind: "record",
      title: r.title,
      subtitle: `${titles[r.kind][0]} · ${getWorkspace(r.workspaceId).title} · ${r.id.slice(0, 16)}`,
      href: href(r),
      fields: [
        { label: "Status", value: overdue(r) ? `${r.status} (overdue)` : r.status },
        { label: "Owner", value: userName(ctx, r.ownerId) },
        { label: "Priority", value: r.priority },
        { label: "Deadline", value: r.dueDate },
        { label: "Progress", value: `${r.progress}%` },
        { label: "Next action", value: r.nextAction || "Not set" },
        ...custom,
      ],
    },
    citations: [{ id: r.id, label: r.title, href: href(r) }],
  };
}

function exceptionsResult(ctx: AgentContext, workspaceId?: string): ToolRunResult {
  const rows = scopeRecords(ctx, workspaceId).filter((r) => !closed(r) && !r.archived);
  const items: { title: string; detail: string; severity: string; href: string }[] = [];

  for (const r of rows) {
    if (overdue(r)) {
      const days = Math.max(
        1,
        Math.floor((Date.parse(today()) - Date.parse(r.dueDate)) / 86400000),
      );
      items.push({
        title: r.title,
        detail: `${days} ${days === 1 ? "day" : "days"} overdue · ${userName(ctx, r.ownerId)}`,
        severity: days > 7 ? "Escalate" : "Overdue",
        href: href(r),
      });
      continue;
    }
    if (blocked(r)) {
      items.push({
        title: r.title,
        detail: `${r.status} · ${r.nextAction || "no next action recorded"}`,
        severity: "Escalate",
        href: href(r),
      });
      continue;
    }
    if (r.kind === "approval" && r.status === "Pending") {
      items.push({
        title: r.title,
        detail: `Approval waiting on ${userName(ctx, r.ownerId)}`,
        severity: "Due soon",
        href: href(r),
      });
      continue;
    }
    if (r.dueDate === today()) {
      items.push({
        title: r.title,
        detail: `Due today · ${userName(ctx, r.ownerId)}`,
        severity: "Due soon",
        href: href(r),
      });
    }
  }

  const order: Record<string, number> = { Escalate: 0, Overdue: 1, "Due soon": 2 };
  items.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
  const top = items.slice(0, 12);
  return { ok: true, data: { total: items.length, items: top }, render: { kind: "exceptions", items: top } };
}

function workloadResult(ctx: AgentContext, workspaceId?: string): ToolRunResult {
  const rows = scopeRecords(ctx, workspaceId).filter(workable);
  const open = rows.filter((r) => !closed(r));
  const groups = ctx.users
    .map((u) => ({ user: u, items: open.filter((r) => r.ownerId === u.id) }))
    .filter((g) => g.items.length)
    .sort((a, b) => b.items.length - a.items.length);

  return {
    ok: true,
    data: groups.map((g) => ({
      owner: g.user.name,
      open: g.items.length,
      overdue: g.items.filter((r) => overdue(r)).length,
      blocked: g.items.filter(blocked).length,
      completed: rows.filter((r) => closed(r) && r.ownerId === g.user.id).length,
    })),
    render: {
      kind: "table",
      columns: ["Owner", "Open", "Overdue", "Blocked", "Completed"],
      ids: groups.map((g) => g.user.id),
      rows: groups.map((g) => [
        g.user.name,
        g.items.length,
        g.items.filter((r) => overdue(r)).length,
        g.items.filter(blocked).length,
        rows.filter((r) => closed(r) && r.ownerId === g.user.id).length,
      ]),
    },
  };
}

function chartResult(ctx: AgentContext, input: Record<string, unknown>): ToolRunResult {
  const series = String(input["series"]);
  const all = scopeRecords(ctx, input["workspaceId"] as string | undefined).filter(workable);
  const open = all.filter((r) => !closed(r));

  const build = (
    variant: "bar" | "donut",
    title: string,
    unit: string,
    data: { label: string; value: number }[],
  ): ToolRunResult => ({
    ok: true,
    data: { series, unit, points: data },
    render: { kind: "chart", variant, title, unit, data },
  });

  const countBy = (rows: WorkRecord[], key: (r: WorkRecord) => string) => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(key(r), (map.get(key(r)) ?? 0) + 1));
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  };

  switch (series) {
    case "work_by_status":
      return build("bar", "Open work by status", "records", countBy(open, (r) => r.status));
    case "work_by_kind":
      return build("bar", "Open work by type", "records", countBy(open, (r) => titles[r.kind][0]));
    case "work_by_owner":
      return build(
        "bar",
        "Open work by owner",
        "records",
        countBy(open, (r) => userName(ctx, r.ownerId)).slice(0, 10),
      );
    case "priority_mix":
      return build("donut", "Open work by priority", "records", countBy(open, (r) => r.priority));
    case "overdue_aging":
      return build(
        "bar",
        "Overdue aging",
        "records",
        countBy(
          open.filter((r) => overdue(r)),
          (r) => {
            const days = Math.floor((Date.parse(today()) - Date.parse(r.dueDate)) / 86400000);
            return days <= 7 ? "1–7 days" : days <= 30 ? "8–30 days" : "30+ days";
          },
        ),
      );
    case "completions_trend":
    case "intake_trend": {
      const completions = series === "completions_trend";
      const points = Array.from({ length: 8 }, (_, index) => {
        const end = dayOffset(today(), -(7 - index) * 7);
        const start = dayOffset(end, -6);
        return {
          label: end.slice(5),
          value: all.filter((r) => {
            const d = (completions ? r.completedAt : r.createdAt).slice(0, 10);
            return Boolean(d) && d >= start && d <= end;
          }).length,
        };
      });
      return build(
        "bar",
        completions ? "Records completed per week" : "New records per week",
        "records",
        points,
      );
    }
    case "bills_by_currency": {
      const bills = scopeRecords(ctx, input["workspaceId"] as string | undefined).filter(
        (r) => r.kind === "bill" && r.status !== "Cancelled",
      );
      const map = new Map<string, number>();
      for (const r of bills) {
        const currency = r.details["currency"] ?? "SAR";
        const outstanding =
          Number(r.details["amount"] ?? 0) - Number(r.details["paid"] ?? 0);
        map.set(currency, (map.get(currency) ?? 0) + outstanding);
      }
      return build(
        "bar",
        "Outstanding balance by currency",
        "value",
        [...map.entries()].map(([label, value]) => ({ label, value: Math.round(value) })),
      );
    }
    default:
      return { ok: false, message: `Unknown series "${series}".` };
  }
}

// -------------------------------------------------------------------- writes

const ok = (message: string, citations?: Citation[]): ToolRunResult => ({
  ok: true,
  message,
  ...(citations ? { citations } : {}),
});
const fail = (message: string): ToolRunResult => ({ ok: false, message });
const cite = (r: WorkRecord): Citation[] => [{ id: r.id, label: r.title, href: href(r) }];

const closingStatus = (kind: Kind) =>
  ["Done", "Completed", "Resolved", "Delivered", "Signed", "Closed", "Approved", "Verified"].find(
    (s) => statuses[kind].includes(s),
  );

export function runAgentTool(ctx: AgentContext, name: string, rawInput: unknown): ToolRunResult {
  const input = (rawInput ?? {}) as Record<string, unknown>;
  const str = (key: string) => String(input[key] ?? "");
  const workspaceId = input["workspaceId"] as string | undefined;

  switch (name) {
    case "get_metrics":
      return metricsResult(ctx, workspaceId);
    case "list_records":
      return listResult(ctx, input);
    case "get_record":
      return recordResult(ctx, str("id"));
    case "needs_attention":
      return exceptionsResult(ctx, workspaceId);
    case "workload":
      return workloadResult(ctx, workspaceId);
    case "chart_data":
      return chartResult(ctx, input);
    case "navigate": {
      const path = str("path");
      if (!path.startsWith("/")) return fail("Path must start with a slash.");
      ctx.navigate(path);
      return { ok: true, message: `Opened ${path}`, render: { kind: "navigate", path } };
    }

    case "create_record": {
      const kind = str("kind") as Kind;
      const target = str("workspaceId") as WorkspaceId;
      if (!workspaceKinds[target]?.includes(kind))
        return fail(`${titles[kind]?.[0] ?? kind} does not exist in the ${target} workspace.`);
      const dueDate = str("dueDate");
      const startDate = input["startDate"] ? str("startDate") : today();
      const status = input["status"] ? str("status") : (statuses[kind][0] ?? "");
      if (!statuses[kind].includes(status))
        return fail(`"${status}" is not a valid status. Use one of: ${statuses[kind].join(", ")}.`);
      const created = ctx.transact((s) =>
        createRecord(
          s,
          ctx.actor,
          {
            workspaceId: target,
            kind,
            title: str("title"),
            description: str("description"),
            ownerId: resolveUserId(ctx, str("ownerId")),
            collaborators: [],
            entityId: ctx.actor.entityId,
            status,
            priority: (input["priority"] as Draft["priority"]) ?? "Medium",
            startDate: startDate > dueDate ? dueDate : startDate,
            dueDate,
            progress: 0,
            nextAction: str("nextAction"),
            details: (input["details"] as Record<string, string>) ?? {},
          },
          ctx.users,
        ),
      );
      return ok(`Created ${titles[kind][0].toLowerCase()} "${created.title}".`, cite(created));
    }

    case "add_comment": {
      const r = findRecord(ctx, str("id"));
      ctx.transact((s) => addCommentAction(s, ctx.actor, r.id, str("body"), ctx.users));
      return ok(`Comment added to "${r.title}".`, cite(r));
    }

    case "create_meeting_action": {
      const meeting = findRecord(ctx, str("meetingId"));
      const task = ctx.transact((s) =>
        meetingAction(
          s,
          ctx.actor,
          meeting.id,
          str("title"),
          resolveUserId(ctx, str("ownerId")),
          str("dueDate"),
          ctx.users,
        ),
      );
      return ok(`Created linked task "${task.title}".`, cite(task));
    }

    case "update_record": {
      const r = findRecord(ctx, str("id"));
      const draft: Draft = { ...asDraft(r) };
      if (input["status"] !== undefined) {
        if (!statuses[r.kind].includes(str("status")))
          return fail(
            `"${str("status")}" is not valid here. Use one of: ${statuses[r.kind].join(", ")}.`,
          );
        draft.status = str("status");
      }
      if (input["ownerId"] !== undefined) draft.ownerId = resolveUserId(ctx, str("ownerId"));
      if (input["priority"] !== undefined) draft.priority = input["priority"] as Draft["priority"];
      if (input["dueDate"] !== undefined) draft.dueDate = str("dueDate");
      if (input["progress"] !== undefined) draft.progress = Number(input["progress"]);
      if (input["nextAction"] !== undefined) draft.nextAction = str("nextAction");
      if (input["title"] !== undefined) draft.title = str("title");
      if (input["description"] !== undefined) draft.description = str("description");
      if (input["details"] !== undefined)
        draft.details = { ...draft.details, ...(input["details"] as Record<string, string>) };
      if (draft.startDate > draft.dueDate) draft.startDate = draft.dueDate;
      const updated = ctx.transact((s) => updateRecord(s, ctx.actor, r.id, draft, ctx.users));
      return ok(`Updated "${updated.title}".`, cite(updated));
    }

    case "reschedule": {
      const r = findRecord(ctx, str("id"));
      const dueDate = str("dueDate");
      const draft = { ...asDraft(r), dueDate };
      if (draft.startDate > dueDate) draft.startDate = dueDate;
      ctx.transact((s) => updateRecord(s, ctx.actor, r.id, draft, ctx.users));
      return ok(`"${r.title}" now due ${dueDate}.`, cite(r));
    }

    case "complete_record": {
      const r = findRecord(ctx, str("id"));
      const status = closingStatus(r.kind);
      if (!status) return fail(`${titles[r.kind][0]} records have no completion status.`);
      ctx.transact((s) =>
        updateRecord(s, ctx.actor, r.id, { ...asDraft(r), status, progress: 100 }, ctx.users),
      );
      return ok(`"${r.title}" marked ${status}.`, cite(r));
    }

    case "decide_approval": {
      const r = findRecord(ctx, str("id"));
      if (r.kind !== "approval") return fail(`"${r.title}" is not an approval request.`);
      ctx.transact((s) =>
        decide(
          s,
          ctx.actor,
          r.id,
          str("decision") as "Approved" | "Rejected" | "Returned",
          str("reason"),
        ),
      );
      return ok(`${str("decision")} "${r.title}".`, cite(r));
    }

    case "record_payment": {
      const bill = findRecord(ctx, str("billId"));
      if (bill.kind !== "bill") return fail(`"${bill.title}" is not a bill.`);
      const amount = Number(input["amount"] ?? 0);
      const outstanding =
        Number(bill.details["amount"] ?? 0) - Number(bill.details["paid"] ?? 0);
      if (amount <= 0) return fail("A payment must be greater than zero.");
      if (amount > outstanding + 0.000001)
        return fail(`That exceeds the ${num(outstanding)} outstanding on this bill.`);
      const date = input["date"] ? str("date") : today();
      const payment = ctx.transact((s) =>
        createRecord(
          s,
          ctx.actor,
          {
            workspaceId: bill.workspaceId,
            kind: "payment",
            title: `Payment for ${bill.title}`,
            description: str("reference"),
            ownerId: ctx.actor.id,
            collaborators: [],
            entityId: bill.entityId,
            status: statuses["payment"][0] ?? "Recorded",
            priority: "Medium",
            startDate: date,
            dueDate: date,
            progress: 100,
            nextAction: "",
            details: {
              billId: bill.id,
              amount: String(amount),
              method: "Bank Transfer",
              reference: str("reference"),
              paidOn: date,
            },
          },
          ctx.users,
        ),
      );
      return ok(`Recorded ${num(amount)} against "${bill.title}".`, cite(payment));
    }

    case "record_promise_to_pay": {
      const bill = findRecord(ctx, str("billId"));
      if (bill.kind !== "bill") return fail(`"${bill.title}" is not a bill.`);
      ctx.transact((s) =>
        updateRecord(
          s,
          ctx.actor,
          bill.id,
          {
            ...asDraft(bill),
            status: "Promise to Pay",
            details: {
              ...bill.details,
              promiseDate: str("promiseDate"),
              lastContact: today(),
            },
          },
          ctx.users,
        ),
      );
      return ok(`Promise to pay recorded for ${str("promiseDate")}.`, cite(bill));
    }

    case "escalate_collection": {
      const bill = findRecord(ctx, str("billId"));
      if (bill.kind !== "bill") return fail(`"${bill.title}" is not a bill.`);
      ctx.transact((s) =>
        updateRecord(
          s,
          ctx.actor,
          bill.id,
          {
            ...asDraft(bill),
            status: "Escalated",
            details: { ...bill.details, escalationReason: str("reason"), lastContact: today() },
          },
          ctx.users,
        ),
      );
      return ok(`Escalated "${bill.title}".`, cite(bill));
    }

    case "archive_record": {
      const r = findRecord(ctx, str("id"));
      ctx.transact((s) => archive(s, ctx.actor, r.id));
      return ok(`Archived "${r.title}". It remains in the audit history.`);
    }

    case "set_active_workspace": {
      const target = str("workspaceId") as WorkspaceId;
      ctx.setActiveWorkspace(target);
      return ok(`Active workspace is now ${getWorkspace(target).title}.`);
    }

    default:
      return fail(`Unknown tool "${name}".`);
  }
}
