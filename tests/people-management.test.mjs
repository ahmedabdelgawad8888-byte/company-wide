import test from "node:test";
import assert from "node:assert/strict";
import {
  validateUser,
  validateRemoval,
  canManageUser,
  canManageAllUsers,
} from "../src/lib/user-management.ts";
import { reconcilePeople, IT_PEOPLE } from "../src/lib/it-directory.ts";
import { emptyState } from "../src/features/workspaces/service.ts";
import { ensureHRWorkspace } from "../src/features/workspaces/hr-workspace.ts";
import { ensureITWorkspace } from "../src/features/workspaces/it-seed.ts";
import { reconcileOperationalPeople } from "../src/features/workspaces/people-reconciliation.ts";
const admin = {
  id: "admin",
  name: "Administrator",
  email: "admin@example.com",
  role: "Group Admin",
  workspaceId: "management",
  workspaceLevel: "lead",
  department: "Management",
  entityId: "eg",
  scope: "group",
  status: "active",
  lastLogin: "",
};
const hr = {
  ...admin,
  id: "hr",
  name: "Actual HR member",
  email: "hr@example.com",
  role: "HR Specialist",
  workspaceId: "hr",
  workspaceLevel: "member",
  department: "HR",
};
test("user creation validates unique emails and rejects privilege changes by members", () => {
  assert.equal(validateUser([admin], admin, hr).name, "Actual HR member");
  assert.throws(() => validateUser([admin, hr], admin, hr), /already exists/);
  assert.throws(
    () => validateUser([admin, hr], hr, { ...hr, role: "Group Admin" }),
    /cannot manage/,
  );
  assert.throws(() => validateRemoval([admin, hr], hr, admin.id), /cannot remove/);
  assert.throws(() => validateRemoval([admin], admin, admin.id), /signed-in/);
});
test("IT manual imports only supplied names, no invented email addresses, and does not resurrect removed users", () => {
  const users = reconcilePeople([admin]);
  assert.equal(users.filter((u) => u.workspaceId === "it").length, 8);
  assert.deepEqual(
    users.filter((u) => u.source).map((u) => u.name),
    IT_PEOPLE.map((u) => u.name),
  );
  assert.ok(users.filter((u) => u.source).every((u) => u.email === ""));
  const removed = users.filter((u) => u.id !== "it-reda");
  assert.ok(!reconcilePeople(removed, true).some((u) => u.id === "it-reda"));
  assert.equal(users.find((u) => u.name === "A. Sabri").workspaceLevel, "lead");
  assert.equal(users.find((u) => u.name === "Mahmoud Taha").workspaceLevel, "member");
});
test("HR starts with an unassigned guide and no invented staff", () => {
  const s = emptyState();
  ensureHRWorkspace(s, [admin]);
  assert.equal(s.records.length, 56);
  assert.ok(s.records.every((r) => r.ownerId === "unassigned" && r.details.enabled === "false"));
});
test("IT source tasks and backup ownership follow manual and preserve edits on reload", () => {
  const users = reconcilePeople([admin]);
  const s = emptyState();
  ensureITWorkspace(s, users);
  reconcileOperationalPeople(s, users);
  assert.equal(s.records.filter((r) => r.sourceId === "trygc_it_manual.html").length, 11);
  assert.equal(
    s.records.find((r) => r.title === "Veeam backup status check").ownerId,
    "it-mahmoud",
  );
  assert.equal(s.records.find((r) => r.id === "IT-MANUAL-63").ownerId, "core-sabry");
  assert.deepEqual(s.records.find((r) => r.id === "IT-MANUAL-1").collaborators, ["it-mahmoud"]);
  const task = s.records.find((r) => r.id === "IT-MANUAL-63");
  task.ownerId = "it-nasef";
  reconcileOperationalPeople(s, users);
  assert.equal(task.ownerId, "it-nasef");
});

test("master user settings require an active global administrator", () => {
  assert.equal(canManageAllUsers(admin), true);
  assert.equal(canManageAllUsers({ ...admin, role: "Executive Management" }), true);
  for (const role of ["HR Manager", "HR Specialist", "IT Admin", "Viewer"])
    assert.equal(canManageAllUsers({ ...admin, role }), false);
  assert.equal(canManageAllUsers({ ...admin, status: "suspended" }), false);
});
