import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Pill, Section, Stat, Field } from "@/components/kit";
import { ChartRow, BarChartCard, ShareChartCard, countBy, sumBy } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { entityFinance } from "@/lib/derive";
import { compactMoney, money, shortDate } from "@/lib/format";

function Entities() {
  const { db } = useApp();
  const { t } = useLang();
  const fin = db.entities.map((e) => entityFinance(e, db.invoices, db.expenses));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Entities", "الكيانات")}
        subtitle={t(
          "Every operating company with its own currency, fiscal calendar and tax registration. New markets are onboarded, not hard-coded.",
          "كل شركة بعملتها وسنتها المالية وسجلها الضريبي. الأسواق الجديدة تُضاف دون برمجة.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("Entities", "الكيانات")} value={String(db.entities.length)} tone="brand" />
        <Stat
          label={t("Active", "نشطة")}
          value={String(db.entities.filter((e) => e.status === "active").length)}
          tone="success"
        />
        <Stat
          label={t("Onboarding / planned", "قيد التأسيس")}
          value={String(db.entities.filter((e) => e.status !== "active").length)}
          tone="orange"
        />
      </div>
      <ChartRow>
        <BarChartCard
          title={t("Revenue by entity (SAR)", "الإيراد حسب الكيان")}
          data={fin.map((f) => ({ name: f.entity.name, value: f.revenueSAR }))}
          horizontal
          colorful
          format={(v) => compactMoney(v, "SAR")}
        />
        <BarChartCard
          title={t("Profit by entity (SAR)", "الربح حسب الكيان")}
          data={fin.map((f) => ({ name: f.entity.name, value: f.profitSAR }))}
          horizontal
          format={(v) => compactMoney(v, "SAR")}
        />
        <ShareChartCard
          title={t("Entities by currency", "الكيانات حسب العملة")}
          data={countBy(db.entities, (e) => e.currency)}
        />
      </ChartRow>
      <Section title={t("Operating companies", "الشركات العاملة")}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {fin.map((f) => (
            <Panel key={f.entity.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{f.entity.name}</p>
                  <p className="text-xs text-muted-foreground">{f.entity.legalName}</p>
                </div>
                <Pill tone={f.entity.status === "active" ? "success" : "warning"}>
                  {f.entity.status}
                </Pill>
              </div>
              <div className="mt-3 grid gap-2">
                <Field label={t("Currency", "العملة")} value={f.entity.currency} />
                <Field
                  label={t("Fiscal year start", "بداية السنة المالية")}
                  value={f.entity.fiscalYearStart}
                />
                <Field label={t("Tax registration", "السجل الضريبي")} value={f.entity.taxId} />
                <Field label={t("Opened", "تاريخ الافتتاح")} value={shortDate(f.entity.openedAt)} />
                <Field
                  label={t("Revenue (local)", "الإيرادات محلياً")}
                  value={money(f.revenue, f.entity.currency)}
                />
                <Field
                  label={t("Revenue (SAR)", "الإيرادات بالريال")}
                  value={money(f.revenueSAR, "SAR")}
                />
                <Field label={t("Receivables", "الذمم")} value={money(f.ar, f.entity.currency)} />
              </div>
            </Panel>
          ))}
        </div>
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/finance/entities")({
  head: () => ({
    meta: [
      { title: "Entities | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Trygc operating companies across Saudi Arabia, Egypt, UAE, Kuwait, Qatar and Bahrain with currency and tax details.",
      },
      { property: "og:title", content: "Entities | TryGC Workspace Hub" },
      {
        property: "og:description",
        content:
          "Operating companies with currency, fiscal calendar, tax registration and local results.",
      },
    ],
  }),
  component: Entities,
});
