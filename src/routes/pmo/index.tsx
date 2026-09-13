import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Panel, Stat, StatusPill } from "@/components/kit";
import { BarChartCard } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { PmoWave } from "@/lib/types";

function PmoDashboard() {
  const { db } = useApp();
  const { t } = useLang();

  const { pmoRequirements, pmoMilestones, pmoRaidItems, pmoActions, pmoQuestions, pmoPlanConfig } =
    db;

  // Summary stats
  const totalReqs = pmoRequirements.length;
  const doneReqs = pmoRequirements.filter(
    (r) => r.pmoStatus === "Done" || r.pmoStatus === "Verify & Close",
  ).length;
  const inProgressReqs = pmoRequirements.filter((r) => r.pmoStatus === "In Progress").length;
  const blockedReqs = pmoRequirements.filter(
    (r) => r.pmoStatus === "Blocked - Clarification",
  ).length;

  const totalEffort = pmoRequirements.reduce((sum, r) => sum + r.effortDays, 0);
  const completedEffort = pmoRequirements
    .filter((r) => r.pmoStatus === "Done" || r.pmoStatus === "Verify & Close")
    .reduce((sum, r) => sum + r.effortDays, 0);

  // Requirements by wave
  const waves: PmoWave[] = ["W0", "W1", "W2", "W3", "W4", "W5", "W6"];
  const reqsByWave = waves.map((wave) => ({
    name: wave,
    value: pmoRequirements.filter((r) => r.wave === wave).length,
  }));

  // Requirements by module
  const modules = [...new Set(pmoRequirements.map((r) => r.module))];
  const reqsByModule = modules.slice(0, 8).map((mod) => ({
    name: mod,
    value: pmoRequirements.filter((r) => r.module === mod).length,
  }));

  // Requirements by priority
  const reqsByPriority = [
    { name: "P0", value: pmoRequirements.filter((r) => r.priority === "P0").length },
    { name: "P1", value: pmoRequirements.filter((r) => r.priority === "P1").length },
    { name: "P2", value: pmoRequirements.filter((r) => r.priority === "P2").length },
  ];

  // RAID summary
  const openRisks = pmoRaidItems.filter((r) => r.type === "Risk" && r.status === "Open").length;
  const openIssues = pmoRaidItems.filter((r) => r.type === "Issue" && r.status === "Open").length;
  const openActions = pmoActions.filter((a) => a.status === "Open").length;
  const openQuestions = pmoQuestions.filter((q) => q.status === "Open").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("PMO Dashboard", "لوحة مكتب إدارة المشاريع")}
        subtitle={t(
          `Program: ${pmoPlanConfig.programDurationWeeks} weeks starting ${pmoPlanConfig.planStartDate}`,
          `البرنامج: ${pmoPlanConfig.programDurationWeeks} أسبوع يبدأ ${pmoPlanConfig.planStartDate}`,
        )}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat
          label={t("Total Requirements", "إجمالي المتطلبات")}
          value={String(totalReqs)}
          hint={`${totalEffort} pd total`}
        />
        <Stat
          label={t("Completed", "مكتمل")}
          value={String(doneReqs)}
          tone="success"
          hint={`${Math.round((doneReqs / totalReqs) * 100)}%`}
        />
        <Stat
          label={t("In Progress", "قيد التنفيذ")}
          value={String(inProgressReqs)}
          tone="warning"
        />
        <Stat label={t("Blocked", "معطل")} value={String(blockedReqs)} tone="danger" />
      </div>

      {/* Progress Overview */}
      <Panel className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{t("Overall Progress", "التقدم العام")}</h3>
          <span className="text-lg font-bold">
            {Math.round((completedEffort / totalEffort) * 100)}%
          </span>
        </div>
        <Progress value={(completedEffort / totalEffort) * 100} className="h-3" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>
            {completedEffort} pd {t("completed", "مكتمل")}
          </span>
          <span>
            {totalEffort - completedEffort} pd {t("remaining", "متبقي")}
          </span>
        </div>
      </Panel>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/pmo/raid">
          <Panel className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="text-2xl font-bold text-red-600">{openRisks}</div>
            <div className="text-sm text-muted-foreground">{t("Open Risks", "مخاطر مفتوحة")}</div>
          </Panel>
        </Link>
        <Link to="/pmo/raid">
          <Panel className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="text-2xl font-bold text-amber-600">{openIssues}</div>
            <div className="text-sm text-muted-foreground">{t("Open Issues", "مشاكل مفتوحة")}</div>
          </Panel>
        </Link>
        <Link to="/pmo/actions">
          <Panel className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="text-2xl font-bold text-blue-600">{openActions}</div>
            <div className="text-sm text-muted-foreground">
              {t("Open Actions", "إجراءات مفتوحة")}
            </div>
          </Panel>
        </Link>
        <Link to="/pmo/questions">
          <Panel className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="text-2xl font-bold text-purple-600">{openQuestions}</div>
            <div className="text-sm text-muted-foreground">
              {t("Open Questions", "أسئلة مفتوحة")}
            </div>
          </Panel>
        </Link>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BarChartCard title={t("By Wave", "حسب الموجة")} data={reqsByWave} />
        <BarChartCard title={t("By Module", "حسب الوحدة")} data={reqsByModule} horizontal />
        <BarChartCard title={t("By Priority", "حسب الأولوية")} data={reqsByPriority} />
      </div>

      {/* Milestones */}
      <Panel className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{t("Milestones", "المراحل الرئيسية")}</h3>
          <Link to="/pmo/milestones" className="text-sm text-primary hover:underline">
            {t("View all", "عرض الكل")}
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pmoMilestones.slice(0, 6).map((m) => (
            <div key={m.id} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">{m.id}</Badge>
                <StatusPill status={m.status} />
              </div>
              <div className="font-medium text-sm">{m.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {m.forecastDate ? new Date(m.forecastDate).toLocaleDateString() : "TBD"}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export const Route = createFileRoute("/pmo/")({
  component: PmoDashboard,
});
