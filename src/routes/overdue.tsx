import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Pill, Section, Stat, StatusPill } from "@/components/kit";
import { BarChartCard } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { taskIsOverdue, invoiceOutstanding, isOverdue } from "@/lib/derive";
import { compactMoney, daysBetween, money, shortDate, toSAR } from "@/lib/format";
import { getWorkspace, workspaceOwnsDepartment } from "@/lib/workspace-hub";

function OverdueControl() {
  const { db, inScope, currentUser, activeWorkspace, userName, clientName, actions } = useApp();
  const { t } = useLang();
  const workspace = getWorkspace(activeWorkspace);
  const tasks = inScope(db.tasks).filter(
    (x) =>
      workspaceOwnsDepartment(activeWorkspace, x.department) &&
      taskIsOverdue(x) &&
      !["Done", "Cancelled"].includes(x.status),
  );
  const invoices =
    activeWorkspace === "finance"
      ? inScope(db.invoices).filter((x) => isOverdue(x) && invoiceOutstanding(x) > 0)
      : [];
  const criticalTasks = tasks.filter(
    (x) => x.priority === "Critical" || daysBetween(x.dueDate) >= 3,
  );
  const overdueSAR = invoices.reduce((s, i) => s + toSAR(invoiceOutstanding(i), i.currency), 0);
  const oldestTask = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const oldestBill = [...invoices].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const ageBuckets = [
    {
      name: t("1–2 days", "1–2 يوم"),
      value: tasks.filter((x) => daysBetween(x.dueDate) <= 2).length,
    },
    {
      name: t("3–7 days", "3–7 أيام"),
      value: tasks.filter((x) => daysBetween(x.dueDate) >= 3 && daysBetween(x.dueDate) <= 7).length,
    },
    {
      name: t("8–30 days", "8–30 يوم"),
      value: tasks.filter((x) => daysBetween(x.dueDate) >= 8 && daysBetween(x.dueDate) <= 30)
        .length,
    },
    {
      name: t("31+ days", "31+ يوم"),
      value: tasks.filter((x) => daysBetween(x.dueDate) > 30).length,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(
          `${workspace.title} — Overdue & Blockers`,
          `${workspace.titleAr} — المتأخرات والمعوقات`,
        )}
        subtitle={t(
          "An intervention screen for this workspace only: oldest delays first, with owner, age and the action needed to unblock them.",
          "شاشة تدخل لمساحة العمل الحالية فقط: أقدم التأخيرات أولاً مع المسؤول وعمر التأخير والإجراء المطلوب.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Overdue actions", "إجراءات متأخرة")}
          value={String(tasks.length)}
          tone={tasks.length ? "danger" : "success"}
        />
        <Stat
          label={t("Critical actions", "إجراءات حرجة")}
          value={String(criticalTasks.length)}
          tone={criticalTasks.length ? "danger" : "success"}
        />
        <Stat
          label={t(
            activeWorkspace === "finance" ? "Overdue bills" : "Blocked actions",
            activeWorkspace === "finance" ? "فواتير متأخرة" : "إجراءات معطلة",
          )}
          value={String(
            activeWorkspace === "finance"
              ? invoices.length
              : tasks.filter((task) => task.status === "Blocked").length,
          )}
          tone={invoices.length ? "danger" : "success"}
        />
        <Stat
          label={t("Oldest delay", "أقدم تأخير")}
          value={`${Math.max(oldestTask ? daysBetween(oldestTask.dueDate) : 0, oldestBill ? daysBetween(oldestBill.dueDate) : 0)}d`}
          tone="warning"
        />
      </div>

      {tasks.length ? (
        <BarChartCard
          title={t("How old are the overdue actions?", "ما عمر الإجراءات المتأخرة؟")}
          description={t(
            "Age buckets help you attack the oldest backlog instead of only the loudest item.",
            "تقسيم العمر يساعدك على معالجة أقدم المتأخرات بدلاً من التركيز على الأعلى صوتاً فقط.",
          )}
          data={ageBuckets}
          colorful
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <Section
            title={t("Overdue actions requiring intervention", "إجراءات متأخرة تحتاج تدخل")}
            description={t(
              "Update status directly or add a management note from the workspace action queue.",
              "حدّث الحالة مباشرة أو أضف ملاحظة إدارة من الإجراءات الرئيسية.",
            )}
          >
            <div className="space-y-2">
              {tasks
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .map((task) => (
                  <div key={task.id} className="rounded-lg border border-danger/20 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{task.title}</p>
                          <Pill tone="danger">{daysBetween(task.dueDate)}d late</Pill>
                          <Pill tone={task.department === "Finance" ? "success" : "brand"}>
                            {task.department}
                          </Pill>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {userName(task.ownerId)} ·{" "}
                          {task.clientId ? clientName(task.clientId) : "Internal"} · due{" "}
                          {shortDate(task.dueDate)}
                        </p>
                        {task.notes ? <p className="mt-2 text-xs">{task.notes}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={task.status} />
                        {task.ownerId === currentUser.id ? (
                          <Button size="sm" onClick={() => actions.setTaskStatus(task.id, "Done")}>
                            {t("Complete", "إنهاء")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              {!tasks.length && (
                <p className="text-sm text-muted-foreground">
                  {t("No overdue actions.", "لا توجد إجراءات متأخرة.")}
                </p>
              )}
            </div>
          </Section>
        </Panel>

        {activeWorkspace === "finance" ? (
          <Panel>
            <Section
              title={t("Overdue bills & collections", "الفواتير والتحصيلات المتأخرة")}
              description={t(
                "Outstanding money only; paid and cancelled bills are excluded.",
                "المبالغ القائمة فقط؛ الفواتير المدفوعة والملغاة غير مدرجة.",
              )}
            >
              <div className="space-y-2">
                {invoices
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                  .map((inv) => (
                    <div key={inv.id} className="rounded-lg border border-danger/20 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="num font-medium">{inv.number}</p>
                            <Pill tone="danger">{daysBetween(inv.dueDate)}d late</Pill>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {clientName(inv.clientId)} ·{" "}
                            {inv.ownerId ? userName(inv.ownerId) : "Finance"} · due{" "}
                            {shortDate(inv.dueDate)}
                          </p>
                          <p className="mt-2 text-xs font-medium">
                            {inv.nextAction ??
                              t("Collection follow-up required", "مطلوب متابعة التحصيل")}
                          </p>
                          {inv.promiseToPayDate ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Promise-to-pay: {shortDate(inv.promiseToPayDate)}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-end">
                          <div className="num font-semibold text-danger">
                            {money(invoiceOutstanding(inv), inv.currency)}
                          </div>
                          <StatusPill status="Overdue" />
                        </div>
                      </div>
                    </div>
                  ))}
                {!invoices.length && (
                  <p className="text-sm text-muted-foreground">
                    {t("No overdue bills.", "لا توجد فواتير متأخرة.")}
                  </p>
                )}
              </div>
            </Section>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/overdue")({
  head: () => ({
    meta: [
      { title: "Workspace Overdue | TryGC Command Center" },
      {
        name: "description",
        content: "Unified overdue actions and collections escalation view for Sales and Finance.",
      },
    ],
  }),
  component: OverdueControl,
});
