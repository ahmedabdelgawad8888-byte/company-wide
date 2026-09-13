import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel } from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PmoWave } from "@/lib/types";

function PmoTimeline() {
  const { db } = useApp();
  const { t } = useLang();
  const [waveFilter, setWaveFilter] = useState<string>("all");

  const { pmoPlanConfig, pmoRequirements, pmoMilestones } = db;
  const waves: PmoWave[] = ["W0", "W1", "W2", "W3", "W4", "W5", "W6"];

  // Calculate week spans for the timeline
  const startDate = new Date(pmoPlanConfig.planStartDate);
  const totalWeeks = pmoPlanConfig.programDurationWeeks;

  // Generate week labels
  const weekLabels = Array.from({ length: totalWeeks }, (_, i) => {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + i * 7);
    return {
      week: i + 1,
      date: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  });

  // Group requirements by wave
  const reqsByWave = waves.reduce(
    (acc, wave) => {
      acc[wave] = pmoRequirements.filter((r) => r.wave === wave);
      return acc;
    },
    {} as Record<PmoWave, typeof pmoRequirements>,
  );

  const weekOf = (date: string) =>
    Math.floor((Date.parse(date) - startDate.getTime()) / 604800000) + 1;
  const waveTimelines = Object.fromEntries(
    waves.map((wave) => [
      wave,
      {
        start: Math.min(...reqsByWave[wave].map((r) => weekOf(r.startDate!))),
        end: Math.max(...reqsByWave[wave].map((r) => weekOf(r.etaDate!))),
      },
    ]),
  ) as Record<PmoWave, { start: number; end: number }>;

  const waveColors: Record<PmoWave, string> = {
    W0: "bg-purple-500",
    W1: "bg-blue-500",
    W2: "bg-cyan-500",
    W3: "bg-green-500",
    W4: "bg-yellow-500",
    W5: "bg-orange-500",
    W6: "bg-red-500",
  };

  const filteredWaves = waveFilter === "all" ? waves : waves.filter((w) => w === waveFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Project Timeline", "الجدول الزمني للمشروع")}
        subtitle={t(
          `${totalWeeks} weeks starting ${startDate.toLocaleDateString()}`,
          `${totalWeeks} أسبوع يبدأ من ${startDate.toLocaleDateString("ar")}`,
        )}
      />

      {/* Filter */}
      <Panel className="p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">{t("Filter by Wave:", "تصفية حسب الموجة:")}</span>
          <Select value={waveFilter} onValueChange={setWaveFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Waves", "جميع الموجات")}</SelectItem>
              {waves.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Panel>

      {/* Timeline Grid */}
      <Panel className="p-4 overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Header - Week numbers */}
          <div className="flex border-b pb-2 mb-4">
            <div className="w-32 shrink-0 font-medium text-sm">{t("Wave", "الموجة")}</div>
            <div className="flex-1 flex">
              {weekLabels.map((wl) => (
                <div
                  key={wl.week}
                  className="flex-1 text-center text-xs text-muted-foreground"
                  style={{ minWidth: "32px" }}
                >
                  <div className="font-medium">W{wl.week}</div>
                  <div className="text-[10px]">{wl.date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones row */}
          <div className="flex mb-6 pb-4 border-b">
            <div className="w-32 shrink-0 font-medium text-sm flex items-center">
              {t("Milestones", "المراحل")}
            </div>
            <div className="flex-1 relative h-8">
              {pmoMilestones.map((m) => {
                // Calculate position based on days from kickoff
                const daysFromKickoff = m.daysFromKickoff ?? 0;
                const weekPos = Math.floor(daysFromKickoff / 7) + 1;
                const leftPercent = ((weekPos - 1) / totalWeeks) * 100;

                return (
                  <div
                    key={m.id}
                    className="absolute top-0 transform -translate-x-1/2"
                    style={{ left: `${Math.min(leftPercent, 95)}%` }}
                    title={`${m.id}: ${m.name}`}
                  >
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent border-t-primary" />
                    <div className="text-[10px] font-medium mt-1 whitespace-nowrap">{m.id}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wave rows */}
          {filteredWaves.map((wave) => {
            const timeline = waveTimelines[wave];
            const reqs = reqsByWave[wave];
            const doneCount = reqs.filter(
              (r) => r.pmoStatus === "Done" || r.pmoStatus === "Verify & Close",
            ).length;
            const progress = reqs.length > 0 ? Math.round((doneCount / reqs.length) * 100) : 0;

            return (
              <div key={wave} className="flex mb-3">
                <div className="w-32 shrink-0 flex items-center gap-2">
                  <Badge variant="secondary" className={`${waveColors[wave]} text-white`}>
                    {wave}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {reqs.length} {t("reqs", "متطلب")}
                  </span>
                </div>
                <div className="flex-1 relative h-8 bg-muted/30 rounded">
                  {/* Wave bar */}
                  <div
                    className={`absolute top-1 bottom-1 ${waveColors[wave]} rounded opacity-80`}
                    style={{
                      left: `${((timeline.start - 1) / totalWeeks) * 100}%`,
                      width: `${((timeline.end - timeline.start + 1) / totalWeeks) * 100}%`,
                    }}
                  >
                    {/* Progress overlay */}
                    <div
                      className="absolute inset-y-0 left-0 bg-white/30 rounded-l"
                      style={{ width: `${progress}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                      {progress}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Wave Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredWaves.map((wave) => {
          const reqs = reqsByWave[wave];
          const totalEffort = reqs.reduce((sum, r) => sum + r.effortDays, 0);
          const doneCount = reqs.filter(
            (r) => r.pmoStatus === "Done" || r.pmoStatus === "Verify & Close",
          ).length;
          const inProgressCount = reqs.filter((r) => r.pmoStatus === "In Progress").length;
          const blockedCount = reqs.filter((r) => r.pmoStatus === "Blocked - Clarification").length;

          return (
            <Panel key={wave} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className={`${waveColors[wave]} text-white`}>
                  {wave}
                </Badge>
                <span className="text-sm font-medium">{totalEffort} pd</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Total", "الإجمالي")}</span>
                  <span>{reqs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">{t("Done", "مكتمل")}</span>
                  <span>{doneCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-600">{t("In Progress", "قيد التنفيذ")}</span>
                  <span>{inProgressCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">{t("Blocked", "معطل")}</span>
                  <span>{blockedCount}</span>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/pmo/timeline")({
  component: PmoTimeline,
});
