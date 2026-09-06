import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Pill, Section, Stat, StatusPill } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { BarChartCard, countBy } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { taskIsOverdue } from "@/lib/derive";
import { shortDate } from "@/lib/format";
import type { Task, TaskStatus } from "@/lib/types";
import { TODAY } from "@/lib/data/seed";
import { getWorkspace, workspaceOwnsDepartment } from "@/lib/workspace-hub";

const STATUSES: TaskStatus[] = [
  "Backlog",
  "To Do",
  "In Progress",
  "Blocked",
  "Pending Approval",
  "Done",
  "Postponed",
  "Cancelled",
];

function InlineNote({ task }: { task: Task }) {
  const { actions } = useApp();
  const [value, setValue] = useState(task.notes ?? "");
  useEffect(() => setValue(task.notes ?? ""), [task.id, task.notes]);
  return (
    <Input
      className="h-8 min-w-[220px] text-xs"
      value={value}
      placeholder="Add status note / blocker…"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== (task.notes ?? "")) actions.updateTask(task.id, { notes: value });
      }}
    />
  );
}

function Tasks() {
  const { db, inScope, currentUser, activeWorkspace, userName, clientName, actions } = useApp();
  const { t } = useLang();
  const workspace = getWorkspace(activeWorkspace);
  const [view, setView] = useState<"Workspace" | "My Tasks">("Workspace");
  useEffect(() => setView("Workspace"), [activeWorkspace]);
  const scoped = inScope(db.tasks).filter((r) =>
    workspaceOwnsDepartment(activeWorkspace, r.department),
  );
  const rows = view === "My Tasks" ? scoped.filter((r) => r.ownerId === currentUser.id) : scoped;
  const allowedViews: ("Workspace" | "My Tasks")[] = ["Workspace", "My Tasks"];
  const open = rows.filter((r) => !["Done", "Cancelled"].includes(r.status));
  const overdue = open.filter(taskIsOverdue);
  const dueToday = open.filter((r) => r.dueDate === TODAY);
  const completed = rows.filter((r) => r.status === "Done");

  const columns: Column<Task>[] = [
    {
      key: "task",
      header: t("Action", "الإجراء"),
      render: (r) => (
        <div className="min-w-[260px]">
          <div className="flex items-center gap-2">
            <span className="font-medium">{r.title}</span>
            {r.source ? <Pill tone="neutral">{r.source}</Pill> : null}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {r.description || r.deliverable}
          </div>
        </div>
      ),
      sortValue: (r) => r.title,
    },
    {
      key: "department",
      header: t("Team", "الفريق"),
      render: (r) => (
        <Pill
          tone={
            r.department === "Finance" ? "success" : r.department === "Sales" ? "brand" : "neutral"
          }
        >
          {r.department}
        </Pill>
      ),
      sortValue: (r) => r.department,
    },
    {
      key: "owner",
      header: t("Owner", "المسؤول"),
      render: (r) => <span className="whitespace-nowrap">{userName(r.ownerId)}</span>,
      sortValue: (r) => userName(r.ownerId),
    },
    {
      key: "client",
      header: t("Client", "العميل"),
      render: (r) => (r.clientId ? clientName(r.clientId) : "—"),
      sortValue: (r) => (r.clientId ? clientName(r.clientId) : ""),
    },
    {
      key: "due",
      header: t("Due", "الاستحقاق"),
      render: (r) => (
        <span className={taskIsOverdue(r) ? "font-semibold text-danger" : ""}>
          {shortDate(r.dueDate)}
        </span>
      ),
      sortValue: (r) => r.dueDate,
    },
    {
      key: "priority",
      header: t("Priority", "الأولوية"),
      render: (r) => <StatusPill status={r.priority} />,
      sortValue: (r) => r.priority,
    },
    {
      key: "status",
      header: t("Update status", "تحديث الحالة"),
      className: "min-w-[180px]",
      render: (r) => (
        <Select
          value={r.status}
          onValueChange={(v) => {
            actions.setTaskStatus(r.id, v as TaskStatus);
            toast.success(t("Task status updated", "تم تحديث حالة المهمة"), {
              description: r.title,
            });
          }}
        >
          <SelectTrigger className="h-8 min-w-[165px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      sortValue: (r) => r.status,
    },
    {
      key: "note",
      header: t("Live note", "ملاحظة مباشرة"),
      className: "min-w-[250px]",
      render: (r) => <InlineNote task={r} />,
      sortValue: (r) => r.notes ?? "",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(`${workspace.title} Actions`, `إجراءات ${workspace.titleAr}`)}
        subtitle={t(
          "A focused execution queue for this workspace. Work the oldest risk first, keep one clear owner, and update the status or blocker before leaving the task.",
          "قائمة تنفيذ مركزة لمساحة العمل الحالية. ابدأ بأقدم مخاطرة، حافظ على مسؤول واضح، وحدّث الحالة أو سبب التعطل قبل مغادرة المهمة.",
        )}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Open actions", "إجراءات مفتوحة")}
          value={String(open.length)}
          tone="brand"
        />
        <Stat
          label={t("Due today", "مستحقة اليوم")}
          value={String(dueToday.length)}
          tone={dueToday.length ? "warning" : "success"}
        />
        <Stat
          label={t("Overdue", "متأخرة")}
          value={String(overdue.length)}
          tone={overdue.length ? "danger" : "success"}
        />
        <Stat label={t("Completed", "مكتملة")} value={String(completed.length)} tone="success" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[.72fr_1.28fr]">
        <BarChartCard
          title={t("Execution state", "حالة التنفيذ")}
          description={t(
            "One view of how work is moving inside this workspace.",
            "عرض واحد لحركة العمل داخل مساحة العمل.",
          )}
          data={countBy(rows, (r) => r.status)}
          horizontal
          colorful
        />
        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-panel)]">
          <p className="text-sm font-semibold">{t("Work order", "ترتيب التنفيذ")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              "Use this order instead of jumping between tasks.",
              "استخدم هذا الترتيب بدلاً من التنقل العشوائي بين المهام.",
            )}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-danger/8 p-3">
              <p className="text-xs text-muted-foreground">
                1 · {t("Overdue / blocked", "متأخر / معطل")}
              </p>
              <p className="num mt-1 text-xl font-semibold text-danger">{overdue.length}</p>
            </div>
            <div className="rounded-lg bg-warning/8 p-3">
              <p className="text-xs text-muted-foreground">2 · {t("Due today", "مستحق اليوم")}</p>
              <p className="num mt-1 text-xl font-semibold text-warning">{dueToday.length}</p>
            </div>
            <div className="rounded-lg bg-primary/8 p-3">
              <p className="text-xs text-muted-foreground">
                3 · {t("Everything else", "باقي المهام")}
              </p>
              <p className="num mt-1 text-xl font-semibold text-primary">
                {Math.max(0, open.length - overdue.length - dueToday.length)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Section
        title={t("Action register", "سجل الإجراءات")}
        actions={
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              {allowedViews.map((v) => (
                <TabsTrigger key={v} value={v}>
                  {v}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      >
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) =>
            `${r.id} ${r.title} ${r.department} ${userName(r.ownerId)} ${r.clientId ? clientName(r.clientId) : ""} ${r.notes ?? ""}`
          }
          exportName="trygc-master-actions"
          pageSize={15}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Workspace Actions | TryGC Command Center" },
      {
        name: "description",
        content:
          "Workspace-specific action queue with owners, deadlines, blockers and live execution updates.",
      },
    ],
  }),
  component: Tasks,
});
