import {
  Activity,
  BarChart3,
  Building2,
  CalendarClock,
  CalendarRange,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  LayoutDashboard,
  Receipt,
  TimerOff,
  Users,
  Zap,
  PhoneCall,
} from "lucide-react";
import { hubNav } from "@/features/workspaces/navigation";
import type { LucideIcon } from "lucide-react";
import { getWorkspaceNav, type WorkspaceId } from "@/lib/workspace-hub";

export interface NavItem {
  to: string;
  label: string;
  labelAr: string;
  icon: LucideIcon;
  badge?: "approvals" | "alerts" | "tasks";
}

export interface NavGroup {
  label: string;
  labelAr: string;
  items: NavItem[];
}

const ICON_BY_PATH: Record<string, LucideIcon> = {
  "/workspace": LayoutDashboard,
  "/sales": PhoneCall,
  "/crm/clients": Building2,
  "/tasks": ClipboardList,
  "/meetings": CalendarClock,
  "/overdue": TimerOff,
  "/calendar": CalendarRange,
  "/finance/invoices": Receipt,
  "/finance/payments": CreditCard,
  "/reports": BarChart3,
  "/admin/automations": Zap,
  "/activity": Activity,
  "/admin/users": Users,
  "/files": FileSpreadsheet,
};

const ICON_BY_SUFFIX: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  home: LayoutDashboard,
  task: ClipboardList,
  meeting: CalendarClock,
  calendar: CalendarRange,
  overdue: TimerOff,
  reports: BarChart3,
  automations: Zap,
  activity: Activity,
  people: Users,
  file: FileSpreadsheet,
  client: Building2,
  bill: Receipt,
  payment: CreditCard,
  collections: PhoneCall,
  workload: Users,
};

export function getWorkspaceNavGroups(workspaceId: WorkspaceId): NavGroup[] {
  return hubNav(workspaceId).map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      icon:
        ICON_BY_PATH[item.to] ?? ICON_BY_SUFFIX[item.to.split("/").pop() ?? ""] ?? ClipboardList,
    })),
  }));
}

// Kept as a compatibility export for any older imports; the app shell uses getWorkspaceNavGroups().
export const navGroups: NavGroup[] = getWorkspaceNavGroups("core");
