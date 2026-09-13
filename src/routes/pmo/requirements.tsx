import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, StatusPill } from "@/components/kit";
import { DataTable } from "@/components/data-table";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { PmoRequirement, PmoWave, PmoPriority, PmoStatus } from "@/lib/types";

function PmoRequirements() {
  const { db } = useApp();
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [waveFilter, setWaveFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [selectedReq, setSelectedReq] = useState<PmoRequirement | null>(null);

  const requirements = db.pmoRequirements;

  const filtered = requirements.filter((r) => {
    const matchesSearch =
      search === "" ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.module.toLowerCase().includes(search.toLowerCase());
    const matchesWave = waveFilter === "all" || r.wave === waveFilter;
    const matchesPriority = priorityFilter === "all" || r.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || r.pmoStatus === statusFilter;
    const matchesOwner = ownerFilter === "all" || r.ownerRole === ownerFilter;
    return matchesSearch && matchesWave && matchesPriority && matchesStatus && matchesOwner;
  });

  const waves: PmoWave[] = ["W0", "W1", "W2", "W3", "W4", "W5", "W6"];
  const priorities: PmoPriority[] = ["P0", "P1", "P2"];
  const statuses: PmoStatus[] = [
    "Verify & Close",
    "Not Started",
    "In Progress",
    "Blocked - Clarification",
    "Done",
  ];
  const ownerRoles = [...new Set(requirements.map((r) => r.ownerRole))];

  const priorityColor = (priority: PmoPriority) => {
    switch (priority) {
      case "P0":
        return "destructive";
      case "P1":
        return "default";
      case "P2":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Requirements Register", "سجل المتطلبات")}
        subtitle={t(
          `${filtered.length} of ${requirements.length} requirements`,
          `${filtered.length} من ${requirements.length} متطلب`,
        )}
      />

      {/* Filters */}
      <Panel className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            placeholder={t("Search ID, title, module...", "بحث بالمعرف أو العنوان أو الوحدة...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={waveFilter} onValueChange={setWaveFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("Wave", "الموجة")} />
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
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("Priority", "الأولوية")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Priorities", "جميع الأولويات")}</SelectItem>
              {priorities.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("Status", "الحالة")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Statuses", "جميع الحالات")}</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("Owner Role", "دور المسؤول")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Owners", "جميع المسؤولين")}</SelectItem>
              {ownerRoles.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Panel>

      {/* Requirements Table */}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left text-muted-foreground">
                <th className="p-3 font-medium">{t("ID", "المعرف")}</th>
                <th className="p-3 font-medium">{t("Module", "الوحدة")}</th>
                <th className="p-3 font-medium">{t("Requirement", "المتطلب")}</th>
                <th className="p-3 font-medium">{t("Wave", "الموجة")}</th>
                <th className="p-3 font-medium">{t("Priority", "الأولوية")}</th>
                <th className="p-3 font-medium">{t("Status", "الحالة")}</th>
                <th className="p-3 font-medium">{t("Owner", "المسؤول")}</th>
                <th className="p-3 font-medium">{t("Effort", "الجهد")}</th>
                <th className="p-3 font-medium">{t("Progress", "التقدم")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedReq(r)}
                >
                  <td className="p-3 font-mono text-xs">{r.id}</td>
                  <td className="p-3">
                    <Badge variant="outline">{r.module}</Badge>
                  </td>
                  <td className="p-3 max-w-xs">
                    <div className="font-medium truncate">{r.title}</div>
                    {r.clarificationNeeded && (
                      <div className="text-xs text-amber-600 mt-1">
                        {t("Clarification needed", "يحتاج توضيح")}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary">{r.wave}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={priorityColor(r.priority)}>{r.priority}</Badge>
                  </td>
                  <td className="p-3">
                    <StatusPill status={r.pmoStatus} />
                  </td>
                  <td className="p-3 text-xs">{r.ownerRole}</td>
                  <td className="p-3 text-xs">{r.effortDays} pd</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Progress value={r.percentDone} className="h-2 w-16" />
                      <span className="text-xs">{r.percentDone}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Requirement Detail Dialog */}
      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedReq && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono">{selectedReq.id}</span>
                  <Badge variant={priorityColor(selectedReq.priority)}>
                    {selectedReq.priority}
                  </Badge>
                  <StatusPill status={selectedReq.pmoStatus} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <div className="text-lg font-semibold">{selectedReq.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{selectedReq.titleAr}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {t("Description", "الوصف")}
                  </div>
                  <div className="mt-1">{selectedReq.description}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Module", "الوحدة")}
                    </div>
                    <div className="mt-1">
                      {selectedReq.module} ({selectedReq.moduleAr})
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("E2E Stage", "المرحلة الشاملة")}
                    </div>
                    <div className="mt-1">{selectedReq.e2eStage}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Wave", "الموجة")}
                    </div>
                    <div className="mt-1">
                      {selectedReq.wave} - {selectedReq.waveName}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Owner Role", "دور المسؤول")}
                    </div>
                    <div className="mt-1">{selectedReq.ownerRole}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Size", "الحجم")}
                    </div>
                    <div className="mt-1">
                      {selectedReq.size} ({selectedReq.effortDays} pd)
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Progress", "التقدم")}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Progress value={selectedReq.percentDone} className="h-2 flex-1" />
                      <span>{selectedReq.percentDone}%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {t("Acceptance Criteria", "معايير القبول")}
                  </div>
                  <div className="mt-1 text-sm">{selectedReq.acceptanceCriteria}</div>
                </div>
                <div className="space-y-2 text-sm">
                  <p>
                    {t("Start / ETA", "البداية / التسليم")}: {selectedReq.startDate} →{" "}
                    {selectedReq.etaDate} · {selectedReq.etaWeek}
                  </p>
                  <p>
                    {t("Document status", "حالة المستند")}: {selectedReq.docStatus}
                  </p>
                  <p>{selectedReq.notes}</p>
                </div>
                {selectedReq.dependencies.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Dependencies", "الاعتماديات")}
                    </div>
                    <div className="mt-1 flex gap-2">
                      {selectedReq.dependencies.map((d) => (
                        <Badge key={d} variant="outline">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedReq.clarificationNeeded && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded">
                    <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {t("Clarification Needed", "يحتاج توضيح")}
                    </div>
                    <div className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                      {selectedReq.clarificationNeeded}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/pmo/requirements")({
  component: PmoRequirements,
});
