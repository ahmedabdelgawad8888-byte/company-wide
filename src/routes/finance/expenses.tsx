import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, Section, Stat, StatusPill } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { compactMoney, money, shortDate, toSAR } from "@/lib/format";
import type { Expense } from "@/lib/types";
import {
  BarChartCard,
  ChartRow,
  ShareChartCard,
  TrendChartCard,
  countBy,
  sumBy,
} from "@/components/charts";

function Expenses() {
  const { db, inScope, entityName, campaignName, can, actions } = useApp();
  const { t } = useLang();
  const rows = inScope(db.expenses);
  const accountName = (code: string) => db.accounts.find((a) => a.code === code)?.name ?? code;

  const columns: Column<Expense>[] = [
    {
      key: "desc",
      header: t("Expense", "المصروف"),
      render: (r) => (
        <div>
          <div className="font-medium">{r.description}</div>
          <div className="text-xs text-muted-foreground">{r.vendor}</div>
        </div>
      ),
      sortValue: (r) => r.description,
    },
    {
      key: "account",
      header: t("Account", "الحساب"),
      render: (r) => <span className="num">{r.accountCode}</span>,
      sortValue: (r) => r.accountCode,
    },
    {
      key: "accountName",
      header: t("Account name", "اسم الحساب"),
      render: (r) => accountName(r.accountCode),
      defaultHidden: true,
    },
    {
      key: "campaign",
      header: t("Campaign", "الحملة"),
      render: (r) => (r.campaignId ? campaignName(r.campaignId) : "—"),
    },
    {
      key: "entity",
      header: t("Entity", "الكيان"),
      render: (r) => entityName(r.entityId),
      sortValue: (r) => entityName(r.entityId),
    },
    {
      key: "date",
      header: t("Date", "التاريخ"),
      render: (r) => shortDate(r.date),
      sortValue: (r) => r.date,
    },
    {
      key: "amount",
      header: t("Amount", "المبلغ"),
      render: (r) => <span className="num">{money(r.amount, r.currency)}</span>,
      sortValue: (r) => toSAR(r.amount, r.currency),
    },
    {
      key: "status",
      header: t("Status", "الحالة"),
      render: (r) => <StatusPill status={r.status} />,
      sortValue: (r) => r.status,
    },
    {
      key: "act",
      header: "",
      render: (r) =>
        r.status === "Pending Approval" && can("finance.approve") ? (
          <Button
            size="sm"
            onClick={() => {
              actions.decideApproval(`ap-${r.id}`, "Approved");
              toast.success(t("Expense approved", "تم اعتماد المصروف"), {
                description: r.description,
              });
            }}
          >
            {t("Approve", "اعتماد")}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  const totalSAR = rows.reduce((s, e) => s + toSAR(e.amount, e.currency), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Expenses & Payables", "المصروفات والذمم الدائنة")}
        subtitle={t(
          "Costs booked against controlled accounts, with approval before anything is paid.",
          "التكاليف مسجلة على حسابات مضبوطة، مع اعتماد قبل أي دفع.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("Expenses", "المصروفات")} value={String(rows.length)} tone="brand" />
        <Stat
          label={t("Total (SAR)", "الإجمالي")}
          value={compactMoney(totalSAR, "SAR")}
          tone="orange"
        />
        <Stat
          label={t("Pending approval", "بانتظار الاعتماد")}
          value={String(rows.filter((r) => r.status === "Pending Approval").length)}
          tone="warning"
        />
        <Stat
          label={t("Paid", "مدفوعة")}
          value={String(rows.filter((r) => r.status === "Paid").length)}
          tone="success"
        />
      </div>
      <ChartRow>
        <ShareChartCard
          title={t("Expenses by status", "المصروفات حسب الحالة")}
          data={countBy(rows, (r) => r.status)}
        />
        <BarChartCard
          title={t("Spend by account (SAR)", "الإنفاق حسب الحساب")}
          horizontal
          data={sumBy(
            rows,
            (r) => r.accountCode,
            (r) => toSAR(r.amount, r.currency),
          )}
          format={(v) => compactMoney(v, "SAR")}
        />
        <BarChartCard
          title={t("Spend by entity (SAR)", "الإنفاق حسب الكيان")}
          data={sumBy(
            rows,
            (r) => entityName(r.entityId),
            (r) => toSAR(r.amount, r.currency),
          )}
          format={(v) => compactMoney(v, "SAR")}
        />
      </ChartRow>
      <Section title={t("Expense ledger", "سجل المصروفات")}>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.description} ${r.vendor} ${r.accountCode}`}
          exportName="trygc-expenses"
          pageSize={12}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/finance/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses & Payables | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Expense ledger booked to controlled accounts with approval status by entity and campaign.",
      },
      { property: "og:title", content: "Expenses & Payables | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Costs by account, entity and campaign with approval status.",
      },
    ],
  }),
  component: Expenses,
});
