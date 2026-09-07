import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel, Pill, Section, Stat, StatusPill } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { BarChartCard, ChartRow, TrendChartCard, countBy } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { shortDate } from "@/lib/format";
import type { CalendarEvent } from "@/lib/types";
import { TODAY } from "@/lib/data/seed";
import { addDays } from "@/lib/calendar";
import { getWorkspace, workspaceOwnsDepartment } from "@/lib/workspace-hub";

function Meetings() {
  const { db, inScope, currentUser, activeWorkspace, userName, clientName, actions } = useApp();
  const { t } = useLang();
  const workspace = getWorkspace(activeWorkspace);
  const workspaceUserIds = new Set(
    db.users.filter((u) => workspaceOwnsDepartment(activeWorkspace, u.department)).map((u) => u.id),
  );
  const rows = inScope(db.calendarEvents)
    .filter((e) =>
      ["Meeting", "Sales Meeting", "Client Review", "Finance Close", "Internal"].includes(e.type),
    )
    .filter(
      (e) =>
        workspaceUserIds.has(e.organizerId) || e.attendeeIds.some((id) => workspaceUserIds.has(id)),
    );
  const participantOptions = db.users.filter(
    (u) => u.status === "active" && (workspaceUserIds.has(u.id) || u.id === currentUser.id),
  );
  const clientOptions =
    activeWorkspace === "sales" || activeWorkspace === "finance"
      ? db.clients.filter(
          (c) => currentUser.scope === "group" || c.entityId === currentUser.entityId,
        )
      : [];
  const [createOpen, setCreateOpen] = useState(false);
  const [outcomeEvent, setOutcomeEvent] = useState<CalendarEvent | null>(null);
  const [create, setCreate] = useState({
    title: "",
    clientId: "",
    date: addDays(TODAY, 1),
    startTime: "10:00",
    endTime: "11:00",
    organizerId: currentUser.id,
    description: "",
    location: "Google Meet",
  });
  const [outcome, setOutcome] = useState({
    outcome: "",
    nextAction: "",
    ownerId: currentUser.id,
    dueDate: addDays(TODAY, 2),
  });

  const scheduled = rows.filter((e) => e.status === "Scheduled" || e.status === "Confirmed");
  const completed = rows.filter((e) => e.status === "Completed");
  const missingOutcome = completed.filter((e) => !e.outcome);
  const actionsCreated = rows.filter((e) => !!e.nextAction).length;
  const meetingTrend = countBy(rows, (e) => e.date)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(-12);
  const outcomeQuality = [
    {
      name: t("Outcome captured", "تم تسجيل النتيجة"),
      value: completed.filter((e) => !!e.outcome).length,
    },
    { name: t("Outcome missing", "النتيجة مفقودة"), value: missingOutcome.length },
    { name: t("Next action created", "تم إنشاء إجراء تالٍ"), value: actionsCreated },
  ];

  const columns: Column<CalendarEvent>[] = [
    {
      key: "date",
      header: t("Date", "التاريخ"),
      render: (r) => (
        <div>
          <div className="font-medium">{shortDate(r.date)}</div>
          <div className="text-xs text-muted-foreground">
            {r.startTime}–{r.endTime}
          </div>
        </div>
      ),
      sortValue: (r) => `${r.date} ${r.startTime}`,
    },
    {
      key: "meeting",
      header: t("Meeting", "الاجتماع"),
      className: "min-w-[260px]",
      render: (r) => (
        <div>
          <div className="font-medium">{r.title}</div>
          <div className="text-xs text-muted-foreground">{r.location ?? "—"}</div>
        </div>
      ),
      sortValue: (r) => r.title,
    },
    {
      key: "owner",
      header: t("Organizer", "المنظم"),
      render: (r) => userName(r.organizerId),
      sortValue: (r) => userName(r.organizerId),
    },
    {
      key: "status",
      header: t("Status", "الحالة"),
      render: (r) => <StatusPill status={r.status} />,
      sortValue: (r) => r.status,
    },
    {
      key: "outcome",
      header: t("Outcome", "النتيجة"),
      className: "min-w-[260px]",
      render: (r) =>
        r.outcome ? (
          <span className="text-xs">{r.outcome}</span>
        ) : (
          <Pill tone="warning">Outcome needed</Pill>
        ),
      sortValue: (r) => r.outcome ?? "",
    },
    {
      key: "next",
      header: t("Next action", "الإجراء التالي"),
      className: "min-w-[240px]",
      render: (r) =>
        r.nextAction ? (
          <div>
            <div className="font-medium">{r.nextAction}</div>
            <div className="text-xs text-muted-foreground">
              {r.actionOwnerId ? userName(r.actionOwnerId) : "—"} ·{" "}
              {r.actionDueDate ? shortDate(r.actionDueDate) : "—"}
            </div>
          </div>
        ) : (
          "—"
        ),
      sortValue: (r) => r.actionDueDate ?? "",
    },
    {
      key: "action",
      header: "",
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setOutcomeEvent(r);
            setOutcome({
              outcome: r.outcome ?? "",
              nextAction: r.nextAction ?? "",
              ownerId: r.actionOwnerId ?? r.organizerId,
              dueDate: r.actionDueDate ?? addDays(TODAY, 2),
            });
          }}
        >
          {r.outcome ? t("Edit outcome", "تعديل النتيجة") : t("Record outcome", "تسجيل النتيجة")}
        </Button>
      ),
    },
  ];

  const saveMeeting = () => {
    if (!create.title.trim()) {
      toast.error(t("Meeting title is required", "اسم الاجتماع مطلوب"));
      return;
    }
    const client = db.clients.find((c) => c.id === create.clientId);
    actions.addEvent({
      title: create.title.trim(),
      description: create.description,
      type:
        activeWorkspace === "sales"
          ? "Sales Meeting"
          : activeWorkspace === "finance"
            ? "Finance Close"
            : "Internal",
      entityId: client?.entityId ?? currentUser.entityId,
      date: create.date,
      startTime: create.startTime,
      endTime: create.endTime,
      allDay: false,
      location: create.location,
      organizerId: create.organizerId,
      attendeeIds: [create.organizerId],
      status: "Scheduled",
      recurrence: "none",
      ...(create.clientId ? { linkedType: "client" as const, linkedId: create.clientId } : {}),
    });
    toast.success(t("Meeting created", "تم إنشاء الاجتماع"));
    setCreateOpen(false);
    setCreate({
      title: "",
      clientId: "",
      date: addDays(TODAY, 1),
      startTime: "10:00",
      endTime: "11:00",
      organizerId: currentUser.id,
      description: "",
      location: "Google Meet",
    });
  };

  const saveOutcome = () => {
    if (!outcomeEvent || !outcome.outcome.trim()) {
      toast.error(t("Meeting outcome is required", "نتيجة الاجتماع مطلوبة"));
      return;
    }
    actions.recordMeetingOutcome(
      outcomeEvent.id,
      outcome.outcome.trim(),
      outcome.nextAction.trim() || undefined,
      outcome.nextAction.trim() ? outcome.ownerId : undefined,
      outcome.nextAction.trim() ? outcome.dueDate : undefined,
    );
    toast.success(t("Meeting outcome saved", "تم حفظ نتيجة الاجتماع"), {
      description: outcome.nextAction.trim()
        ? t("Linked task created automatically", "تم إنشاء مهمة مرتبطة تلقائياً")
        : undefined,
    });
    setOutcomeEvent(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(
          activeWorkspace === "sales"
            ? "Client Meetings"
            : activeWorkspace === "finance"
              ? "Finance Meetings"
              : activeWorkspace === "hr"
                ? "Interviews & People Meetings"
                : "Decisions & Meetings",
          activeWorkspace === "sales"
            ? "اجتماعات العملاء"
            : activeWorkspace === "finance"
              ? "اجتماعات الحسابات"
              : activeWorkspace === "hr"
                ? "المقابلات واجتماعات الموظفين"
                : "القرارات والاجتماعات",
        )}
        subtitle={t(
          `Meetings inside ${workspace.title} should end with a clear outcome. If something must happen next, assign one owner and one due date before leaving the record.`,
          `اجتماعات ${workspace.titleAr} يجب أن تنتهي بنتيجة واضحة. إذا كان هناك إجراء تالٍ، حدد مسؤولاً واحداً وموعداً واحداً قبل إغلاق السجل.`,
        )}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            {t("Schedule meeting", "جدولة اجتماع")}
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("Scheduled", "مجدولة")} value={String(scheduled.length)} tone="brand" />
        <Stat label={t("Completed", "مكتملة")} value={String(completed.length)} tone="success" />
        <Stat
          label={t("Missing outcome", "بدون نتيجة")}
          value={String(missingOutcome.length)}
          tone={missingOutcome.length ? "warning" : "success"}
        />
        <Stat
          label={t("Actions created", "إجراءات تم إنشاؤها")}
          value={String(actionsCreated)}
          tone="orange"
        />
      </div>
      <ChartRow cols={2}>
        <TrendChartCard
          title={t("Meeting rhythm", "إيقاع الاجتماعات")}
          description={t("Meetings by date", "الاجتماعات حسب التاريخ")}
          data={meetingTrend}
        />
        <BarChartCard
          title={t("Outcome discipline", "الالتزام بنتائج الاجتماع")}
          description={t(
            "Completed meetings should end with an outcome and, when needed, a next action.",
            "الاجتماعات المكتملة يجب أن تنتهي بنتيجة وإجراء تالٍ عند الحاجة.",
          )}
          data={outcomeQuality}
          horizontal
          colorful
        />
      </ChartRow>
      <Section title={t("Meeting register", "سجل الاجتماعات")}>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) =>
            `${r.title} ${r.description ?? ""} ${r.outcome ?? ""} ${r.nextAction ?? ""} ${r.linkedType === "client" && r.linkedId ? clientName(r.linkedId) : ""}`
          }
          exportName="trygc-meetings-outcomes"
          pageSize={12}
        />
      </Section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Schedule meeting", "جدولة اجتماع")}</DialogTitle>
            <DialogDescription>
              {t(
                "Create a meeting that belongs to the current workspace and its team.",
                "أنشئ اجتماعاً يخص مساحة العمل الحالية وفريقها.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Meeting title</Label>
              <Input
                value={create.title}
                onChange={(e) => setCreate((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select
                value={create.clientId || "none"}
                onValueChange={(v) => setCreate((p) => ({ ...p, clientId: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Internal / no client</SelectItem>
                  {clientOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Organizer</Label>
              <Select
                value={create.organizerId}
                onValueChange={(v) => setCreate((p) => ({ ...p, organizerId: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {participantOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={create.date}
                onChange={(e) => setCreate((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input
                  type="time"
                  value={create.startTime}
                  onChange={(e) => setCreate((p) => ({ ...p, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input
                  type="time"
                  value={create.endTime}
                  onChange={(e) => setCreate((p) => ({ ...p, endTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Location / link</Label>
              <Input
                value={create.location}
                onChange={(e) => setCreate((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Purpose / notes</Label>
              <Textarea
                value={create.description}
                onChange={(e) => setCreate((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button onClick={saveMeeting}>{t("Create meeting", "إنشاء الاجتماع")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!outcomeEvent} onOpenChange={(v) => !v && setOutcomeEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{outcomeEvent?.title}</DialogTitle>
            <DialogDescription>
              {t(
                "Capture what happened. A next action with owner + due date becomes a task automatically.",
                "سجل ما حدث. أي إجراء تالٍ مع مسؤول وموعد يتحول إلى مهمة تلقائياً.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Meeting outcome</Label>
              <Textarea
                value={outcome.outcome}
                onChange={(e) => setOutcome((p) => ({ ...p, outcome: e.target.value }))}
                placeholder="Decision, client request, commitment, blocker…"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Next action</Label>
              <Input
                value={outcome.nextAction}
                onChange={(e) => setOutcome((p) => ({ ...p, nextAction: e.target.value }))}
                placeholder="e.g. Send revised quotation"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Action owner</Label>
              <Select
                value={outcome.ownerId}
                onValueChange={(v) => setOutcome((p) => ({ ...p, ownerId: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {participantOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input
                type="date"
                value={outcome.dueDate}
                onChange={(e) => setOutcome((p) => ({ ...p, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutcomeEvent(null)}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button onClick={saveOutcome}>{t("Save outcome", "حفظ النتيجة")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Workspace Meetings | TryGC Command Center" },
      {
        name: "description",
        content:
          "Schedule meetings, record outcomes and automatically convert commitments into owned tasks.",
      },
    ],
  }),
  component: Meetings,
});
