import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader, Panel, Pill, Section, Stat } from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { dealIsStuck } from "@/lib/derive";
import { ageLabel, compactMoney, money, shortDate, toSAR } from "@/lib/format";
import type { Deal, LeadStage } from "@/lib/types";
import {
  BarChartCard,
  ChartRow,
  ShareChartCard,
  TrendChartCard,
  countBy,
  sumBy,
} from "@/components/charts";

const STAGES: LeadStage[] = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Discovery",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

export function DealsPage({ leadsOnly = false }: { leadsOnly?: boolean }) {
  const { db, inScope, clientName, userName, entityName, actions } = useApp();
  const { t } = useLang();
  const [view, setView] = useState("board");
  const all = inScope(db.deals);
  const rows = leadsOnly
    ? all.filter((d) => ["New Lead", "Contacted", "Qualified"].includes(d.stage))
    : all;

  const move = (deal: Deal, stage: LeadStage) => {
    actions.moveDeal(deal.id, stage);
    toast.success(t("Stage updated", "تم تحديث المرحلة"), {
      description: `${deal.name}: ${deal.stage} → ${stage}`,
    });
    if (stage === "Won") {
      actions.convertDeal(deal.id);
      toast.success(t("Deal converted", "تم تحويل الصفقة"), {
        description: t(
          "Client activated and a campaign shell was created.",
          "تم تفعيل العميل وإنشاء حملة مبدئية.",
        ),
      });
    }
  };

  const columns: Column<Deal>[] = [
    {
      key: "name",
      header: t("Deal", "الصفقة"),
      render: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          <div className="text-xs text-muted-foreground">{clientName(r.clientId)}</div>
        </div>
      ),
      sortValue: (r) => r.name,
    },
    {
      key: "stage",
      header: t("Stage", "المرحلة"),
      render: (r) => (
        <Pill tone={r.stage === "Won" ? "success" : r.stage === "Lost" ? "danger" : "brand"}>
          {r.stage}
        </Pill>
      ),
      sortValue: (r) => STAGES.indexOf(r.stage),
    },
    {
      key: "value",
      header: t("Value", "القيمة"),
      render: (r) => <span className="num">{money(r.value, r.currency)}</span>,
      sortValue: (r) => toSAR(r.value, r.currency),
    },
    {
      key: "prob",
      header: t("Probability", "الاحتمالية"),
      render: (r) => `${r.probability}%`,
      sortValue: (r) => r.probability,
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
    { key: "source", header: t("Source", "المصدر"), render: (r) => r.source, defaultHidden: true },
    {
      key: "close",
      header: t("Expected close", "الإغلاق المتوقع"),
      render: (r) => shortDate(r.expectedClose),
      sortValue: (r) => r.expectedClose,
    },
    {
      key: "activity",
      header: t("Last activity", "آخر نشاط"),
      render: (r) => (
        <span className={dealIsStuck(r) ? "text-danger font-medium" : ""}>
          {ageLabel(r.lastActivity)}
        </span>
      ),
      sortValue: (r) => r.lastActivity,
    },
    {
      key: "next",
      header: t("Next action", "الإجراء التالي"),
      render: (r) => (
        <div>
          <div>{r.nextAction}</div>
          <div className="text-xs text-muted-foreground">{shortDate(r.nextActionDate)}</div>
        </div>
      ),
    },
    {
      key: "act",
      header: "",
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            actions.touchDeal(r.id);
            toast.success(t("Activity logged", "تم تسجيل النشاط"), { description: r.name });
          }}
        >
          {t("Log touch", "تسجيل تواصل")}
        </Button>
      ),
    },
  ];

  const pipelineSAR = rows
    .filter((d) => !["Won", "Lost"].includes(d.stage))
    .reduce((s, d) => s + toSAR(d.value, d.currency), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          leadsOnly ? t("Leads", "العملاء المحتملون") : t("Deals & Pipeline", "الصفقات وخط الفرص")
        }
        subtitle={
          leadsOnly
            ? t(
                "New and early-stage opportunities. Qualify or disqualify — nothing should sit untouched.",
                "الفرص الجديدة والمبكرة. أهّلها أو استبعدها — لا شيء يُترك دون متابعة.",
              )
            : t(
                "Drag work forward stage by stage. Winning a deal activates the client and opens a campaign.",
                "حرّك العمل مرحلة بمرحلة. فوز الصفقة يفعّل العميل ويفتح حملة.",
              )
        }
        meta={[
          <Pill key="v" tone="brand">
            {compactMoney(pipelineSAR, "SAR")} {t("open pipeline", "خط فرص مفتوح")}
          </Pill>,
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Deals in view", "الصفقات المعروضة")}
          value={String(rows.length)}
          tone="brand"
        />
        <Stat
          label={t("Stuck 7+ days", "متوقفة 7 أيام+")}
          value={String(rows.filter(dealIsStuck).length)}
          tone="danger"
        />
        <Stat
          label={t("Closing this month", "تُغلق هذا الشهر")}
          value={String(rows.filter((d) => d.expectedClose.startsWith("2026-09")).length)}
          tone="orange"
        />
        <Stat
          label={t("Won", "مكسوبة")}
          value={String(rows.filter((d) => d.stage === "Won").length)}
          tone="success"
        />
      </div>
      <ChartRow>
        <ShareChartCard
          title={t("Deals by stage", "الصفقات حسب المرحلة")}
          data={countBy(rows, (r) => r.stage)}
        />
        <BarChartCard
          title={t("Pipeline by owner (SAR)", "خط الفرص حسب المسؤول")}
          horizontal
          data={sumBy(
            rows,
            (r) => userName(r.ownerId),
            (r) => toSAR(r.value, r.currency),
          )}
          format={(v) => compactMoney(v, "SAR")}
        />
        <BarChartCard
          title={t("Deals by source", "الصفقات حسب المصدر")}
          colorful
          data={countBy(rows, (r) => r.source)}
        />
      </ChartRow>

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="board">{t("Board", "لوحة")}</TabsTrigger>
          <TabsTrigger value="table">{t("Table", "جدول")}</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="mt-4">
          <div className="grid gap-3 overflow-x-auto md:grid-cols-2 xl:grid-cols-4">
            {STAGES.filter((s) =>
              leadsOnly ? ["New Lead", "Contacted", "Qualified"].includes(s) : true,
            ).map((stage) => {
              const cards = rows.filter((d) => d.stage === stage);
              return (
                <div key={stage} className="min-w-[240px] rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide">{stage}</span>
                    <span className="num text-xs text-muted-foreground">{cards.length}</span>
                  </div>
                  <div className="space-y-2">
                    {cards.map((d) => (
                      <div key={d.id} className="rounded-lg border bg-background p-3">
                        <p className="truncate text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {clientName(d.clientId)} · {entityName(d.entityId)}
                        </p>
                        <p className="num mt-1 text-sm font-semibold">
                          {money(d.value, d.currency)}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {userName(d.ownerId)} · {ageLabel(d.lastActivity)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {STAGES.filter((s) => s !== stage)
                            .slice(0, 3)
                            .map((s) => (
                              <Button
                                key={s}
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => move(d, s)}
                              >
                                {s}
                              </Button>
                            ))}
                        </div>
                      </div>
                    ))}
                    {cards.length === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        {t("Empty", "فارغ")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="table" className="mt-4">
          <Panel className="p-0 shadow-none">
            <Section title={t("Deal table", "جدول الصفقات")}>
              <DataTable
                rows={rows}
                columns={columns}
                rowKey={(r) => r.id}
                searchable={(r) => `${r.name} ${clientName(r.clientId)} ${r.stage}`}
                exportName="trygc-deals"
                pageSize={12}
              />
            </Section>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/crm/deals")({
  head: () => ({
    meta: [
      { title: "Deals & Pipeline | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Trygc B2B pipeline board and table: stages, owners, values in local currency and stuck-deal detection.",
      },
      { property: "og:title", content: "Deals & Pipeline | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Pipeline board and table with stage moves, owners and stuck-deal detection.",
      },
    ],
  }),
  component: () => <DealsPage />,
});
