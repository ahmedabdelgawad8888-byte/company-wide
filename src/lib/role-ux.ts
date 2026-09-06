import type { RoleName } from "./types.ts";

export type RoleMode =
  | "executive"
  | "admin"
  | "sales-manager"
  | "sales-individual"
  | "finance-manager"
  | "finance-individual"
  | "support";

export type QuickCreateKind = "Task" | "Meeting" | "Sales Activity" | "Bill" | "Payment" | "Client";

export interface RoleExperience {
  mode: RoleMode;
  homePath: "/dashboard" | "/workspace";
  title: string;
  subtitle: string;
  workflow: string[];
  focus: string[];
  allowedPaths: string[];
  quickCreate: QuickCreateKind[];
}

const SHARED_EXECUTION = ["/workspace", "/tasks", "/meetings", "/overdue", "/calendar"];
const SALES_PATHS = ["/sales", "/crm/clients"];
const FINANCE_PATHS = ["/finance", "/finance/invoices", "/finance/payments"];
const MANAGEMENT_PATHS = ["/dashboard", "/alerts", "/approvals", "/activity", "/reports"];
const ADMIN_PATHS = ["/admin/automations", "/admin/users", "/admin/roles", "/settings"];

const ROLE_UX: Partial<Record<RoleName, RoleExperience>> = {
  "Group Admin": {
    mode: "admin",
    homePath: "/dashboard",
    title: "System control & execution",
    subtitle:
      "Keep access, automations and operating workflows healthy while retaining a full view of Sales and Finance execution.",
    workflow: [
      "Check failed automations",
      "Review access exceptions",
      "Validate workflow health",
      "Support business teams",
    ],
    focus: ["Automation failures", "Access issues", "Data integrity", "Cross-team blockers"],
    allowedPaths: [
      ...MANAGEMENT_PATHS,
      ...SHARED_EXECUTION,
      ...SALES_PATHS,
      ...FINANCE_PATHS,
      ...ADMIN_PATHS,
    ],
    quickCreate: ["Task", "Meeting", "Sales Activity", "Bill", "Payment", "Client"],
  },
  "Executive Management": {
    mode: "executive",
    homePath: "/dashboard",
    title: "Decision & intervention view",
    subtitle:
      "See only the issues that need management attention: overdue commitments, collection risk, Sales execution gaps and pending decisions.",
    workflow: [
      "Review critical exceptions",
      "Check collection exposure",
      "Review Sales commitments",
      "Decide approvals",
      "Intervene only where needed",
    ],
    focus: ["Critical overdue", "Cash at risk", "Commitments at risk", "Pending decisions"],
    allowedPaths: [...MANAGEMENT_PATHS, ...SHARED_EXECUTION, ...SALES_PATHS, ...FINANCE_PATHS],
    quickCreate: ["Task", "Meeting"],
  },
  "Sales Manager": {
    mode: "sales-manager",
    homePath: "/workspace",
    title: "Sales team control",
    subtitle:
      "Start with missed follow-ups and overdue commitments, then coach workload, meetings and client next actions.",
    workflow: [
      "Review overdue follow-ups",
      "Check today’s meetings",
      "Rebalance team actions",
      "Coach weak outcomes",
      "Close client commitments",
    ],
    focus: ["Overdue follow-ups", "Team workload", "Meeting outcomes", "Client commitments"],
    allowedPaths: [
      "/workspace",
      ...SALES_PATHS,
      "/tasks",
      "/meetings",
      "/overdue",
      "/calendar",
      "/reports",
      "/alerts",
    ],
    quickCreate: ["Sales Activity", "Meeting", "Task", "Client"],
  },
  "Account Manager": {
    mode: "sales-individual",
    homePath: "/workspace",
    title: "My Sales day",
    subtitle:
      "A simple personal queue: who to contact, which meeting is next, what was promised and what must be completed today.",
    workflow: [
      "Clear overdue follow-ups",
      "Work today’s calls",
      "Attend meetings",
      "Record every outcome",
      "Create the next action before moving on",
    ],
    focus: ["My overdue", "Calls due", "Meetings today", "Next actions"],
    allowedPaths: [
      "/workspace",
      ...SALES_PATHS,
      "/tasks",
      "/meetings",
      "/overdue",
      "/calendar",
      "/reports",
      "/alerts",
    ],
    quickCreate: ["Sales Activity", "Meeting", "Task", "Client"],
  },
  "Group Finance": {
    mode: "finance-manager",
    homePath: "/workspace",
    title: "Finance collection control",
    subtitle:
      "Prioritize overdue value and aging, then assign ownership, resolve collection blockers and close financial decisions.",
    workflow: [
      "Review overdue exposure",
      "Check aging buckets",
      "Assign collection actions",
      "Resolve exceptions",
      "Confirm cash received",
    ],
    focus: ["Overdue value", "Aging", "Collection ownership", "Finance approvals"],
    allowedPaths: [
      "/workspace",
      ...FINANCE_PATHS,
      "/tasks",
      "/meetings",
      "/overdue",
      "/calendar",
      "/reports",
      "/alerts",
      "/approvals",
    ],
    quickCreate: ["Bill", "Payment", "Task", "Meeting"],
  },
  "Branch Accountant": {
    mode: "finance-individual",
    homePath: "/workspace",
    title: "My Finance day",
    subtitle:
      "A clear collection queue: bills to issue, payments to confirm, follow-ups due today and anything already overdue.",
    workflow: [
      "Issue due bills",
      "Confirm invoice receipt",
      "Follow up collections",
      "Record payment or promise-to-pay",
      "Escalate overdue items",
    ],
    focus: ["Bills due", "Follow-ups today", "Payments to confirm", "My overdue"],
    allowedPaths: [
      "/workspace",
      ...FINANCE_PATHS,
      "/tasks",
      "/meetings",
      "/overdue",
      "/calendar",
      "/reports",
      "/alerts",
    ],
    quickCreate: ["Bill", "Payment", "Task", "Meeting"],
  },
  "IT Admin": {
    mode: "admin",
    homePath: "/workspace",
    title: "System support",
    subtitle:
      "Keep access and automations healthy while supporting Sales and Finance users without exposing irrelevant business modules.",
    workflow: [
      "Check automation failures",
      "Review access status",
      "Resolve user issues",
      "Validate system settings",
    ],
    focus: ["Automation health", "User access", "System exceptions", "Audit trail"],
    allowedPaths: ["/workspace", "/alerts", "/activity", ...ADMIN_PATHS],
    quickCreate: ["Task"],
  },
  Viewer: {
    mode: "support",
    homePath: "/workspace",
    title: "Read-only overview",
    subtitle:
      "See the execution information relevant to your assigned entity without edit-heavy administration or operational controls.",
    workflow: ["Review assigned information", "Check deadlines", "Open reports"],
    focus: ["Current status", "Upcoming deadlines", "Reports"],
    allowedPaths: ["/workspace", "/calendar", "/reports"],
    quickCreate: [],
  },
};

const FALLBACK: RoleExperience = {
  mode: "support",
  homePath: "/workspace",
  title: "My workspace",
  subtitle: "Focus on assigned actions and deadlines relevant to your role.",
  workflow: ["Review assigned actions", "Work by due date", "Update outcomes"],
  focus: ["Assigned actions", "Due dates", "Exceptions"],
  allowedPaths: ["/workspace", "/tasks", "/calendar", "/alerts"],
  quickCreate: ["Task"],
};

const FINANCE_SALES_HUB_ROLES = new Set<string>([
  "Group Admin",
  "Executive Management",
  "Group Finance",
  "Branch Accountant",
  "Sales Manager",
  "Account Manager",
  "IT Admin",
  "Viewer",
]);

export function isFinanceSalesHubRole(role: RoleName | string): boolean {
  return FINANCE_SALES_HUB_ROLES.has(role);
}

export function getRoleExperience(role: RoleName | string): RoleExperience {
  return ROLE_UX[role as RoleName] ?? FALLBACK;
}

export function getQuickCreateKinds(role: RoleName | string): QuickCreateKind[] {
  return [...getRoleExperience(role).quickCreate];
}

export function isIndividualContributor(role: RoleName | string): boolean {
  return ["sales-individual", "finance-individual"].includes(getRoleExperience(role).mode);
}

export function canSeePath(role: RoleName | string, path: string): boolean {
  const allowed = getRoleExperience(role).allowedPaths;
  return allowed.some((base) => path === base || (base !== "/" && path.startsWith(`${base}/`)));
}

export function getVisibleNavGroups<T extends { items: Array<{ to: string }> }>(
  groups: T[],
  role: RoleName | string,
): T[] {
  const allowed = new Set(getRoleExperience(role).allowedPaths);
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => allowed.has(item.to)) }))
    .filter((group) => group.items.length > 0) as T[];
}
