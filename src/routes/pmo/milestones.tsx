import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Panel, Stat, StatusPill } from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TODAY } from "@/lib/data/seed";
import { milestoneForecast, type MilestoneForecast } from "@/features/pmo/analytics";

function PmoMilestones() {
  const { db } = useApp();
  const { t } = useLang();
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneForecast | null>(null);

  const { pmoMilestones, pmoRequirements, pmoPlanConfig } = db;

  const milestones = useMemo(
    () => milestoneForecast(pmoMilestones, pmoRequirements, pmoPlanConfig.planStartDate),
    [pmoMilestones, pmoRequirements, pmoPlanConfig.planStartDate],
  );

  const gatesPassed = milestones.filter((m) => m.progress === 100).length;
  const nextGate = milestones.find((m) => m.progress < 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Milestones", "المراحل الرئيسية")}
        subtitle={t(
          `${milestones.length} gates with workbook forecast dates from ${pmoPlanConfig.planStartDate}.`,
          `${milestones.length} بوابة بتواريخ متوقعة من الملف ابتداءً من ${pmoPlanConfig.planStartDate}.`,
        )}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("Gates", "البوابات")} value={String(milestones.length)} tone="brand" />
        <Stat
          label={t("Wave complete", "موجات مكتملة")}
          value={String(gatesPassed)}
          tone="success"
        />
        <Stat
          label={t("Next gate", "البوابة القادمة")}
          value={nextGate?.id ?? "—"}
          hint={nextGate?.forecastDate ?? ""}
          tone="warning"
        />
        <Stat
          label={t("Days to next gate", "أيام للبوابة القادمة")}
          value={nextGate ? String(Math.max(0, nextGate.daysFromStart)) : "—"}
          hint={TODAY}
        />
      </div>

      {/* Milestones Timeline View */}
      <Panel className="p-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          {/* Milestone items */}
          <div className="space-y-8">
            {milestones.map((milestone) => {
              const progress = {
                total: milestone.waveTotal,
                done: milestone.waveDelivered,
                progress: milestone.progress,
              };

              return (
                <div
                  key={milestone.id}
                  className="relative pl-16 cursor-pointer group"
                  onClick={() => setSelectedMilestone(milestone)}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-4 w-5 h-5 rounded-full border-4 border-background ${
                      progress.progress === 100
                        ? "bg-green-500"
                        : progress.progress > 0
                          ? "bg-amber-500"
                          : "bg-muted"
                    }`}
                  />

                  {/* Milestone card */}
                  <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono">
                            {milestone.id}
                          </Badge>
                          <span className="font-semibold">{milestone.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {milestone.gateCriteria}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium">
                          {milestone.forecastDate
                            ? new Date(milestone.forecastDate).toLocaleDateString()
                            : "TBD"}
                        </div>
                        <StatusPill status={milestone.status} />
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 flex items-center gap-3">
                      <Progress value={progress.progress} className="flex-1 h-2" />
                      <span className="text-sm font-medium w-20 text-right">
                        {progress.done}/{progress.total} ({progress.progress}%)
                      </span>
                    </div>

                    {/* Wave badge */}
                    <div className="mt-3">
                      <Badge variant="secondary">{milestone.wave}</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* Milestone Detail Dialog */}
      <Dialog open={!!selectedMilestone} onOpenChange={() => setSelectedMilestone(null)}>
        <DialogContent className="max-w-2xl">
          {selectedMilestone && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {selectedMilestone.id}
                  </Badge>
                  <span>{selectedMilestone.name}</span>
                  <StatusPill status={selectedMilestone.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {t("Gate Criteria", "معايير البوابة")}
                  </div>
                  <div className="mt-1">{selectedMilestone.gateCriteria}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Forecast Date", "التاريخ المتوقع")}
                    </div>
                    <div className="mt-1">
                      {selectedMilestone.forecastDate
                        ? new Date(selectedMilestone.forecastDate).toLocaleDateString()
                        : "TBD"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Owner", "المسؤول")}
                    </div>
                    <div className="mt-1">{selectedMilestone.owner}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Wave", "الموجة")}
                    </div>
                    <div className="mt-1">
                      <Badge variant="secondary">{selectedMilestone.wave}</Badge>
                    </div>
                  </div>
                  {selectedMilestone.daysFromStart !== undefined && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        {t("Days from kickoff", "أيام من البداية")}
                      </div>
                      <div className="mt-1">{selectedMilestone.daysFromStart} days</div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {t("Progress", "التقدم")}
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={selectedMilestone.progress} className="flex-1 h-3" />
                    <span className="font-medium">
                      {selectedMilestone.waveDelivered}/{selectedMilestone.waveTotal} (
                      {selectedMilestone.progress}%)
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/pmo/milestones")({
  component: PmoMilestones,
});
