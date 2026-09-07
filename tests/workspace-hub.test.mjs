import test from "node:test";
import assert from "node:assert/strict";
import {
  WORKSPACES,
  getWorkspace,
  getHomeWorkspace,
  getWorkspaceLevel,
  getWorkspaceIdsForUser,
  getWorkspaceNav,
  workspaceOwnsDepartment,
} from "../src/lib/workspace-hub.ts";

const financeLead = {
  id: "u3",
  name: "Finance Lead",
  department: "Finance",
  role: "Group Finance",
  workspaceId: "finance",
  workspaceLevel: "lead",
};
const financeMember = {
  id: "f",
  name: "Finance User",
  department: "Finance",
  role: "Branch Accountant",
};
const salesUser = { id: "s", name: "Sales User", department: "Sales", role: "Account Manager" };
const adminUser = {
  id: "core-essmat",
  name: "Ahmed Essmat",
  department: "Technology",
  role: "Group Admin",
};
const hrUser = { id: "hr", name: "HR User", department: "HR", role: "HR Manager" };
const dataUser = {
  id: "data",
  name: "Data User",
  department: "Data Analysis",
  role: "Data Analyst",
};

test("hub exposes exactly four primary workspaces", () => {
  assert.deepEqual(
    WORKSPACES.map((w) => w.id),
    ["management", "sales", "finance", "hr"],
  );
});

test("everyone belongs to exactly one workspace", () => {
  assert.deepEqual(getWorkspaceIdsForUser(financeMember), ["finance"]);
  assert.deepEqual(getWorkspaceIdsForUser(salesUser), ["sales"]);
  assert.deepEqual(getWorkspaceIdsForUser(hrUser), ["hr"]);
  // Data analysis is folded into Management.
  assert.deepEqual(getWorkspaceIdsForUser(dataUser), ["management"]);
});

test("only Group Admin / Executive Management see every workspace", () => {
  assert.deepEqual(getWorkspaceIdsForUser(adminUser), ["management", "sales", "finance", "hr"]);
  assert.deepEqual(getWorkspaceIdsForUser({ ...adminUser, role: "Executive Management" }), [
    "management",
    "sales",
    "finance",
    "hr",
  ]);
  assert.equal(getWorkspaceIdsForUser(salesUser).length, 1);
});

test("an explicit workspaceId wins over the department fallback", () => {
  assert.equal(getHomeWorkspace({ id: "x", department: "Sales", workspaceId: "hr" }), "hr");
  assert.equal(getHomeWorkspace(financeMember), "finance");
});

test("the hierarchy resolves lead, supervisor and member", () => {
  assert.equal(getWorkspaceLevel(financeLead), "lead");
  assert.equal(getWorkspaceLevel(financeMember), "member");
  assert.equal(getWorkspaceLevel({ id: "sm", role: "Sales Manager" }), "lead");
  assert.equal(getWorkspaceLevel({ id: "cm", role: "Community Manager" }), "supervisor");
  assert.equal(getWorkspaceLevel({ id: "v", role: "Viewer" }), "member");
  // An explicit level always wins over the role fallback.
  assert.equal(getWorkspaceLevel({ id: "v", role: "Viewer", workspaceLevel: "lead" }), "lead");
});

test("each workspace has purpose-built navigation rather than the old global Finance menu", () => {
  const financePaths = getWorkspaceNav("finance").flatMap((g) => g.items.map((i) => i.to));
  const managementPaths = getWorkspaceNav("management").flatMap((g) => g.items.map((i) => i.to));
  const hrPaths = getWorkspaceNav("hr").flatMap((g) => g.items.map((i) => i.to));
  assert.ok(financePaths.includes("/finance/invoices"));
  assert.ok(!managementPaths.includes("/finance/invoices"));
  assert.ok(hrPaths.includes("/admin/users"));
});

test("department ownership maps tasks into the correct workspace", () => {
  assert.equal(workspaceOwnsDepartment("finance", "Finance"), true);
  assert.equal(workspaceOwnsDepartment("sales", "Sales"), true);
  assert.equal(workspaceOwnsDepartment("management", "IT"), true);
  assert.equal(workspaceOwnsDepartment("management", "Technology"), true);
  assert.equal(workspaceOwnsDepartment("hr", "HR"), true);
  assert.equal(workspaceOwnsDepartment("management", "Data Analysis"), true);
  assert.equal(workspaceOwnsDepartment("sales", "Finance"), false);
});

test("workspace metadata uses clear action-oriented titles", () => {
  assert.equal(getWorkspace("management").title, "Management");
  assert.equal(getWorkspace("hr").title, "HR");
});
