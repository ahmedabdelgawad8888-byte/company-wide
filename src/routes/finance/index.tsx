import { createFileRoute, Link } from "@tanstack/react-router";
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
import { getRoleExperience } from "@/lib/role-ux";

function FinanceCenter() {
  const { db, inScope, currentUser, clientName, userName } = useApp();
  const { t } = useLang();
  const ux = getRoleExperience(currentUser.role);
  const individual = ux.mode === "finance-individual";
  const invoices = inScope(db.invoices).filter((i) =>
    individual ? i.ownerId === currentUser.id : true,
  );
  const invoiceIds = new Set(invoices.map((i) => i.id));
  const payments = inScope(db.payments).filter((p) => invoiceIds.has(p.invoiceId));
  const tasks = inScope(db.tasks).filter(
    (x) => x.department === "Finance" && (individual ? x.ownerId === currentUser.id : true),
  );
  const outstanding = invoices.filter((i) => invoiceOutstanding(i) > 0 && i.status !== "Cancelled");
  const overdue = outstanding.filter(isOverdue);
  const dueSoon = outstanding.filter((i) => {
    const until = -daysBetween(i.dueDate);
    return until >= 0 && until <= 30;
  });
  const outstandingSAR = outstanding.reduce(
    (s, i) => s + toSAR(invoiceOutstanding(i), i.currency),
    0,
  );
  const overdueSAR = overdue.reduce((s, i) => s + toSAR(invoiceOutstanding(i), i.currency), 0);
  const collectedSAR = payments.reduce((s, p) => s + toSAR(p.amount, p.currency), 0);
  const openTasks = tasks.filter((x) => !["Done", "Cancelled"].includes(x.status));
  const agingBuckets = [
    { name: t("Not due", "غير مستحق"), value: outstanding.filter((i) => !isOverdue(i)).length },
    {
      name: t("1–7d overdue", "متأخر 1–7 أيام"),
      value: overdue.filter((i) => daysBetween(i.dueDate) <= 7).length,
    },
    {
      name: t("8–30d overdue", "متأخر 8–30 يوم"),
      value: overdue.filter((i) => daysBetween(i.dueDate) > 7 && daysBetween(i.dueDate) <= 30)
        .length,
    },
    {
      name: t("31+d overdue", "متأخر 31+ يوم"),
      value: overdue.filter((i) => daysBetween(i.dueDate) > 30).length,
    },
  ];
  const collectionTrend = sumBy(
    payments,
    (p) => p.date,
    (p) => toSAR(p.amount, p.currency),
  )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(-12);
  const financeOwners = db.users.filter((u) => u.department === "Finance" && u.status === "active");
  const ownerExposure = financeOwners
    .map((u) => ({
      name: u.name,
      outstanding: outstanding
        .filter((i) => i.ownerId === u.id)
        .reduce((sum, i) => sum + toSAR(invoiceOutstanding(i), i.currency), 0),
      overdue: overdue
        .filter((i) => i.ownerId === u.id)
        .reduce((sum, i) => sum + toSAR(invoiceOutstanding(i), i.currency), 0),
    }))
    .filter((r) => r.outstanding > 0 || r.overdue > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(
          individual ? "My Finance Workspace" : "Finance Control Workspace",
          individual ? "مساحة عملي المالية" : "مساحة التحكم المالي",
        )}
        subtitle={t(
          individual
            ? "Work your collection queue in order: overdue first, then due soon, then confirm payment or promise-to-pay and log the next action."
            : "Control collections by aging and ownership: see overdue exposure, assign the next action and intervene where follow-up is not moving.",
          individual
            ? "نفّذ قائمة التحصيل بالترتيب: المتأخر أولاً ثم القريب، وبعدها أكد الدفع أو وعد الدفع وسجّل الإجراء التالي."
            : "تحكم في التحصيل حسب عمر الدين والمسؤولية: راقب المتأخر وحدد الإجراء التالي وتدخل عندما تتوقف المتابعة.",
        )}
        actions={
          <Button asChild>
            <Link to="/finance/invoices">{t("Open due bills", "فتح الفواتير المستحقة")}</Link>
          </Button>
        }
      />
      {individual ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label={t("My outstanding", "القائم عندي")}
              value={compactMoney(outstandingSAR, "SAR")}
              tone="brand"
            />
            <Stat
              label={t("My overdue", "المتأخر عندي")}
              value={compactMoney(overdueSAR, "SAR")}
              tone={overdueSAR ? "danger" : "success"}
            />
            <Stat
              label={t("Bills due soon", "فواتير قريبة الاستحقاق")}
              value={String(dueSoon.length)}
              tone="warning"
            />
            <Stat
              label={t("My open actions", "إجراءاتي المفتوحة")}
              value={String(openTasks.length)}
              tone="orange"
            />
          </div>
          <ChartRow cols={2}>
            <BarChartCard
              title={t("My collection aging", "عمر التحصيل عندي")}
              description={t("Where open bills sit by age", "توزيع الفواتير المفتوحة حسب العمر")}
              data={agingBuckets}
              colorful
            />
            <TrendChartCard
              title={t("Collections recorded", "التحصيلات المسجلة")}
              description={t("Payment value over time in SAR", "قيمة المدفوعات عبر الوقت بالريال")}
              data={collectionTrend}
              format={(v) => compactMoney(v, "SAR")}
              trendLine
            />
          </ChartRow>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat
              label={t("Outstanding (SAR)", "القائم بالريال")}
              value={compactMoney(outstandingSAR, "SAR")}
              tone="brand"
            />
            <Stat
              label={t("Overdue (SAR)", "المتأخر بالريال")}
              value={compactMoney(overdueSAR, "SAR")}
              tone={overdueSAR ? "danger" : "success"}
            />
            <Stat
              label={t("Due in 30 days", "مستحق خلال 30 يوم")}
              value={String(dueSoon.length)}
              tone="warning"
            />
            <Stat
              label={t("Open finance actions", "إجراءات مالية مفتوحة")}
              value={String(openTasks.length)}
              tone="orange"
            />
            <Stat
              label={t("Collections recorded", "تحصيلات مسجلة")}
              value={compactMoney(collectedSAR, "SAR")}
              tone="success"
            />
          </div>
          <ChartRow>
            <BarChartCard
              title={t("Aging distribution", "توزيع عمر الديون")}
              description={t(
                "Count of open bills by aging bucket",
                "عدد الفواتير المفتوحة حسب العمر",
              )}
              data={agingBuckets}
              colorful
            />
            <TrendChartCard
              title={t("Collection trend", "اتجاه التحصيل")}
              description={t(
                "Recorded payments over time in SAR",
                "المدفوعات المسجلة عبر الوقت بالريال",
              )}
              data={collectionTrend}
              format={(v) => compactMoney(v, "SAR")}
              trendLine
            />
            <SeriesBarChartCard
              title={t("Exposure by Finance owner", "التعرض حسب مسؤول المالية")}
              data={ownerExposure}
              series={[
                { key: "outstanding", label: t("Outstanding", "قائم") },
                { key: "overdue", label: t("Overdue", "متأخر") },
              ]}
              format={(v) => compactMoney(v, "SAR")}
            />
          </ChartRow>
        </>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <Section
            title={t(
              individual ? "My next collection actions" : "Collections needing intervention",
              individual ? "إجراءات التحصيل التالية عندي" : "تحصيلات تحتاج تدخل",
            )}
            actions={
              <Button size="sm" variant="outline" asChild>
                <Link to="/overdue">{t("Overdue control", "متابعة المتأخرات")}</Link>
              </Button>
            }
          >
            <div className="space-y-2">
              {[...overdue, ...dueSoon]
                .filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i)
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .slice(0, 8)
                .map((i) => (
                  <div key={i.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="num font-medium">{i.number}</p>
                          <StatusPill status={isOverdue(i) ? "Overdue" : i.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {clientName(i.clientId)} · {i.ownerId ? userName(i.ownerId) : "Finance"} ·
                          due {shortDate(i.dueDate)}
                        </p>
                        <p className="mt-2 text-xs font-medium">
                          {i.nextAction ?? "Confirm payment plan"}
                        </p>
                      </div>
                      <div className="num whitespace-nowrap font-semibold">
                        {money(invoiceOutstanding(i), i.currency)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Section>
        </Panel>
        <Panel>
          <Section
            title={t("Finance action queue", "قائمة الإجراءات المالية")}
            actions={
              <Button size="sm" variant="outline" asChild>
                <Link to="/tasks">{t("Master Actions", "الإجراءات الرئيسية")}</Link>
              </Button>
            }
          >
            <div className="space-y-2">
              {openTasks
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .slice(0, 8)
                .map((task) => (
                  <div key={task.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{task.title}</p>
                      {taskIsOverdue(task) ? (
                        <Pill tone="danger">Overdue</Pill>
                      ) : (
                        <StatusPill status={task.status} />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {userName(task.ownerId)} · due {shortDate(task.dueDate)}
                      {task.clientId ? ` · ${clientName(task.clientId)}` : ""}
                    </p>
                    {task.notes ? <p className="mt-2 text-xs">{task.notes}</p> : null}
                  </div>
                ))}
            </div>
          </Section>
        </Panel>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/finance/")({
  head: () => ({
    meta: [
      { title: "Finance Workspace | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Finance execution workspace for due bills, collections, overdue actions and owner accountability.",
      },
    ],
  }),
  component: FinanceCenter,
});
