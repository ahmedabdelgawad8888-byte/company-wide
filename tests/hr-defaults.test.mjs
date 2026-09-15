import test from "node:test";
import assert from "node:assert/strict";
import {
  initialHRSchedule,
  nextHRDate,
  ensureHRWorkspace,
  guide,
  hrDraft,
} from "../src/features/workspaces/hr-workspace.ts";
import { emptyState, createRecord, updateRecord } from "../src/features/workspaces/service.ts";
const lead = {
  id: "lead",
  name: "HR lead",
  department: "HR",
  role: "HR Manager",
  entityId: "eg",
  scope: "group",
  status: "active",
};
const admin = { ...lead, id: "admin", role: "Group Admin" };
test("HR default dates implement weekly Thursday, payroll cut-off and mixed monthly cycles", () => {
  assert.deepEqual(initialHRSchedule("Weekly", "Recruitment Progress Report", "2026-09-15"), {
    date: "2026-09-17",
    anchor: 17,
  });
  assert.deepEqual(
    initialHRSchedule("Monthly", "Payroll Inputs & Attendance Validation", "2026-09-15"),
    { date: "2026-09-28", anchor: 28 },
  );
  assert.deepEqual(initialHRSchedule("Monthly", "HR Monthly Report", "2026-09-15"), {
    date: "2026-09-30",
    anchor: 31,
  });
  assert.equal(nextHRDate("2026-09-17", "Daily", 17), "2026-09-20");
  const s = emptyState();
  ensureHRWorkspace(s, [lead, admin]);
  assert.equal(s.records.filter((r) => r.details.enabled === "true").length, 28);
  for (const r of s.records) {
    const row = guide.tasks.find((t) => t.id === r.id);
    if (row.frequency === "Monthly / Quarterly") assert.equal(r.details.selectedCadence, "Monthly");
  }
});
test("HR guide requirements cannot be removed or changed on execution records", () => {
  const s = emptyState();
  ensureHRWorkspace(s, [lead, admin]);
  const r = createRecord(s, lead, hrDraft(s.records[0]), [lead, admin]);
  assert.throws(
    () =>
      updateRecord(s, lead, r.id, { ...r, details: { ...r.details, guideId: "" } }, [lead, admin]),
    /source guide/,
  );
  assert.throws(
    () =>
      updateRecord(s, lead, r.id, { ...r, details: { ...r.details, sla: "Optional" } }, [
        lead,
        admin,
      ]),
    /requirements are fixed/,
  );
});
