import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Pill, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { num } from "@/lib/format";
import type { Influencer } from "@/lib/types";
import {
  BarChartCard,
  ChartRow,
  ShareChartCard,
  TrendChartCard,
  countBy,
  sumBy,
} from "@/components/charts";

function Directory() {
  const { db } = useApp();
  const { t } = useLang();
  const rows = db.influencers;

  const usage = (id: string) => db.campaignInfluencers.filter((r) => r.influencerId === id);

  const columns: Column<Influencer>[] = [
    {
      key: "name",
      header: t("Creator", "صانع المحتوى"),
      render: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          <div className="num text-xs text-muted-foreground">{r.handle}</div>
        </div>
      ),
      sortValue: (r) => r.name,
    },
    {
      key: "platform",
      header: t("Platform", "المنصة"),
      render: (r) => <Pill tone="brand">{r.platform}</Pill>,
      sortValue: (r) => r.platform,
    },
    {
      key: "followers",
      header: t("Audience", "الجمهور"),
      render: (r) => <span className="num">{num(r.followers)}</span>,
      sortValue: (r) => r.followers,
    },
    { key: "tier", header: t("Tier", "الفئة"), render: (r) => r.tier, sortValue: (r) => r.tier },
    {
      key: "country",
      header: t("Market", "السوق"),
      render: (r) => r.country,
      sortValue: (r) => r.country,
    },
    {
      key: "category",
      header: t("Category", "التصنيف"),
      render: (r) => r.category,
      sortValue: (r) => r.category,
    },
    {
      key: "rating",
      header: t("Reliability", "الموثوقية"),
      render: (r) => (
        <Pill tone={r.rating >= 4.3 ? "success" : r.rating >= 3.5 ? "warning" : "danger"}>
          {r.rating}/5
        </Pill>
      ),
      sortValue: (r) => r.rating,
    },
    {
      key: "campaigns",
      header: t("Campaigns", "الحملات"),
      render: (r) => <span className="num">{usage(r.id).length}</span>,
      sortValue: (r) => usage(r.id).length,
    },
    {
      key: "issues",
      header: t("Coverage issues", "مشاكل التغطية"),
      render: (r) => {
        const n = usage(r.id).filter((u) =>
          ["Missing Posting Coverage", "Missed Visit"].includes(u.stage),
        ).length;
        return <Pill tone={n ? "danger" : "success"}>{n}</Pill>;
      },
      sortValue: (r) =>
        usage(r.id).filter((u) => ["Missing Posting Coverage", "Missed Visit"].includes(u.stage))
          .length,
    },
    {
      key: "status",
      header: t("Status", "الحالة"),
      render: (r) => (
        <Pill tone={r.blacklisted ? "danger" : "success"}>
          {r.blacklisted ? t("Blacklisted", "محظور") : t("Approved", "معتمد")}
        </Pill>
      ),
      sortValue: (r) => (r.blacklisted ? 1 : 0),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Influencer Directory", "دليل صناع المحتوى")}
        subtitle={t(
          "The shared creator database with reliability history, so the same person is never re-vetted from scratch.",
          "قاعدة صناع المحتوى المشتركة مع سجل الموثوقية، حتى لا يُعاد تقييم الشخص نفسه من الصفر.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("Creators", "صناع المحتوى")} value={String(rows.length)} tone="brand" />
        <Stat
          label={t("Highly reliable", "موثوقية عالية")}
          value={String(rows.filter((r) => r.rating >= 4.3).length)}
          tone="success"
        />
        <Stat
          label={t("Blacklisted", "محظورون")}
          value={String(rows.filter((r) => r.blacklisted).length)}
          tone="danger"
        />
        <Stat
          label={t("Total audience", "إجمالي الجمهور")}
          value={num(rows.reduce((s, r) => s + r.followers, 0))}
          tone="orange"
        />
      </div>
      <ChartRow>
        <ShareChartCard
          title={t("Creators by platform", "حسب المنصة")}
          data={countBy(rows, (r) => r.platform)}
        />
        <BarChartCard
          title={t("Creators by tier", "حسب الشريحة")}
          colorful
          data={countBy(rows, (r) => r.tier)}
        />
        <BarChartCard
          title={t("Reach by category", "الوصول حسب الفئة")}
          horizontal
          data={sumBy(
            rows,
            (r) => r.category,
            (r) => r.followers,
          )}
          format={(v) => num(v)}
        />
      </ChartRow>
      <Section title={t("Directory", "الدليل")}>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.name} ${r.handle} ${r.category} ${r.platform}`}
          exportName="trygc-influencers"
          pageSize={12}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/campaigns/influencers")({
  head: () => ({
    meta: [
      { title: "Influencer Directory | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Shared creator database with audience size, tier, reliability rating, coverage history and blacklist status.",
      },
      { property: "og:title", content: "Influencer Directory | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Creator database with reliability, audience and coverage history.",
      },
    ],
  }),
  component: Directory,
});
