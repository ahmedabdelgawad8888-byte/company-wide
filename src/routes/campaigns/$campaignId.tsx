import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bar,
  EmptyState,
  Field,
  HealthPill,
  PageHeader,
  Panel,
  Pill,
  Section,
  Stat,
  StatusPill,
} from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { campaignHealth, campaignStats } from "@/lib/derive";
import { money, shortDate } from "@/lib/format";
import type { InfluencerStage } from "@/lib/types";

const FLOW: InfluencerStage[] = [
  "Target",
  "Prospected",
  "Contacted",
  "Interested",
  "Confirmation Requested",
  "Confirmed",
  "Submitted to Client",
  "Approved",
  "Scheduled",
  "Visited",
  "Posting Coverage Received",
  "Posting Coverage Verified",
  "Completed",
];

function CampaignDetail() {
  const { campaignId } = useParams({ from: "/campaigns/$campaignId" });
  const { db, userName, clientName, entityName, influencerName, actions } = useApp();
  const { t } = useLang();
  const campaign = db.campaigns.find((c) => c.id === campaignId);

  if (!campaign) {
    return (
      <EmptyState
        title={t("Campaign not found", "الحملة غير موجودة")}
        description={t(
          "This campaign may have been closed or renamed.",
          "ربما أُغلقت هذه الحملة أو أُعيدت تسميتها.",
        )}
      />
    );
  }

  const rows = db.campaignInfluencers.filter((r) => r.campaignId === campaign.id);
  const stats = campaignStats(campaign, rows);
  const health = campaignHealth(campaign, stats);
  const tasks = db.tasks.filter((x) => x.campaignId === campaign.id);
  const queue = db.queueItems.filter((q) => q.campaignId === campaign.id);
  const invoices = db.invoices.filter((i) => i.campaignId === campaign.id);
  const expenses = db.expenses.filter((e) => e.campaignId === campaign.id);
  const spend = expenses.reduce((s, e) => s + e.amount, 0);

  const advance = (id: string, stage: InfluencerStage) => {
    actions.moveInfluencer(id, stage);
    toast.success(t("Stage updated", "تم تحديث المرحلة"), { description: stage });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.name}
        subtitle={`${clientName(campaign.clientId)} · ${campaign.city} · ${entityName(campaign.entityId)} · ${shortDate(campaign.startDate)} → ${shortDate(campaign.endDate)}`}
        meta={[
          <HealthPill key="h" health={health.health} />,
          <StatusPill key="s" status={campaign.status} />,
          <Pill key="a" tone={campaign.clientApproval === "Approved" ? "success" : "warning"}>
            {t("Client approval", "موافقة العميل")}: {campaign.clientApproval}
          </Pill>,
          <Pill key="o" tone="brand">
            {t("Owner", "المسؤول")}: {userName(campaign.ownerId)}
          </Pill>,
          <Pill key="ops" tone="orange">
            {t("Ops", "العمليات")}: {userName(campaign.opsOwnerId)}
          </Pill>,
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link to="/campaigns/coverage">{t("Coverage queue", "طابور التغطية")}</Link>
          </Button>
        }
      />

      <Panel className={health.health === "green" ? "" : "border-danger/40"}>
        <div className="grid gap-3 md:grid-cols-3">
          <Field
            label={t("Root cause", "السبب الجذري")}
            value={<span className="font-medium">{health.rootCause}</span>}
          />
          <Field label={t("Business impact", "الأثر")} value={health.impact} />
          <Field
            label={t("Required action", "الإجراء المطلوب")}
            value={<span className="font-medium text-primary">{health.action}</span>}
          />
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label={t("Target creators", "العدد المستهدف")}
          value={String(campaign.targetInfluencers)}
          tone="brand"
        />
        <Stat label={t("Confirmed", "مؤكد")} value={String(stats.confirmed)} tone="success" />
        <Stat
          label={t("Remaining slots", "المتبقي")}
          value={String(stats.remaining)}
          tone={stats.remaining ? "orange" : "success"}
        />
        <Stat
          label={t("Missing coverage", "تغطية ناقصة")}
          value={String(stats.missingCoverage)}
          tone={stats.missingCoverage ? "danger" : "default"}
        />
        <Stat
          label={t("Budget vs spend", "الميزانية مقابل الصرف")}
          value={`${money(spend, campaign.currency)}`}
          hint={`${t("of", "من")} ${money(campaign.budget, campaign.currency)}`}
          tone={spend > campaign.budget ? "danger" : "default"}
        />
      </div>

      <Panel>
        <Section title={t("Delivery progress", "تقدم التنفيذ")}>
          <Bar
            value={stats.completed}
            max={campaign.targetInfluencers}
            tone={health.health === "green" ? "success" : "orange"}
          />
          <div className="num mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              {stats.identified} {t("identified", "محدد")}
            </span>
            <span>
              {stats.interested} {t("interested", "مهتم")}
            </span>
            <span>
              {stats.confirmed} {t("confirmed", "مؤكد")}
            </span>
            <span>
              {stats.submitted} {t("submitted to client", "مرسل للعميل")}
            </span>
            <span>
              {stats.approved} {t("client approved", "معتمد")}
            </span>
            <span>
              {stats.verified} {t("coverage verified", "تغطية موثقة")}
            </span>
            <span>
              {stats.completed} {t("completed", "مكتمل")}
            </span>
          </div>
        </Section>
      </Panel>

      <Tabs defaultValue="creators">
        <TabsList className="flex-wrap">
          <TabsTrigger value="creators">{t("Creator workflow", "مسار صناع المحتوى")}</TabsTrigger>
          <TabsTrigger value="brief">{t("Brief & requirements", "الملخص والمتطلبات")}</TabsTrigger>
          <TabsTrigger value="ops">{t("Operations", "العمليات")}</TabsTrigger>
          <TabsTrigger value="finance">{t("Finance", "المالية")}</TabsTrigger>
          <TabsTrigger value="history">{t("Stage history", "سجل المراحل")}</TabsTrigger>
        </TabsList>

        <TabsContent value="creators" className="mt-4 space-y-3">
          {rows.map((r) => {
            const idx = FLOW.indexOf(r.stage);
            const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
            const problem = [
              "Missing Posting Coverage",
              "Missed Visit",
              "Replacement Required",
              "No Response",
              "Rejected",
            ].includes(r.stage);
            return (
              <Panel key={r.id} className={problem ? "border-danger/40" : ""}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{influencerName(r.influencerId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Fee", "الأتعاب")} <span className="num">{money(r.fee, r.currency)}</span>
                      {r.visitDate ? ` · ${t("visit", "زيارة")} ${shortDate(r.visitDate)}` : ""}
                      {r.coverageDue
                        ? ` · ${t("coverage due", "التغطية مستحقة")} ${shortDate(r.coverageDue)}`
                        : ""}
                      {r.note ? ` · ${r.note}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={problem ? "danger" : r.stage === "Completed" ? "success" : "brand"}>
                      {r.stage}
                    </Pill>
                    {next && (
                      <Button size="sm" onClick={() => advance(r.id, next)}>
                        {t("Advance to", "تقدم إلى")} {next}
                      </Button>
                    )}
                    {problem && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => advance(r.id, "Replacement Required")}
                      >
                        {t("Request replacement", "طلب بديل")}
                      </Button>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
          {rows.length === 0 && (
            <EmptyState
              title={t("No creators yet", "لا يوجد صناع محتوى")}
              description={t(
                "Use Create → Influencer to add the first creator to this campaign.",
                "استخدم إنشاء ← صانع محتوى لإضافة أول صانع لهذه الحملة.",
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="brief" className="mt-4">
          <Panel>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t("Brief", "الملخص")} value={campaign.brief} />
              <Field
                label={t("Posting requirements", "متطلبات النشر")}
                value={campaign.postingRequirements}
              />
              <Field label={t("SLA", "المهلة")} value={`${campaign.slaHours}h`} />
              <Field
                label={t("Backup owner", "المسؤول البديل")}
                value={userName(campaign.backupOwnerId)}
              />
              <Field label={t("Next action", "الإجراء التالي")} value={campaign.nextAction} />
              <Field
                label={t("Budget", "الميزانية")}
                value={money(campaign.budget, campaign.currency)}
              />
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="ops" className="mt-4 grid gap-4 xl:grid-cols-2">
          <Panel>
            <Section title={t("Tasks", "المهام")}>
              <div className="space-y-2">
                {tasks.map((x) => (
                  <div
                    key={x.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{x.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {userName(x.ownerId)} · {shortDate(x.dueDate)}
                      </p>
                    </div>
                    <StatusPill status={x.status} />
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("No tasks linked.", "لا مهام مرتبطة.")}
                  </p>
                )}
              </div>
            </Section>
          </Panel>
          <Panel>
            <Section title={t("Queue items", "بنود الطابور")}>
              <div className="space-y-2">
                {queue.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{q.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.queue} · {userName(q.ownerId)} · SLA {shortDate(q.slaDeadline)}
                      </p>
                    </div>
                    <StatusPill status={q.status} />
                  </div>
                ))}
                {queue.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("No queue items linked.", "لا بنود طابور مرتبطة.")}
                  </p>
                )}
              </div>
            </Section>
          </Panel>
        </TabsContent>

        <TabsContent value="finance" className="mt-4 grid gap-4 xl:grid-cols-2">
          <Panel>
            <Section title={t("Invoices", "الفواتير")}>
              {invoices.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <span className="num text-sm font-medium">{i.number}</span>
                  <span className="num text-sm">{money(i.amount, i.currency)}</span>
                  <StatusPill status={i.status} />
                </div>
              ))}
              {invoices.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("Not invoiced yet.", "لم تُفوتر بعد.")}
                </p>
              )}
            </Section>
          </Panel>
          <Panel>
            <Section title={t("Campaign costs", "تكاليف الحملة")}>
              {expenses.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <span className="text-sm">{e.description}</span>
                  <span className="num text-sm">{money(e.amount, e.currency)}</span>
                  <StatusPill status={e.status} />
                </div>
              ))}
              {expenses.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("No costs booked.", "لا توجد تكاليف مسجلة.")}
                </p>
              )}
            </Section>
          </Panel>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Panel>
            <ol className="space-y-3">
              {rows
                .flatMap((r) =>
                  r.history.map((h, n) => ({
                    key: `${r.id}-${n}`,
                    who: influencerName(r.influencerId),
                    ...h,
                  })),
                )
                .sort((a, b) => (a.at < b.at ? 1 : -1))
                .map((h) => (
                  <li key={h.key} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">
                      {h.who} → {h.stage}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.at} · {userName(h.by)}
                    </p>
                  </li>
                ))}
            </ol>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/campaigns/$campaignId")({
  head: () => ({
    meta: [
      { title: "Campaign Detail | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Creator workflow, Posting Coverage status, brief, operations queue and campaign finance in one record.",
      },
      { property: "og:title", content: "Campaign Detail | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Creator workflow, coverage status, operations and finance for a single campaign.",
      },
    ],
  }),
  component: CampaignDetail,
});
