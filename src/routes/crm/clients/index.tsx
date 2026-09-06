import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, Pill, Section, Stat, StatusPill } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { compactMoney, shortDate, toSAR } from "@/lib/format";
import { invoiceOutstanding, isOverdue, taskIsOverdue } from "@/lib/derive";
import { clientVisibleToRole } from "@/lib/record-scope";
import { getRoleExperience } from "@/lib/role-ux";
import type { Client } from "@/lib/types";
import { BarChartCard } from "@/components/charts";

function Clients() {
  const { db, inScope, currentUser, userName, entityName } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();
  const ux = getRoleExperience(currentUser.role);
  const individual = ux.mode === "sales-individual";
  const rows = inScope(db.clients).filter((c) =>
    clientVisibleToRole(c, currentUser, currentUser.role),
  );

  const clientTasks = (id: string) =>
    db.tasks.filter(
      (x) =>
        x.clientId === id && x.department === "Sales" && !["Done", "Cancelled"].includes(x.status),
    );
  const openActions = (id: string) => clientTasks(id).length;
  const overdueActions = (id: string) => clientTasks(id).filter(taskIsOverdue).length;
  const overdueBills = (id: string) =>
    db.invoices.filter((x) => x.clientId === id && isOverdue(x) && invoiceOutstanding(x) > 0)
      .length;
  const outstanding = (id: string) =>
    db.invoices
      .filter((x) => x.clientId === id && x.status !== "Cancelled")
      .reduce((s, x) => s + toSAR(invoiceOutstanding(x), x.currency), 0);
  const needsAttention = rows.filter(
    (r) => r.status === "At Risk" || overdueActions(r.id) > 0 || overdueBills(r.id) > 0,
  );

  const columns: Column<Client>[] = [
    {
      key: "name",
      header: t("Client", "العميل"),
      render: (r) => (
        <div>
          <span className="font-medium">{r.name}</span>
          <div className="text-xs text-muted-foreground">{r.industry}</div>
        </div>
      ),
      sortValue: (r) => r.name,
    },
    {
      key: "status",
      header: t("Status", "الحالة"),
      render: (r) => <StatusPill status={r.status} />,
      sortValue: (r) => r.status,
    },
    ...(!individual
      ? ([
          {
            key: "owner",
            header: t("Sales owner", "مسؤول المبيعات"),
            render: (r: Client) => userName(r.accountManagerId),
            sortValue: (r: Client) => userName(r.accountManagerId),
          },
        ] as Column<Client>[])
      : []),
    {
      key: "actions",
      header: t("Open / overdue actions", "إجراءات مفتوحة / متأخرة"),
      render: (r) => (
        <div className="flex gap-1">
          <Pill tone={openActions(r.id) ? "warning" : "success"}>{openActions(r.id)} open</Pill>
          {overdueActions(r.id) ? <Pill tone="danger">{overdueActions(r.id)} late</Pill> : null}
        </div>
      ),
      sortValue: (r) => overdueActions(r.id) * 100 + openActions(r.id),
    },
    {
      key: "bills",
      header: t("Payment risk", "مخاطر الدفع"),
      render: (r) => (
        <Pill tone={overdueBills(r.id) ? "danger" : outstanding(r.id) ? "warning" : "success"}>
          {overdueBills(r.id)
            ? `${overdueBills(r.id)} overdue`
            : outstanding(r.id)
              ? "Outstanding"
              : "Clear"}
        </Pill>
      ),
      sortValue: (r) => overdueBills(r.id),
    },
    {
      key: "last",
      header: t("Last interaction", "آخر تفاعل"),
      render: (r) => shortDate(r.lastInteraction),
      sortValue: (r) => r.lastInteraction,
    },
    {
      key: "next",
      header: t("What I do next", "ما الإجراء التالي"),
      className: "min-w-[240px]",
      render: (r) => <span className="font-medium">{r.nextAction}</span>,
      sortValue: (r) => r.nextAction,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          individual
            ? t("My Clients", "عملائي")
            : t("Clients & Action Center", "العملاء ومركز الإجراءات")
        }
        subtitle={
          individual
            ? t(
                "Your assigned client book, organized around the next action, overdue commitments and payment risk.",
                "عملاؤك المخصصون لك مرتبين حسب الإجراء التالي والالتزامات المتأخرة ومخاطر الدفع.",
              )
            : t(
                "Manage client execution by exception: ownership, next action, overdue commitment and collection risk.",
                "إدارة تنفيذ العملاء حسب الاستثناء: الملكية والإجراء التالي والالتزام المتأخر ومخاطر التحصيل.",
              )
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={individual ? t("My clients", "عملائي") : t("Clients", "العملاء")}
          value={String(rows.length)}
          tone="brand"
        />
        <Stat
          label={t("Need attention", "تحتاج انتباه")}
          value={String(needsAttention.length)}
          tone={needsAttention.length ? "warning" : "success"}
        />
        <Stat
          label={t("Overdue Sales actions", "إجراءات مبيعات متأخرة")}
          value={String(rows.reduce((n, r) => n + overdueActions(r.id), 0))}
          tone={rows.some((r) => overdueActions(r.id)) ? "danger" : "success"}
        />
        <Stat
          label={t("Client payment exposure (SAR)", "تعرض مدفوعات العملاء بالريال")}
          value={compactMoney(
            rows.reduce((s, r) => s + outstanding(r.id), 0),
            "SAR",
          )}
          tone="orange"
        />
      </div>
      {!individual && rows.length ? (
        <div className="max-w-4xl">
          <BarChartCard
            title={t("Where is the Sales action load?", "أين يتركز عبء إجراءات المبيعات؟")}
            description={t(
              "Use this to rebalance the team by client workload.",
              "استخدمه لإعادة توزيع الفريق حسب عبء العميل.",
            )}
            horizontal
            data={rows.map((r) => ({
              name: r.name,
              value: openActions(r.id) + overdueActions(r.id),
            }))}
          />
        </div>
      ) : null}
      {needsAttention.length ? (
        <Section
          title={
            individual
              ? t("Start here", "ابدأ من هنا")
              : t("Clients needing intervention", "عملاء يحتاجون تدخلاً")
          }
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {needsAttention.slice(0, 6).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() =>
                  navigate({ to: "/crm/clients/$clientId", params: { clientId: r.id } })
                }
                className="rounded-xl border bg-card p-3 text-start transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{r.name}</span>
                  <StatusPill status={r.status} />
                </div>
                <p className="mt-2 text-xs font-medium">{r.nextAction}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {overdueActions(r.id) ? (
                    <Pill tone="danger">{overdueActions(r.id)} Sales overdue</Pill>
                  ) : null}
                  {overdueBills(r.id) ? <Pill tone="danger">Payment overdue</Pill> : null}
                </div>
              </button>
            ))}
          </div>
        </Section>
      ) : null}
      <Section
        title={
          individual
            ? t("My client book", "سجل عملائي")
            : t("Client execution book", "سجل تنفيذ العملاء")
        }
      >
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.name} ${r.industry} ${r.status} ${r.nextAction}`}
          onRowClick={(r) => navigate({ to: "/crm/clients/$clientId", params: { clientId: r.id } })}
          exportName="trygc-client-action-center"
          pageSize={12}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/crm/clients/")({
  head: () => ({
    meta: [
      { title: "Clients & Action Center | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Role-aware client execution center organized around next actions, meetings and collection risk.",
      },
    ],
  }),
  component: Clients,
});
