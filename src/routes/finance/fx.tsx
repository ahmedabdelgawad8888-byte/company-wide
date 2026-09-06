import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Pill, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { ChartRow, BarChartCard, ShareChartCard, countBy, sumBy } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { fxRates } from "@/lib/data/seed";
import { money, shortDate } from "@/lib/format";
import type { FxRate } from "@/lib/types";

function Fx() {
  const { db } = useApp();
  const { t } = useLang();

  const columns: Column<FxRate>[] = [
    {
      key: "cur",
      header: t("Currency", "العملة"),
      render: (r) => <span className="num font-medium">{r.currency}</span>,
      sortValue: (r) => r.currency,
    },
    {
      key: "entity",
      header: t("Used by", "يستخدمها"),
      render: (r) =>
        db.entities
          .filter((e) => e.currency === r.currency)
          .map((e) => e.name)
          .join(", ") || "—",
    },
    {
      key: "rate",
      header: t("Rate to SAR", "السعر مقابل الريال"),
      render: (r) => <span className="num">{r.toSAR.toFixed(4)}</span>,
      sortValue: (r) => r.toSAR,
    },
    {
      key: "example",
      header: t("1,000 units in SAR", "1000 وحدة بالريال"),
      render: (r) => <span className="num">{money(1000 * r.toSAR, "SAR")}</span>,
    },
    {
      key: "eff",
      header: t("Effective date", "تاريخ السريان"),
      render: (r) => shortDate(r.effectiveDate),
      sortValue: (r) => r.effectiveDate,
    },
    { key: "src", header: t("Source", "المصدر"), render: (r) => r.source },
    {
      key: "locked",
      header: t("Period lock", "قفل الفترة"),
      render: (r) => (
        <Pill tone={r.locked ? "success" : "warning"}>
          {r.locked ? t("Locked", "مقفل") : t("Open", "مفتوح")}
        </Pill>
      ),
      sortValue: (r) => (r.locked ? 0 : 1),
    },
  ];

  const missing = db.entities.filter((e) => !fxRates.some((r) => r.currency === e.currency));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Exchange Rates", "أسعار الصرف")}
        subtitle={t(
          "Group reporting uses SAR. Rates are dated and locked per period so historical reports never change retrospectively.",
          "تقارير المجموعة بالريال. الأسعار مؤرخة ومقفلة لكل فترة حتى لا تتغير التقارير التاريخية.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("Currencies", "العملات")} value={String(fxRates.length)} tone="brand" />
        <Stat
          label={t("Locked periods", "فترات مقفلة")}
          value={String(fxRates.filter((r) => r.locked).length)}
          tone="success"
        />
        <Stat
          label={t("Missing rates", "أسعار ناقصة")}
          value={String(missing.length)}
          tone={missing.length ? "danger" : "default"}
        />
      </div>
      <ChartRow cols={2}>
        <BarChartCard
          title={t("Rate to SAR by currency", "السعر مقابل الريال")}
          data={fxRates.map((r) => ({ name: r.currency, value: r.toSAR }))}
          colorful
          format={(v) => v.toFixed(3)}
        />
        <ShareChartCard
          title={t("Locked vs open periods", "فترات مقفلة مقابل مفتوحة")}
          data={countBy(fxRates, (r) => (r.locked ? "Locked" : "Open"))}
        />
      </ChartRow>
      <Section title={t("Rate table", "جدول الأسعار")}>
        <DataTable
          rows={fxRates}
          columns={columns}
          rowKey={(r) => r.currency}
          searchable={(r) => `${r.currency} ${r.source}`}
          exportName="trygc-fx"
          pageSize={10}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/finance/fx")({
  head: () => ({
    meta: [
      { title: "Exchange Rates | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Dated, period-locked exchange rates used to consolidate Trygc entity results into SAR.",
      },
      { property: "og:title", content: "Exchange Rates | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Dated and locked FX rates used for SAR consolidation.",
      },
    ],
  }),
  component: Fx,
});
