import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, StatusPill } from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PmoE2EStage } from "@/lib/types";

function PmoE2EView() {
  const { db } = useApp();
  const { t } = useLang();
  const [selectedStage, setSelectedStage] = useState<PmoE2EStage | null>(null);

  const { pmoE2EStages, pmoRequirements } = db;

  // Calculate stage progress based on requirements
  const getStageProgress = (stage: PmoE2EStage) => {
    const stageReqs = pmoRequirements.filter((r) => r.e2eStage === stage.name);
    const doneReqs = stageReqs.filter(
      (r) => r.pmoStatus === "Done" || r.pmoStatus === "Verify & Close",
    );
    const progress =
      stageReqs.length > 0 ? Math.round((doneReqs.length / stageReqs.length) * 100) : 0;
    return { total: stageReqs.length, done: doneReqs.length, progress };
  };

  const stageColors = [
    "from-purple-500 to-purple-600",
    "from-blue-500 to-blue-600",
    "from-cyan-500 to-cyan-600",
    "from-teal-500 to-teal-600",
    "from-green-500 to-green-600",
    "from-lime-500 to-lime-600",
    "from-yellow-500 to-yellow-600",
    "from-orange-500 to-orange-600",
    "from-red-500 to-red-600",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("E2E Journey View", "رحلة المستخدم الشاملة")}
        subtitle={t(
          `${pmoE2EStages.length} stages in the end-to-end flow`,
          `${pmoE2EStages.length} مراحل في التدفق الشامل`,
        )}
      />

      {/* E2E Flow Visualization */}
      <Panel className="p-6 overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Flow diagram */}
          <div className="flex items-stretch gap-2">
            {pmoE2EStages.map((stage, index) => {
              const progress = getStageProgress(stage);
              const isLast = index === pmoE2EStages.length - 1;

              return (
                <div key={stage.id} className="flex items-stretch">
                  {/* Stage card */}
                  <div
                    className={`flex-1 min-w-[100px] p-3 rounded-lg bg-gradient-to-br ${stageColors[index]} text-white cursor-pointer hover:opacity-90 transition-opacity`}
                    onClick={() => setSelectedStage(stage)}
                  >
                    <div className="text-xs font-medium opacity-80">
                      {t("Stage", "المرحلة")} {stage.id}
                    </div>
                    <div className="text-sm font-semibold mt-1 line-clamp-2">{stage.name}</div>
                    <div className="mt-3">
                      <div className="text-xs opacity-80 mb-1">
                        {progress.done}/{progress.total}
                      </div>
                      <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full"
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Arrow connector */}
                  {!isLast && (
                    <div className="flex items-center px-1">
                      <div className="w-4 h-0.5 bg-border" />
                      <div className="w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-border" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* Stage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pmoE2EStages.map((stage, index) => {
          const progress = getStageProgress(stage);
          const stageReqs = pmoRequirements.filter((r) => r.e2eStage === stage.name);
          const blockedCount = stageReqs.filter(
            (r) => r.pmoStatus === "Blocked - Clarification",
          ).length;
          const inProgressCount = stageReqs.filter((r) => r.pmoStatus === "In Progress").length;
          const modules = stage.modulesInvolved
            ? stage.modulesInvolved.split(",").map((m) => m.trim())
            : [];

          return (
            <Panel
              key={stage.id}
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedStage(stage)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge
                    variant="secondary"
                    className={`bg-gradient-to-r ${stageColors[index]} text-white border-0`}
                  >
                    {t("Stage", "المرحلة")} {stage.id}
                  </Badge>
                  <div className="font-semibold mt-2">{stage.name}</div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {stage.description}
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2 mb-4">
                <Progress value={progress.progress} className="flex-1 h-2" />
                <span className="text-sm font-medium">{progress.progress}%</span>
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">{t("Total:", "الإجمالي:")}</span>{" "}
                  <span className="font-medium">{progress.total}</span>
                </div>
                <div>
                  <span className="text-green-600">{t("Done:", "مكتمل:")}</span>{" "}
                  <span className="font-medium">{progress.done}</span>
                </div>
                <div>
                  <span className="text-amber-600">{t("WIP:", "جاري:")}</span>{" "}
                  <span className="font-medium">{inProgressCount}</span>
                </div>
                {blockedCount > 0 && (
                  <div>
                    <span className="text-red-600">{t("Blocked:", "معطل:")}</span>{" "}
                    <span className="font-medium">{blockedCount}</span>
                  </div>
                )}
              </div>

              {/* Modules */}
              {modules.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1">
                  {modules.slice(0, 4).map((m) => (
                    <Badge key={m} variant="outline" className="text-xs">
                      {m}
                    </Badge>
                  ))}
                  {modules.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{modules.length - 4}
                    </Badge>
                  )}
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      {/* Stage Detail Dialog */}
      <Dialog open={!!selectedStage} onOpenChange={() => setSelectedStage(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedStage && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {t("Stage", "المرحلة")} {selectedStage.id}
                  </Badge>
                  <span>{selectedStage.name}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {t("Description", "الوصف")}
                  </div>
                  <div className="mt-1">{selectedStage.description}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {t("Progress", "التقدم")}
                  </div>
                  {(() => {
                    const progress = getStageProgress(selectedStage);
                    return (
                      <div className="flex items-center gap-3">
                        <Progress value={progress.progress} className="flex-1 h-3" />
                        <span className="font-medium">
                          {progress.done}/{progress.total} ({progress.progress}%)
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Primary Owner", "المسؤول الرئيسي")}
                    </div>
                    <div className="mt-1">{selectedStage.primaryOwner}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Effort", "الجهد")}
                    </div>
                    <div className="mt-1">{selectedStage.effortDays} pd</div>
                  </div>
                </div>

                {selectedStage.modulesInvolved && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      {t("Modules", "الوحدات")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedStage.modulesInvolved.split(",").map((m) => (
                        <Badge key={m.trim()} variant="outline">
                          {m.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {t("Entry Criteria", "معايير الدخول")}
                  </div>
                  <div className="text-sm bg-muted p-3 rounded">{selectedStage.entryCriteria}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {t("Exit Criteria", "معايير الخروج")}
                  </div>
                  <div className="text-sm bg-muted p-3 rounded">{selectedStage.exitCriteria}</div>
                </div>

                {/* Requirements in this stage */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {t("Requirements", "المتطلبات")}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pmoRequirements
                      .filter((r) => r.e2eStage === selectedStage.name)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-2 rounded bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{r.id}</span>
                            <span className="text-sm truncate max-w-[200px]">{r.title}</span>
                          </div>
                          <StatusPill status={r.pmoStatus} />
                        </div>
                      ))}
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

export const Route = createFileRoute("/pmo/e2e")({
  component: PmoE2EView,
});
