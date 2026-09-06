import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Pill, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { shortDate } from "@/lib/format";
import type { Deal } from "@/lib/types";
import {
  BarChartCard,
  ChartRow,
  ShareChartCard,
  TrendChartCard,
  countBy,
  sumBy,
} from "@/components/charts";

function Activities() {
  const { db, inScope, clientName, userName, entityName } = useApp();
  const { t } = useLang();
  const rows = inScope(db.deals);

  const columns: Column<Deal>[] = [
    {
      key: "when",
      header: t("Scheduled", "الموعد"),
      render: (r) => shortDate(r.nextActionDate),
      sortValue: (r) => r.nextActionDate,
    },
    {
      key: "action",
      header: t("Planned activity", "النشاط المخطط"),
      render: (r) => <span className="font-medium">{r.nextAction}</span>,
      sortValue: (r) => r.nextAction,
    },
    {
      key: "client",
      header: t("Client", "العميل"),
      render: (r) => clientName(r.clientId),
      sortValue: (r) => clientName(r.clientId),
    },
    {
      key: "deal",
      header: t("Related deal", "الصفقة"),
      render: (r) => r.name,
      sortValue: (r) => r.name,
    },
    {
      key: "owner",
      header: t("Owner", "المسؤول"),
      render: (r) => userName(r.ownerId),
      sortValue: (r) => userName(r.ownerId),
    },
    {
      key: "entity",
      header: t("Entity", "الكيان"),
      render: (r) => entityName(r.entityId),
      sortValue: (r) => entityName(r.entityId),
    },
    {
      key: "stage",
      header: t("Stage", "المرحلة"),
      render: (r) => <Pill tone="brand">{r.stage}</Pill>,
      sortValue: (r) => r.stage,
    },
    {
      key: "last",
      header: t("Last touch", "آخر تواصل"),
      render: (r) => shortDate(r.lastActivity),
      sortValue: (r) => r.lastActivity,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Activities & Meetings", "الأنشطة والاجتماعات")}
        subtitle={t(
          "Planned commercial touchpoints across the pipeline, so nothing depends on someone's memory.",
          "نقاط التواصل التجارية المخططة عبر خط الفرص، حتى لا يعتمد شيء على الذاكرة.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label={t("Planned activities", "أنشطة مخططة")}
          value={String(rows.length)}
          tone="brand"
        />
        <Stat
          label={t("Due this week", "مستحقة هذا الأسبوع")}
          value={String(rows.filter((r) => r.nextActionDate <= "2026-09-11").length)}
          tone="orange"
        />
        <Stat
          label={t("Overdue", "متأخرة")}
          value={String(rows.filter((r) => r.nextActionDate < "2026-09-04").length)}
          tone="danger"
        />
      </div>
      <ChartRow cols={2}>
        <ShareChartCard
          title={t("Activities by stage", "الأنشطة حسب المرحلة")}
          data={countBy(rows, (r) => r.stage)}
        />
        <BarChartCard
          title={t("Activities by owner", "الأنشطة حسب المسؤول")}
          horizontal
          data={countBy(rows, (r) => userName(r.ownerId))}
        />
      </ChartRow>
      <Section title={t("Upcoming touchpoints", "نقاط التواصل القادمة")}>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.nextAction} ${r.name}`}
          exportName="trygc-activities"
          pageSize={12}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/crm/activities")({
  head: () => ({
    meta: [
      { title: "Activities & Meetings | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Planned calls, meetings and follow-ups across the Trygc pipeline with owners and due dates.",
      },
      { property: "og:title", content: "Activities & Meetings | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Planned commercial touchpoints with owners and due dates.",
      },
    ],
  }),
  component: Activities,
});
