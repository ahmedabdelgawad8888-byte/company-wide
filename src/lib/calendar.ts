import type { Cadence, CalendarEvent, ReminderSchedule } from "./types";

/* Dates are handled as plain "YYYY-MM-DD" strings so nothing shifts across timezones. */

export const ISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const parseISO = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
};

export const addDays = (s: string, n: number) => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return ISO(d);
};

export const addMonths = (s: string, n: number) => {
  const d = parseISO(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  // Clamp so 31 Jan +1 month lands on 28/29 Feb rather than spilling into March.
  d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
  return ISO(d);
};

export const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

export const CADENCES: Cadence[] = [
  "none",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
];

export const cadenceLabel: Record<Cadence, [string, string]> = {
  none: ["Does not repeat", "لا يتكرر"],
  daily: ["Daily", "يوميًا"],
  weekly: ["Weekly", "أسبوعيًا"],
  biweekly: ["Every 2 weeks", "كل أسبوعين"],
  monthly: ["Monthly", "شهريًا"],
  quarterly: ["Quarterly", "ربع سنوي"],
  yearly: ["Yearly", "سنويًا"],
};

/** Advance a date by one step of the cadence. Returns null for "none". */
export function step(date: string, cadence: Cadence): string | null {
  switch (cadence) {
    case "daily":
      return addDays(date, 1);
    case "weekly":
      return addDays(date, 7);
    case "biweekly":
      return addDays(date, 14);
    case "monthly":
      return addMonths(date, 1);
    case "quarterly":
      return addMonths(date, 3);
    case "yearly":
      return addMonths(date, 12);
    default:
      return null;
  }
}

/** Hard ceiling so a malformed rule can never spin forever. */
const MAX_OCCURRENCES = 400;

/**
 * Expand one event into the concrete dates it occupies between `from` and `to`
 * (inclusive). A non-repeating event yields at most one date.
 */
export function occurrencesBetween(event: CalendarEvent, from: string, to: string): string[] {
  const out: string[] = [];
  if (event.recurrence === "none") {
    if (event.date >= from && event.date <= to) out.push(event.date);
    return out;
  }
  const ceiling = event.recurrenceUntil && event.recurrenceUntil < to ? event.recurrenceUntil : to;
  let cursor = event.date;
  for (let i = 0; i < MAX_OCCURRENCES && cursor <= ceiling; i++) {
    if (cursor >= from) out.push(cursor);
    const next = step(cursor, event.recurrence);
    if (!next || next === cursor) break;
    cursor = next;
  }
  return out;
}

/** Every event occurrence in a window, flattened and sorted. */
export function eventsBetween(events: CalendarEvent[], from: string, to: string) {
  const rows = events.flatMap((e) =>
    occurrencesBetween(e, from, to).map((date) => ({ event: e, date, repeated: date !== e.date })),
  );
  return rows.sort(
    (a, b) => a.date.localeCompare(b.date) || a.event.startTime.localeCompare(b.event.startTime),
  );
}

/**
 * The next date a reminder should fire on or after `from`, accounting for the
 * lead time. Returns null when the schedule is inactive or has run out.
 */
export function nextRun(schedule: ReminderSchedule, from: string): string | null {
  if (!schedule.active) return null;
  const fire = (occurrence: string) => addDays(occurrence, -schedule.leadDays);

  if (schedule.cadence === "none") {
    const one = fire(schedule.startDate);
    return one >= from ? one : null;
  }
  let cursor = schedule.startDate;
  for (let i = 0; i < MAX_OCCURRENCES; i++) {
    if (schedule.endDate && cursor > schedule.endDate) return null;
    const at = fire(cursor);
    if (at >= from) return at;
    const next = step(cursor, schedule.cadence);
    if (!next || next === cursor) return null;
    cursor = next;
  }
  return null;
}

/** Schedules whose next run has arrived (or been missed) as of `today`. */
export function dueReminders(schedules: ReminderSchedule[], today: string) {
  return schedules
    .filter((s) => s.active)
    .map((s) => ({
      schedule: s,
      at: nextRun(s, s.lastRunAt ? addDays(s.lastRunAt, 1) : s.startDate),
    }))
    .filter((r): r is { schedule: ReminderSchedule; at: string } => r.at !== null && r.at <= today);
}

/** The 6x7 day grid covering a month, padded with neighbouring days. */
export function monthGrid(year: number, month: number, weekStartsOn = 6) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date: ISO(d), inMonth: d.getMonth() === month, weekday: d.getDay() };
  });
}

export const monthLabel = (year: number, month: number, lang: "en" | "ar") =>
  new Date(year, month, 1).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
    month: "long",
    year: "numeric",
  });

/** Minutes between two "HH:MM" stamps, used for day-view block heights. */
export function minutesBetween(startTime: string, endTime: string) {
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  return Math.max(0, toMin(endTime) - toMin(startTime));
}
