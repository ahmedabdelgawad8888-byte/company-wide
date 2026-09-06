import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HealthPill, PageHeader, Pill, Section, Stat, StatusPill, Bar } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { campaignHealth, campaignStats } from "@/lib/derive";
import { compactMoney, money, shortDate, toSAR } from "@/lib/format";
import type { Campaign } from "@/lib/types";
import {
  BarChartCard,
  ChartRow,
  ShareChartCard,
  TrendChartCard,
  countBy,
  sumBy,
} from "@/components/charts";

function CampaignCenter() {
  const { db, inScope, clientName, userName, entityName } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();
  const rows = inScope(db.campaigns);
  const withStats = rows.map((c) => {
    const stats = campaignStats(
      c,
      db.campaignInfluencers.filter((r) => r.campaignId === c.id),
    );
    return { c, stats, health: campaignHealth(c, stats) };
  });

  const columns: Column<Campaign>[] = [
    {
      key: "name",
      header: t("Campaign", "الحملة"),
      render: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          <div className="text-xs text-muted-foreground">
            {clientName(r.clientId)} · {r.city}
          </div>
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
    {
      key: "health",
      header: t("Health", "الصحة"),
      render: (r) => {
        const row = withStats.find((w) => w.c.id === r.id)!;
        return <HealthPill health={row.health.health} />;
      },
      sortValue: (r) => withStats.find((w) => w.c.id === r.id)!.health.health,
    },
    {
      key: "progress",
      header: t("Delivery", "التنفيذ"),
      render: (r) => {
        const row = withStats.find((w) => w.c.id === r.id)!;
        return (
          <div className="w-40">
            <Bar
              value={row.stats.completed}
              max={r.targetInfluencers}
              tone={row.health.health === "green" ? "success" : "orange"}
            />
            <span className="num text-[11px] text-muted-foreground">
              {row.stats.completed}/{r.targetInfluencers} {t("completed", "مكتمل")}
            </span>
          </div>
        );
      },
      sortValue: (r) =>
        withStats.find((w) => w.c.id === r.id)!.stats.completed / r.targetInfluencers,
    },
    {
      key: "coverage",
      header: t("Missing coverage", "تغطية ناقصة"),
      render: (r) => {
        const s = withStats.find((w) => w.c.id === r.id)!.stats;
        return <Pill tone={s.missingCoverage ? "danger" : "success"}>{s.missingCoverage}</Pill>;
      },
      sortValue: (r) => withStats.find((w) => w.c.id === r.id)!.stats.missingCoverage,
    },
    {
      key: "budget",
      header: t("Budget", "الميزانية"),
      render: (r) => <span className="num">{money(r.budget, r.currency)}</span>,
      sortValue: (r) => toSAR(r.budget, r.currency),
    },
    {
      key: "owner",
      header: t("Owner", "المسؤول"),
      render: (r) => userName(r.ownerId),
      sortValue: (r) => userName(r.ownerId),
    },
    {
      key: "ops",
      header: t("Ops owner", "مسؤول العمليات"),
      render: (r) => userName(r.opsOwnerId),
      defaultHidden: true,
    },
    {
      key: "entity",
      header: t("Entity", "الكيان"),
      render: (r) => entityName(r.entityId),
      sortValue: (r) => entityName(r.entityId),
    },
    {
      key: "dates",
      header: t("Window", "الفترة"),
      render: (r) => `${shortDate(r.startDate)} → ${shortDate(r.endDate)}`,
      sortValue: (r) => r.endDate,
    },
    {
      key: "approval",
      header: t("Client approval", "موافقة العميل"),
      render: (r) => <StatusPill status={r.clientApproval} />,
      sortValue: (r) => r.clientApproval,
    },
  ];

  const budgetSAR = rows.reduce((s, c) => s + toSAR(c.budget, c.currency), 0);
  const allStats = withStats.reduce(
    (a, w) => ({
      conf: a.conf + w.stats.confirmed,
      miss: a.miss + w.stats.missingCoverage,
      done: a.done + w.stats.completed,
    }),
    { conf: 0, miss: 0, done: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Campaign Command Center", "مركز قيادة الحملات")}
        subtitle={t(
          "Every campaign, its delivery position against target creators, and the exact reason any campaign is not green.",
          "كل حملة وموقعها في التنفيذ مقابل العدد المستهدف، والسبب الدقيق لعدم كونها خضراء.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Campaigns", "الحملات")}
          value={String(rows.length)}
          hint={`${rows.filter((c) => ["Active", "Delivery"].includes(c.status)).length} ${t("in delivery", "قيد التنفيذ")}`}
          tone="brand"
        />
        <Stat
          label={t("Confirmed creators", "صناع مؤكدون")}
          value={String(allStats.conf)}
          tone="success"
        />
        <Stat
          label={t("Missing Posting Coverage", "تغطية نشر ناقصة")}
          value={String(allStats.miss)}
          tone="danger"
        />
        <Stat
          label={t("Committed budget (SAR)", "الميزانية الملتزمة")}
          value={compactMoney(budgetSAR, "SAR")}
          tone="orange"
        />
      </div>
      <ChartRow>
        <ShareChartCard
          title={t("Campaigns by status", "الحملات حسب الحالة")}
          data={countBy(rows, (r) => r.status)}
        />
        <BarChartCard
          title={t("Budget by client (SAR)", "الميزانية حسب العميل")}
          horizontal
          data={sumBy(
            rows,
            (r) => clientName(r.clientId),
            (r) => toSAR(r.budget, r.currency),
          )}
          format={(v) => compactMoney(v, "SAR")}
        />
        <BarChartCard
          title={t("Target creators by city", "المستهدف حسب المدينة")}
          colorful
          data={sumBy(
            rows,
            (r) => r.city,
            (r) => r.targetInfluencers,
          )}
        />
      </ChartRow>
      <Section title={t("Campaign portfolio", "محفظة الحملات")}>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.name} ${clientName(r.clientId)} ${r.city}`}
          onRowClick={(r) =>
            navigate({ to: "/campaigns/$campaignId", params: { campaignId: r.id } })
          }
          exportName="trygc-campaigns"
          pageSize={12}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/campaigns/")({
  head: () => ({
    meta: [
      { title: "Campaign Command Center | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Delivery position, health, budgets and Posting Coverage gaps for every Trygc influencer campaign.",
      },
      { property: "og:title", content: "Campaign Command Center | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Campaign health, delivery progress and Posting Coverage gaps in one place.",
      },
    ],
  }),
  component: CampaignCenter,
});
