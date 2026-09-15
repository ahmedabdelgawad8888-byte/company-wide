import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureHRWorkspace,
  guide,
  hrDraft,
  nextHRDate,
  runHRSchedules,
} from "../src/features/workspaces/hr-workspace.ts";
import { emptyState, createRecord, updateRecord } from "../src/features/workspaces/service.ts";
import { closed, recordSchema } from "../src/features/workspaces/model.ts";
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
const users = [lead, admin];
test("HR migration imports every guide row once and preserves existing records and configured ownership", () => {
  const s = emptyState();
  ensureHRWorkspace(s, users);
  assert.equal(s.records.length, 56);
  for (const r of s.records) recordSchema.parse(r);
  s.records[0].ownerId = "admin";
  assert.equal(ensureHRWorkspace(s, users), false);
  assert.equal(s.records[0].ownerId, "admin");
  assert.equal(s.records.length, guide.tasks.length);
  assert.equal(new Set(guide.tasks.map((t) => t.category)).size, 10);
});
test("HR recurrence respects calendar intervals, leap year and month end", () => {
  assert.equal(nextHRDate("2028-01-31", "Monthly", 31), "2028-02-29");
  assert.equal(nextHRDate("2028-02-29", "Monthly", 31), "2028-03-31");
  assert.equal(nextHRDate("2026-09-15", "Quarterly", 15), "2026-12-15");
  assert.equal(nextHRDate("2026-09-15", "Semi-Annual", 15), "2027-03-15");
  assert.equal(nextHRDate("2026-09-15", "Annual", 15), "2027-09-15");
  assert.equal(nextHRDate("2026-09-15", "Weekly", 15), "2026-09-22");
});
test("HR schedules catch up once, include the upcoming execution, and skip disabled/request tasks", () => {
  const s = emptyState();
  ensureHRWorkspace(s, users);
  for (const r of s.records) r.details.enabled = "false";
  runHRSchedules(s, admin, users, "2026-09-15");
  assert.equal(s.records.length, 56);
  const r = s.records[0];
  Object.assign(r.details, {
    enabled: "true",
    selectedCadence: "Daily",
    nextExecution: "2026-09-13",
    anchorDay: "13",
  });
  runHRSchedules(s, admin, users, "2026-09-15");
  assert.equal(s.records.filter((r) => r.kind === "hr-task").length, 4);
  runHRSchedules(s, admin, users, "2026-09-15");
  assert.equal(s.records.filter((r) => r.kind === "hr-task").length, 4);
  assert.equal(r.details.nextExecution, "2026-09-16");
});
test("HR completion requires ordered progress, evidence and independent assigned approval", () => {
  const s = emptyState();
  ensureHRWorkspace(s, users);
  const draft = hrDraft(s.records[0]);
  draft.details.approverId = "admin";
  const r = createRecord(s, lead, draft, users);
  assert.throws(() => updateRecord(s, lead, r.id, { ...r, status: "Completed" }, users), /flow/);
  updateRecord(s, lead, r.id, { ...r, status: "In Progress" }, users);
  assert.throws(
    () => updateRecord(s, lead, r.id, { ...r, status: "Pending Approval" }, users),
    /evidence/,
  );
  updateRecord(
    s,
    lead,
    r.id,
    {
      ...r,
      status: "Pending Approval",
      details: { ...r.details, evidenceLink: "Attendance report attached to case" },
    },
    users,
  );
  assert.throws(
    () => updateRecord(s, lead, r.id, { ...r, status: "Approved" }, users),
    /assigned approver/,
  );
  updateRecord(
    s,
    admin,
    r.id,
    {
      ...r,
      status: "Approved",
      details: { ...r.details, approvalReason: "Reviewed attendance evidence" },
    },
    users,
  );
  assert.equal(closed(r), false);
  updateRecord(s, lead, r.id, { ...r, status: "Completed" }, users);
  assert.equal(closed(r), true);
});
