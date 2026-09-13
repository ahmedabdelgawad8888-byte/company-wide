import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Panel, Section, Stat, StatusPill, Pill } from "@/components/kit";
import {
  BarChartCard,
  ChartRow,
  SeriesBarChartCard,
  TrendChartCard,
  ShareChartCard,
} from "@/components/charts";
import { DataTable, type Column } from "@/components/data-table";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TODAY } from "@/lib/data/seed";
import {
  buildOverview,
  type OwnerSummary,
  type ModuleSummary,
  type WaveSummary,
} from "@/features/pmo/analytics";
import { groupRequirements } from "@/features/pmo/deliverables";
import type { PmoRequirement, PmoWave } from "@/lib/types";

function pct(done: number, total: number) {
  return total ? Math.round((done / total) * 100) : 0;
}

function PmoReports() {
  const { db } = useApp();
  const { t } = useLang();
  const [waveFilter, setWaveFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");

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

  const filtered = useMemo(
    () =>
      db.pmoRequirements.filter(
        (r) =>
          (waveFilter === "all" || r.wave === waveFilter) &&
          (ownerFilter === "all" || r.ownerRole === ownerFilter),
      ),
    [db.pmoRequirements, waveFilter, ownerFilter],
  );

  const filteredEffort = filtered.reduce((n, r) => n + r.effortDays, 0);
  const filteredDelivered = filtered.filter((r) =>
    ["Verify & Close", "Done"].includes(r.pmoStatus),
  ).length;

  const waves: PmoWave[] = ["W0", "W1", "W2", "W3", "W4", "W5", "W6"];
  const ownerRoles = [...new Set(db.pmoRequirements.map((r) => r.ownerRole))].sort();

  const moduleDeliverables = groupRequirements(
    filtered,
    o.modules.map((m) => ({ key: m.module, label: m.module, labelAr: m.moduleAr })),
    (r, g) => r.module === g.key,
  ).sort((a, b) => b.total - a.total);

  const waveCols: Column<WaveSummary & { id: string }>[] = [
    {
      key: "wave",
      header: t("Wave", "الموجة"),
      render: (r) => (
        <div>
          <Badge variant="secondary">{r.wave}</Badge>
          <div className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">{r.name}</div>
        </div>
      ),
      sortValue: (r) => r.wave,
    },
    {
      key: "count",
      header: t("Reqs", "المتطلبات"),
      render: (r) => <span className="num">{r.count}</span>,
      sortValue: (r) => r.count,
    },
    {
      key: "effort",
      header: t("Effort (pd)", "الجهد"),
      render: (r) => <span className="num">{r.effort}</span>,
      sortValue: (r) => r.effort,
    },
    {
      key: "delivered",
      header: t("Delivered", "منجز"),
      render: (r) => (
        <div className="flex items-center gap-2">
          <Progress value={pct(r.delivered, r.count)} className="h-2 w-16" />
          <span className="num text-xs">
            {r.delivered}/{r.count}
          </span>
        </div>
      ),
      sortValue: (r) => r.delivered,
    },
    {
      key: "blocked",
      header: t("Blocked", "معطل"),
      render: (r) => <span className={`num ${r.blocked ? "text-danger" : ""}`}>{r.blocked}</span>,
      sortValue: (r) => r.blocked,
    },
    {
      key: "p0",
      header: "P0",
      render: (r) => <span className="num">{r.p0}</span>,
      sortValue: (r) => r.p0,
    },
    {
      key: "weeks",
      header: t("Window (wks)", "المدة"),
      render: (r) => <span className="num">{r.weeks}</span>,
      sortValue: (r) => r.weeks,
    },
  ];

  const ownerCols: Column<OwnerSummary & { id: string }>[] = [
    {
      key: "owner",
      header: t("Owner role", "دور المسؤول"),
      render: (r) => <span className="font-medium">{r.owner}</span>,
      sortValue: (r) => r.owner,
    },
    {
      key: "count",
      header: t("Reqs", "المتطلبات"),
      render: (r) => <span className="num">{r.count}</span>,
      sortValue: (r) => r.count,
    },
    {
      key: "effort",
      header: t("Effort (pd)", "الجهد"),
      render: (r) => <span className="num">{r.effort}</span>,
      sortValue: (r) => r.effort,
    },
    {
      key: "p0",
      header: "P0",
      render: (r) => <span className="num">{r.p0}</span>,
      sortValue: (r) => r.p0,
    },
    {
      key: "p1",
      header: "P1",
      render: (r) => <span className="num">{r.p1}</span>,
      sortValue: (r) => r.p1,
    },
    {
      key: "p2",
      header: "P2",
      render: (r) => <span className="num">{r.p2}</span>,
      sortValue: (r) => r.p2,
    },
    {
      key: "waves",
      header: t("Waves touched", "الموجات"),
      render: (r) => <span className="num">{r.waves}</span>,
      sortValue: (r) => r.waves,
    },
    {
      key: "delivered",
      header: t("Delivered", "منجز"),
      render: (r) => <span className="num">{r.delivered}</span>,
      sortValue: (r) => r.delivered,
    },
    {
      key: "blocked",
      header: t("Blocked", "معطل"),
      render: (r) => <span className={`num ${r.blocked ? "text-danger" : ""}`}>{r.blocked}</span>,
      sortValue: (r) => r.blocked,
    },
  ];

  const moduleCols: Column<ModuleSummary & { id: string }>[] = [
    {
      key: "module",
      header: t("Module", "الوحدة"),
      render: (r) => (
        <div>
          <Badge variant="outline">{r.module}</Badge>
          <div className="mt-1 text-xs text-muted-foreground">{r.moduleAr}</div>
        </div>
      ),
      sortValue: (r) => r.module,
    },
    {
      key: "count",
      header: t("Reqs", "المتطلبات"),
      render: (r) => <span className="num">{r.count}</span>,
      sortValue: (r) => r.count,
    },
    {
      key: "effort",
      header: t("Effort (pd)", "الجهد"),
      render: (r) => <span className="num">{r.effort}</span>,
      sortValue: (r) => r.effort,
    },
    {
      key: "p0",
      header: "P0",
      render: (r) => <span className="num">{r.p0}</span>,
      sortValue: (r) => r.p0,
    },
    {
      key: "delivered",
      header: t("Delivered", "منجز"),
      render: (r) => <span className="num">{r.delivered}</span>,
      sortValue: (r) => r.delivered,
    },
    {
      key: "blocked",
      header: t("Blocked", "معطل"),
      render: (r) => <span className={`num ${r.blocked ? "text-danger" : ""}`}>{r.blocked}</span>,
      sortValue: (r) => r.blocked,
    },
  ];

  const deliverableCols: Column<(typeof moduleDeliverables)[number] & { id: string }>[] = [
    {
      key: "module",
      header: t("Module", "الوحدة"),
      render: (r) => (
        <div className="font-medium">
          {r.key}
          <div className="text-xs text-muted-foreground">{r.labelAr}</div>
        </div>
      ),
      sortValue: (r) => r.key,
    },
    {
      key: "progress",
      header: t("Delivered", "منجز"),
      render: (r) => (
        <div className="flex items-center gap-2">
          <Progress value={r.percent} className="h-2 w-20" />
          <span className="num text-xs">{r.percent}%</span>
        </div>
      ),
      sortValue: (r) => r.percent,
    },
    {
      key: "total",
      header: t("Total", "الإجمالي"),
      render: (r) => <span className="num">{r.total}</span>,
      sortValue: (r) => r.total,
    },
    {
      key: "delivered",
      header: t("Shipped", "مسلّم"),
      render: (r) => <span className="num text-success">{r.delivered}</span>,
      sortValue: (r) => r.delivered,
    },
    {
      key: "remaining",
      header: t("Remaining pd", "جهد متبقٍ"),
      render: (r) => <span className="num">{r.effortRemaining}</span>,
      sortValue: (r) => r.effortRemaining,
    },
    {
      key: "p0Remaining",
      header: t("P0 remaining", "P0 متبقٍ"),
      render: (r) => (
        <span className={`num ${r.p0Remaining ? "text-danger" : ""}`}>{r.p0Remaining}</span>
      ),
      sortValue: (r) => r.p0Remaining,
    },
    {
      key: "blocked",
      header: t("Blocked", "معطل"),
      render: (r) => <span className={`num ${r.blocked ? "text-danger" : ""}`}>{r.blocked}</span>,
      sortValue: (r) => r.blocked,
    },
  ];

  const reqCols: Column<PmoRequirement>[] = [
    {
      key: "id",
      header: t("ID", "المعرف"),
      render: (r) => <span className="font-mono text-xs">{r.id}</span>,
      sortValue: (r) => r.id,
    },
    {
      key: "title",
      header: t("Requirement", "المتطلب"),
      render: (r) => (
        <div className="max-w-xs">
          <div className="truncate font-medium">{r.title}</div>
          <div className="text-xs text-muted-foreground">
            {r.module} · {r.ownerRole}
          </div>
        </div>
      ),
      sortValue: (r) => r.title,
    },
    {
      key: "wave",
      header: t("Wave", "الموجة"),
      render: (r) => <Badge variant="secondary">{r.wave}</Badge>,
      sortValue: (r) => r.wave,
    },
    {
      key: "etaWeek",
      header: t("ETA week", "أسبوع التسليم"),
      render: (r) => <span className="num text-xs">{r.etaWeek}</span>,
      sortValue: (r) => r.etaWeek ?? "",
    },
    {
      key: "eta",
      header: t("ETA", "التسليم"),
      render: (r) => <span className="num text-xs">{r.etaDate}</span>,
      sortValue: (r) => r.etaDate ?? "",
    },
    {
      key: "priority",
      header: t("Priority", "الأولوية"),
      render: (r) => (
        <Badge
          variant={
            r.priority === "P0" ? "destructive" : r.priority === "P1" ? "default" : "secondary"
          }
        >
          {r.priority}
        </Badge>
      ),
      sortValue: (r) => r.priority,
    },
    {
      key: "status",
      header: t("Status", "الحالة"),
      render: (r) => <StatusPill status={r.pmoStatus} />,
      sortValue: (r) => r.pmoStatus,
    },
    {
      key: "effort",
      header: t("Effort", "الجهد"),
      render: (r) => <span className="num">{r.effortDays} pd</span>,
      sortValue: (r) => r.effortDays,
    },
    {
      key: "progress",
      header: t("Progress", "التقدم"),
      render: (r) => <span className="num">{r.percentDone}%</span>,
      sortValue: (r) => r.percentDone,
    },
  ];

  const cumulativeSeries = o.cumulative.map((c) => ({
    name: c.week,
    planned: c.planned,
    delivered: c.delivered,
  }));
  const statusRows = o.statusMix.map((s) => ({ name: s.status, value: s.count }));
  const priorityRows = o.priorityMix.map((p) => ({ name: p.priority, value: p.count }));
  const raidBySeverity = ["High", "Medium", "Low"].map((sev) => ({
    name: sev,
    value: o.raid.filter((r) => r.item.severity === sev).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Dev & Business Analysis Reports", "تقارير التطوير وتحليل الأعمال")}
        subtitle={t(
          `${o.requirements} requirements · ${o.effort} person-days · ${o.waves.length} waves · ${o.ownerCount} owner roles, derived from the workbook baseline.`,
          `${o.requirements} متطلب · ${o.effort} يوم عمل · ${o.waves.length} موجات · ${o.owners} أدوار مسؤول، مستخرجة من أساس الملف.`,
        )}
        meta={
          <>
            <Pill tone="brand">
              {t("Baseline", "الأساس")}: {db.pmoPlanConfig.planStartDate}
            </Pill>
            <Pill tone="info">
              {t("Reference date", "تاريخ المرجع")}: {TODAY}
            </Pill>
          </>
        }
      />

      {/* Headline KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Total requirements", "إجمالي المتطلبات")}
          value={String(o.requirements)}
          hint={`${o.effort} pd`}
          tone="brand"
        />
        <Stat
          label={t("Delivered", "منجز")}
          value={String(o.delivered)}
          hint={`${pct(o.delivered, o.requirements)}% · ${o.deliveredEffort} pd`}
          tone="success"
        />
        <Stat
          label={t("Blocked", "معطل")}
          value={String(o.blocked)}
          hint={t("needs clarification", "يحتاج توضيح")}
          tone={o.blocked ? "danger" : "success"}
        />
        <Stat
          label={t("High risks open", "مخاطر عالية مفتوحة")}
          value={String(o.risksHigh)}
          hint={`${o.actionsOpen} actions · ${o.questionsOpen} questions`}
          tone={o.risksHigh ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("P0 delivered", "P0 منجز")}
          value={`${o.p0Delivered}/${o.p0}`}
          tone={o.p0Delivered === o.p0 ? "success" : "warning"}
        />
        <Stat
          label={t("Overdue vs plan", "متأخر عن الخطة")}
          value={String(o.health.overdue.length)}
          tone={o.health.overdue.length ? "danger" : "success"}
        />
        <Stat
          label={t("Due in 14 days", "مستحق خلال ١٤ يوم")}
          value={String(o.health.dueSoon.length)}
          tone="warning"
        />
        <Stat
          label={t("Open clarifications", "توضيحات مفتوحة")}
          value={String(o.questionsOpen)}
          tone={o.questionsOpen ? "warning" : "success"}
        />
      </div>

      {/* Portfolio curve and mix */}
      <ChartRow cols={2}>
        <SeriesBarChartCard
          title={t("Delivery S-curve (cumulative pd)", "منحنى التسليم التراكمي")}
          description={t(
            "Planned versus delivered effort by ETA week",
            "الجهد المخطط مقابل المنجز حسب أسبوع التسليم",
          )}
          data={cumulativeSeries}
          series={[
            { key: "planned", label: t("Planned", "مخطط") },
            { key: "delivered", label: t("Delivered", "منجز") },
          ]}
        />
        <TrendChartCard
          title={t("Weekly delivery load (pd)", "عبء التسليم الأسبوعي")}
          description={t(
            "Effort due each week across the programme",
            "الجهد المستحق كل أسبوع خلال البرنامج",
          )}
          data={o.weeklyLoad.map((w) => ({ name: w.week, value: w.effort }))}
        />
      </ChartRow>

      <ChartRow cols={2}>
        <ShareChartCard title={t("Status mix", "توزيع الحالات")} data={statusRows} />
        <BarChartCard title={t("Priority mix", "توزيع الأولويات")} data={priorityRows} colorful />
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

      <ChartRow cols={2}>
        <ShareChartCard
          title={t("RAID by severity", "سجل المخاطر حسب الخطورة")}
          data={raidBySeverity}
        />
        <BarChartCard
          title={t("Blocked requirements by module", "المتطلبات المعطلة حسب الوحدة")}
          data={o.modules
            .filter((m) => m.blocked > 0)
            .map((m) => ({ name: m.module, value: m.blocked }))}
          horizontal
          colorful
        />
      </ChartRow>

      {/* Wave register */}
      <Section
        title={t("Wave performance register", "سجل أداء الموجات")}
        description={t(
          "Effort, delivery and blockage for each workbook wave.",
          "الجهد والتسليم والتعطل لكل موجة في الملف.",
        )}
      >
        <DataTable
          rows={o.waves.map((w) => ({ ...w, id: w.wave }))}
          columns={waveCols}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.wave} ${r.name}`}
          exportName="trygc-pmo-waves"
          pageSize={8}
        />
      </Section>

      {/* Milestone burn-down */}
      <Section
        title={t("Milestone forecast", "توقعات المراحل")}
        description={t(
          "Gate dates from the workbook against wave delivery.",
          "تواريخ البوابات من الملف مقابل تسليم الموجات.",
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {o.milestones.map((m) => (
            <Panel key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {m.id}
                    </Badge>
                    <Badge variant="secondary">{m.wave}</Badge>
                  </div>
                  <div className="mt-2 font-medium">{m.name}</div>
                </div>
                <StatusPill status={m.status} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Progress value={m.progress} className="h-2 flex-1" />
                <span className="num text-xs">{m.progress}%</span>
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>
                  {t("Forecast", "التوقع")}: {m.forecastDate || "TBD"}
                </span>
                <span>
                  {m.waveDelivered}/{m.waveTotal} · {m.daysFromStart}d
                </span>
              </div>
            </Panel>
          ))}
        </div>
      </Section>

      {/* Module register */}
      <Section
        title={t("Module register", "سجل الوحدات")}
        description={t("Effort and delivery by product module.", "الجهد والتسليم حسب وحدة المنتج.")}
      >
        <DataTable
          rows={o.modules.map((m) => ({ ...m, id: m.module }))}
          columns={moduleCols}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.module} ${r.moduleAr}`}
          exportName="trygc-pmo-modules"
          pageSize={10}
        />
      </Section>

      {/* Owner register */}
      <Section
        title={t("Owner workload register", "سجل أحمال المسؤولين")}
        description={t(
          "Effort and priority load per owner role from the sheet.",
          "الجهد والأولوية لكل دور مسؤول من الملف.",
        )}
      >
        <DataTable
          rows={o.owners.map((x) => ({ ...x, id: x.owner }))}
          columns={ownerCols}
          rowKey={(r) => r.id}
          searchable={(r) => r.owner}
          exportName="trygc-pmo-owners"
          pageSize={10}
        />
      </Section>

      {/* Deliverables tracker */}
      <Section
        title={t("Deliverables tracker", "متتبع التسليمات")}
        description={t("Shipped versus remaining per module.", "المسلّم مقابل المتبقي لكل وحدة.")}
      >
        <DataTable
          rows={moduleDeliverables.map((d) => ({ ...d, id: d.key }))}
          columns={deliverableCols}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.key} ${r.labelAr ?? ""}`}
          exportName="trygc-pmo-deliverables"
          pageSize={10}
        />
      </Section>

      {/* Requirement explorer */}
      <Section
        title={t("Requirement explorer", "مستكشف المتطلبات")}
        description={t(
          `${filtered.length} of ${db.pmoRequirements.length} requirements · ${filteredEffort} pd · ${filteredDelivered} delivered.`,
          `${filtered.length} من ${db.pmoRequirements.length} متطلب · ${filteredEffort} يوم · ${filteredDelivered} منجز.`,
        )}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={waveFilter} onValueChange={setWaveFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("Wave", "الموجة")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All waves", "كل الموجات")}</SelectItem>
                {waves.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("Owner", "المسؤول")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All owners", "كل المسؤولين")}</SelectItem>
                {ownerRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(waveFilter !== "all" || ownerFilter !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setWaveFilter("all");
                  setOwnerFilter("all");
                }}
              >
                {t("Clear", "مسح")}
              </Button>
            )}
          </div>
        }
      >
        <DataTable
          rows={filtered}
          columns={reqCols}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.id} ${r.title} ${r.module} ${r.ownerRole} ${r.e2eStage}`}
          exportName="trygc-pmo-requirements"
          pageSize={15}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/pmo/reports")({
  head: () => ({
    meta: [
      { title: "Dev & Business Analysis Reports | TryGC" },
      {
        name: "description",
        content: "Workbook-derived reporting for the Dev & Business Analysis workspace.",
      },
    ],
  }),
  component: PmoReports,
});
