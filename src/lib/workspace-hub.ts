export type WorkspaceId = "core" | "sales" | "finance" | "hr" | "data";

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
  core: [
    {
      label: "Core Team",
      labelAr: "الفريق الأساسي",
      items: [
        { to: "/workspace", label: "Core Team Home", labelAr: "الرئيسية" },
        { to: "/tasks", label: "Shared Priorities", labelAr: "الأولويات المشتركة", badge: "tasks" },
        { to: "/meetings", label: "Decisions & Meetings", labelAr: "القرارات والاجتماعات" },
        { to: "/overdue", label: "Blockers & Overdue", labelAr: "المعوقات والمتأخرات" },
        { to: "/calendar", label: "Team Calendar", labelAr: "تقويم الفريق" },
      ],
    },
    {
      label: "Technology & Control",
      labelAr: "التكنولوجيا والمتابعة",
      items: [
        { to: "/admin/automations", label: "Automation Center", labelAr: "مركز الأتمتة" },
        { to: "/activity", label: "Activity & Changes", labelAr: "النشاط والتغييرات" },
        { to: "/reports", label: "Core Team Reports", labelAr: "تقارير الفريق الأساسي" },
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
  data: [
    {
      label: "Data Analysis Workspace",
      labelAr: "مساحة تحليل البيانات",
      items: [
        { to: "/workspace", label: "Data Home", labelAr: "الرئيسية" },
        { to: "/tasks", label: "Analysis Queue", labelAr: "قائمة التحليلات", badge: "tasks" },
        { to: "/reports", label: "Reports & Insights", labelAr: "التقارير والتحليلات" },
        { to: "/files", label: "Data Files", labelAr: "ملفات البيانات" },
        { to: "/calendar", label: "Delivery Calendar", labelAr: "تقويم التسليمات" },
        { to: "/activity", label: "Data Activity", labelAr: "نشاط البيانات" },
      ],
    },
  ],
};

export const WORKSPACES: WorkspaceDefinition[] = [
  {
    id: "core",
    title: "Core Team",
    titleAr: "الفريق الأساسي",
    shortTitle: "Core",
    shortTitleAr: "Core",
    description:
      "One shared command room for cross-functional priorities, blockers, decisions, technology and operations follow-through.",
    descriptionAr:
      "مساحة موحدة لأولويات الفريق الأساسي والمعوقات والقرارات ومتابعة التكنولوجيا والعمليات.",
    purpose: "Align the people who unblock the company.",
    purposeAr: "توحيد الفريق المسؤول عن إزالة المعوقات وتحريك الشركة.",
    departments: [
      "Core Team",
      "Technology",
      "IT",
      "Operations",
      "Business Analysis",
      "Development",
      "UI/UX",
    ],
    nav: WORKSPACE_NAV.core,
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
    departments: ["Sales"],
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
    id: "data",
    title: "Data Analysis",
    titleAr: "تحليل البيانات",
    shortTitle: "Data",
    shortTitleAr: "البيانات",
    description:
      "Analysis requests, report delivery, data quality follow-ups and recurring insight production.",
    descriptionAr: "طلبات التحليل وتسليم التقارير ومتابعة جودة البيانات وإنتاج التحليلات الدورية.",
    purpose: "Make analysis requests measurable from intake to delivery.",
    purposeAr: "تتبع طلبات التحليل من الاستلام حتى التسليم بشكل واضح.",
    departments: ["Data", "Data Analysis", "Business Intelligence", "BI"],
    nav: WORKSPACE_NAV.data,
  },
];

const CORE_MEMBER_IDS = new Set([
  "core-essmat",
  "core-amr",
  "core-alaa",
  "core-abdelfattah",
  "core-sabry",
  "core-ismaiel",
  "core-uiux",
]);

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

export function getWorkspaceIdsForUser(user: {
  id: string;
  department?: string;
  role?: string;
}): WorkspaceId[] {
  if (user.role === "Group Admin" || user.role === "Executive Management")
    return ["core", "sales", "finance", "hr", "data"];

  const matches = WORKSPACES.filter((workspace) =>
    workspaceOwnsDepartment(workspace.id, user.department),
  ).map((workspace) => workspace.id);
  if (CORE_MEMBER_IDS.has(user.id) && !matches.includes("core")) matches.unshift("core");
  if (matches.length) return matches;
  if (user.role === "Group Finance" || user.role === "Branch Accountant") return ["finance"];
  if (user.role === "Sales Manager" || user.role === "Account Manager") return ["sales"];
  if (user.role === "IT Admin") return ["core"];
  return ["core"];
}

export function userCanAccessWorkspace(
  user: { id: string; department?: string; role?: string },
  workspaceId: WorkspaceId,
): boolean {
  return getWorkspaceIdsForUser(user).includes(workspaceId);
}

export function workspaceAllowsPath(id: WorkspaceId, path: string): boolean {
  return getWorkspaceNav(id).some((group) =>
    group.items.some(
      (item) => path === item.to || (item.to !== "/" && path.startsWith(`${item.to}/`)),
    ),
  );
}
