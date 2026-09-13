import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { PmoOwnerRole, PmoWave } from "@/lib/types";

function PmoCapacity() {
  const { db } = useApp();
  const { t } = useLang();

  const { pmoRequirements, pmoPlanConfig } = db;

  const waves: PmoWave[] = ["W0", "W1", "W2", "W3", "W4", "W5", "W6"];

  // Derive the owner-role list from the workbook so a new role is never dropped.
  const roles: PmoOwnerRole[] = [...new Set(pmoRequirements.map((r) => r.ownerRole))];

  // Calculate effort by role
  const effortByRole = roles.map((role) => {
    const roleReqs = pmoRequirements.filter((r) => r.ownerRole === role);
    const totalEffort = roleReqs.reduce((sum, r) => sum + r.effortDays, 0);
    const completedEffort = roleReqs
      .filter((r) => r.pmoStatus === "Done" || r.pmoStatus === "Verify & Close")
      .reduce((sum, r) => sum + r.effortDays, 0);
    const inProgressEffort = roleReqs
      .filter((r) => r.pmoStatus === "In Progress")
      .reduce((sum, r) => sum + r.effortDays, 0);

    return {
      role,
      total: totalEffort,
      completed: completedEffort,
      inProgress: inProgressEffort,
      remaining: totalEffort - completedEffort - inProgressEffort,
      reqCount: roleReqs.length,
    };
  });

  // Calculate effort by wave
  const effortByWave = waves.map((wave) => {
    const waveReqs = pmoRequirements.filter((r) => r.wave === wave);
    const totalEffort = waveReqs.reduce((sum, r) => sum + r.effortDays, 0);
    const completedEffort = waveReqs
      .filter((r) => r.pmoStatus === "Done" || r.pmoStatus === "Verify & Close")
      .reduce((sum, r) => sum + r.effortDays, 0);

    return {
      wave,
      total: totalEffort,
      completed: completedEffort,
      progress: totalEffort > 0 ? Math.round((completedEffort / totalEffort) * 100) : 0,
      reqCount: waveReqs.length,
    };
  });

  // Total summary
  const totalEffort = pmoRequirements.reduce((sum, r) => sum + r.effortDays, 0);
  const completedEffort = pmoRequirements
    .filter((r) => r.pmoStatus === "Done" || r.pmoStatus === "Verify & Close")
    .reduce((sum, r) => sum + r.effortDays, 0);

  // Role colors
  const roleColors: Record<PmoOwnerRole, string> = {
    "Product/BA": "bg-purple-500",
    "UI/UX": "bg-pink-500",
    Backend: "bg-blue-500",
    Frontend: "bg-cyan-500",
    "Full-stack": "bg-indigo-500",
    "Data/BI": "bg-green-500",
    DevOps: "bg-orange-500",
    QA: "bg-yellow-500",
    Ops: "bg-gray-500",
    Management: "bg-red-500",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Capacity & Workload", "القدرة وتوزيع العمل")}
        subtitle={t(`${totalEffort} person-days total effort`, `${totalEffort} يوم عمل إجمالي`)}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Panel className="p-4">
          <div className="text-sm text-muted-foreground mb-1">
            {t("Total Effort", "إجمالي الجهد")}
          </div>
          <div className="text-3xl font-bold">{totalEffort} pd</div>
          <div className="text-sm text-muted-foreground mt-1">
            {pmoRequirements.length} {t("requirements", "متطلب")}
          </div>
        </Panel>
        <Panel className="p-4">
          <div className="text-sm text-muted-foreground mb-1">{t("Completed", "مكتمل")}</div>
          <div className="text-3xl font-bold text-green-600">{completedEffort} pd</div>
          <div className="text-sm text-muted-foreground mt-1">
            {Math.round((completedEffort / totalEffort) * 100)}% {t("done", "منجز")}
          </div>
        </Panel>
        <Panel className="p-4">
          <div className="text-sm text-muted-foreground mb-1">{t("Remaining", "متبقي")}</div>
          <div className="text-3xl font-bold text-amber-600">
            {totalEffort - completedEffort} pd
          </div>
        </Panel>
        <Panel className="p-4">
          <div className="text-sm text-muted-foreground mb-1">{t("Duration", "المدة")}</div>
          <div className="text-3xl font-bold">{pmoPlanConfig.programDurationWeeks} wks</div>
          <div className="text-sm text-muted-foreground mt-1">
            {t("Starting", "يبدأ")} {new Date(pmoPlanConfig.planStartDate).toLocaleDateString()}
          </div>
        </Panel>
      </div>

      {/* Effort by Wave */}
      <Panel className="p-4">
        <h3 className="font-semibold mb-4">{t("Effort by Wave", "الجهد حسب الموجة")}</h3>
        <div className="space-y-4">
          {effortByWave.map((item) => (
            <div key={item.wave} className="flex items-center gap-4">
              <div className="w-12 shrink-0">
                <Badge variant="secondary">{item.wave}</Badge>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Progress value={item.progress} className="flex-1 h-3" />
                  <span className="text-sm font-medium w-12">{item.progress}%</span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{item.reqCount} reqs</span>
                  <span>{item.total} pd total</span>
                  <span className="text-green-600">{item.completed} pd done</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Effort by Role */}
      <Panel className="p-4">
        <h3 className="font-semibold mb-4">{t("Workload by Role", "توزيع العمل حسب الدور")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {effortByRole
            .filter((item) => item.total > 0)
            .sort((a, b) => b.total - a.total)
            .map((item) => {
              const completedPercent = item.total > 0 ? (item.completed / item.total) * 100 : 0;
              const inProgressPercent = item.total > 0 ? (item.inProgress / item.total) * 100 : 0;

              return (
                <div key={item.role} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${roleColors[item.role]}`} />
                      <span className="font-medium">{item.role}</span>
                    </div>
                    <span className="text-sm font-medium">{item.total} pd</span>
                  </div>

                  {/* Stacked progress bar */}
                  <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                    <div
                      className="bg-green-500 h-full"
                      style={{ width: `${completedPercent}%` }}
                    />
                    <div
                      className="bg-amber-500 h-full"
                      style={{ width: `${inProgressPercent}%` }}
                    />
                  </div>

                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="text-muted-foreground">{item.reqCount} reqs</span>
                    <span className="text-green-600">{item.completed} pd done</span>
                    <span className="text-amber-600">{item.inProgress} pd WIP</span>
                    <span className="text-gray-500">{item.remaining} pd left</span>
                  </div>
                </div>
              );
            })}
        </div>
      </Panel>

      {/* Capacity Planning Matrix */}
      <Panel className="p-4 overflow-x-auto">
        <h3 className="font-semibold mb-4">
          {t("Wave × Role Matrix (Person-Days)", "مصفوفة الموجة × الدور")}
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left font-medium">{t("Role", "الدور")}</th>
              {waves.map((wave) => (
                <th key={wave} className="p-2 text-center font-medium">
                  {wave}
                </th>
              ))}
              <th className="p-2 text-center font-medium bg-muted">{t("Total", "الإجمالي")}</th>
            </tr>
          </thead>
          <tbody>
            {roles
              .filter((role) => (effortByRole.find((e) => e.role === role)?.total ?? 0) > 0)
              .map((role) => {
                const roleTotal = effortByRole.find((e) => e.role === role)?.total ?? 0;
                return (
                  <tr key={role} className="border-b">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${roleColors[role]}`} />
                        {role}
                      </div>
                    </td>
                    {waves.map((wave) => {
                      const effort = pmoRequirements
                        .filter((r) => r.wave === wave && r.ownerRole === role)
                        .reduce((sum, r) => sum + r.effortDays, 0);
                      return (
                        <td key={wave} className="p-2 text-center">
                          {effort > 0 ? effort : "-"}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-medium bg-muted">{roleTotal}</td>
                  </tr>
                );
              })}
            <tr className="bg-muted font-medium">
              <td className="p-2">{t("Total", "الإجمالي")}</td>
              {waves.map((wave) => {
                const waveTotal = effortByWave.find((e) => e.wave === wave)?.total ?? 0;
                return (
                  <td key={wave} className="p-2 text-center">
                    {waveTotal}
                  </td>
                );
              })}
              <td className="p-2 text-center">{totalEffort}</td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

export const Route = createFileRoute("/pmo/capacity")({
  component: PmoCapacity,
});
