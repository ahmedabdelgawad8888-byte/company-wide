import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Pill, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { compactMoney, money, shortDate, toSAR } from "@/lib/format";
import type { Payment } from "@/lib/types";
import { BarChartCard, ChartRow, TrendChartCard, sumBy } from "@/components/charts";
import { getRoleExperience } from "@/lib/role-ux";

function Payments() {
  const { db, inScope, currentUser, entityName, clientName } = useApp();
  const { t } = useLang();
  const ux = getRoleExperience(currentUser.role);
  const individual = ux.mode === "finance-individual";
  const invoice = (id: string) => db.invoices.find((i) => i.id === id);
  const rows = inScope(db.payments).filter((p) =>
    individual ? invoice(p.invoiceId)?.ownerId === currentUser.id : true,
  );

  const columns: Column<Payment>[] = [
    {
      key: "date",
      header: t("Date", "التاريخ"),
      render: (r) => shortDate(r.date),
      sortValue: (r) => r.date,
    },
    {
      key: "invoice",
      header: t("Invoice", "الفاتورة"),
      render: (r) => <span className="num font-medium">{invoice(r.invoiceId)?.number ?? "—"}</span>,
      sortValue: (r) => invoice(r.invoiceId)?.number ?? "",
    },
    {
      key: "client",
      header: t("Client", "العميل"),
      render: (r) => {
        const inv = invoice(r.invoiceId);
        return inv ? clientName(inv.clientId) : "—";
      },
    },
    {
      key: "amount",
      header: t("Amount", "المبلغ"),
      render: (r) => <span className="num">{money(r.amount, r.currency)}</span>,
      sortValue: (r) => toSAR(r.amount, r.currency),
    },
    {
      key: "sar",
      header: t("Amount (SAR)", "المبلغ بالريال"),
      render: (r) => <span className="num">{money(toSAR(r.amount, r.currency), "SAR")}</span>,
    },
    {
      key: "method",
      header: t("Method", "الطريقة"),
      render: (r) => <Pill tone="brand">{r.method}</Pill>,
      sortValue: (r) => r.method,
    },
    {
      key: "ref",
      header: t("Reference", "المرجع"),
      render: (r) => <span className="num text-xs">{r.reference}</span>,
    },
    {
      key: "entity",
      header: t("Entity", "الكيان"),
      render: (r) => entityName(r.entityId),
      sortValue: (r) => entityName(r.entityId),
    },
  ];

  const totalSAR = rows.reduce((s, p) => s + toSAR(p.amount, p.currency), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(
          individual ? "My Payment Log" : "Payments & Collection Log",
          individual ? "سجل مدفوعاتي" : "سجل المدفوعات والتحصيل",
        )}
        subtitle={t(
          individual
            ? "Use this to verify what you collected and what was actually recorded against the bills you own."
            : "The cash-received ledger. Use it to verify collection performance and reconcile what was recorded against open bills.",
          individual
            ? "استخدم هذا السجل للتأكد مما تم تحصيله وتسجيله فعلياً على الفواتير تحت مسؤوليتك."
            : "سجل النقد المحصل للتحقق من أداء التحصيل ومطابقة ما تم تسجيله مع الفواتير المفتوحة.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label={t("Payments recorded", "دفعات مسجلة")}
          value={String(rows.length)}
          tone="brand"
        />
        <Stat
          label={t("Cash collected (SAR)", "النقد المحصل")}
          value={compactMoney(totalSAR, "SAR")}
          tone="success"
        />
        <Stat
          label={t("Bank transfers", "تحويلات بنكية")}
          value={String(rows.filter((r) => r.method === "Bank Transfer").length)}
        />
      </div>
      {individual ? (
        <ChartRow cols={2}>
          <TrendChartCard
            title={t("My collection trend", "اتجاه تحصيلي")}
            data={sumBy(
              [...rows].sort((a, b) => a.date.localeCompare(b.date)),
              (r) => shortDate(r.date),
              (r) => toSAR(r.amount, r.currency),
            )}
            format={(v) => compactMoney(v, "SAR")}
            trendLine
          />
          <BarChartCard
            title={t("How payments arrived", "وسائل استلام المدفوعات")}
            data={sumBy(
              rows,
              (r) => r.method,
              (r) => toSAR(r.amount, r.currency),
            )}
            horizontal
            colorful
            format={(v) => compactMoney(v, "SAR")}
          />
        </ChartRow>
      ) : (
        <ChartRow>
          <TrendChartCard
            title={t("Cash received over time (SAR)", "النقد المحصل عبر الزمن")}
            data={sumBy(
              [...rows].sort((a, b) => a.date.localeCompare(b.date)),
              (r) => shortDate(r.date),
              (r) => toSAR(r.amount, r.currency),
            )}
            format={(v) => compactMoney(v, "SAR")}
            trendLine
          />
          <BarChartCard
            title={t("Collections by entity (SAR)", "التحصيل حسب الكيان")}
            data={sumBy(
              rows,
              (r) => entityName(r.entityId),
              (r) => toSAR(r.amount, r.currency),
            )}
            format={(v) => compactMoney(v, "SAR")}
          />
          <BarChartCard
            title={t("Collection method mix", "مزيج وسائل التحصيل")}
            data={sumBy(
              rows,
              (r) => r.method,
              (r) => toSAR(r.amount, r.currency),
            )}
            horizontal
            colorful
            format={(v) => compactMoney(v, "SAR")}
          />
        </ChartRow>
      )}
      <Section title={t("Payment register", "سجل المدفوعات")}>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.reference} ${invoice(r.invoiceId)?.number ?? ""}`}
          exportName="trygc-payments"
          pageSize={12}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/finance/payments")({
  head: () => ({
    meta: [
      { title: "Payments | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Payment register showing cash received against invoices in local currency and SAR.",
      },
      { property: "og:title", content: "Payments | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Cash received against invoices, by entity and method.",
      },
    ],
  }),
  component: Payments,
});
