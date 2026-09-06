import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { ChartRow, BarChartCard, ShareChartCard, countBy, sumBy } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { entityFinance, type EntityFinance } from "@/lib/derive";
import { compactMoney, money, rateToSAR } from "@/lib/format";

function Consolidation() {
  const { db } = useApp();
  const { t } = useLang();
  const rows = db.entities.map((e) => entityFinance(e, db.invoices, db.expenses));
  const total = rows.reduce(
    (a, f) => ({
      rev: a.rev + f.revenueSAR,
      exp: a.exp + f.expensesSAR,
      ar: a.ar + f.arSAR,
      ap: a.ap + f.apSAR,
      cash: a.cash + f.cashSAR,
    }),
    { rev: 0, exp: 0, ar: 0, ap: 0, cash: 0 },
  );

  const columns: Column<EntityFinance>[] = [
    {
      key: "entity",
      header: t("Entity", "الكيان"),
      render: (r) => (
        <div>
          <div className="font-medium">{r.entity.name}</div>
          <div className="text-xs text-muted-foreground">{r.entity.countryName}</div>
        </div>
      ),
      sortValue: (r) => r.entity.name,
    },
    {
      key: "cur",
      header: t("Currency", "العملة"),
      render: (r) => r.entity.currency,
      sortValue: (r) => r.entity.currency,
    },
    {
      key: "rate",
      header: t("Rate to SAR", "سعر التحويل"),
      render: (r) => <span className="num">{rateToSAR(r.entity.currency).toFixed(4)}</span>,
    },
    {
      key: "revLocal",
      header: t("Revenue (local)", "الإيرادات محلياً"),
      render: (r) => <span className="num">{money(r.revenue, r.entity.currency)}</span>,
      sortValue: (r) => r.revenue,
    },
    {
      key: "revSar",
      header: t("Revenue (SAR)", "الإيرادات بالريال"),
      render: (r) => <span className="num font-medium">{money(r.revenueSAR, "SAR")}</span>,
      sortValue: (r) => r.revenueSAR,
    },
    {
      key: "expSar",
      header: t("Expenses (SAR)", "المصروفات بالريال"),
      render: (r) => <span className="num">{money(r.expensesSAR, "SAR")}</span>,
      sortValue: (r) => r.expensesSAR,
    },
    {
      key: "profitSar",
      header: t("Profit (SAR)", "الربح بالريال"),
      render: (r) => (
        <span className={`num font-medium ${r.profitSAR < 0 ? "text-danger" : "text-success"}`}>
          {money(r.profitSAR, "SAR")}
        </span>
      ),
      sortValue: (r) => r.profitSAR,
    },
    {
      key: "arSar",
      header: t("Receivables (SAR)", "الذمم بالريال"),
      render: (r) => <span className="num">{money(r.arSAR, "SAR")}</span>,
      sortValue: (r) => r.arSAR,
    },
    {
      key: "cashSar",
      header: t("Cash (SAR)", "النقد بالريال"),
      render: (r) => <span className="num">{money(r.cashSAR, "SAR")}</span>,
      sortValue: (r) => r.cashSAR,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Group Consolidation", "التوحيد الجماعي")}
        subtitle={t(
          "Each entity keeps its own books in its own currency; the group view converts at the locked rate. Both numbers are always shown.",
          "كل كيان يحتفظ بدفاتره بعملته، وعرض المجموعة يحوّل بالسعر المقفل. يُعرض الرقمان دائماً.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label={t("Group revenue", "إيرادات المجموعة")}
          value={compactMoney(total.rev, "SAR")}
          tone="brand"
        />
        <Stat
          label={t("Group expenses", "مصروفات المجموعة")}
          value={compactMoney(total.exp, "SAR")}
          tone="orange"
        />
        <Stat
          label={t("Group profit", "ربح المجموعة")}
          value={compactMoney(total.rev - total.exp, "SAR")}
          tone={total.rev - total.exp >= 0 ? "success" : "danger"}
        />
        <Stat
          label={t("Receivables", "الذمم المدينة")}
          value={compactMoney(total.ar, "SAR")}
          tone="danger"
        />
        <Stat label={t("Payables", "الذمم الدائنة")} value={compactMoney(total.ap, "SAR")} />
      </div>
      <Panel>
        <ChartRow>
          <BarChartCard
            title={t("Revenue contribution (SAR)", "مساهمة الإيراد")}
            data={rows.map((f) => ({ name: f.entity.name, value: f.revenueSAR }))}
            horizontal
            colorful
            format={(v) => compactMoney(v, "SAR")}
          />
          <BarChartCard
            title={t("Expenses by entity (SAR)", "المصروفات حسب الكيان")}
            data={rows.map((f) => ({ name: f.entity.name, value: f.expensesSAR }))}
            horizontal
            format={(v) => compactMoney(v, "SAR")}
          />
          <BarChartCard
            title={t("Receivables by entity (SAR)", "الذمم حسب الكيان")}
            data={rows.map((f) => ({ name: f.entity.name, value: f.arSAR }))}
            horizontal
            format={(v) => compactMoney(v, "SAR")}
          />
        </ChartRow>
        <Section title={t("Consolidated statement (SAR)", "القائمة الموحدة")}>
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.entity.id}
            searchable={(r) => r.entity.name}
            exportName="trygc-consolidation"
            pageSize={10}
          />
        </Section>
      </Panel>
    </div>
  );
}

export const Route = createFileRoute("/finance/consolidation")({
  head: () => ({
    meta: [
      { title: "Group Consolidation | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Entity-by-entity results in local currency alongside the SAR-consolidated group position.",
      },
      { property: "og:title", content: "Group Consolidation | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Local currency results alongside SAR group consolidation.",
      },
    ],
  }),
  component: Consolidation,
});
