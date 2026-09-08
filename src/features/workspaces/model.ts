import { z } from "zod";
import type { WorkspaceId, WorkspaceLevel } from "../../lib/workspace-hub";

export const kinds = [
  "task",
  "project",
  "decision",
  "blocker",
  "meeting",
  "client",
  "action",
  "quotation",
  "proposal",
  "contract",
  "bill",
  "payment",
  "employee",
  "onboarding",
  "people-action",
  "interview",
  "attendance",
  "document",
  "request",
  "data-issue",
  "file",
  "approval",
] as const;
export type Kind = (typeof kinds)[number];
export type Actor = {
  id: string;
  name: string;
  role: string;
  department: string;
  entityId: string;
  scope: string;
  status: string;
  /** Home workspace. Falls back to department/role mapping when absent. */
  workspaceId?: WorkspaceId;
  /** member | supervisor | lead inside that workspace. */
  workspaceLevel?: WorkspaceLevel;
  /** Direct line manager inside the workspace. */
  managerId?: string;
  /** Everyone reporting to this person, directly or indirectly. Filled by the provider. */
  reportIds?: string[];
};
export type Field = {
  key: string;
  en: string;
  ar: string;
  type?: "text" | "textarea" | "date" | "time" | "number" | "url" | "email";
  required?: boolean;
  options?: string[];
  link?: Kind;
};
export const titles: Record<Kind, [string, string]> = {
  task: ["Task", "مهمة"],
  project: ["Project", "مشروع"],
  decision: ["Decision", "قرار"],
  blocker: ["Blocker", "معوق"],
  meeting: ["Meeting", "اجتماع"],
  client: ["Client", "عميل"],
  action: ["Sales Action", "إجراء مبيعات"],
  quotation: ["Quotation", "عرض سعر"],
  proposal: ["Proposal", "مقترح"],
  contract: ["Contract", "عقد"],
  bill: ["Bill", "فاتورة"],
  payment: ["Payment", "دفعة"],
  employee: ["Employee", "موظف"],
  onboarding: ["Onboarding", "تهيئة موظف"],
  "people-action": ["People Action", "إجراء موظف"],
  interview: ["Interview", "مقابلة"],
  attendance: ["Attendance Exception", "استثناء حضور"],
  document: ["Document", "مستند"],
  request: ["Analysis Request", "طلب تحليل"],
  "data-issue": ["Data Issue", "مشكلة بيانات"],
  file: ["File", "ملف"],
  approval: ["Approval", "موافقة"],
};
export const taskStatuses = [
  "Backlog",
  "To Do",
  "In Progress",
  "Blocked",
  "Waiting",
  "Under Review",
  "Done",
  "Cancelled",
];
export const statuses: Record<Kind, string[]> = {
  task: taskStatuses,
  project: [
    "Planned",
    "Ready",
    "In Progress",
    "Blocked",
    "Waiting",
    "Under Review",
    "Completed",
    "On Hold",
  ],
  decision: ["Needed", "Under Discussion", "Approved", "Rejected", "Deferred"],
  blocker: ["Open", "Escalated", "Resolved"],
  meeting: ["Scheduled", "Completed", "Cancelled"],
  client: ["Prospect", "Active", "At Risk", "Closed"],
  action: ["Open", "In Progress", "Waiting", "Completed", "Cancelled"],
  quotation: ["Draft", "Under Review", "Sent", "Accepted", "Rejected"],
  proposal: ["Draft", "Under Review", "Sent", "Accepted", "Rejected"],
  contract: ["Draft", "Under Review", "Sent", "Signed", "Cancelled"],
  bill: [
    "Upcoming",
    "Due Soon",
    "Due Today",
    "Promise to Pay",
    "Partially Paid",
    "Paid",
    "Overdue",
    "Escalated",
    "Cancelled",
  ],
  payment: ["Recorded"],
  employee: ["Active", "Onboarding", "Offboarding", "Inactive"],
  onboarding: taskStatuses,
  "people-action": taskStatuses,
  interview: ["Scheduled", "Completed", "Cancelled"],
  attendance: ["Open", "Under Review", "Resolved"],
  document: ["Requested", "Received", "Verified", "Expired"],
  request: ["New", "Clarification Needed", "Ready", "In Progress", "QA", "Delivered", "Blocked"],
  "data-issue": ["Open", "In Progress", "Blocked", "Resolved"],
  file: ["Available", "Archived"],
  approval: ["Pending", "Approved", "Rejected", "Returned"],
};
const client: Field = { key: "clientId", en: "Client", ar: "العميل", link: "client" };
const project: Field = { key: "projectId", en: "Project", ar: "المشروع", link: "project" };
const employee: Field = {
  key: "employeeId",
  en: "Employee",
  ar: "الموظف",
  link: "employee",
  required: true,
};
export const fields: Record<Kind, Field[]> = {
  task: [
    project,
    { key: "deliverable", en: "Deliverable", ar: "المخرج المطلوب" },
    { key: "slaHours", en: "SLA (hours)", ar: "مدة التنفيذ بالساعات", type: "number" },
    { key: "dependencyId", en: "Depends on", ar: "يعتمد على", link: "task" },
  ],
  project: [
    { key: "milestones", en: "Milestones", ar: "المراحل", type: "textarea" },
    { key: "risk", en: "Risk / business impact", ar: "المخاطر وأثرها", type: "textarea" },
    { key: "decisionNeeded", en: "Decision needed", ar: "القرار المطلوب" },
    { key: "dependencyId", en: "Dependency", ar: "الاعتماد", link: "project" },
  ],
  decision: [
    project,
    { key: "meetingId", en: "Related meeting", ar: "الاجتماع المرتبط", link: "meeting" },
    { key: "options", en: "Options", ar: "الخيارات", type: "textarea", required: true },
    { key: "reason", en: "Decision and reason", ar: "القرار والسبب", type: "textarea" },
  ],
  blocker: [
    project,
    { key: "impact", en: "Business impact", ar: "الأثر على العمل", required: true },
    {
      key: "blockedTeam",
      en: "Blocked person / team",
      ar: "الشخص أو الفريق المتعطل",
      required: true,
    },
    { key: "dependencyId", en: "Dependency", ar: "الاعتماد", link: "task" },
    { key: "escalationOwner", en: "Escalation owner ID", ar: "معرّف مسؤول التصعيد" },
  ],
  meeting: [
    client,
    project,
    { key: "startTime", en: "Start time", ar: "وقت البداية", type: "time", required: true },
    { key: "endTime", en: "End time", ar: "وقت النهاية", type: "time", required: true },
    { key: "externalAttendees", en: "External attendees", ar: "حضور خارجي" },
    { key: "agenda", en: "Agenda", ar: "جدول الأعمال", type: "textarea" },
    { key: "location", en: "Location / meeting link", ar: "المكان أو رابط الاجتماع" },
  ],
  client: [
    { key: "contact", en: "Contact name", ar: "جهة الاتصال", required: true },
    { key: "email", en: "Work email", ar: "البريد المهني", type: "email" },
    { key: "phone", en: "Phone", ar: "الهاتف" },
    { key: "industry", en: "Industry", ar: "القطاع" },
  ],
  action: [
    { ...client, required: true },
    { key: "contact", en: "Contact", ar: "جهة الاتصال" },
    {
      key: "activity",
      en: "Activity",
      ar: "النشاط",
      options: ["Call", "Follow-up", "Meeting", "Quotation", "Proposal", "Contract", "Other"],
    },
    {
      key: "outcome",
      en: "Outcome",
      ar: "النتيجة",
      required: true,
      options: [
        "Answered",
        "No Answer",
        "Follow-up",
        "Meeting Requested",
        "Not Interested",
        "Call Back",
        "Other",
      ],
    },
    { key: "lastOutcome", en: "Previous outcome", ar: "النتيجة السابقة" },
  ],
  quotation: [
    { ...client, required: true },
    { key: "amount", en: "Amount", ar: "المبلغ", type: "number", required: true },
    {
      key: "currency",
      en: "Currency",
      ar: "العملة",
      options: ["SAR", "EGP", "AED", "KWD", "QAR", "BHD"],
      required: true,
    },
    { key: "deliveryUrl", en: "Quotation link", ar: "رابط عرض السعر", type: "url" },
  ],
  proposal: [
    { ...client, required: true },
    { key: "amount", en: "Amount", ar: "المبلغ", type: "number" },
    {
      key: "currency",
      en: "Currency",
      ar: "العملة",
      options: ["SAR", "EGP", "AED", "KWD", "QAR", "BHD"],
    },
    { key: "deliveryUrl", en: "Proposal link", ar: "رابط المقترح", type: "url" },
  ],
  contract: [
    { ...client, required: true },
    { key: "amount", en: "Contract value", ar: "قيمة العقد", type: "number" },
    {
      key: "currency",
      en: "Currency",
      ar: "العملة",
      options: ["SAR", "EGP", "AED", "KWD", "QAR", "BHD"],
    },
    { key: "deliveryUrl", en: "Contract link", ar: "رابط العقد", type: "url" },
  ],
  bill: [
    { key: "clientName", en: "Client / legal name", ar: "اسم العميل", required: true },
    { key: "invoice", en: "Invoice number", ar: "رقم الفاتورة", required: true },
    { key: "amount", en: "Amount", ar: "المبلغ", type: "number", required: true },
    {
      key: "currency",
      en: "Currency",
      ar: "العملة",
      options: ["SAR", "EGP", "AED", "KWD", "QAR", "BHD"],
      required: true,
    },
    { key: "issueDate", en: "Issue date", ar: "تاريخ الإصدار", type: "date", required: true },
  ],
  payment: [
    { key: "billId", en: "Bill", ar: "الفاتورة", link: "bill", required: true },
    { key: "amount", en: "Amount", ar: "المبلغ", type: "number", required: true },
    { key: "reference", en: "Payment reference", ar: "مرجع الدفع", required: true },
  ],
  employee: [
    { key: "email", en: "Work email", ar: "البريد المهني", type: "email", required: true },
    { key: "department", en: "Department", ar: "القسم", required: true },
    { key: "role", en: "Responsibility", ar: "المسؤولية" },
    { key: "joinDate", en: "Join date", ar: "تاريخ الانضمام", type: "date", required: true },
    { key: "location", en: "Location", ar: "الموقع" },
    { key: "equipment", en: "Equipment", ar: "المعدات", type: "textarea" },
    { key: "access", en: "System access", ar: "صلاحيات الأنظمة", type: "textarea" },
  ],
  onboarding: [
    employee,
    {
      key: "template",
      en: "Template",
      ar: "القالب",
      options: ["Standard employee", "Technical employee"],
    },
  ],
  "people-action": [
    employee,
    {
      key: "category",
      en: "Action type",
      ar: "نوع الإجراء",
      options: ["Request", "Probation review", "Training", "Leave", "Equipment", "Access"],
    },
  ],
  interview: [
    { key: "candidate", en: "Candidate", ar: "المرشح", required: true },
    { key: "role", en: "Responsibility", ar: "المسؤولية", required: true },
    { key: "startTime", en: "Start time", ar: "وقت البداية", type: "time", required: true },
    { key: "endTime", en: "End time", ar: "وقت النهاية", type: "time", required: true },
    { key: "location", en: "Location", ar: "المكان" },
  ],
  attendance: [
    employee,
    {
      key: "exception",
      en: "Exception",
      ar: "الاستثناء",
      options: ["Missing punch", "Late arrival", "Correction", "Absence"],
    },
    { key: "evidence", en: "Evidence / correction", ar: "الدليل أو التصحيح", type: "textarea" },
  ],
  document: [
    employee,
    { key: "category", en: "Document type", ar: "نوع المستند" },
    { key: "deliveryUrl", en: "Document link", ar: "رابط المستند", type: "url" },
  ],
  request: [
    {
      key: "requestType",
      en: "Request type",
      ar: "نوع الطلب",
      options: ["Analysis", "Report", "Dashboard"],
    },
    { key: "department", en: "Requesting department", ar: "القسم الطالب", required: true },
    {
      key: "businessQuestion",
      en: "Business question",
      ar: "سؤال العمل",
      type: "textarea",
      required: true,
    },
    { key: "metrics", en: "Required metrics", ar: "المؤشرات المطلوبة", required: true },
    { key: "source", en: "Data source", ar: "مصدر البيانات", required: true },
    { key: "slaHours", en: "SLA (hours)", ar: "مدة التنفيذ بالساعات", type: "number" },
    { key: "deliveryUrl", en: "Delivery link", ar: "رابط التسليم", type: "url" },
    {
      key: "clarification",
      en: "Clarification / QA notes",
      ar: "ملاحظات التوضيح والجودة",
      type: "textarea",
    },
  ],
  "data-issue": [
    { key: "requestId", en: "Analysis request", ar: "طلب التحليل", link: "request" },
    {
      key: "category",
      en: "Issue type",
      ar: "نوع المشكلة",
      options: [
        "Missing data",
        "Inconsistent data",
        "Duplicate data",
        "Delayed source",
        "API issue",
        "Wrong mapping",
        "Incorrect calculation",
        "Dashboard issue",
      ],
    },
    { key: "source", en: "Source", ar: "المصدر", required: true },
    { key: "impact", en: "Impact", ar: "الأثر", required: true },
    { key: "fix", en: "Fix", ar: "الإصلاح", type: "textarea" },
  ],
  file: [
    { key: "folder", en: "Folder", ar: "المجلد" },
    { key: "tags", en: "Tags", ar: "الوسوم" },
    { key: "deliveryUrl", en: "External file link", ar: "رابط ملف خارجي", type: "url" },
  ],
  approval: [
    {
      key: "requestType",
      en: "Approval type",
      ar: "نوع الموافقة",
      options: [
        "Budget",
        "Quotation",
        "Payment",
        "HR request",
        "Project decision",
        "Access request",
      ],
    },
    { key: "impact", en: "Impact", ar: "الأثر", required: true },
    { key: "reason", en: "Decision reason", ar: "سبب القرار", type: "textarea" },
  ],
};
export const workspaceKinds: Record<WorkspaceId, Kind[]> = {
  management: [
    "project",
    "decision",
    "blocker",
    "request",
    "data-issue",
    "task",
    "meeting",
    "file",
    "approval",
  ],
  sales: [
    "action",
    "client",
    "quotation",
    "proposal",
    "contract",
    "task",
    "meeting",
    "file",
    "approval",
  ],
  finance: ["bill", "payment", "task", "meeting", "file", "approval"],
  hr: [
    "employee",
    "onboarding",
    "people-action",
    "interview",
    "attendance",
    "document",
    "task",
    "meeting",
    "file",
    "approval",
  ],
};
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");
export const recordSchema = z.object({
  id: z.string(),
  workspaceId: z.enum(["management", "sales", "finance", "hr"]),
  kind: z.enum(kinds),
  title: z.string().trim().min(3).max(180),
  description: z.string().max(12000),
  ownerId: z.string().min(1),
  collaborators: z.array(z.string()),
  entityId: z.string(),
  status: z.string(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  startDate: date,
  dueDate: date,
  progress: z.number().min(0).max(100),
  nextAction: z.string().max(2000),
  details: z.record(z.string(), z.string()),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string(),
  sourceId: z.string(),
  archived: z.boolean(),
});
export type WorkRecord = z.infer<typeof recordSchema>;
export type Draft = Pick<
  WorkRecord,
  | "workspaceId"
  | "kind"
  | "title"
  | "description"
  | "ownerId"
  | "collaborators"
  | "entityId"
  | "status"
  | "priority"
  | "startDate"
  | "dueDate"
  | "progress"
  | "nextAction"
  | "details"
>;
export type Comment = { id: string; recordId: string; by: string; body: string; at: string };
export type Audit = {
  id: string;
  recordId: string;
  workspaceId: WorkspaceId;
  actorId: string;
  action: string;
  at: string;
  before: string;
  after: string;
};
export type Notice = {
  id: string;
  recordId: string;
  workspaceId: WorkspaceId;
  userId: string;
  title: string;
  at: string;
  read: boolean;
};
export type Rule = {
  id: string;
  workspaceId: WorkspaceId;
  title: string;
  trigger: "due" | "daily" | "blocked" | "sla";
  days: number;
  hour: string;
  kind: Kind;
  action: "notify" | "task" | "escalate";
  channel: "in-app" | "Email" | "Webhook";
  ownerId: string;
  enabled: boolean;
  lastRun: string;
};
export type Run = {
  id: string;
  ruleId: string;
  at: string;
  status: "Success" | "Failed" | "Test";
  message: string;
};
export type SavedView = {
  id: string;
  userId: string;
  workspaceId: WorkspaceId;
  module: string;
  name: string;
  query: string;
  status: string;
  owner: string;
  view: string;
};
export type Attachment = {
  id: string;
  recordId: string;
  name: string;
  mime: string;
  size: number;
  version: number;
  at: string;
  by: string;
  data: string;
};
export type HubState = {
  version: 2;
  revision: number;
  records: WorkRecord[];
  comments: Comment[];
  audit: Audit[];
  notifications: Notice[];
  rules: Rule[];
  runs: Run[];
  views: SavedView[];
  attachments: Attachment[];
  executions: string[];
};
export const today = () => new Date().toLocaleDateString("en-CA");
export const dayOffset = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const closed = (r: WorkRecord) =>
  r.archived ||
  [
    "Done",
    "Completed",
    "Cancelled",
    "Resolved",
    "Paid",
    "Delivered",
    "Approved",
    "Rejected",
    "Signed",
    "Closed",
    "Inactive",
    "Archived",
    "Verified",
  ].includes(r.status);
export const overdue = (r: WorkRecord, day = today()) => !closed(r) && r.dueDate < day;
export const attentionScore = (r: WorkRecord, day = today()) =>
  closed(r)
    ? 0
    : { Low: 1, Medium: 2, High: 4, Critical: 6 }[r.priority] * 10 +
      (overdue(r, day) ? 60 : r.dueDate === day ? 30 : 0) +
      (r.status === "Blocked" || r.kind === "blocker" ? 40 : 0) +
      (r.status === "Escalated" ? 60 : 0) +
      Math.min(30, Math.max(0, Math.floor((Date.parse(day) - Date.parse(r.createdAt)) / 86400000)));
export const href = (r: WorkRecord) => `/workspaces/${r.workspaceId}/${r.kind}/${r.id}`;
