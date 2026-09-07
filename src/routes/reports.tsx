import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Pill, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import {
  BarChartCard,
  ChartRow,
  SeriesBarChartCard,
  TrendChartCard,
  countBy,
  sumBy,
} from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { invoiceOutstanding, isOverdue, taskIsOverdue } from "@/lib/derive";
import { compactMoney, shortDate, toSAR } from "@/lib/format";
import { getWorkspace, workspaceOwnsDepartment } from "@/lib/workspace-hub";

interface PerformanceRow {
  id: string;
  name: string;
  department: string;
  open: number;
  done: number;
  overdue: number;
  activities: number;
  meetings: number;
  bills: number;
  billValueSAR: number;
  collectedSAR: number;
  onTimeRate: number;
}

function Reports() {
  const { db, inScope, activeWorkspace, scope } = useApp();
  const { t } = useLang();
  const workspace = getWorkspace(activeWorkspace);
  const salesMode = activeWorkspace === "sales";
  const financeMode = activeWorkspace === "finance";
  const managementMode = activeWorkspace === "management";
  const hrMode = activeWorkspace === "hr";

  const users = db.users.filter(
    (u) =>
      workspaceOwnsDepartment(activeWorkspace, u.department) &&
      u.status === "active" &&
      (scope === "group" || u.entityId === scope),
  );
  const userIds = new Set(users.map((u) => u.id));
  const tasks = inScope(db.tasks).filter((task) =>
    workspaceOwnsDepartment(activeWorkspace, task.department),
  );
  const sales = salesMode
    ? inScope(db.salesActivities).filter((activity) => userIds.has(activity.ownerId))
    : [];
  const meetings = inScope(db.calendarEvents).filter(
    (event) => userIds.has(event.organizerId) || event.attendeeIds.some((id) => userIds.has(id)),
  );
  const invoices = financeMode
    ? inScope(db.invoices).filter((invoice) =>
        invoice.ownerId ? userIds.has(invoice.ownerId) : false,
      )
    : [];
  const invoiceOwner = new Map(invoices.map((invoice) => [invoice.id, invoice.ownerId]));
  const payments = financeMode
    ? inScope(db.payments).filter((payment) => invoiceOwner.has(payment.invoiceId))
    : [];

  const rows: PerformanceRow[] = users.map((user) => {
    const mine = tasks.filter((task) => task.ownerId === user.id);
    const done = mine.filter((task) => task.status === "Done");
    const open = mine.filter((task) => !["Done", "Cancelled"].includes(task.status));
    const overdue = open.filter(taskIsOverdue);
    const ownedBills = invoices.filter(
      (invoice) =>
        invoice.ownerId === user.id &&
        invoiceOutstanding(invoice) > 0 &&
        invoice.status !== "Cancelled",
    );
    const ownedInvoiceIds = new Set(
      invoices.filter((invoice) => invoice.ownerId === user.id).map((invoice) => invoice.id),
    );
    const onTimeDone = done.filter(
      (task) => !task.completedAt || task.completedAt <= task.dueDate,
    ).length;
    return {
      id: user.id,
      name: user.name,
      department: user.department,
      open: open.length,
      done: done.length,
      overdue: overdue.length,
      activities: sales.filter((activity) => activity.ownerId === user.id).length,
      meetings: meetings.filter(
        (meeting) => meeting.organizerId === user.id || meeting.attendeeIds.includes(user.id),
      ).length,
      bills: ownedBills.length,
      billValueSAR: ownedBills.reduce(
        (sum, invoice) => sum + toSAR(invoiceOutstanding(invoice), invoice.currency),
        0,
      ),
      collectedSAR: payments
        .filter((payment) => ownedInvoiceIds.has(payment.invoiceId))
        .reduce((sum, payment) => sum + toSAR(payment.amount, payment.currency), 0),
      onTimeRate: done.length ? Math.round((onTimeDone / done.length) * 100) : 0,
    };
  });

  const cols: Column<PerformanceRow>[] = [
    {
      key: "employee",
      header: t("Owner", "المسؤول"),
      render: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <Pill tone="neutral">{row.department}</Pill>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: "open",
      header: t("Open", "مفتوح"),
      render: (row) => <span className="num">{row.open}</span>,
      sortValue: (row) => row.open,
    },
    {
      key: "done",
      header: t("Completed", "مكتمل"),
      render: (row) => <span className="num">{row.done}</span>,
      sortValue: (row) => row.done,
    },
    {
      key: "overdue",
      header: t("Overdue", "متأخر"),
      render: (row) => (
        <span className={`num font-semibold ${row.overdue ? "text-danger" : "text-success"}`}>
          {row.overdue}
        </span>
      ),
      sortValue: (row) => row.overdue,
    },
    {
      key: "ontime",
      header: t("On-time", "في الموعد"),
      render: (row) => <span className="num">{row.onTimeRate}%</span>,
      sortValue: (row) => row.onTimeRate,
    },
    ...(financeMode
      ? [
          {
            key: "bills",
            header: t("Owned bills", "فواتير تحت المسؤولية"),
            render: (row: PerformanceRow) => (
              <div>
                <div className="num">{row.bills}</div>
                <div className="num text-xs text-muted-foreground">
                  {compactMoney(row.billValueSAR, "SAR")}
                </div>
              </div>
            ),
            sortValue: (row: PerformanceRow) => row.billValueSAR,
          },
          {
            key: "collected",
            header: t("Collected", "محصل"),
            render: (row: PerformanceRow) => (
              <span className="num">{compactMoney(row.collectedSAR, "SAR")}</span>
            ),
            sortValue: (row: PerformanceRow) => row.collectedSAR,
          },
        ]
      : []),
    ...(salesMode
      ? [
          {
            key: "activity",
            header: t("Sales activities", "أنشطة المبيعات"),
            render: (row: PerformanceRow) => <span className="num">{row.activities}</span>,
            sortValue: (row: PerformanceRow) => row.activities,
          },
          {
            key: "meetings",
            header: t("Meetings", "الاجتماعات"),
            render: (row: PerformanceRow) => <span className="num">{row.meetings}</span>,
            sortValue: (row: PerformanceRow) => row.meetings,
          },
        ]
      : []),
    ...(!salesMode && !financeMode
      ? [
          {
            key: "meetings",
            header: t("Meetings", "الاجتماعات"),
            render: (row: PerformanceRow) => <span className="num">{row.meetings}</span>,
            sortValue: (row: PerformanceRow) => row.meetings,
          },
        ]
      : []),
  ];

  const open = tasks.filter((task) => !["Done", "Cancelled"].includes(task.status));
  const overdueTasks = open.filter(taskIsOverdue);
  const blocked = open.filter((task) => task.status === "Blocked");
  const completed = tasks.filter((task) => task.status === "Done");
  const outstanding = invoices.filter(
    (invoice) => invoiceOutstanding(invoice) > 0 && invoice.status !== "Cancelled",
  );
  const overdueBills = outstanding.filter(isOverdue);
  const collectedSAR = payments.reduce(
    (sum, payment) => sum + toSAR(payment.amount, payment.currency),
    0,
  );
  const outstandingSAR = outstanding.reduce(
    (sum, invoice) => sum + toSAR(invoiceOutstanding(invoice), invoice.currency),
    0,
  );

  const actionSeries = rows.map((row) => ({
    name: row.name,
    open: row.open,
    overdue: row.overdue,
    completed: row.done,
  }));
  const salesTrend = countBy(sales, (activity) => activity.date)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(-12);
  const collectionTrend = sumBy(
    payments,
    (payment) => shortDate(payment.date),
    (payment) => toSAR(payment.amount, payment.currency),
  );
  const financeSeries = rows.map((row) => ({
    name: row.name,
    outstanding: row.billValueSAR,
    collected: row.collectedSAR,
  }));
  const dueTrend = countBy(open, (task) => shortDate(task.dueDate))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 12);

  const title = t(`${workspace.title} Reports`, `تقارير ${workspace.titleAr}`);
  const subtitle = financeMode
    ? t(
        "Collection performance, outstanding exposure and execution quality for Finance only.",
        "أداء التحصيل والقائم وجودة التنفيذ لمساحة الحسابات فقط.",
      )
    : salesMode
      ? t(
          "Client activity, commitments and execution quality for the Sales team only.",
          "نشاط العملاء والالتزامات وجودة التنفيذ لفريق المبيعات فقط.",
        )
      : hrMode
        ? t(
            "People-action execution, overdue HR work and delivery by owner.",
            "تنفيذ إجراءات الموظفين والمتأخرات وأداء المسؤولين في الموارد البشرية.",
          )
        : t(
            "Shared-priority health, blockers, analysis delivery and ownership across Management.",
            "صحة الأولويات المشتركة والمعوقات وتسليم التحليلات وتوزيع المسؤولية داخل الإدارة.",
          );

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />

      {financeMode ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label={t("Outstanding", "القائم")}
            value={compactMoney(outstandingSAR, "SAR")}
            tone="brand"
          />
          <Stat
            label={t("Overdue bills", "فواتير متأخرة")}
            value={String(overdueBills.length)}
            tone={overdueBills.length ? "danger" : "success"}
          />
          <Stat
            label={t("Collected", "محصل")}
            value={compactMoney(collectedSAR, "SAR")}
            tone="success"
          />
          <Stat
            label={t("Overdue actions", "إجراءات متأخرة")}
            value={String(overdueTasks.length)}
            tone={overdueTasks.length ? "danger" : "success"}
          />
        </div>
      ) : salesMode ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label={t("Open commitments", "التزامات مفتوحة")}
            value={String(open.length)}
            tone="brand"
          />
          <Stat
            label={t("Overdue actions", "إجراءات متأخرة")}
            value={String(overdueTasks.length)}
            tone={overdueTasks.length ? "danger" : "success"}
          />
          <Stat
            label={t("Sales activities", "أنشطة المبيعات")}
            value={String(sales.length)}
            tone="orange"
          />
          <Stat label={t("Meetings", "اجتماعات")} value={String(meetings.length)} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label={t("Open actions", "إجراءات مفتوحة")}
            value={String(open.length)}
            tone="brand"
          />
          <Stat
            label={t("Blocked", "معطل")}
            value={String(blocked.length)}
            tone={blocked.length ? "danger" : "success"}
          />
          <Stat
            label={t("Overdue", "متأخر")}
            value={String(overdueTasks.length)}
            tone={overdueTasks.length ? "danger" : "success"}
          />
          <Stat label={t("Completed", "مكتمل")} value={String(completed.length)} tone="success" />
        </div>
      )}

      {salesMode ? (
        <ChartRow cols={2}>
          <TrendChartCard
            title={t("Activity rhythm", "إيقاع النشاط")}
            description={t("Sales activities over time", "أنشطة المبيعات عبر الوقت")}
            data={salesTrend}
            trendLine
          />
          <BarChartCard
            title={t("Outcome mix", "مزيج النتائج")}
            description={t(
              "What happened after calls and follow-ups",
              "ما حدث بعد المكالمات والمتابعات",
            )}
            data={countBy(sales, (row) => row.outcome)}
            horizontal
            colorful
          />
        </ChartRow>
      ) : financeMode ? (
        <ChartRow cols={2}>
          <TrendChartCard
            title={t("Collection trend", "اتجاه التحصيل")}
            data={collectionTrend}
            format={(value) => compactMoney(value, "SAR")}
            trendLine
          />
          <SeriesBarChartCard
            title={t("Exposure vs collected", "القائم مقابل المحصل")}
            data={financeSeries}
            series={[
              { key: "outstanding", label: t("Outstanding", "قائم") },
              { key: "collected", label: t("Collected", "محصل") },
            ]}
            format={(value) => compactMoney(value, "SAR")}
          />
        </ChartRow>
      ) : managementMode ? (
        <ChartRow cols={2}>
          <SeriesBarChartCard
            title={t("Owner action health", "صحة الإجراءات حسب المسؤول")}
            data={actionSeries}
            series={[
              { key: "open", label: t("Open", "مفتوح") },
              { key: "overdue", label: t("Overdue", "متأخر") },
              { key: "completed", label: t("Completed", "مكتمل") },
            ]}
          />
          <BarChartCard
            title={t("Work by function", "العمل حسب الوظيفة")}
            data={countBy(tasks, (task) => task.department)}
            horizontal
            colorful
          />
        </ChartRow>
      ) : (
        <ChartRow cols={2}>
          <BarChartCard
            title={t("Request state", "حالة الطلبات")}
            data={countBy(tasks, (task) => task.status)}
            horizontal
            colorful
          />
          <TrendChartCard
            title={t("Upcoming delivery load", "عبء التسليم القادم")}
            description={t("Open work by due date", "العمل المفتوح حسب موعد التسليم")}
            data={dueTrend}
          />
        </ChartRow>
      )}

      <Section
        title={t("Performance register", "سجل الأداء")}
        description={t(
          "This table follows the selected workspace only.",
          "هذا الجدول يعرض مساحة العمل المختارة فقط.",
        )}
      >
        <DataTable
          rows={rows}
          columns={cols}
          rowKey={(row) => row.id}
          searchable={(row) => `${row.name} ${row.department}`}
          exportName={`trygc-${activeWorkspace}-performance`}
          pageSize={12}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Workspace Reports | TryGC Command Center" },
      {
        name: "description",
        content: "Workspace-specific reporting for TryGC Management, Finance, Sales and HR.",
      },
    ],
  }),
  component: Reports,
});
