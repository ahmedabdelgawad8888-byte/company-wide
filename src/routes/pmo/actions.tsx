import { PmoEditor } from "@/features/pmo/editor";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, StatusPill } from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PmoAction, PmoActionStatus } from "@/lib/types";

function PmoActions() {
  const { db } = useApp();
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<PmoAction | null>(null);

  const { pmoActions } = db;

  const statuses: PmoActionStatus[] = ["Open", "In Progress", "Closed", "Blocked"];
  const priorities = [...new Set(pmoActions.map((a) => a.priority))];
  const owners = [...new Set(pmoActions.map((a) => a.owner))];

  const filtered = pmoActions.filter((action) => {
    const matchesSearch =
      search === "" ||
      action.id.toLowerCase().includes(search.toLowerCase()) ||
      action.action.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || action.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || action.priority === priorityFilter;
    const matchesOwner = ownerFilter === "all" || action.owner === ownerFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesOwner;
  });

  const priorityColor = (priority: string) => {
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

  const isOverdue = (dueDate: string, status: PmoActionStatus) => {
    return new Date(dueDate) < new Date() && status !== "Closed";
  };

  // Summary stats
  const summary = {
    total: pmoActions.length,
    open: pmoActions.filter((a) => a.status === "Open").length,
    inProgress: pmoActions.filter((a) => a.status === "In Progress").length,
    closed: pmoActions.filter((a) => a.status === "Closed").length,
    overdue: pmoActions.filter((a) => isOverdue(a.dueDate, a.status)).length,
  };

  return (
    <div className="space-y-6">
      <PmoEditor collection="pmoActions" />
      <PageHeader
        title={t("Actions Log", "سجل الإجراءات")}
        subtitle={t(`${pmoActions.length} actions tracked`, `${pmoActions.length} إجراء متتبع`)}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Panel className="p-4 text-center">
          <div className="text-2xl font-bold">{summary.total}</div>
          <div className="text-sm text-muted-foreground">{t("Total", "الإجمالي")}</div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{summary.open}</div>
          <div className="text-sm text-muted-foreground">{t("Open", "مفتوح")}</div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{summary.inProgress}</div>
          <div className="text-sm text-muted-foreground">{t("In Progress", "قيد التنفيذ")}</div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{summary.closed}</div>
          <div className="text-sm text-muted-foreground">{t("Closed", "مغلق")}</div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{summary.overdue}</div>
          <div className="text-sm text-muted-foreground">{t("Overdue", "متأخر")}</div>
        </Panel>
      </div>

      {/* Filters */}
      <Panel className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder={t("Search actions...", "بحث في الإجراءات...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("Owner", "المسؤول")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Owners", "جميع المسؤولين")}</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Panel>

      {/* Actions Table */}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left text-muted-foreground">
                <th className="p-3 font-medium">{t("ID", "المعرف")}</th>
                <th className="p-3 font-medium">{t("Action", "الإجراء")}</th>
                <th className="p-3 font-medium">{t("Type", "النوع")}</th>
                <th className="p-3 font-medium">{t("Priority", "الأولوية")}</th>
                <th className="p-3 font-medium">{t("Status", "الحالة")}</th>
                <th className="p-3 font-medium">{t("Owner", "المسؤول")}</th>
                <th className="p-3 font-medium">{t("Due Date", "تاريخ الاستحقاق")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((action) => {
                const overdue = isOverdue(action.dueDate, action.status);
                return (
                  <tr
                    key={action.id}
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedAction(action)}
                  >
                    <td className="p-3 font-mono text-xs">{action.id}</td>
                    <td className="p-3 max-w-xs">
                      <div className="font-medium truncate">{action.action}</div>
                      {overdue && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          {t("Overdue", "متأخر")}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{action.type}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant={priorityColor(action.priority)}>{action.priority}</Badge>
                    </td>
                    <td className="p-3">
                      <StatusPill status={action.status} />
                    </td>
                    <td className="p-3 text-xs">{action.owner}</td>
                    <td className="p-3 text-xs">
                      <span className={overdue ? "text-red-600 font-medium" : ""}>
                        {new Date(action.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
        <DialogContent className="max-w-2xl">
          {selectedAction && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono">{selectedAction.id}</span>
                  <Badge variant={priorityColor(selectedAction.priority)}>
                    {selectedAction.priority}
                  </Badge>
                  <StatusPill status={selectedAction.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <div className="text-lg font-semibold">{selectedAction.action}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Type", "النوع")}
                    </div>
                    <div className="mt-1">
                      <Badge variant="outline">{selectedAction.type}</Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Owner", "المسؤول")}
                    </div>
                    <div className="mt-1">{selectedAction.owner}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Raised Date", "تاريخ الرفع")}
                    </div>
                    <div className="mt-1">
                      {new Date(selectedAction.raisedDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("Due Date", "تاريخ الاستحقاق")}
                    </div>
                    <div className="mt-1">
                      <span
                        className={
                          isOverdue(selectedAction.dueDate, selectedAction.status)
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        {new Date(selectedAction.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedAction.relatedReq && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      {t("Related Requirement", "المتطلب المرتبط")}
                    </div>
                    <Badge variant="outline">{selectedAction.relatedReq}</Badge>
                  </div>
                )}

                {selectedAction.notes && (
                  <div className="p-3 bg-muted rounded">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      {t("Notes", "ملاحظات")}
                    </div>
                    <div className="text-sm">{selectedAction.notes}</div>
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

export const Route = createFileRoute("/pmo/actions")({
  component: PmoActions,
});
