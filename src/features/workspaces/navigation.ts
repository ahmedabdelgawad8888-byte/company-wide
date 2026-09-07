import type { WorkspaceId } from "../../lib/workspace-hub";
import { titles, type Kind } from "./model";
export type Module =
  | Kind
  | "home"
  | "dashboard"
  | "my-work"
  | "management"
  | "reports"
  | "calendar"
  | "activity"
  | "automations"
  | "people"
  | "notifications"
  | "overdue"
  | "collections"
  | "portfolio"
  | "workload";
export const extras: Record<string, [string, string]> = {
  home: ["Home", "الرئيسية"],
  dashboard: ["Dashboard", "لوحة التحليلات"],
  "my-work": ["My Workspace", "مساحتي"],
  management: ["Management", "الإدارة"],
  reports: ["Reports", "التقارير"],
  calendar: ["Calendar", "التقويم"],
  activity: ["Activity & audit", "النشاط والتدقيق"],
  automations: ["Automation Center", "مركز الأتمتة"],
  people: ["Workspace People", "فريق المساحة"],
  notifications: ["Notifications", "الإشعارات"],
  overdue: ["Overdue", "المتأخرات"],
  collections: ["Collections", "التحصيل"],
  portfolio: ["Portfolio", "محفظة المشاريع"],
  workload: ["Workload", "توزيع العمل"],
};
export const moduleTitle = (m: string): [string, string] =>
  titles[m as Kind] ?? extras[m] ?? [m, m];
const work: Record<WorkspaceId, Module[]> = {
  management: [
    "project",
    "decision",
    "blocker",
    "request",
    "data-issue",
    "task",
    "meeting",
    "portfolio",
  ],
  sales: ["action", "client", "meeting", "quotation", "proposal", "contract", "task"],
  finance: ["bill", "collections", "payment", "task", "meeting", "overdue"],
  hr: [
    "employee",
    "people-action",
    "onboarding",
    "interview",
    "attendance",
    "document",
    "task",
    "meeting",
  ],
};
export const modulePath = (w: WorkspaceId, m: Module) => `/workspaces/${w}/${m}`;
export const validModules = (w: WorkspaceId): Module[] => [
  "dashboard",
  "home",
  ...work[w],
  "calendar",
  "people",
  "file",
  "reports",
  "workload",
  "activity",
  "automations",
  "approval",
  "notifications",
  "my-work",
  "management",
];
export function hubNav(w: WorkspaceId) {
  return [
    {
      label: "Workspace",
      labelAr: "مساحة العمل",
      items: (["dashboard", "home", ...work[w]] as Module[]).map((m) => ({
        to: modulePath(w, m),
        label: m === "home" ? "Workspace Home" : moduleTitle(m)[0],
        labelAr: m === "home" ? "رئيسية المساحة" : moduleTitle(m)[1],
      })),
    },
    {
      label: "Team & insights",
      labelAr: "الفريق والمتابعة",
      items: (["calendar", "people", "file", "reports", "workload"] as Module[]).map((m) => ({
        to: modulePath(w, m),
        label: moduleTitle(m)[0],
        labelAr: moduleTitle(m)[1],
      })),
    },
    {
      label: "My work & control",
      labelAr: "عملي والمتابعة",
      items: (
        [
          "my-work",
          "approval",
          "notifications",
          "activity",
          "automations",
          "management",
        ] as Module[]
      ).map((m) => ({
        to: modulePath(w, m),
        label: moduleTitle(m)[0],
        labelAr: moduleTitle(m)[1],
      })),
    },
  ];
}
