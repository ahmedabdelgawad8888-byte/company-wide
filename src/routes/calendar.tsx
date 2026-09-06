import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Repeat,
  Trash2,
  Users,
} from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, PageHeader, Panel, Pill, Section, Stat } from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { TODAY } from "@/lib/data/seed";
import { shortDate } from "@/lib/format";
import {
  CADENCES,
  addDays,
  cadenceLabel,
  eventsBetween,
  monthGrid,
  monthLabel,
  nextRun,
  occurrencesBetween,
  parseISO,
} from "@/lib/calendar";
import type {
  Cadence,
  CalendarEvent,
  EventType,
  Notification,
  ReminderSchedule,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { getWorkspace, workspaceOwnsDepartment } from "@/lib/workspace-hub";

const EVENT_TYPES: EventType[] = [
  "Meeting",
  "Sales Meeting",
  "Client Review",
  "Finance Close",
  "Approval Deadline",
  "Internal",
  "Holiday",
];

const TYPE_TONE: Record<EventType, string> = {
  Meeting: "bg-chart-1",
  "Sales Meeting": "bg-chart-2",
  "Client Review": "bg-chart-2",
  "Campaign Milestone": "bg-chart-3",
  "Creator Visit": "bg-chart-4",
  "Finance Close": "bg-chart-5",
  "Approval Deadline": "bg-danger",
  Internal: "bg-chart-6",
  Holiday: "bg-success",
};

const REMINDER_CATEGORIES: Notification["category"][] = [
  "Calendar",
  "Finance",
  "Sales",
  "Meeting",
  "Client",
  "Approval",
  "Task",
  "System",
];

type EventDraft = Omit<CalendarEvent, "id" | "createdBy">;

function emptyEvent(entityId: string, date: string, organizerId: string): EventDraft {
  return {
    title: "",
    type: "Meeting",
    entityId,
    date,
    startTime: "10:00",
    endTime: "11:00",
    allDay: false,
    organizerId,
    attendeeIds: [organizerId],
    status: "Scheduled",
    recurrence: "none",
  };
}

function CalendarPage() {
  const { db, inScope, scope, currentUser, activeWorkspace, userName, entityName, actions } =
    useApp();
  const { t, lang } = useLang();
  const workspace = getWorkspace(activeWorkspace);
  const workspaceUserIds = new Set(
    db.users.filter((u) => workspaceOwnsDepartment(activeWorkspace, u.department)).map((u) => u.id),
  );
  const canCreateEvent = true;
  const canCreateReminder = true;
  const peopleOptions = db.users.filter(
    (u) => u.status === "active" && (workspaceUserIds.has(u.id) || u.id === currentUser.id),
  );
  const allowedEventTypes: EventType[] =
    activeWorkspace === "sales"
      ? ["Meeting", "Sales Meeting", "Client Review", "Internal"]
      : activeWorkspace === "finance"
        ? ["Meeting", "Finance Close", "Approval Deadline", "Internal"]
        : ["Meeting", "Internal", "Holiday"];
  const allowedReminderCategories: Notification["category"][] =
    activeWorkspace === "sales"
      ? ["Calendar", "Sales", "Meeting", "Client", "Task"]
      : activeWorkspace === "finance"
        ? ["Calendar", "Finance", "Meeting", "Approval", "Task"]
        : ["Calendar", "Meeting", "Task", "System"];

  const today = TODAY;
  const [cursor, setCursor] = useState(() => {
    const d = parseISO(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<"calendar" | "reminders">("calendar");

  const [eventDialog, setEventDialog] = useState<{ open: boolean; editing?: CalendarEvent }>({
    open: false,
  });
  const [draft, setDraft] = useState<EventDraft>(() =>
    emptyEvent(currentUser.entityId, today, currentUser.id),
  );
  const [reminderOpen, setReminderOpen] = useState(false);

  const defaultEntity = scope === "group" ? currentUser.entityId : scope;
  const events = inScope(db.calendarEvents).filter(
    (event) =>
      workspaceUserIds.has(event.organizerId) ||
      event.attendeeIds.some((id) => workspaceUserIds.has(id)),
  );
  const reminders = inScope(db.reminderSchedules).filter(
    (reminder) =>
      reminder.recipientIds.some((id) => workspaceUserIds.has(id)) ||
      workspaceUserIds.has(reminder.ownerId),
  );
  const weekStart =
    db.settings.localisation.weekStart === "Saturday"
      ? 6
      : db.settings.localisation.weekStart === "Monday"
        ? 1
        : 0;

  const grid = useMemo(() => monthGrid(cursor.year, cursor.month, weekStart), [cursor, weekStart]);
  const gridFrom = grid[0]!.date;
  const gridTo = grid[grid.length - 1]!.date;

  /* Recurring events are expanded into concrete occurrences for the visible range. */
  const occurrences = useMemo(
    () => eventsBetween(events, gridFrom, gridTo),
    [events, gridFrom, gridTo],
  );
  const byDate = useMemo(() => {
    const m = new Map<string, typeof occurrences>();
    occurrences.forEach((o) => m.set(o.date, [...(m.get(o.date) ?? []), o]));
    return m;
  }, [occurrences]);

  const dayEvents = byDate.get(selectedDate) ?? [];
  const upcoming = useMemo(
    () => eventsBetween(events, today, addDays(today, 30)).slice(0, 8),
    [events, today],
  );

  const weekdayNames = useMemo(() => {
    const base = new Date(2026, 8, 6); // a Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate() + ((i + weekStart) % 7),
      );
      return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { weekday: "short" });
    });
  }, [weekStart, lang]);

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const openNew = (date: string) => {
    if (!canCreateEvent) return;
    setDraft(emptyEvent(defaultEntity, date, currentUser.id));
    setEventDialog({ open: true });
  };

  const openExisting = (event: CalendarEvent) => {
    const { id: _id, createdBy: _createdBy, ...rest } = event;
    setDraft(rest);
    setEventDialog({ open: true, editing: event });
  };

  const canEditSelectedEvent =
    !eventDialog.editing ||
    eventDialog.editing.organizerId === currentUser.id ||
    currentUser.role === "Group Admin";

  const saveEvent = () => {
    if (!canEditSelectedEvent) return;
    if (!draft.title.trim()) {
      toast.error(t("Give the event a title", "أضف عنوانًا للحدث"));
      return;
    }
    if (!draft.allDay && draft.endTime < draft.startTime) {
      toast.error(t("End time is before the start time", "وقت الانتهاء قبل وقت البداية"));
      return;
    }
    if (eventDialog.editing) {
      actions.updateEvent(eventDialog.editing.id, draft);
      toast.success(t("Event updated", "تم تحديث الحدث"), { description: draft.title });
    } else {
      actions.addEvent(draft);
      toast.success(t("Event created", "تم إنشاء الحدث"), {
        description: `${draft.title} · ${shortDate(draft.date)}`,
      });
    }
    setSelectedDate(draft.date);
    setEventDialog({ open: false });
  };

  const removeEvent = () => {
    if (!eventDialog.editing || !canEditSelectedEvent) return;
    actions.deleteEvent(eventDialog.editing.id);
    toast.success(t("Event deleted", "تم حذف الحدث"));
    setEventDialog({ open: false });
  };

  const setD = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) =>
    setDraft((p) => ({ ...p, [k]: v }));

  const activeReminders = reminders.filter((r) => r.active);
  const dueSoon = activeReminders.filter((r) => {
    const at = nextRun(r, today);
    return at !== null && at <= addDays(today, 7);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(`${workspace.title} Calendar`, `تقويم ${workspace.titleAr}`)}
        subtitle={t(
          `Meetings, deadlines and recurring reminders that belong to the ${workspace.title} workspace only.`,
          `الاجتماعات والمواعيد والتنبيهات الدورية الخاصة بمساحة ${workspace.titleAr} فقط.`,
        )}
        actions={
          canCreateEvent ? (
            <Button onClick={() => openNew(selectedDate)}>
              <Plus className="me-2 size-4" />
              {t("New event", "حدث جديد")}
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Events this month", "أحداث هذا الشهر")}
          value={String(
            occurrences.filter(
              (o) =>
                o.date.slice(0, 7) ===
                `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`,
            ).length,
          )}
          hint={t("Including repeats", "شاملة التكرارات")}
          icon={<CalendarDays className="size-4" />}
        />
        <Stat
          label={t("Next 30 days", "الثلاثون يومًا القادمة")}
          value={String(eventsBetween(events, today, addDays(today, 30)).length)}
          hint={t("Scheduled occurrences", "مواعيد مجدولة")}
          tone="brand"
        />
        <Stat
          label={t("Active reminders", "تذكيرات نشطة")}
          value={String(activeReminders.length)}
          hint={`${reminders.length - activeReminders.length} ${t("paused", "متوقفة")}`}
          icon={<Repeat className="size-4" />}
        />
        <Stat
          label={t("Firing within 7 days", "تُرسل خلال ٧ أيام")}
          value={String(dueSoon.length)}
          hint={t("Recipients will be notified", "سيتم إشعار المستلمين")}
          tone={dueSoon.length ? "warning" : "default"}
          icon={<BellRing className="size-4" />}
        />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="calendar">{t("Calendar", "التقويم")}</TabsTrigger>
          <TabsTrigger value="reminders">
            {t("Reminder schedules", "جداول التذكير")} ({reminders.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "calendar" ? (
        <div className="grid items-start gap-4 xl:grid-cols-3">
          <Panel className="xl:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">
                {monthLabel(cursor.year, cursor.month, lang)}
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => shiftMonth(-1)}
                  aria-label={t("Previous month", "الشهر السابق")}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = parseISO(today);
                    setCursor({ year: d.getFullYear(), month: d.getMonth() });
                    setSelectedDate(today);
                  }}
                >
                  {t("Today", "اليوم")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => shiftMonth(1)}
                  aria-label={t("Next month", "الشهر التالي")}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
              {weekdayNames.map((w) => (
                <div
                  key={w}
                  className="bg-muted/60 px-2 py-1.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  {w}
                </div>
              ))}
              {grid.map((cell) => {
                const items = byDate.get(cell.date) ?? [];
                const isToday = cell.date === today;
                const isSelected = cell.date === selectedDate;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setSelectedDate(cell.date)}
                    onDoubleClick={() => canCreateEvent && openNew(cell.date)}
                    className={cn(
                      "min-h-[84px] bg-card p-1.5 text-start align-top transition-colors hover:bg-muted/50",
                      !cell.inMonth && "bg-muted/25 text-muted-foreground",
                      isSelected && "ring-2 ring-primary ring-inset",
                    )}
                  >
                    <span
                      className={cn(
                        "num inline-flex size-5 items-center justify-center rounded-full text-[11px] font-medium",
                        isToday && "bg-primary text-primary-foreground",
                      )}
                    >
                      {Number(cell.date.slice(8, 10))}
                    </span>
                    <span className="mt-1 flex flex-col gap-0.5">
                      {items.slice(0, 3).map((o) => (
                        <span
                          key={`${o.event.id}-${o.date}`}
                          className="flex items-center gap-1 truncate text-[10px]"
                        >
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              TYPE_TONE[o.event.type],
                            )}
                          />
                          <span className="truncate">{o.event.title}</span>
                        </span>
                      ))}
                      {items.length > 3 ? (
                        <span className="text-[10px] text-muted-foreground">
                          +{items.length - 3} {t("more", "أخرى")}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              {allowedEventTypes.map((type) => (
                <span
                  key={type}
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                >
                  <span className={cn("size-1.5 rounded-full", TYPE_TONE[type])} />
                  {type}
                </span>
              ))}
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel>
              <Section
                title={shortDate(selectedDate)}
                description={
                  dayEvents.length
                    ? `${dayEvents.length} ${t("scheduled", "موعد مجدول")}`
                    : t(
                        "Nothing scheduled. Double-click a day to add an event.",
                        "لا يوجد شيء مجدول. انقر نقرًا مزدوجًا على يوم لإضافة حدث.",
                      )
                }
              >
                <div className="space-y-2">
                  {dayEvents.map((o) => (
                    <button
                      key={`${o.event.id}-${o.date}`}
                      type="button"
                      onClick={() => openExisting(o.event)}
                      className="w-full rounded-lg border bg-card p-2.5 text-start transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-1 size-2 shrink-0 rounded-full",
                            TYPE_TONE[o.event.type],
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{o.event.title}</span>
                            {o.repeated ? (
                              <Repeat
                                className="size-3 shrink-0 text-muted-foreground"
                                aria-label={t("Repeating", "متكرر")}
                              />
                            ) : null}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span className="num inline-flex items-center gap-1">
                              <Clock className="size-3" />
                              {o.event.allDay
                                ? t("All day", "طوال اليوم")
                                : `${o.event.startTime}–${o.event.endTime}`}
                            </span>
                            {o.event.location ? (
                              <span className="inline-flex items-center gap-1 truncate">
                                <MapPin className="size-3" /> {o.event.location}
                              </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1">
                              <Users className="size-3" /> {o.event.attendeeIds.length}
                            </span>
                          </div>
                        </div>
                        <Pill
                          tone={
                            o.event.status === "Confirmed"
                              ? "success"
                              : o.event.status === "Cancelled"
                                ? "danger"
                                : "brand"
                          }
                        >
                          {o.event.status}
                        </Pill>
                      </div>
                    </button>
                  ))}
                  {dayEvents.length === 0 && canCreateEvent ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => openNew(selectedDate)}
                    >
                      <Plus className="size-4" /> {t("Add event", "إضافة حدث")}
                    </Button>
                  ) : null}
                </div>
              </Section>
            </Panel>

            <Panel>
              <Section
                title={t("Coming up", "القادم")}
                description={t(
                  "Next 30 days inside the selected workspace.",
                  "الثلاثون يومًا القادمة المرتبطة بدورك.",
                )}
              >
                <div className="space-y-2">
                  {upcoming.map((o) => (
                    <button
                      key={`${o.event.id}-${o.date}`}
                      type="button"
                      onClick={() => {
                        const d = parseISO(o.date);
                        setCursor({ year: d.getFullYear(), month: d.getMonth() });
                        setSelectedDate(o.date);
                      }}
                      className="flex w-full items-center gap-2 text-start text-xs"
                    >
                      <span
                        className={cn("size-1.5 shrink-0 rounded-full", TYPE_TONE[o.event.type])}
                      />
                      <span className="min-w-0 flex-1 truncate">{o.event.title}</span>
                      <span className="num shrink-0 text-muted-foreground">
                        {shortDate(o.date)}
                      </span>
                    </button>
                  ))}
                  {upcoming.length === 0 ? (
                    <EmptyState
                      title={t("Nothing in the next 30 days", "لا شيء خلال ٣٠ يومًا")}
                      description={t(
                        "New events will appear here as they are scheduled.",
                        "ستظهر الأحداث الجديدة هنا عند جدولتها.",
                      )}
                    />
                  ) : null}
                </div>
              </Section>
            </Panel>
          </div>
        </div>
      ) : (
        <ReminderBoard
          reminders={reminders}
          canCreate={canCreateReminder}
          canManage={(r) => r.ownerId === currentUser.id || currentUser.role === "Group Admin"}
          onCreate={() => setReminderOpen(true)}
          onToggle={(r) => {
            actions.toggleReminder(r.id);
            toast.success(
              r.active
                ? t("Reminder paused", "تم إيقاف التذكير")
                : t("Reminder activated", "تم تفعيل التذكير"),
              { description: r.title },
            );
          }}
          onRun={(r) => {
            actions.runReminder(r.id);
            toast.success(t("Reminder sent", "تم إرسال التذكير"), {
              description: `${r.recipientIds.length} ${t("recipients notified", "مستلمين تم إشعارهم")}`,
            });
          }}
          onDelete={(r) => {
            actions.deleteReminder(r.id);
            toast.success(t("Reminder deleted", "تم حذف التذكير"), { description: r.title });
          }}
          userName={userName}
          entityName={entityName}
          today={today}
          t={t}
        />
      )}

      {/* ── Event editor ────────────────────────────────────────────── */}
      <Dialog
        open={eventDialog.open}
        onOpenChange={(open) => setEventDialog((s) => ({ ...s, open }))}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {eventDialog.editing
                ? canEditSelectedEvent
                  ? t("Edit event", "تعديل الحدث")
                  : t("Event details", "تفاصيل الحدث")
                : t("New event", "حدث جديد")}
            </DialogTitle>
            <DialogDescription>
              {eventDialog.editing && !canEditSelectedEvent
                ? t(
                    "You are included in this event, but only the organiser or team manager can change it.",
                    "أنت مشارك في هذا الحدث، لكن المنظم أو مدير الفريق فقط يمكنه تعديله.",
                  )
                : t(
                    "Schedule the meeting or deadline, then keep the outcome and next action connected to the same workflow.",
                    "جدول الاجتماع أو الموعد النهائي، ثم اربط النتيجة والإجراء التالي بنفس مسار العمل.",
                  )}
            </DialogDescription>
          </DialogHeader>

          <fieldset disabled={!canEditSelectedEvent} className="space-y-3 disabled:opacity-90">
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">{t("Title", "العنوان")}</Label>
              <Input
                id="ev-title"
                value={draft.title}
                onChange={(e) => setD("title", e.target.value)}
                placeholder={t("Client review — Q4 scope", "مراجعة العميل")}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("Type", "النوع")}</Label>
                <Select value={draft.type} onValueChange={(v) => setD("type", v as EventType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedEventTypes.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Entity", "الكيان")}</Label>
                <Select value={draft.entityId} onValueChange={(v) => setD("entityId", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {db.entities
                      .filter((e) => currentUser.scope === "group" || e.id === currentUser.entityId)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-date">{t("Date", "التاريخ")}</Label>
                <Input
                  id="ev-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => setD("date", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-start">{t("Start", "البداية")}</Label>
                <Input
                  id="ev-start"
                  type="time"
                  value={draft.startTime}
                  disabled={draft.allDay}
                  onChange={(e) => setD("startTime", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-end">{t("End", "النهاية")}</Label>
                <Input
                  id="ev-end"
                  type="time"
                  value={draft.endTime}
                  disabled={draft.allDay}
                  onChange={(e) => setD("endTime", e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <Label htmlFor="ev-allday" className="text-sm font-normal">
                {t("All day", "طوال اليوم")}
              </Label>
              <Switch
                id="ev-allday"
                checked={draft.allDay}
                onCheckedChange={(v) => setD("allDay", v)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("Repeats", "التكرار")}</Label>
                <Select
                  value={draft.recurrence}
                  onValueChange={(v) => setD("recurrence", v as Cadence)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CADENCES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(cadenceLabel[c][0], cadenceLabel[c][1])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-until">{t("Repeat until", "يتكرر حتى")}</Label>
                <Input
                  id="ev-until"
                  type="date"
                  disabled={draft.recurrence === "none"}
                  value={draft.recurrenceUntil ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((p) => {
                      if (!v) {
                        const { recurrenceUntil: _drop, ...rest } = p;
                        return rest;
                      }
                      return { ...p, recurrenceUntil: v };
                    });
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-location">{t("Location", "المكان")}</Label>
              <Input
                id="ev-location"
                value={draft.location ?? ""}
                onChange={(e) => setD("location", e.target.value)}
                placeholder={t("Riyadh HQ, or a meeting link", "المقر الرئيسي أو رابط اجتماع")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("Organiser", "المنظّم")}</Label>
              <Select value={draft.organizerId} onValueChange={(v) => setD("organizerId", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {peopleOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("Attendees", "الحضور")}</Label>
              <div className="flex flex-wrap gap-1.5 rounded-lg border p-2">
                {peopleOptions.slice(0, 12).map((u) => {
                  const on = draft.attendeeIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() =>
                        setD(
                          "attendeeIds",
                          on
                            ? draft.attendeeIds.filter((x) => x !== u.id)
                            : [...draft.attendeeIds, u.id],
                        )
                      }
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {u.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-desc">{t("Description", "الوصف")}</Label>
              <Textarea
                id="ev-desc"
                rows={3}
                value={draft.description ?? ""}
                onChange={(e) => setD("description", e.target.value)}
              />
            </div>

            {draft.recurrence !== "none" ? (
              <p className="rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
                {t("Next occurrences", "المواعيد القادمة")}:{" "}
                <span className="num">
                  {occurrencesBetween(
                    { ...draft, id: "preview", createdBy: "" },
                    draft.date,
                    addDays(draft.date, 120),
                  )
                    .slice(0, 4)
                    .map((d) => shortDate(d))
                    .join(" · ")}
                </span>
              </p>
            ) : null}
          </fieldset>

          <DialogFooter className="gap-2 sm:justify-between">
            {eventDialog.editing && canEditSelectedEvent ? (
              <Button variant="outline" onClick={removeEvent} className="text-danger">
                <Trash2 className="size-4" /> {t("Delete", "حذف")}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEventDialog({ open: false })}>
                {canEditSelectedEvent ? t("Cancel", "إلغاء") : t("Close", "إغلاق")}
              </Button>
              {canEditSelectedEvent ? (
                <Button onClick={saveEvent}>
                  {eventDialog.editing ? t("Save changes", "حفظ") : t("Create event", "إنشاء")}
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        defaultEntity={defaultEntity}
        events={events}
        users={peopleOptions}
        today={today}
        categories={allowedReminderCategories}
        t={t}
        onSave={(r) => {
          actions.addReminder(r);
          toast.success(t("Reminder scheduled", "تمت جدولة التذكير"), {
            description: `${t(cadenceLabel[r.cadence][0], cadenceLabel[r.cadence][1])} · ${r.recipientIds.length} ${t("recipients", "مستلمين")}`,
          });
          setReminderOpen(false);
          setView("reminders");
        }}
      />
    </div>
  );
}

/* ── Reminder schedules board ──────────────────────────────────────── */

function ReminderBoard({
  reminders,
  canCreate,
  canManage,
  onCreate,
  onToggle,
  onRun,
  onDelete,
  userName,
  entityName,
  today,
  t,
}: {
  reminders: ReminderSchedule[];
  canCreate: boolean;
  canManage: (r: ReminderSchedule) => boolean;
  onCreate: () => void;
  onToggle: (r: ReminderSchedule) => void;
  onRun: (r: ReminderSchedule) => void;
  onDelete: (r: ReminderSchedule) => void;
  userName: (id?: string) => string;
  entityName: (id: string) => string;
  today: string;
  t: (en: string, ar: string) => string;
}) {
  if (!reminders.length) {
    return (
      <Panel>
        <EmptyState
          title={t("No reminder schedules yet", "لا توجد جداول تذكير بعد")}
          description={t(
            "Schedule a recurring notification so the concerned people hear about it — daily, weekly, every two weeks, monthly or quarterly.",
            "أنشئ إشعارًا متكررًا ليصل المعنيين — يوميًا أو أسبوعيًا أو كل أسبوعين أو شهريًا أو ربع سنوي.",
          )}
          action={
            canCreate ? (
              <Button onClick={onCreate}>
                <Plus className="size-4" /> {t("New reminder", "تذكير جديد")}
              </Button>
            ) : undefined
          }
        />
      </Panel>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {reminders.map((r) => {
        const at = nextRun(r, today);
        return (
          <Panel key={r.id} className={cn(!r.active && "opacity-60")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">{r.title}</h3>
                  <Pill tone={r.active ? "success" : "neutral"}>
                    {r.active ? t("Active", "نشط") : t("Paused", "متوقف")}
                  </Pill>
                </div>
                {r.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
                ) : null}
              </div>
              <Pill tone="brand">{t(cadenceLabel[r.cadence][0], cadenceLabel[r.cadence][1])}</Pill>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">{t("Next send", "الإرسال التالي")}</dt>
                <dd className="num font-medium">{at ? shortDate(at) : t("—", "—")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("Lead time", "مهلة التنبيه")}</dt>
                <dd className="num font-medium">
                  {r.leadDays === 0
                    ? t("On the day", "في نفس اليوم")
                    : `${r.leadDays} ${r.leadDays === 1 ? t("day before", "يوم قبل") : t("days before", "أيام قبل")}`}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("Channels", "القنوات")}</dt>
                <dd className="font-medium">{r.channels.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("Entity", "الكيان")}</dt>
                <dd className="font-medium">{entityName(r.entityId)}</dd>
              </div>
            </dl>

            <div className="mt-3">
              <div className="text-xs text-muted-foreground">{t("Notifies", "يُشعر")}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {r.recipientIds.map((id) => (
                  <span key={id} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                    {userName(id)}
                  </span>
                ))}
              </div>
            </div>

            {canManage(r) ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onRun(r)}>
                  <BellRing className="size-4" /> {t("Send now", "إرسال الآن")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => onToggle(r)}>
                  {r.active ? t("Pause", "إيقاف") : t("Activate", "تفعيل")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => onDelete(r)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                {t(
                  "Managed by another owner; visible here because it affects your work.",
                  "يديره مسؤول آخر ويظهر هنا لأنه يؤثر على عملك.",
                )}
              </p>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

/* ── Reminder creator ──────────────────────────────────────────────── */

function ReminderDialog({
  open,
  onOpenChange,
  defaultEntity,
  events,
  users,
  today,
  categories,
  t,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultEntity: string;
  events: CalendarEvent[];
  users: { id: string; name: string }[];
  today: string;
  categories: Notification["category"][];
  t: (en: string, ar: string) => string;
  onSave: (r: Omit<ReminderSchedule, "id" | "ownerId">) => void;
}) {
  const [form, setForm] = useState<Omit<ReminderSchedule, "id" | "ownerId">>({
    title: "",
    recipientIds: [],
    cadence: "weekly",
    leadDays: 0,
    sendTime: "09:00",
    channels: ["in-app"],
    startDate: today,
    active: true,
    entityId: defaultEntity,
    category: "Calendar",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));
  const preview = nextRun({ ...form, id: "preview", ownerId: "" }, today);

  const submit = () => {
    if (!form.title.trim()) {
      toast.error(t("Give the reminder a title", "أضف عنوانًا للتذكير"));
      return;
    }
    if (!form.recipientIds.length) {
      toast.error(t("Pick at least one recipient", "اختر مستلمًا واحدًا على الأقل"));
      return;
    }
    if (!form.channels.length) {
      toast.error(t("Pick at least one channel", "اختر قناة واحدة على الأقل"));
      return;
    }
    onSave(form);
    setForm((p) => ({ ...p, title: "", recipientIds: [] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Schedule a reminder", "جدولة تذكير")}</DialogTitle>
          <DialogDescription>
            {t(
              "Pick who needs to know and how often. Everyone listed gets their own notification each time it fires.",
              "اختر من يجب إبلاغه وعدد مرات التكرار. يتلقى كل شخص مُدرج إشعارًا خاصًا به عند كل إرسال.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rm-title">{t("What is the reminder about?", "موضوع التذكير")}</Label>
            <Input
              id="rm-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={t("Overdue receivables sweep", "متابعة المستحقات المتأخرة")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rm-desc">{t("Detail", "التفاصيل")}</Label>
            <Textarea
              id="rm-desc"
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("Repeat", "التكرار")}</Label>
              <Select value={form.cadence} onValueChange={(v) => set("cadence", v as Cadence)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CADENCES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(cadenceLabel[c][0], cadenceLabel[c][1])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Category", "التصنيف")}</Label>
              <Select
                value={form.category}
                onValueChange={(v) => set("category", v as Notification["category"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="rm-start">{t("Starting", "يبدأ")}</Label>
              <Input
                id="rm-start"
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rm-lead">{t("Notify days before", "التنبيه قبل (أيام)")}</Label>
              <Input
                id="rm-lead"
                type="number"
                min={0}
                max={30}
                value={form.leadDays}
                onChange={(e) => set("leadDays", Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rm-time">{t("Send at", "وقت الإرسال")}</Label>
              <Input
                id="rm-time"
                type="time"
                value={form.sendTime}
                onChange={(e) => set("sendTime", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("Attach to an event", "ربط بحدث")}</Label>
            <Select
              value={form.eventId ?? "none"}
              onValueChange={(v) =>
                setForm((p) => {
                  if (v === "none") {
                    const { eventId: _drop, ...rest } = p;
                    return rest;
                  }
                  const ev = events.find((e) => e.id === v);
                  return {
                    ...p,
                    eventId: v,
                    ...(ev ? { startDate: ev.date, entityId: ev.entityId } : {}),
                  };
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("Standalone reminder", "تذكير مستقل")}</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("Who gets notified", "من يتلقى الإشعار")}</Label>
            <div className="flex flex-wrap gap-1.5 rounded-lg border p-2">
              {users.slice(0, 12).map((u) => {
                const on = form.recipientIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() =>
                      set(
                        "recipientIds",
                        on
                          ? form.recipientIds.filter((x) => x !== u.id)
                          : [...form.recipientIds, u.id],
                      )
                    }
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {u.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("Channels", "القنوات")}</Label>
            <div className="flex gap-2">
              {(["in-app", "email"] as const).map((c) => {
                const on = form.channels.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      set(
                        "channels",
                        on ? form.channels.filter((x) => x !== c) : [...form.channels, c],
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {c === "in-app" ? t("In-app", "داخل التطبيق") : t("Email", "بريد إلكتروني")}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
            {t("First notification", "أول إشعار")}:{" "}
            <span className="num font-medium text-foreground">
              {preview
                ? `${shortDate(preview)} · ${form.sendTime}`
                : t("not scheduled", "غير مجدول")}
            </span>
            {form.leadDays > 0
              ? ` — ${form.leadDays} ${t("days before each occurrence", "يوم قبل كل موعد")}`
              : ""}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel", "إلغاء")}
          </Button>
          <Button onClick={submit}>{t("Schedule reminder", "جدولة التذكير")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const Route = createFileRoute("/calendar")({ component: CalendarPage });
