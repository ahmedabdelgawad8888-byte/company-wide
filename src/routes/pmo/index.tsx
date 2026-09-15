import { PmoEditor } from "@/features/pmo/editor";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, Panel, Section, Stat, StatusPill, Pill } from "@/components/kit";
import {
  BarChartCard,
  ChartRow,
  SeriesBarChartCard,
  TrendChartCard,
  ShareChartCard,
} from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TODAY } from "@/lib/data/seed";
import { buildOverview } from "@/features/pmo/analytics";

function PmoDashboard() {
  const { db } = useApp();
  const { t } = useLang();

  const o = useMemo(
    () =>
      buildOverview({
        requirements: db.pmoRequirements,
        stages: db.pmoE2EStages,
        milestones: db.pmoMilestones,
        raid: db.pmoRaidItems,
        questions: db.pmoQuestions,
        actions: db.pmoActions,
        planStart: db.pmoPlanConfig.planStartDate,
        today: TODAY,
      }),
    [db],
  );

  const pctDone = o.requirements ? Math.round((o.delivered / o.requirements) * 100) : 0;
  const p0Pct = o.p0 ? Math.round((o.p0Delivered / o.p0) * 100) : 0;

  return (
    <div className="space-y-6">
      <PmoEditor />
      <PageHeader
        title={t("Dev & Business Analysis", "التطوير وتحليل الأعمال")}
        subtitle={t(
          `${db.pmoPlanConfig.programDurationWeeks}-week programme from ${db.pmoPlanConfig.planStartDate} · ${o.requirements} requirements · ${o.effort} person-days.`,
          `برنامج من ${db.pmoPlanConfig.programDurationWeeks} أسبوع يبدأ ${db.pmoPlanConfig.planStartDate} · ${o.requirements} متطلب · ${o.effort} يوم عمل.`,
        )}
        meta={
          <>
            <Pill tone="brand">{t("Workbook baseline", "أساس الملف")}</Pill>
            <Pill tone="info">
              {t("Reference date", "تاريخ المرجع")}: {TODAY}
            </Pill>
          </>
        }
        actions={
          <Link
            to="/pmo/reports"
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            {t("Open reports", "فتح التقارير")}
          </Link>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label={t("Total requirements", "إجمالي المتطلبات")}
          value={String(o.requirements)}
          hint={`${o.effort} pd total`}
          tone="brand"
        />
        <Stat
          label={t("Delivered", "منجز")}
          value={String(o.delivered)}
          tone="success"
          hint={`${pctDone}% of scope`}
        />
        <Stat
          label={t("Blocked", "معطل")}
          value={String(o.blocked)}
          tone={o.blocked ? "danger" : "success"}
          hint={t("clarification needed", "يحتاج توضيح")}
        />
        <Stat
          label={t("High risks open", "مخاطر عالية مفتوحة")}
          value={String(o.risksHigh)}
          tone={o.risksHigh ? "warning" : "success"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label={t("P0 delivered", "P0 منجز")}
          value={`${o.p0Delivered}/${o.p0}`}
          tone={o.p0Delivered === o.p0 ? "success" : "warning"}
          hint={`${p0Pct}%`}
        />
        <Stat
          label={t("Owner roles", "أدوار المسؤولين")}
          value={String(o.ownerCount)}
          hint={`${o.moduleCount} modules`}
        />
        <Stat
          label={t("Open actions", "إجراءات مفتوحة")}
          value={String(o.actionsOpen)}
          tone="orange"
        />
        <Stat
          label={t("Open questions", "أسئلة مفتوحة")}
          value={String(o.questionsOpen)}
          tone="warning"
        />
      </div>

      {/* Programme progress */}
      <Panel className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{t("Overall progress", "التقدم العام")}</h3>
          <span className="text-lg font-bold">{pctDone}%</span>
        </div>
        <Progress value={pctDone} className="h-3" />
        <div className="mt-2 flex justify-between text-sm text-muted-foreground">
          <span>
            {o.deliveredEffort} pd {t("delivered", "منجز")} · {o.delivered}{" "}
            {t("requirements", "متطلب")}
          </span>
          <span>
            {o.effort - o.deliveredEffort} pd {t("remaining", "متبقي")}
          </span>
        </div>
      </Panel>

      {/* Register quick links */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            to: "/pmo/requirements",
            value: o.requirements,
            label: t("Requirements", "المتطلبات"),
            tone: "text-primary",
          },
          {
            to: "/pmo/raid",
            value: o.raid.length,
            label: t("RAID items", "سجل المخاطر"),
            tone: "text-red-600",
          },
          {
            to: "/pmo/actions",
            value: o.actionsOpen,
            label: t("Open actions", "إجراءات مفتوحة"),
            tone: "text-blue-600",
          },
          {
            to: "/pmo/questions",
            value: o.questionsOpen,
            label: t("Open questions", "أسئلة مفتوحة"),
            tone: "text-purple-600",
          },
        ].map((c) => (
          <Link key={c.to} to={c.to}>
            <Panel className="cursor-pointer p-4 transition-colors hover:bg-muted/50">
              <div className={`text-2xl font-bold ${c.tone}`}>{c.value}</div>
              <div className="text-sm text-muted-foreground">{c.label}</div>
            </Panel>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <ChartRow cols={2}>
        <SeriesBarChartCard
          title={t("Delivery S-curve (cumulative pd)", "منحنى التسليم التراكمي")}
          description={t(
            "Planned versus delivered effort by week",
            "الجهد المخطط مقابل المنجز أسبوعياً",
          )}
          data={o.cumulative.map((c) => ({
            name: c.week,
            planned: c.planned,
            delivered: c.delivered,
          }))}
          series={[
            { key: "planned", label: t("Planned", "مخطط") },
            { key: "delivered", label: t("Delivered", "منجز") },
          ]}
        />
        <TrendChartCard
          title={t("Weekly delivery load (pd)", "عبء التسليم الأسبوعي")}
          description={t("Effort due each week", "الجهد المستحق كل أسبوع")}
          data={o.weeklyLoad.map((w) => ({ name: w.week, value: w.effort }))}
        />
      </ChartRow>

      <ChartRow cols={3}>
        <BarChartCard
          title={t("By wave", "حسب الموجة")}
          data={o.waves.map((w) => ({ name: w.wave, value: w.effort }))}
          colorful
        />
        <BarChartCard
          title={t("By priority", "حسب الأولوية")}
          data={o.priorityMix.map((p) => ({ name: p.priority, value: p.count }))}
          colorful
        />
        <ShareChartCard
          title={t("Status mix", "توزيع الحالات")}
          data={o.statusMix.map((s) => ({ name: s.status, value: s.count }))}
        />
      </ChartRow>

      <ChartRow cols={2}>
        <BarChartCard
          title={t("Effort by owner role", "الجهد حسب دور المسؤول")}
          data={o.owners.map((r) => ({ name: r.owner, value: r.effort }))}
          horizontal
          colorful
        />
        <BarChartCard
          title={t("Effort by module", "الجهد حسب الوحدة")}
          data={o.modules.map((r) => ({ name: r.module, value: r.effort }))}
          horizontal
          colorful
        />
      </ChartRow>

      {/* Wave cards with progress */}
      <Section
        title={t("Waves", "الموجات")}
        description={t(
          "Delivery window and progress for each wave.",
          "نافذة التسليم والتقدم لكل موجة.",
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {o.waves.map((w) => (
            <Panel key={w.wave} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">{w.wave}</Badge>
                <span className="num text-xs text-muted-foreground">{w.effort} pd</span>
              </div>
              <div className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-medium">{w.name}</div>
              <div className="mt-3 flex items-center gap-2">
                <Progress value={pct(w.delivered, w.count)} className="h-2 flex-1" />
                <span className="num text-xs">
                  {w.delivered}/{w.count}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>
                  {w.start} → {w.finish}
                </span>
                <span>
                  {w.blocked > 0 ? `${w.blocked} blocked · ` : ""}
                  {w.weeks} wks
                </span>
              </div>
            </Panel>
          ))}
        </div>
      </Section>

      {/* Milestones */}
      <Section
        title={t("Milestones", "المراحل الرئيسية")}
        actions={
          <Link to="/pmo/milestones" className="text-sm text-primary hover:underline">
            {t("View all", "عرض الكل")}
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {o.milestones.map((m) => (
            <Panel key={m.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="font-mono">
                  {m.id}
                </Badge>
                <StatusPill status={m.status} />
              </div>
              <div className="mt-2 font-medium">{m.name}</div>
              <div className="num mt-1 text-xs text-muted-foreground">
                {m.forecastDate || "TBD"}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Progress value={m.progress} className="h-2 flex-1" />
                <span className="num text-xs">{m.progress}%</span>
              </div>
            </Panel>
          ))}
        </div>
      </Section>

      {/* Risk + governance */}
      <ChartRow cols={2}>
        <Panel className="p-4">
          <h3 className="mb-3 font-semibold">{t("Top open risks", "أبرز المخاطر المفتوحة")}</h3>
          <div className="space-y-2">
            {o.raid.slice(0, 5).map(({ item }) => (
              <Link
                key={item.id}
                to="/pmo/raid"
                className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50"
              >
                <span className="min-w-0">
                  <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
                  <span className="mt-0.5 block line-clamp-2">{item.description}</span>
                </span>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusPill status={item.type} />
                  <span className="text-[11px] text-muted-foreground">
                    {item.impact} / {item.likelihood}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel className="p-4">
          <h3 className="mb-3 font-semibold">
            {t("Upcoming gates & clarifications", "البوابات القادمة والتوضيحات")}
          </h3>
          <div className="space-y-2">
            {db.pmoMilestones.slice(0, 4).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <span>
                  <Badge variant="outline" className="me-2 font-mono">
                    {m.id}
                  </Badge>
                  {m.name}
                </span>
                <span className="num text-xs text-muted-foreground">{m.forecastDate || "TBD"}</span>
              </div>
            ))}
            {db.pmoQuestions.slice(0, 3).map((q) => (
              <Link
                key={q.id}
                to="/pmo/questions"
                className="block rounded-lg border p-3 text-sm hover:bg-muted/50"
              >
                <span className="font-mono text-xs text-muted-foreground">{q.id}</span>
                <span className="mt-0.5 block line-clamp-2">{q.question}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </ChartRow>
    </div>
  );
}

function pct(done: number, total: number) {
  return total ? Math.round((done / total) * 100) : 0;
}

export const Route = createFileRoute("/pmo/")({
  component: PmoDashboard,
});
