import { useMemo, useState } from "react";
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
import {
  BarChartCard,
  ChartRow,
  SeriesBarChartCard,
  TrendChartCard,
  countBy,
} from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { shortDate } from "@/lib/format";
import { taskIsOverdue } from "@/lib/derive";
import type { SalesActivity } from "@/lib/types";
import { TODAY } from "@/lib/data/seed";
import { addDays } from "@/lib/calendar";
import { getRoleExperience } from "@/lib/role-ux";

const TYPES: SalesActivity["type"][] = [
  "Call",
  "Follow-up",
  "Meeting",
  "Proposal",
  "Quotation",
  "Contract",
  "Other",
];
const OUTCOMES: SalesActivity["outcome"][] = [
  "Answered",
  "No Answer",
  "Follow-up Required",
  "Meeting Booked",
  "Proposal Requested",
  "Quotation Sent",
  "Contract Pending",
  "Completed",
  "Rejected",
];

function SalesWorkspace() {
  const { db, inScope, currentUser, userName, clientName, actions } = useApp();
  const { t } = useLang();
  const roleUx = getRoleExperience(currentUser.role);
  const individual = roleUx.mode === "sales-individual";
  const salesUsers = db.users.filter(
    (u) =>
      u.department === "Sales" &&
      u.status === "active" &&
      (currentUser.scope === "group" || u.entityId === currentUser.entityId),
  );
  const rows = inScope(db.salesActivities).filter((a) =>
    individual ? a.ownerId === currentUser.id : true,
  );
  const openTasks = inScope(db.tasks).filter(
    (x) =>
      x.department === "Sales" &&
      !["Done", "Cancelled"].includes(x.status) &&
      (individual ? x.ownerId === currentUser.id : true),
  );
  const meetings = inScope(db.calendarEvents).filter(
    (e) =>
      ["Meeting", "Sales Meeting", "Client Review"].includes(e.type) &&
      e.status !== "Cancelled" &&
      (individual
        ? e.organizerId === currentUser.id || e.attendeeIds.includes(currentUser.id)
        : true),
  );
  const [open, setOpen] = useState(false);
  const defaultOwner =
    currentUser.department === "Sales" ? currentUser.id : (salesUsers[0]?.id ?? currentUser.id);
  const [form, setForm] = useState({
    ownerId: defaultOwner,
    clientId: "",
    type: "Call" as SalesActivity["type"],
    outcome: "Answered" as SalesActivity["outcome"],
    notes: "",
    nextAction: "",
    nextActionDate: addDays(TODAY, 1),
  });

  const today = rows.filter((r) => r.date === TODAY);
  const calls = today.filter((r) => r.type === "Call").length;
  const meetingsDone = rows.filter((r) => r.type === "Meeting" && r.outcome !== "No Answer").length;
  const followups = rows.filter(
    (r) => r.nextAction && r.nextActionDate && r.nextActionDate >= TODAY,
  ).length;
  const followupsToday = rows.filter((r) => r.nextAction && r.nextActionDate === TODAY).length;
  const meetingsToday = meetings.filter((m) => m.date === TODAY).length;
  const activityTrend = countBy(rows, (r) => r.date)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(-12);

  const employeeRows = useMemo(
    () =>
      salesUsers.map((u) => {
        const activities = rows.filter((r) => r.ownerId === u.id);
        const tasks = openTasks.filter((r) => r.ownerId === u.id);
        return {
          id: u.id,
          name: u.name,
          calls: activities.filter((r) => r.type === "Call").length,
          meetings: activities.filter((r) => r.type === "Meeting").length,
          followups: activities.filter((r) => !!r.nextAction).length,
          overdue: tasks.filter(taskIsOverdue).length,
          openTasks: tasks.length,
        };
      }),
    [salesUsers, rows, openTasks],
  );

  const ownerSeries = useMemo(
    () =>
      employeeRows.map((r) => ({
        name: r.name,
        calls: r.calls,
        meetings: r.meetings,
        followups: r.followups,
      })),
    [employeeRows],
  );

  const columns: Column<SalesActivity>[] = [
    {
      key: "date",
      header: t("Date", "التاريخ"),
      render: (r) => shortDate(r.date),
      sortValue: (r) => r.date,
    },
    {
      key: "owner",
      header: t("Owner", "المسؤول"),
      render: (r) => userName(r.ownerId),
      sortValue: (r) => userName(r.ownerId),
    },
    {
      key: "client",
      header: t("Client", "العميل"),
      render: (r) => (r.clientId ? clientName(r.clientId) : "—"),
      sortValue: (r) => (r.clientId ? clientName(r.clientId) : ""),
    },
    {
      key: "type",
      header: t("Activity", "النشاط"),
      render: (r) => <Pill tone="brand">{r.type}</Pill>,
      sortValue: (r) => r.type,
    },
    {
      key: "outcome",
      header: t("Outcome", "النتيجة"),
      render: (r) => <StatusPill status={r.outcome} />,
      sortValue: (r) => r.outcome,
    },
    {
      key: "notes",
      header: t("Notes", "ملاحظات"),
      className: "min-w-[260px]",
      render: (r) => <span className="text-xs text-muted-foreground">{r.notes}</span>,
      sortValue: (r) => r.notes,
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
              {r.nextActionDate ? shortDate(r.nextActionDate) : "—"}
            </div>
          </div>
        ) : (
          "—"
        ),
      sortValue: (r) => r.nextActionDate ?? "",
    },
  ];

  const save = () => {
    if (!form.notes.trim()) {
      toast.error(t("Add activity notes", "أضف ملاحظات النشاط"));
      return;
    }
    const owner = db.users.find((u) => u.id === form.ownerId);
    actions.addSalesActivity({
      entityId: owner?.entityId ?? currentUser.entityId,
      ownerId: form.ownerId,
      ...(form.clientId ? { clientId: form.clientId } : {}),
      type: form.type,
      date: TODAY,
      outcome: form.outcome,
      notes: form.notes.trim(),
      ...(form.nextAction ? { nextAction: form.nextAction } : {}),
      ...(form.nextAction && form.nextActionDate ? { nextActionDate: form.nextActionDate } : {}),
    });
    toast.success(t("Sales activity logged", "تم تسجيل نشاط المبيعات"), {
      description: form.nextAction
        ? t("Follow-up task created automatically", "تم إنشاء مهمة المتابعة تلقائياً")
        : undefined,
    });
    setOpen(false);
    setForm({
      ownerId: defaultOwner,
      clientId: "",
      type: "Call",
      outcome: "Answered",
      notes: "",
      nextAction: "",
      nextActionDate: addDays(TODAY, 1),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(
          individual ? "My Sales Workspace" : "Sales Team Workspace",
          individual ? "مساحة مبيعاتي" : "مساحة فريق المبيعات",
        )}
        subtitle={t(
          individual
            ? "Work from your next action: clear overdue follow-ups, log every call outcome, and never leave a client interaction without a clear next step."
            : "Manage Sales execution by exceptions: overdue follow-ups, weak outcomes, meeting commitments and workload by owner.",
          individual
            ? "ابدأ بالإجراء التالي: أنهِ المتابعات المتأخرة وسجّل نتيجة كل مكالمة ولا تترك تفاعلاً مع العميل بدون خطوة تالية واضحة."
            : "أدر تنفيذ المبيعات عبر الاستثناءات: المتابعات المتأخرة والنتائج الضعيفة والتزامات الاجتماعات وعبء العمل لكل مسؤول.",
        )}
        actions={
          <Button onClick={() => setOpen(true)}>
            {t("Log sales activity", "تسجيل نشاط مبيعات")}
          </Button>
        }
      />

      {individual ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label={t("Activities today", "أنشطة اليوم")}
              value={String(today.length)}
              tone="brand"
            />
            <Stat
              label={t("Follow-ups due today", "متابعات مستحقة اليوم")}
              value={String(followupsToday)}
              tone={followupsToday ? "warning" : "success"}
            />
            <Stat
              label={t("Meetings today", "اجتماعات اليوم")}
              value={String(meetingsToday)}
              tone="orange"
            />
            <Stat
              label={t("My overdue actions", "إجراءاتي المتأخرة")}
              value={String(openTasks.filter(taskIsOverdue).length)}
              tone={openTasks.some(taskIsOverdue) ? "danger" : "success"}
            />
          </div>
          <ChartRow cols={2}>
            <TrendChartCard
              title={t("My activity rhythm", "إيقاع نشاطي")}
              description={t("Logged activity by day", "الأنشطة المسجلة يومياً")}
              data={activityTrend}
              trendLine
            />
            <BarChartCard
              title={t("What happened after contact", "نتائج التواصل")}
              description={t("Outcome mix for your logged activities", "نتائج الأنشطة المسجلة")}
              data={countBy(rows, (r) => r.outcome)}
              horizontal
              colorful
            />
          </ChartRow>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat
              label={t("Team activities today", "أنشطة الفريق اليوم")}
              value={String(today.length)}
              tone="brand"
            />
            <Stat label={t("Calls today", "مكالمات اليوم")} value={String(calls)} tone="orange" />
            <Stat label={t("Meetings today", "اجتماعات اليوم")} value={String(meetingsToday)} />
            <Stat
              label={t("Follow-ups open", "متابعات مفتوحة")}
              value={String(followups)}
              tone="warning"
            />
            <Stat
              label={t("Team overdue", "متأخرات الفريق")}
              value={String(openTasks.filter(taskIsOverdue).length)}
              tone={openTasks.some(taskIsOverdue) ? "danger" : "success"}
            />
          </div>
          <ChartRow>
            <TrendChartCard
              title={t("Sales execution trend", "اتجاه تنفيذ المبيعات")}
              description={t("Logged activities over time", "الأنشطة المسجلة عبر الوقت")}
              data={activityTrend}
              trendLine
            />
            <SeriesBarChartCard
              title={t("Work mix by owner", "مزيج العمل حسب المسؤول")}
              data={ownerSeries}
              series={[
                { key: "calls", label: t("Calls", "مكالمات") },
                { key: "meetings", label: t("Meetings", "اجتماعات") },
                { key: "followups", label: t("Follow-ups", "متابعات") },
              ]}
            />
            <BarChartCard
              title={t("Outcome quality", "جودة النتائج")}
              description={t(
                "What happened after each Sales interaction",
                "ما حدث بعد كل تفاعل مبيعات",
              )}
              data={countBy(rows, (r) => r.outcome)}
              horizontal
              colorful
            />
          </ChartRow>
        </>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <Section title={t("Sales activity register", "سجل أنشطة المبيعات")}>
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(r) => r.id}
              searchable={(r) =>
                `${userName(r.ownerId)} ${r.clientId ? clientName(r.clientId) : ""} ${r.type} ${r.outcome} ${r.notes} ${r.nextAction ?? ""}`
              }
              exportName="trygc-sales-activity"
              pageSize={12}
            />
          </Section>
        </Panel>
        <Panel>
          <Section
            title={t(
              individual ? "My next meetings" : "Upcoming Sales meetings",
              individual ? "اجتماعاتي القادمة" : "اجتماعات المبيعات القادمة",
            )}
          >
            <div className="space-y-2">
              {meetings
                .filter((m) => m.date >= TODAY)
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 7)
                .map((m) => (
                  <div key={m.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{m.title}</p>
                      <StatusPill status={m.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {shortDate(m.date)} · {m.startTime} · {userName(m.organizerId)}
                    </p>
                  </div>
                ))}
            </div>
          </Section>
        </Panel>
      </div>

      {!individual ? (
        <Section
          title={t("Employee execution snapshot", "ملخص تنفيذ الموظفين")}
          description={t(
            "Coaching view: workload and overdue exposure by person.",
            "عرض للتوجيه: عبء العمل والتأخير لكل شخص.",
          )}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {employeeRows.map((r) => (
              <Panel key={r.id}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{r.name}</p>
                  {r.overdue ? (
                    <Pill tone="danger">{r.overdue} overdue</Pill>
                  ) : (
                    <Pill tone="success">On track</Pill>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Calls</span>
                    <div className="num mt-1 text-lg font-semibold">{r.calls}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Meetings</span>
                    <div className="num mt-1 text-lg font-semibold">{r.meetings}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Follow-ups</span>
                    <div className="num mt-1 text-lg font-semibold">{r.followups}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Open actions</span>
                    <div className="num mt-1 text-lg font-semibold">{r.openTasks}</div>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </Section>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Log sales activity", "تسجيل نشاط مبيعات")}</DialogTitle>
            <DialogDescription>
              {t(
                "If you add a next action and due date, the system creates a linked task automatically.",
                "إذا أضفت إجراءً تالياً وموعداً فسيقوم النظام بإنشاء مهمة مرتبطة تلقائياً.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select
                value={form.ownerId}
                onValueChange={(v) => setForm((p) => ({ ...p, ownerId: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {salesUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select
                value={form.clientId || "none"}
                onValueChange={(v) => setForm((p) => ({ ...p, clientId: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {db.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Activity type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((p) => ({ ...p, type: v as SalesActivity["type"] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <Select
                value={form.outcome}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, outcome: v as SalesActivity["outcome"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes / outcome details</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="What happened? What did the client say?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Next action</Label>
              <Input
                value={form.nextAction}
                onChange={(e) => setForm((p) => ({ ...p, nextAction: e.target.value }))}
                placeholder="e.g. Send revised quotation"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Action due date</Label>
              <Input
                type="date"
                value={form.nextActionDate}
                onChange={(e) => setForm((p) => ({ ...p, nextActionDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button onClick={save}>{t("Save activity", "حفظ النشاط")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales Workspace | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Sales execution workspace for calls, follow-ups, meetings, quotations, next actions and employee performance.",
      },
    ],
  }),
  component: SalesWorkspace,
});
