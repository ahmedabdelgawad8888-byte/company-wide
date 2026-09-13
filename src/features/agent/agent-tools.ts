import { z } from "zod";
import { kinds } from "../workspaces/model";

/**
 * Tool catalogue shared by the server route and the browser.
 *
 * The workspace lives in React state and localStorage, so no tool declares an
 * `execute`. The model's calls are forwarded to the client, gated by the
 * permission matrix, then run against the hub provider — the same path a human
 * takes, so validation, role gating and the audit trail behave identically.
 */

export const toolCategories = ["read", "create", "update", "approval", "finance", "admin"] as const;
export type ToolCategory = (typeof toolCategories)[number];

export type ToolPolicy = "auto" | "confirm" | "blocked";

export const categoryLabels: Record<ToolCategory, { title: string; description: string }> = {
  read: { title: "Read & search", description: "Query records, metrics, insights and exceptions." },
  create: { title: "Create work", description: "Add tasks, meetings, projects and other records." },
  update: {
    title: "Update work",
    description: "Change status, owner, deadline, progress and next action.",
  },
  approval: { title: "Approvals", description: "Decide approval requests waiting on you." },
  finance: {
    title: "Bills & payments",
    description: "Record payments, promises to pay, escalate.",
  },
  admin: {
    title: "Workspace control",
    description: "Archive records and switch active workspace.",
  },
};

/** Defaults follow the principle that money and approvals always need a human. */
export const defaultPolicies: Record<ToolCategory, ToolPolicy> = {
  read: "auto",
  create: "auto",
  update: "confirm",
  approval: "confirm",
  finance: "confirm",
  admin: "blocked",
};

const workspaceEnum = z.enum(["management", "sales", "finance", "hr", "it", "pmo"]);
const kindEnum = z.enum(kinds);
const priorityEnum = z.enum(["Low", "Medium", "High", "Critical"]);

export type AgentWorkspace = z.infer<typeof workspaceEnum>;

export interface AgentToolSpec {
  category: ToolCategory;
  description: string;
  inputSchema: z.ZodType;
  /** Short sentence rendered on the approval card, so a reviewer sees intent before JSON. */
  summarize: (input: Record<string, unknown>) => string;
}

const s = (value: unknown) => String(value ?? "");

export const agentTools = {
  // ------------------------------------------------------------------ read
  get_metrics: {
    category: "read",
    description:
      "Headline execution position for a workspace, or all workspaces the user can see: open work, overdue, due today and this week, blocked, completed, on-time delivery rate and outstanding bill value. Call this first for any 'how are we doing' question.",
    inputSchema: z.object({ workspaceId: workspaceEnum.optional() }),
    summarize: (i) => `Read metrics${i["workspaceId"] ? ` for ${s(i["workspaceId"])}` : ""}`,
  },
  list_records: {
    category: "read",
    description:
      "List work records with optional filtering. Returns a compact table the interface renders directly. Use `query` for free text and `kind`/`status`/`owner`/`workspaceId` to narrow, and `state` for open, overdue, blocked, dueToday or closed.",
    inputSchema: z.object({
      workspaceId: workspaceEnum.optional(),
      kind: kindEnum.optional(),
      status: z.string().optional(),
      owner: z.string().optional().describe("Owner name or id"),
      state: z.enum(["all", "open", "overdue", "blocked", "dueToday", "closed"]).default("all"),
      query: z.string().optional().describe("Free text on title, next action, details or owner"),
      limit: z.number().int().min(1).max(50).default(15),
    }),
    summarize: (i) =>
      `List ${s(i["kind"] ?? "records")}${i["state"] && i["state"] !== "all" ? ` (${s(i["state"])})` : ""}`,
  },
  get_record: {
    category: "read",
    description:
      "Full detail for a single record: owner, status, deadline, progress, next action, custom fields, comments and recent history.",
    inputSchema: z.object({ id: z.string() }),
    summarize: (i) => `Open ${s(i["id"])}`,
  },
  needs_attention: {
    category: "read",
    description:
      "Operational exceptions ordered by urgency: overdue work, blocked and escalated records, decisions waiting, approvals pending, and bills past due.",
    inputSchema: z.object({ workspaceId: workspaceEnum.optional() }),
    summarize: () => "Read the exception queue",
  },
  chart_data: {
    category: "read",
    description:
      "Aggregated series for a chart. Use this instead of listing records when the question is about distribution, comparison, ranking or trend. The interface renders the result as a real chart.",
    inputSchema: z.object({
      series: z.enum([
        "work_by_status",
        "work_by_kind",
        "work_by_owner",
        "overdue_aging",
        "completions_trend",
        "intake_trend",
        "priority_mix",
        "bills_by_currency",
      ]),
      workspaceId: workspaceEnum.optional(),
    }),
    summarize: (i) => `Chart ${s(i["series"]).replace(/_/g, " ")}`,
  },
  workload: {
    category: "read",
    description:
      "Open work and capacity risk per owner: open count, overdue, blocked and completed. Use for questions about who is loaded or who is behind.",
    inputSchema: z.object({ workspaceId: workspaceEnum.optional() }),
    summarize: () => "Read team workload",
  },
  navigate: {
    category: "read",
    description:
      "Open a page for the user, for example /workspaces/finance/dashboard, /workspaces/core/task or /workspaces/sales/reports.",
    inputSchema: z.object({ path: z.string(), reason: z.string().optional() }),
    summarize: (i) => `Open ${s(i["path"])}`,
  },

  // ---------------------------------------------------------------- create
  create_record: {
    category: "create",
    description:
      "Create a work record. `kind` must belong to the workspace. Dates are ISO (YYYY-MM-DD) and the due date must be on or after the start date. `details` carries the kind-specific fields.",
    inputSchema: z.object({
      workspaceId: workspaceEnum,
      kind: kindEnum,
      title: z.string().min(3).max(180),
      description: z.string().default(""),
      ownerId: z.string().describe("Owner name or user id"),
      status: z.string().optional().describe("Defaults to the first status of the workflow"),
      priority: priorityEnum.default("Medium"),
      startDate: z.string().optional(),
      dueDate: z.string(),
      nextAction: z.string().default(""),
      details: z.record(z.string(), z.string()).default({}),
    }),
    summarize: (i) => `Create ${s(i["kind"])} "${s(i["title"])}"`,
  },
  add_comment: {
    category: "create",
    description: "Add a comment to a record. Mention someone with @Full Name to notify them.",
    inputSchema: z.object({ id: z.string(), body: z.string().min(1) }),
    summarize: (i) => `Comment on ${s(i["id"])}`,
  },
  create_meeting_action: {
    category: "create",
    description: "Turn a meeting or interview outcome into an owned, linked task with a deadline.",
    inputSchema: z.object({
      meetingId: z.string(),
      title: z.string().min(3),
      ownerId: z.string().describe("Owner name or user id"),
      dueDate: z.string(),
    }),
    summarize: (i) => `Create task "${s(i["title"])}" from ${s(i["meetingId"])}`,
  },

  // ---------------------------------------------------------------- update
  update_record: {
    category: "update",
    description:
      "Change a record. Supply only the fields that change. Status must be valid for that workflow.",
    inputSchema: z.object({
      id: z.string(),
      status: z.string().optional(),
      ownerId: z.string().optional().describe("Owner name or user id"),
      priority: priorityEnum.optional(),
      dueDate: z.string().optional(),
      progress: z.number().int().min(0).max(100).optional(),
      nextAction: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      details: z.record(z.string(), z.string()).optional(),
    }),
    summarize: (i) =>
      `Update ${s(i["id"])}${i["status"] ? ` to ${s(i["status"])}` : ""}${i["ownerId"] ? ` for ${s(i["ownerId"])}` : ""}`,
  },
  reschedule: {
    category: "update",
    description: "Move a record's deadline, and its start date when the new deadline is earlier.",
    inputSchema: z.object({ id: z.string(), dueDate: z.string(), reason: z.string().default("") }),
    summarize: (i) => `Move ${s(i["id"])} to ${s(i["dueDate"])}`,
  },
  complete_record: {
    category: "update",
    description: "Mark a record complete, using the closing status its workflow supports.",
    inputSchema: z.object({ id: z.string() }),
    summarize: (i) => `Complete ${s(i["id"])}`,
  },

  // -------------------------------------------------------------- approval
  decide_approval: {
    category: "approval",
    description:
      "Record a decision on a pending approval request. Requires the acting user to be its approver, and a reason.",
    inputSchema: z.object({
      id: z.string(),
      decision: z.enum(["Approved", "Rejected", "Returned"]),
      reason: z.string().min(1),
    }),
    summarize: (i) => `${s(i["decision"])} ${s(i["id"])}`,
  },

  // --------------------------------------------------------------- finance
  record_payment: {
    category: "finance",
    description:
      "Record a receipt against a bill. The amount cannot exceed the outstanding balance, and settles the bill when it covers it.",
    inputSchema: z.object({
      billId: z.string(),
      amount: z.number().min(0),
      reference: z.string().default(""),
      date: z.string().optional(),
    }),
    summarize: (i) => `Record ${s(i["amount"])} against ${s(i["billId"])}`,
  },
  record_promise_to_pay: {
    category: "finance",
    description: "Log a client promise-to-pay date on a bill and set it to Promise to Pay.",
    inputSchema: z.object({ billId: z.string(), promiseDate: z.string() }),
    summarize: (i) => `Promise to pay on ${s(i["billId"])} by ${s(i["promiseDate"])}`,
  },
  escalate_collection: {
    category: "finance",
    description: "Escalate an unpaid bill so it leaves the routine collection cycle.",
    inputSchema: z.object({ billId: z.string(), reason: z.string().default("") }),
    summarize: (i) => `Escalate ${s(i["billId"])}`,
  },

  // ----------------------------------------------------------------- admin
  archive_record: {
    category: "admin",
    description:
      "Archive a record. It stays in the audit history. Financial records cannot be archived.",
    inputSchema: z.object({ id: z.string(), reason: z.string().default("") }),
    summarize: (i) => `Archive ${s(i["id"])}`,
  },
  set_active_workspace: {
    category: "admin",
    description: "Switch the active workspace for the user.",
    inputSchema: z.object({ workspaceId: workspaceEnum }),
    summarize: (i) => `Switch to ${s(i["workspaceId"])}`,
  },
} satisfies Record<string, AgentToolSpec>;

export type AgentToolName = keyof typeof agentTools;
export const agentToolNames = Object.keys(agentTools) as AgentToolName[];

export function toolCategory(name: string): ToolCategory | null {
  return name in agentTools ? agentTools[name as AgentToolName].category : null;
}

export function summarizeToolCall(name: string, input: unknown): string {
  if (!(name in agentTools)) return name;
  try {
    return agentTools[name as AgentToolName].summarize((input ?? {}) as Record<string, unknown>);
  } catch {
    return name;
  }
}

/** Tools whose effects are visible in the workspace, so the UI can label them as writes. */
export function isWriteTool(name: string): boolean {
  const category = toolCategory(name);
  return category !== null && category !== "read";
}
