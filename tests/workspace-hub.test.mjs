import test from "node:test";
import assert from "node:assert/strict";
import {
  WORKSPACES,
  getWorkspace,
  getWorkspaceIdsForUser,
  getWorkspaceNav,
  workspaceOwnsDepartment,
} from "../src/lib/workspace-hub.ts";

const financeUser = {
  id: "f",
  name: "Finance User",
  department: "Finance",
  role: "Branch Accountant",
};
const salesUser = { id: "s", name: "Sales User", department: "Sales", role: "Account Manager" };
const coreUser = {
  id: "core-essmat",
  name: "Ahmed Essmat",
  department: "Technology",
  role: "Group Admin",
};
const hrUser = { id: "hr", name: "HR User", department: "HR", role: "Viewer" };
const dataUser = { id: "data", name: "Data User", department: "Data Analysis", role: "Viewer" };

test("hub exposes exactly five primary workspaces", () => {
  assert.deepEqual(
    WORKSPACES.map((w) => w.id),
    ["core", "sales", "finance", "hr", "data"],
  );
});

test("department users land in the workspace that matches their job", () => {
  assert.deepEqual(getWorkspaceIdsForUser(financeUser), ["finance"]);
  assert.deepEqual(getWorkspaceIdsForUser(salesUser), ["sales"]);
  assert.deepEqual(getWorkspaceIdsForUser(hrUser), ["hr"]);
  assert.deepEqual(getWorkspaceIdsForUser(dataUser), ["data"]);
});

test("core team members can access Core plus the workspace relevant to their function", () => {
  assert.ok(getWorkspaceIdsForUser(coreUser).includes("core"));
});

test("each workspace has purpose-built navigation rather than the old global Finance menu", () => {
  const financePaths = getWorkspaceNav("finance").flatMap((g) => g.items.map((i) => i.to));
  const corePaths = getWorkspaceNav("core").flatMap((g) => g.items.map((i) => i.to));
  const hrPaths = getWorkspaceNav("hr").flatMap((g) => g.items.map((i) => i.to));
  assert.ok(financePaths.includes("/finance/invoices"));
  assert.ok(!corePaths.includes("/finance/invoices"));
  assert.ok(hrPaths.includes("/admin/users"));
});

test("department ownership maps tasks into the correct workspace", () => {
  assert.equal(workspaceOwnsDepartment("finance", "Finance"), true);
  assert.equal(workspaceOwnsDepartment("sales", "Sales"), true);
  assert.equal(workspaceOwnsDepartment("core", "IT"), true);
  assert.equal(workspaceOwnsDepartment("core", "Technology"), true);
  assert.equal(workspaceOwnsDepartment("hr", "HR"), true);
  assert.equal(workspaceOwnsDepartment("data", "Data Analysis"), true);
  assert.equal(workspaceOwnsDepartment("sales", "Finance"), false);
});

test("workspace metadata uses clear action-oriented titles", () => {
  assert.equal(getWorkspace("core").title, "Core Team");
  assert.equal(getWorkspace("data").title, "Data Analysis");
});
