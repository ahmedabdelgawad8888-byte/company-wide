import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, StatusPill } from "@/components/kit";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PmoRaidItem, RaidType, RaidStatus } from "@/lib/types";

function PmoRaid() {
  const { db } = useApp();
  const { t } = useLang();
  const [selectedType, setSelectedType] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<PmoRaidItem | null>(null);

  const { pmoRaidItems } = db;

  const types: RaidType[] = ["Risk", "Assumption", "Issue", "Dependency"];
  const statuses: RaidStatus[] = ["Open", "Mitigated", "Closed", "Accepted"];

  const filtered = pmoRaidItems.filter((item) => {
    const matchesType = selectedType === "all" || item.type === selectedType;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const typeIcon = (type: RaidType) => {
    switch (type) {
      case "Risk":
        return "⚠️";
      case "Assumption":
        return "💡";
      case "Issue":
        return "🔴";
      case "Dependency":
        return "🔗";
    }
  };

  const typeColor = (type: RaidType) => {
    switch (type) {
      case "Risk":
        return "bg-amber-500";
      case "Assumption":
        return "bg-blue-500";
      case "Issue":
        return "bg-red-500";
      case "Dependency":
        return "bg-purple-500";
    }
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "High":
        return "destructive";
      case "Medium":
        return "default";
      case "Low":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Summary counts
  const summary = {
    risks: pmoRaidItems.filter((i) => i.type === "Risk").length,
    risksOpen: pmoRaidItems.filter((i) => i.type === "Risk" && i.status === "Open").length,
    assumptions: pmoRaidItems.filter((i) => i.type === "Assumption").length,
    issues: pmoRaidItems.filter((i) => i.type === "Issue").length,
    issuesOpen: pmoRaidItems.filter((i) => i.type === "Issue" && i.status === "Open").length,
    dependencies: pmoRaidItems.filter((i) => i.type === "Dependency").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("RAID Log", "سجل المخاطر والافتراضات")}
        subtitle={t(`${pmoRaidItems.length} items tracked`, `${pmoRaidItems.length} عنصر متتبع`)}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Panel className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚠️</span>
            <span className="font-medium">{t("Risks", "المخاطر")}</span>
          </div>
          <div className="text-3xl font-bold">{summary.risks}</div>
          <div className="text-sm text-red-600">
            {summary.risksOpen} {t("open", "مفتوح")}
          </div>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💡</span>
            <span className="font-medium">{t("Assumptions", "الافتراضات")}</span>
          </div>
          <div className="text-3xl font-bold">{summary.assumptions}</div>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔴</span>
            <span className="font-medium">{t("Issues", "المشاكل")}</span>
          </div>
          <div className="text-3xl font-bold">{summary.issues}</div>
          <div className="text-sm text-red-600">
            {summary.issuesOpen} {t("open", "مفتوح")}
          </div>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔗</span>
            <span className="font-medium">{t("Dependencies", "الاعتماديات")}</span>
          </div>
          <div className="text-3xl font-bold">{summary.dependencies}</div>
        </Panel>
      </div>

      {/* Filters */}
      <Panel className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("Type:", "النوع:")}</span>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Types", "جميع الأنواع")}</SelectItem>
                {types.map((type) => (
                  <SelectItem key={type} value={type}>
                    {typeIcon(type)} {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("Status:", "الحالة:")}</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Statuses", "جميع الحالات")}</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Panel>

      {/* RAID Table */}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left text-muted-foreground">
                <th className="p-3 font-medium">{t("ID", "المعرف")}</th>
                <th className="p-3 font-medium">{t("Type", "النوع")}</th>
                <th className="p-3 font-medium">{t("Description", "الوصف")}</th>
                <th className="p-3 font-medium">{t("Severity", "الخطورة")}</th>
                <th className="p-3 font-medium">{t("Status", "الحالة")}</th>
                <th className="p-3 font-medium">{t("Owner", "المسؤول")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <td className="p-3 font-mono text-xs">{item.id}</td>
                  <td className="p-3">
                    <Badge className={`${typeColor(item.type)} text-white`}>
                      {typeIcon(item.type)} {item.type}
                    </Badge>
                  </td>
                  <td className="p-3 max-w-xs">
                    <div className="font-medium truncate">{item.description}</div>
                  </td>
                  <td className="p-3">
                    <Badge variant={severityColor(item.severity)}>{item.severity}</Badge>
                  </td>
                  <td className="p-3">
                    <StatusPill status={item.status} />
                  </td>
                  <td className="p-3 text-xs">{item.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge className={`${typeColor(selectedItem.type)} text-white`}>
                    {typeIcon(selectedItem.type)} {selectedItem.type}
                  </Badge>
                  <span className="font-mono text-sm">{selectedItem.id}</span>
                  <StatusPill status={selectedItem.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {t("Description", "الوصف")}
                  </div>
                  <div className="mt-1">{selectedItem.description}</div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Impact", "التأثير")}
                    </div>
                    <div className="mt-1">
                      <Badge variant={severityColor(selectedItem.impact)}>
                        {selectedItem.impact}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Likelihood", "الاحتمال")}
                    </div>
                    <div className="mt-1">
                      <Badge variant="outline">{selectedItem.likelihood}</Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Owner", "المسؤول")}
                    </div>
                    <div className="mt-1">{selectedItem.owner}</div>
                  </div>
                </div>

                {selectedItem.mitigation && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Mitigation Plan", "خطة التخفيف")}
                    </div>
                    <div className="mt-1 p-3 bg-muted rounded">{selectedItem.mitigation}</div>
                  </div>
                )}

                {selectedItem.relatedReqs.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      {t("Related Requirements", "المتطلبات المرتبطة")}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {selectedItem.relatedReqs.map((req) => (
                        <Badge key={req} variant="outline">
                          {req}
                        </Badge>
                      ))}
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

export const Route = createFileRoute("/pmo/raid")({
  component: PmoRaid,
});
