import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, CircleDollarSign, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Pill, Section, Stat, StatusPill } from "@/components/kit";
import {
  BarChartCard,
  ChartRow,
  SeriesBarChartCard,
  TrendChartCard,
  sumBy,
} from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { invoiceOutstanding, isOverdue, taskIsOverdue } from "@/lib/derive";
import { compactMoney, daysBetween, money, shortDate, toSAR } from "@/lib/format";
import { TODAY } from "@/lib/data/seed";

export function ExecDashboard() {
  const { db, inScope, currentUser, userName, clientName } = useApp();
  const { t } = useLang();
  const isAdmin = currentUser.role === "Group Admin";
  const tasks = inScope(db.tasks).filter(
    (x) =>
      ["Sales", "Finance", "Management"].includes(x.department) ||
      ["Meeting", "Bill", "Sales Activity"].includes(x.source ?? ""),
  );
  const openTasks = tasks.filter((x) => !["Done", "Cancelled"].includes(x.status));
  const overdueTasks = openTasks.filter(taskIsOverdue);
  const salesOpen = openTasks.filter((x) => x.department === "Sales");
  const financeOpen = openTasks.filter((x) => x.department === "Finance");
  const invoices = inScope(db.invoices);
  const openBills = invoices.filter((i) => invoiceOutstanding(i) > 0 && i.status !== "Cancelled");
  const overdueBills = openBills.filter(isOverdue);
  const overdueSAR = overdueBills.reduce((s, i) => s + toSAR(invoiceOutstanding(i), i.currency), 0);
  const outstandingSAR = openBills.reduce(
    (s, i) => s + toSAR(invoiceOutstanding(i), i.currency),
    0,
  );
  const payments = inScope(db.payments);
  const sales = inScope(db.salesActivities);
  const meetings = inScope(db.calendarEvents).filter((e) =>
    ["Meeting", "Sales Meeting", "Client Review", "Internal"].includes(e.type),
  );
  const todayMeetings = meetings.filter((e) => e.date === TODAY && e.status !== "Cancelled");
  const missingOutcomes = meetings.filter((e) => e.status === "Completed" && !e.outcome);
  const relevantApprovalTypes = new Set([
    "Invoice Approval",
    "Payment Approval",
    "Proposal Approval",
    "Finance Adjustment",
    ...(isAdmin ? ["Access Request"] : []),
  ]);
  const pendingApprovals = inScope(db.approvals).filter(
    (a) => a.status === "Pending" && relevantApprovalTypes.has(a.type),
  );
  const critical = [...overdueTasks]
    .sort((a, b) => b.priority.localeCompare(a.priority) || a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);
  const dueBills = openBills
    .filter((i) => {
      const d = -daysBetween(i.dueDate);
      return d >= 0 && d <= 14;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8);
  const collectedThisMonth = payments
    .filter((p) => p.date.startsWith(TODAY.slice(0, 7)))
    .reduce((s, p) => s + toSAR(p.amount, p.currency), 0);
  const collectionTimeline = sumBy(
    openBills,
    (i) => i.dueDate,
    (i) => toSAR(invoiceOutstanding(i), i.currency),
  )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 14);
  const executionHealth = [
    {
      name: t("Sales", "المبيعات"),
      open: salesOpen.length,
      risk: salesOpen.filter(taskIsOverdue).length,
    },
    {
      name: t("Finance", "المالية"),
      open: financeOpen.length,
      risk: financeOpen.filter(taskIsOverdue).length,
    },
    { name: t("Meetings", "الاجتماعات"), open: todayMeetings.length, risk: missingOutcomes.length },
  ];
  const clientExposure = sumBy(
    overdueBills,
    (i) => clientName(i.clientId),
    (i) => toSAR(invoiceOutstanding(i), i.currency),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const exceptionPeople = db.users
    .filter((u) => ["Sales", "Finance"].includes(u.department) && u.status === "active")
    .map((user) => ({
      user,
      overdue: overdueTasks.filter((x) => x.ownerId === user.id).length,
      open: openTasks.filter((x) => x.ownerId === user.id).length,
    }))
    .filter((r) => r.overdue > 0)
    .sort((a, b) => b.overdue - a.overdue)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Decision & Intervention Center", "مركز القرار والتدخل")}
        subtitle={t(
          "Start with exceptions that need management action. Operational detail stays one click away instead of competing for attention on the executive screen.",
          "ابدأ بالاستثناءات التي تحتاج تدخلاً إدارياً. التفاصيل التشغيلية تبقى على بعد نقرة دون تشتيت شاشة الإدارة.",
        )}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/approvals">{t("Pending decisions", "القرارات المعلقة")}</Link>
            </Button>
            <Button asChild>
              <Link to="/overdue">{t("Intervention queue", "قائمة التدخل")}</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Critical overdue actions", "إجراءات حرجة متأخرة")}
          value={String(overdueTasks.filter((x) => x.priority === "Critical").length)}
          hint={`${overdueTasks.length} ${t("total overdue", "إجمالي المتأخر")}`}
          tone={overdueTasks.length ? "danger" : "success"}
          icon={<AlertTriangle className="size-4" />}
        />
        <Stat
          label={t("Cash at risk (SAR)", "النقد المعرض للخطر بالريال")}
          value={compactMoney(overdueSAR, "SAR")}
          hint={`${compactMoney(outstandingSAR, "SAR")} ${t("total outstanding", "إجمالي قائم")}`}
          tone={overdueSAR ? "danger" : "success"}
          icon={<CircleDollarSign className="size-4" />}
        />
        <Stat
          label={t("Pending decisions", "قرارات معلقة")}
          value={String(pendingApprovals.length)}
          hint={t("Finance, proposal and access decisions", "قرارات مالية وعروض ووصول")}
          tone={pendingApprovals.length ? "warning" : "success"}
          icon={<ClipboardCheck className="size-4" />}
        />
        <Stat
          label={t("Meetings missing outcome", "اجتماعات بلا نتيجة")}
          value={String(missingOutcomes.length)}
          hint={`${todayMeetings.length} ${t("meetings today", "اجتماع اليوم")}`}
          tone={missingOutcomes.length ? "warning" : "brand"}
          icon={<CalendarClock className="size-4" />}
        />
      </div>

      <ChartRow>
        <TrendChartCard
          title={t("Collection exposure by due date", "التعرض للتحصيل حسب الاستحقاق")}
          description={t(
            "Shows when outstanding cash is expected, so pressure points are visible by date.",
            "يوضح متى يُتوقع تحصيل المبالغ القائمة لإظهار نقاط الضغط زمنياً.",
          )}
          data={collectionTimeline}
          format={(v) => compactMoney(v, "SAR")}
        />
        <SeriesBarChartCard
          title={t("Execution health by function", "صحة التنفيذ حسب الوظيفة")}
          description={t(
            "Open work compared with work already at risk.",
            "مقارنة العمل المفتوح بالعمل المعرض للخطر.",
          )}
          data={executionHealth}
          series={[
            { key: "open", label: t("Open", "مفتوح") },
            { key: "risk", label: t("At risk", "معرض للخطر") },
          ]}
        />
        <BarChartCard
          title={t("Overdue cash by client", "النقد المتأخر حسب العميل")}
          description={t(
            "Ranked only by money already past due.",
            "ترتيب حسب المبالغ التي تجاوزت تاريخ الاستحقاق فقط.",
          )}
          data={clientExposure}
          horizontal
          format={(v) => compactMoney(v, "SAR")}
        />
      </ChartRow>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <Section
            title={t("Intervene now", "تدخل الآن")}
            actions={
              <Button size="sm" variant="outline" asChild>
                <Link to="/overdue">{t("Open full queue", "فتح القائمة كاملة")}</Link>
              </Button>
            }
          >
            <div className="space-y-2">
              {critical.map((x) => (
                <div key={x.id} className="rounded-lg border border-danger/20 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{x.title}</p>
                        <Pill tone="danger">{daysBetween(x.dueDate)}d late</Pill>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {x.department} · {userName(x.ownerId)} ·{" "}
                        {x.clientId ? clientName(x.clientId) : t("Internal", "داخلي")}
                      </p>
                      {x.notes ? <p className="mt-2 text-xs">{x.notes}</p> : null}
                    </div>
                    <StatusPill status={x.status} />
                  </div>
                </div>
              ))}
              {!critical.length && (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "No overdue action currently needs management intervention.",
                    "لا يوجد إجراء متأخر يحتاج تدخلاً إدارياً حالياً.",
                  )}
                </p>
              )}
            </div>
          </Section>
        </Panel>

        <Panel>
          <Section
            title={t("Cash coming due", "النقد القريب من الاستحقاق")}
            actions={
              <Button size="sm" variant="outline" asChild>
                <Link to="/finance/invoices">
                  {t("Open collection register", "فتح سجل التحصيل")}
                </Link>
              </Button>
            }
          >
            <div className="space-y-2">
              {dueBills.map((i) => (
                <div key={i.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="num text-sm font-medium">{i.number}</p>
                        <Pill tone={-daysBetween(i.dueDate) <= 3 ? "warning" : "neutral"}>
                          {-daysBetween(i.dueDate)}d
                        </Pill>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {clientName(i.clientId)} · {t("due", "مستحق")} {shortDate(i.dueDate)}
                      </p>
                      <p className="mt-2 text-xs font-medium">
                        {i.nextAction ?? t("Confirm invoice receipt", "تأكيد استلام الفاتورة")}
                      </p>
                    </div>
                    <div className="num whitespace-nowrap font-semibold">
                      {money(invoiceOutstanding(i), i.currency)}
                    </div>
                  </div>
                </div>
              ))}
              {!dueBills.length && (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "No bills are due in the next 14 days.",
                    "لا توجد فواتير مستحقة خلال 14 يوماً.",
                  )}
                </p>
              )}
            </div>
          </Section>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <Section title={t("People needing management help", "أشخاص يحتاجون دعماً إدارياً")}>
            <div className="grid gap-3 md:grid-cols-2">
              {exceptionPeople.map(({ user, overdue, open }) => (
                <div key={user.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.department} · {user.role}
                      </p>
                    </div>
                    <Pill tone="danger">{overdue} overdue</Pill>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {open} open actions.{" "}
                    {t(
                      "Open their function queue to rebalance ownership or remove blockers.",
                      "افتح قائمة فريقه لإعادة توزيع الملكية أو إزالة العوائق.",
                    )}
                  </p>
                </div>
              ))}
              {!exceptionPeople.length && (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "No team member currently has overdue execution work.",
                    "لا يوجد عضو فريق لديه عمل تنفيذي متأخر حالياً.",
                  )}
                </p>
              )}
            </div>
          </Section>
        </Panel>
        <Panel>
          <Section
            title={
              isAdmin
                ? t("System exceptions", "استثناءات النظام")
                : t("Decision queue", "قائمة القرارات")
            }
          >
            <div className="space-y-3">
              {isAdmin
                ? db.automationRules
                    .filter((r) => r.failures > 0 || !r.enabled)
                    .slice(0, 6)
                    .map((r) => (
                      <div key={r.id} className="rounded-lg border p-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${r.failures ? "bg-danger" : "bg-warning"}`}
                          />
                          <p className="text-xs font-medium">{r.name}</p>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {r.failures} failures ·{" "}
                          {r.enabled ? t("enabled", "مفعّل") : t("disabled", "متوقف")}
                        </p>
                      </div>
                    ))
                : pendingApprovals.slice(0, 6).map((a) => (
                    <div key={a.id} className="rounded-lg border p-2.5">
                      <p className="text-xs font-medium">{a.title}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {a.type} · {shortDate(a.submittedAt)}
                        </span>
                        {a.value && a.currency ? (
                          <span className="num text-[11px] font-medium">
                            {money(a.value, a.currency)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
              {(isAdmin
                ? !db.automationRules.some((r) => r.failures > 0 || !r.enabled)
                : !pendingApprovals.length) && (
                <p className="text-sm text-muted-foreground">
                  {isAdmin
                    ? t(
                        "No automation exception needs attention.",
                        "لا يوجد استثناء أتمتة يحتاج متابعة.",
                      )
                    : t(
                        "No pending decision needs your attention.",
                        "لا يوجد قرار معلق يحتاج انتباهك.",
                      )}
                </p>
              )}
            </div>
            <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              {t("Business pulse", "نبض الأعمال")}: {compactMoney(collectedThisMonth, "SAR")}{" "}
              {t("collected this month", "محصّل هذا الشهر")} ·{" "}
              {sales.filter((x) => x.date === TODAY).length}{" "}
              {t("Sales activities today", "نشاط مبيعات اليوم")}
            </div>
          </Section>
        </Panel>
      </div>
    </div>
  );
}
