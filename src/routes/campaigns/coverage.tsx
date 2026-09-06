import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, Pill, Section, Stat } from "@/components/kit";
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

const OPEN = [
  "Scheduled",
  "Visited",
  "Posting Coverage Received",
  "Missing Posting Coverage",
  "Missed Visit",
  "Replacement Required",
];

function Coverage() {
  const { db, inScope, campaignName, influencerName, actions } = useApp();
  const { t } = useLang();
  const campaigns = inScope(db.campaigns);
  const rows = db.campaignInfluencers.filter((r) => campaigns.some((c) => c.id === r.campaignId));

  const columns: Column<CampaignInfluencer>[] = [
    {
      key: "influencer",
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
      header: t("Coverage stage", "مرحلة التغطية"),
      render: (r) => (
        <Pill
          tone={
            r.stage.startsWith("Missing") || r.stage === "Missed Visit"
              ? "danger"
              : r.stage.includes("Verified") || r.stage === "Completed"
                ? "success"
                : "brand"
          }
        >
          {r.stage}
        </Pill>
      ),
      sortValue: (r) => r.stage,
    },
    {
      key: "visit",
      header: t("Visit date", "تاريخ الزيارة"),
      render: (r) => (r.visitDate ? shortDate(r.visitDate) : "—"),
      sortValue: (r) => r.visitDate ?? "",
    },
    {
      key: "due",
      header: t("Coverage due", "موعد التغطية"),
      render: (r) => (r.coverageDue ? shortDate(r.coverageDue) : "—"),
      sortValue: (r) => r.coverageDue ?? "",
    },
    {
      key: "fee",
      header: t("Fee", "الأتعاب"),
      render: (r) => <span className="num">{money(r.fee, r.currency)}</span>,
      sortValue: (r) => r.fee,
    },
    {
      key: "note",
      header: t("Note", "ملاحظة"),
      render: (r) => <span className="text-xs text-muted-foreground">{r.note ?? "—"}</span>,
      defaultHidden: true,
    },
    {
      key: "act",
      header: "",
      render: (r) => (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              actions.moveInfluencer(r.id, "Posting Coverage Received", "Coverage link submitted");
              toast.success(t("Coverage received", "تم استلام التغطية"), {
                description: influencerName(r.influencerId),
              });
            }}
          >
            {t("Mark received", "استلمت")}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              actions.moveInfluencer(r.id, "Posting Coverage Verified", "Verified by quality");
              toast.success(t("Coverage verified", "تم توثيق التغطية"), {
                description: influencerName(r.influencerId),
              });
            }}
          >
            {t("Verify", "توثيق")}
          </Button>
        </div>
      ),
    },
  ];

  const count = (fn: (r: CampaignInfluencer) => boolean) => rows.filter(fn).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Posting Coverage", "تغطية النشر")}
        subtitle={t(
          "Trygc tracks Posting Coverage, not raw posts: what was promised, what was published, what was verified and what is still missing.",
          "نتابع تغطية النشر لا المنشورات فقط: ما تم الالتزام به، وما نُشر، وما تم توثيقه، وما لا يزال ناقصاً.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Deliverables tracked", "مخرجات متابعة")}
          value={String(rows.length)}
          tone="brand"
        />
        <Stat
          label={t("Verified", "موثّقة")}
          value={String(count((r) => ["Posting Coverage Verified", "Completed"].includes(r.stage)))}
          tone="success"
        />
        <Stat
          label={t("Awaiting verification", "بانتظار التوثيق")}
          value={String(count((r) => r.stage === "Posting Coverage Received"))}
          tone="orange"
        />
        <Stat
          label={t("Missing / missed", "ناقصة أو فائتة")}
          value={String(
            count((r) =>
              ["Missing Posting Coverage", "Missed Visit", "Replacement Required"].includes(
                r.stage,
              ),
            ),
          )}
          tone="danger"
        />
      </div>
      <ChartRow cols={2}>
        <ShareChartCard
          title={t("Coverage by stage", "التغطية حسب المرحلة")}
          data={countBy(rows, (r) => r.stage)}
        />
        <BarChartCard
          title={t("Creators per campaign", "صناع المحتوى لكل حملة")}
          horizontal
          data={countBy(rows, (r) => campaignName(r.campaignId))}
        />
      </ChartRow>
      <Section
        title={t("Open coverage items", "بنود التغطية المفتوحة")}
        description={t(
          "Sorted work for the community and quality teams.",
          "عمل مرتب لفرق المجتمع والجودة.",
        )}
      >
        <DataTable
          rows={rows.filter((r) => OPEN.includes(r.stage))}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) =>
            `${influencerName(r.influencerId)} ${campaignName(r.campaignId)} ${r.stage}`
          }
          exportName="trygc-posting-coverage"
          pageSize={12}
        />
      </Section>
      <Section title={t("All coverage records", "كل سجلات التغطية")}>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) =>
            `${influencerName(r.influencerId)} ${campaignName(r.campaignId)} ${r.stage}`
          }
          exportName="trygc-coverage-all"
          pageSize={12}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/campaigns/coverage")({
  head: () => ({
    meta: [
      { title: "Posting Coverage | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Track promised, submitted, verified and missing Posting Coverage for every creator on every Trygc campaign.",
      },
      { property: "og:title", content: "Posting Coverage | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Promised, submitted, verified and missing creator coverage in one queue.",
      },
    ],
  }),
  component: Coverage,
});
