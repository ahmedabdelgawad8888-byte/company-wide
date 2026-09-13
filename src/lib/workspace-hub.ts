export type WorkspaceId = "management" | "sales" | "finance" | "hr" | "it" | "pmo";

/**
 * Position inside a workspace. Visibility widens as the level rises:
 * member     - only records they own, created or collaborate on
 * supervisor - the above plus everything owned by their direct reports
 * lead       - every record in their own workspace
 * Group Admin / Executive Management sit above all workspaces.
 */
export type WorkspaceLevel = "member" | "supervisor" | "lead";

export const WORKSPACE_IDS: WorkspaceId[] = ["management", "sales", "finance", "hr", "it", "pmo"];

export interface WorkspaceNavItem {
  to: string;
  label: string;
  labelAr: string;
  badge?: "approvals" | "alerts" | "tasks";
}

export interface WorkspaceNavGroup {
  label: string;
  labelAr: string;
  items: WorkspaceNavItem[];
}

export interface WorkspaceDefinition {
  id: WorkspaceId;
  title: string;
  titleAr: string;
  shortTitle: string;
  shortTitleAr: string;
  description: string;
  descriptionAr: string;
  purpose: string;
  purposeAr: string;
  departments: string[];
  nav: WorkspaceNavGroup[];
}

const WORKSPACE_NAV: Record<WorkspaceId, WorkspaceNavGroup[]> = {
  management: [
    {
      label: "Management",
      labelAr: "الإدارة",
      items: [
        { to: "/workspace", label: "Management Home", labelAr: "الرئيسية" },
        { to: "/tasks", label: "Shared Priorities", labelAr: "الأولويات المشتركة", badge: "tasks" },
        { to: "/meetings", label: "Decisions & Meetings", labelAr: "القرارات والاجتماعات" },
        { to: "/overdue", label: "Blockers & Overdue", labelAr: "المعوقات والمتأخرات" },
        { to: "/calendar", label: "Management Calendar", labelAr: "تقويم الإدارة" },
      ],
    },
    {
      label: "Control & Insight",
      labelAr: "المتابعة والتحليل",
      items: [
        { to: "/admin/automations", label: "Automation Center", labelAr: "مركز الأتمتة" },
        { to: "/admin/users", label: "People & Access", labelAr: "الأشخاص والصلاحيات" },
        { to: "/activity", label: "Activity & Changes", labelAr: "النشاط والتغييرات" },
        { to: "/reports", label: "Group Reports", labelAr: "تقارير المجموعة" },
        { to: "/files", label: "Files & Data", labelAr: "الملفات والبيانات" },
      ],
    },
  ],
  sales: [
    {
      label: "Sales Workspace",
      labelAr: "مساحة المبيعات",
      items: [
        { to: "/workspace", label: "Sales Home", labelAr: "الرئيسية" },
        { to: "/sales", label: "Sales Activity", labelAr: "نشاط المبيعات" },
        { to: "/crm/clients", label: "Clients & Follow-ups", labelAr: "العملاء والمتابعات" },
        { to: "/tasks", label: "Sales Actions", labelAr: "إجراءات المبيعات", badge: "tasks" },
        { to: "/meetings", label: "Client Meetings", labelAr: "اجتماعات العملاء" },
        { to: "/calendar", label: "Sales Calendar", labelAr: "تقويم المبيعات" },
        { to: "/reports", label: "Sales Performance", labelAr: "أداء المبيعات" },
      ],
    },
  ],
  finance: [
    {
      label: "Finance Workspace",
      labelAr: "مساحة الحسابات",
      items: [
        { to: "/workspace", label: "Finance Home", labelAr: "الرئيسية" },
        { to: "/finance/invoices", label: "Bills & Collections", labelAr: "الفواتير والتحصيلات" },
        { to: "/finance/payments", label: "Payments", labelAr: "المدفوعات" },
        { to: "/tasks", label: "Finance Actions", labelAr: "إجراءات الحسابات", badge: "tasks" },
        { to: "/overdue", label: "Collection Overdue", labelAr: "التحصيلات المتأخرة" },
        { to: "/calendar", label: "Due Calendar", labelAr: "تقويم الاستحقاقات" },
        { to: "/reports", label: "Finance Reports", labelAr: "تقارير الحسابات" },
      ],
    },
  ],
  hr: [
    {
      label: "HR Workspace",
      labelAr: "مساحة الموارد البشرية",
      items: [
        { to: "/workspace", label: "HR Home", labelAr: "الرئيسية" },
        { to: "/tasks", label: "People Actions", labelAr: "إجراءات الموظفين", badge: "tasks" },
        { to: "/admin/users", label: "People Directory", labelAr: "دليل الموظفين" },
        { to: "/meetings", label: "Interviews & Meetings", labelAr: "المقابلات والاجتماعات" },
        { to: "/calendar", label: "HR Calendar", labelAr: "تقويم الموارد البشرية" },
        { to: "/reports", label: "People Reports", labelAr: "تقارير الموارد البشرية" },
      ],
    },
  ],
  it: [
    {
      label: "IT Operations",
      labelAr: "عمليات تقنية المعلومات",
      items: [
        { to: "/workspace", label: "IT Home", labelAr: "الرئيسية" },
        { to: "/tasks", label: "Tasks & Tickets", labelAr: "المهام والتذاكر", badge: "tasks" },
        { to: "/calendar", label: "Routine Calendar", labelAr: "تقويم الإجراءات الدورية" },
        { to: "/overdue", label: "Blockers & Overdue", labelAr: "المعوقات والمتأخرات" },
      ],
    },
    {
      label: "Control & Knowledge",
      labelAr: "الرقابة والمعرفة",
      items: [
        { to: "/files", label: "SOPs & Files", labelAr: "الإجراءات والملفات" },
        { to: "/reports", label: "IT Reports", labelAr: "تقارير تقنية المعلومات" },
        { to: "/admin/automations", label: "Automations", labelAr: "الأتمتة" },
        { to: "/activity", label: "Activity & Audit", labelAr: "النشاط والتدقيق" },
      ],
    },
  ],
  pmo: [
    {
      label: "PMO Dashboard",
      labelAr: "لوحة PMO",
      items: [
        { to: "/workspace", label: "PMO Home", labelAr: "الرئيسية" },
        { to: "/pmo", label: "Dashboard", labelAr: "لوحة المؤشرات" },
        { to: "/pmo/requirements", label: "Requirements", labelAr: "المتطلبات", badge: "tasks" },
        { to: "/pmo/timeline", label: "Timeline (Gantt)", labelAr: "الجدول الزمني" },
        { to: "/pmo/e2e", label: "E2E View", labelAr: "المراحل الشاملة" },
      ],
    },
    {
      label: "Delivery Control",
      labelAr: "التحكم في التسليم",
      items: [
        { to: "/pmo/milestones", label: "Milestones", labelAr: "المراحل الرئيسية" },
        { to: "/pmo/actions", label: "Actions Log", labelAr: "سجل الإجراءات" },
        { to: "/pmo/raid", label: "RAID Log", labelAr: "سجل المخاطر" },
        { to: "/pmo/questions", label: "Open Questions", labelAr: "الأسئلة المفتوحة" },
      ],
    },
    {
      label: "Capacity & Insight",
      labelAr: "القدرة والتحليل",
      items: [
        { to: "/pmo/capacity", label: "Effort & Capacity", labelAr: "الجهد والقدرة" },
        { to: "/calendar", label: "Delivery Calendar", labelAr: "تقويم التسليم" },
        { to: "/pmo/reports", label: "Reports", labelAr: "التقارير" },
        { to: "/activity", label: "Activity & Changes", labelAr: "النشاط والتغييرات" },
      ],
    },
  ],
};

export const WORKSPACES: WorkspaceDefinition[] = [
  {
    id: "management",
    title: "Management",
    titleAr: "الإدارة",
    shortTitle: "Management",
    shortTitleAr: "الإدارة",
    description:
      "The admin and leadership workspace: cross-team priorities, blockers, decisions, approvals, analysis requests, automation and full visibility over Sales, Finance, HR and IT.",
    descriptionAr:
      "مساحة الإدارة والمشرفين: الأولويات المشتركة والمعوقات والقرارات والموافقات وطلبات التحليل والأتمتة مع رؤية كاملة على المبيعات والحسابات والموارد البشرية.",
    purpose: "See every workspace, decide fast and unblock the company.",
    purposeAr: "رؤية كل المساحات واتخاذ القرار بسرعة وإزالة المعوقات.",
    departments: [
      "Management",
      "Executive",
      "Core Team",
      "Technology",
      "IT",
      "Operations",
      "Business Analysis",
      "Development",
      "UI/UX",
      "Quality",
      "Data",
      "Data Analysis",
      "Business Intelligence",
      "BI",
    ],
    nav: WORKSPACE_NAV.management,
  },
  {
    id: "sales",
    title: "Sales",
    titleAr: "المبيعات",
    shortTitle: "Sales",
    shortTitleAr: "المبيعات",
    description:
      "Daily selling, client follow-ups, meetings, commitments and team performance without CRM clutter.",
    descriptionAr:
      "المتابعات اليومية والاجتماعات والتزامات العملاء وأداء فريق المبيعات بدون تعقيد CRM.",
    purpose: "Make every client next action visible and owned.",
    purposeAr: "كل خطوة تالية مع العميل تكون واضحة ولها مسؤول.",
    departments: ["Sales", "Community"],
    nav: WORKSPACE_NAV.sales,
  },
  {
    id: "finance",
    title: "Finance",
    titleAr: "الحسابات",
    shortTitle: "Finance",
    shortTitleAr: "الحسابات",
    description: "Bills, collections, payment follow-ups and finance actions in one focused queue.",
    descriptionAr: "الفواتير والتحصيلات ومتابعات الدفع وإجراءات الحسابات في قائمة واضحة واحدة.",
    purpose: "Protect cash flow and make due work impossible to miss.",
    purposeAr: "حماية التدفق النقدي ومنع ضياع أي استحقاق.",
    departments: ["Finance"],
    nav: WORKSPACE_NAV.finance,
  },
  {
    id: "hr",
    title: "HR",
    titleAr: "الموارد البشرية",
    shortTitle: "HR",
    shortTitleAr: "HR",
    description:
      "People actions, onboarding, interviews, employee requests and recurring HR deadlines.",
    descriptionAr:
      "إجراءات الموظفين والتعيين والمقابلات والطلبات والمواعيد الدورية للموارد البشرية.",
    purpose: "Turn people operations into clear owned actions.",
    purposeAr: "تحويل أعمال الموارد البشرية إلى إجراءات واضحة ومسؤولة.",
    departments: ["HR", "People"],
    nav: WORKSPACE_NAV.hr,
  },
  {
    id: "it",
    title: "IT",
    titleAr: "تقنية المعلومات",
    shortTitle: "IT",
    shortTitleAr: "IT",
    description:
      "IT operations, infrastructure controls, recurring routines, support work, SOPs and technology governance in one accountable workspace.",
    descriptionAr:
      "عمليات تقنية المعلومات وضوابط البنية التحتية والإجراءات الدورية والدعم وإجراءات التشغيل والحوكمة التقنية في مساحة واحدة.",
    purpose: "Keep technology reliable, recoverable, secure and visibly owned.",
    purposeAr: "الحفاظ على موثوقية التقنية وقابليتها للاستعادة وأمنها ووضوح مسؤولياتها.",
    departments: ["IT"],
    nav: WORKSPACE_NAV.it,
  },
  {
    id: "pmo",
    title: "Dev & Business Analysis",
    titleAr: "التطوير وتحليل الأعمال",
    shortTitle: "PMO",
    shortTitleAr: "PMO",
    description:
      "Product requirements tracking, delivery milestones, RAID log, capacity planning and end-to-end value stream visibility for the development and BA team.",
    descriptionAr:
      "تتبع متطلبات المنتج ومراحل التسليم وسجل المخاطر وتخطيط القدرات ورؤية شاملة لمراحل القيمة لفريق التطوير وتحليل الأعمال.",
    purpose: "Ship the right scope on time with visible progress and no surprises.",
    purposeAr: "تسليم النطاق الصحيح في الوقت المحدد مع تقدم واضح وبدون مفاجآت.",
    departments: [
      "Product",
      "Business Analysis",
      "Development",
      "Frontend",
      "Backend",
      "Full-stack",
      "UI/UX",
      "Data/BI",
      "DevOps",
      "QA",
    ],
    nav: WORKSPACE_NAV.pmo,
  },
];

/** Roles that sit above every workspace and see all of them. */
const ADMIN_ROLES = new Set(["Group Admin", "Executive Management"]);

/** Fallback level when a user record carries no explicit workspaceLevel. */
const LEVEL_BY_ROLE: Record<string, WorkspaceLevel> = {
  "Group Admin": "lead",
  "Executive Management": "lead",
  "Group Finance": "lead",
  "Sales Manager": "lead",
  "HR Manager": "lead",
  "Operations Manager": "lead",
  "PMO Lead": "lead",
  "Product Manager": "lead",
  "Community Manager": "supervisor",
  "Queue Manager": "supervisor",
  "IT Admin": "supervisor",
  "Tech Lead": "supervisor",
  "Branch Accountant": "member",
  "Account Manager": "member",
  "Community Specialist": "member",
  "Operations Specialist": "member",
  "HR Specialist": "member",
  "Data Analyst": "member",
  "Business Analyst": "member",
  "Frontend Developer": "member",
  "Backend Developer": "member",
  "Full-stack Developer": "member",
  "UI/UX Designer": "member",
  "QA Engineer": "member",
  "DevOps Engineer": "member",
  Quality: "member",
  Viewer: "member",
};

/** Fallback home workspace when neither an explicit workspaceId nor a department matches. */
const WORKSPACE_BY_ROLE: Record<string, WorkspaceId> = {
  "Group Finance": "finance",
  "Branch Accountant": "finance",
  "Sales Manager": "sales",
  "Account Manager": "sales",
  "Community Manager": "sales",
  "Community Specialist": "sales",
  "HR Manager": "hr",
  "HR Specialist": "hr",
  "IT Admin": "it",
  "PMO Lead": "pmo",
  "Product Manager": "pmo",
  "Tech Lead": "pmo",
  "Business Analyst": "pmo",
  "Frontend Developer": "pmo",
  "Backend Developer": "pmo",
  "Full-stack Developer": "pmo",
  "UI/UX Designer": "pmo",
  "QA Engineer": "pmo",
  "DevOps Engineer": "pmo",
};

export interface WorkspaceUserLike {
  id: string;
  department?: string;
  role?: string;
  workspaceId?: WorkspaceId;
  workspaceLevel?: WorkspaceLevel;
  managerId?: string;
}

export function getWorkspace(id: WorkspaceId): WorkspaceDefinition {
  return WORKSPACES.find((workspace) => workspace.id === id) ?? WORKSPACES[0]!;
}

export function getWorkspaceNav(id: WorkspaceId): WorkspaceNavGroup[] {
  return getWorkspace(id).nav;
}

export function workspaceOwnsDepartment(id: WorkspaceId, department?: string): boolean {
  if (!department) return false;
  return getWorkspace(id).departments.some(
    (item) => item.toLowerCase() === department.toLowerCase(),
  );
}

export function isAdminUser(user: WorkspaceUserLike): boolean {
  return ADMIN_ROLES.has(user.role ?? "");
}

/** The single workspace a person belongs to. Admins are homed in Management. */
export function getHomeWorkspace(user: WorkspaceUserLike): WorkspaceId {
  if (user.workspaceId && WORKSPACE_IDS.includes(user.workspaceId)) return user.workspaceId;
  if (isAdminUser(user)) return "management";
  const byDepartment = WORKSPACES.find((workspace) =>
    workspaceOwnsDepartment(workspace.id, user.department),
  );
  if (byDepartment) return byDepartment.id;
  return WORKSPACE_BY_ROLE[user.role ?? ""] ?? "management";
}

export function getWorkspaceLevel(user: WorkspaceUserLike): WorkspaceLevel {
  if (user.workspaceLevel) return user.workspaceLevel;
  if (isAdminUser(user)) return "lead";
  return LEVEL_BY_ROLE[user.role ?? ""] ?? "member";
}

/**
 * Workspaces a person may open. Everyone belongs to exactly one workspace;
 * only Group Admin / Executive Management see every workspace.
 */
export function getWorkspaceIdsForUser(user: WorkspaceUserLike): WorkspaceId[] {
  if (isAdminUser(user)) return [...WORKSPACE_IDS];
  return [getHomeWorkspace(user)];
}

export function userCanAccessWorkspace(user: WorkspaceUserLike, workspaceId: WorkspaceId): boolean {
  return getWorkspaceIdsForUser(user).includes(workspaceId);
}

export function workspaceAllowsPath(id: WorkspaceId, path: string): boolean {
  return getWorkspaceNav(id).some((group) =>
    group.items.some(
      (item) => path === item.to || (item.to !== "/" && path.startsWith(`${item.to}/`)),
    ),
  );
}
