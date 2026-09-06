import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Pill, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { money, shortDate } from "@/lib/format";
import type { CampaignInfluencer } from "@/lib/types";
import {
  BarChartCard,
  ChartRow,
  ShareChartCard,
  TrendChartCard,
  countBy,
  sumBy,
} from "@/components/charts";

const OUTREACH: CampaignInfluencer["stage"][] = [
  "Target",
  "Prospected",
  "Contacted",
  "Interested",
  "Confirmation Requested",
  "Confirmed",
  "No Response",
];

function Community() {
  const { db, inScope, campaignName, influencerName, actions } = useApp();
  const { t } = useLang();
  const campaigns = inScope(db.campaigns);
  const rows = db.campaignInfluencers.filter((r) => campaigns.some((c) => c.id === r.campaignId));
  const outreach = rows.filter((r) => OUTREACH.includes(r.stage));

  const columns: Column<CampaignInfluencer>[] = [
    {
      key: "creator",
      header: t("Creator", "صانع المحتوى"),
      render: (r) => <span className="font-medium">{influencerName(r.influencerId)}</span>,
      sortValue: (r) => influencerName(r.influencerId),
    },
    {
      key: "campaign",
      header: t("Campaign", "الحملة"),
      render: (r) => campaignName(r.campaignId),
      sortValue: (r) => campaignName(r.campaignId),
    },
    {
      key: "stage",
      header: t("Outreach stage", "مرحلة التواصل"),
      render: (r) => (
        <Pill
          tone={
            r.stage === "Confirmed" ? "success" : r.stage === "No Response" ? "danger" : "brand"
          }
        >
          {r.stage}
        </Pill>
      ),
      sortValue: (r) => OUTREACH.indexOf(r.stage),
    },
    {
      key: "fee",
      header: t("Agreed fee", "الأتعاب المتفق عليها"),
      render: (r) => <span className="num">{money(r.fee, r.currency)}</span>,
      sortValue: (r) => r.fee,
    },
    {
      key: "visit",
      header: t("Visit", "الزيارة"),
      render: (r) => (r.visitDate ? shortDate(r.visitDate) : "—"),
      sortValue: (r) => r.visitDate ?? "",
    },
    {
      key: "act",
      header: "",
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            actions.moveInfluencer(r.id, "Confirmed", "Confirmed by community team");
            toast.success(t("Creator confirmed", "تم تأكيد صانع المحتوى"), {
              description: influencerName(r.influencerId),
            });
          }}
        >
          {t("Confirm", "تأكيد")}
        </Button>
      ),
    },
  ];

  const funnel = OUTREACH.map((stage) => ({
    stage,
    n: rows.filter((r) => r.stage === stage).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Community Workspace", "مساحة المجتمع")}
        subtitle={t(
          "Creator outreach and confirmation work: who was contacted, who is interested, who is committed and who never replied.",
          "أعمال التواصل والتأكيد: من تم التواصل معه، ومن مهتم، ومن التزم، ومن لم يرد.",
        )}
        actions={
          <Button variant="outline" asChild>
            <Link to="/campaigns/influencers">{t("Creator directory", "دليل صناع المحتوى")}</Link>
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Creators in outreach", "قيد التواصل")}
          value={String(outreach.length)}
          tone="brand"
        />
        <Stat
          label={t("Confirmed", "مؤكدون")}
          value={String(rows.filter((r) => r.stage === "Confirmed").length)}
          tone="success"
        />
        <Stat
          label={t("No response", "بدون رد")}
          value={String(rows.filter((r) => r.stage === "No Response").length)}
          tone="danger"
        />
        <Stat
          label={t("Replacements needed", "بدلاء مطلوبون")}
          value={String(rows.filter((r) => r.stage === "Replacement Required").length)}
          tone="warning"
        />
      </div>
      <ChartRow cols={2}>
        <ShareChartCard
          title={t("Creator relationships by stage", "العلاقات حسب المرحلة")}
          data={countBy(rows, (r) => r.stage)}
        />
        <BarChartCard
          title={t("Engagements per campaign", "المشاركات لكل حملة")}
          horizontal
          data={countBy(rows, (r) => campaignName(r.campaignId))}
        />
      </ChartRow>
      <Panel>
        <Section title={t("Outreach funnel", "قمع التواصل")}>
          <div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-7">
            {funnel.map((f) => (
              <div key={f.stage} className="rounded-lg border p-3 text-center">
                <p className="num text-xl font-semibold">{f.n}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{f.stage}</p>
              </div>
            ))}
          </div>
        </Section>
      </Panel>
      <Section title={t("Outreach worklist", "قائمة التواصل")}>
        <DataTable
          rows={outreach}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${influencerName(r.influencerId)} ${campaignName(r.campaignId)}`}
          exportName="trygc-community"
          pageSize={12}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community Workspace | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Creator outreach, interest and confirmation tracking for every live Trygc campaign.",
      },
      { property: "og:title", content: "Community Workspace | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Outreach funnel, confirmations and replacements for creator campaigns.",
      },
    ],
  }),
  component: Community,
});
