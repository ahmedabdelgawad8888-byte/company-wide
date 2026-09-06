import { describe, expect, test } from "bun:test";
import { addDays, addMonths, monthGrid, nextRun, occurrencesBetween, step } from "./calendar";
import type { CalendarEvent, ReminderSchedule } from "./types";

const event: CalendarEvent = {
  id: "e1",
  title: "Weekly sync",
  type: "Meeting",
  entityId: "en1",
  date: "2026-09-07",
  startTime: "10:00",
  endTime: "11:00",
  allDay: false,
  organizerId: "u1",
  attendeeIds: [],
  status: "Scheduled",
  recurrence: "none",
  createdBy: "u1",
};

const schedule: ReminderSchedule = {
  id: "r1",
  title: "Month-end close",
  recipientIds: ["u1"],
  cadence: "monthly",
  leadDays: 3,
  sendTime: "09:00",
  channels: ["in-app"],
  startDate: "2026-09-10",
  active: true,
  entityId: "en1",
  ownerId: "u1",
  category: "Finance",
};

describe("date arithmetic", () => {
  test("clamps to the end of a short month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29"); // leap year
    expect(addMonths("2026-03-31", 3)).toBe("2026-06-30");
  });
  test("crosses year boundaries", () => {
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  test("steps each cadence", () => {
    expect(step("2026-09-04", "weekly")).toBe("2026-09-11");
    expect(step("2026-09-04", "biweekly")).toBe("2026-09-18");
    expect(step("2026-09-04", "none")).toBeNull();
  });
});

describe("event recurrence", () => {
  test("a one-off appears only inside its window", () => {
    expect(occurrencesBetween(event, "2026-09-01", "2026-09-30")).toEqual(["2026-09-07"]);
    expect(occurrencesBetween(event, "2026-10-01", "2026-10-31")).toEqual([]);
  });
  test("expands weekly and biweekly", () => {
    expect(
      occurrencesBetween({ ...event, recurrence: "weekly" }, "2026-09-01", "2026-09-30"),
    ).toEqual(["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"]);
    expect(
      occurrencesBetween({ ...event, recurrence: "biweekly" }, "2026-09-01", "2026-09-30"),
    ).toEqual(["2026-09-07", "2026-09-21"]);
  });
  test("honours recurrenceUntil and mid-series windows", () => {
    expect(
      occurrencesBetween(
        { ...event, recurrence: "weekly", recurrenceUntil: "2026-09-15" },
        "2026-09-01",
        "2026-09-30",
      ),
    ).toEqual(["2026-09-07", "2026-09-14"]);
    expect(
      occurrencesBetween({ ...event, recurrence: "weekly" }, "2026-09-15", "2026-09-30"),
    ).toEqual(["2026-09-21", "2026-09-28"]);
  });
});

describe("reminder scheduling", () => {
  test("fires leadDays before the occurrence", () => {
    expect(nextRun(schedule, "2026-09-04")).toBe("2026-09-07");
  });
  test("rolls forward once the window has passed", () => {
    expect(nextRun(schedule, "2026-09-08")).toBe("2026-10-07");
  });
  test("returns null when inactive, ended, or already past", () => {
    expect(nextRun({ ...schedule, active: false }, "2026-09-04")).toBeNull();
    expect(nextRun({ ...schedule, endDate: "2026-09-01" }, "2026-09-04")).toBeNull();
    expect(nextRun({ ...schedule, cadence: "none" }, "2026-09-20")).toBeNull();
  });
});

describe("month grid", () => {
  test("returns a padded 6x7 grid starting on the configured weekday", () => {
    const grid = monthGrid(2026, 8, 6); // September 2026, weeks start Saturday
    expect(grid).toHaveLength(42);
    expect(grid[0]!.weekday).toBe(6);
    expect(grid.filter((g) => g.inMonth)).toHaveLength(30);
  });
});
