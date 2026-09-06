import test from "node:test";
import assert from "node:assert/strict";
import { taskVisibleToRole, defaultTaskView } from "../src/lib/task-role.ts";

const salesMine = { ownerId: "me", department: "Sales", source: "Manual" };
const salesOther = { ownerId: "other", department: "Sales", source: "Manual" };
const financeMine = { ownerId: "me", department: "Finance", source: "Bill" };
const financeOther = { ownerId: "other", department: "Finance", source: "Bill" };

test("individual sales user sees only own actions", () => {
  assert.equal(taskVisibleToRole(salesMine, "Account Manager", "me"), true);
  assert.equal(taskVisibleToRole(salesOther, "Account Manager", "me"), false);
  assert.equal(taskVisibleToRole(financeMine, "Account Manager", "me"), false);
  assert.equal(defaultTaskView("Account Manager"), "My Tasks");
});

test("sales manager sees Sales team actions only", () => {
  assert.equal(taskVisibleToRole(salesMine, "Sales Manager", "me"), true);
  assert.equal(taskVisibleToRole(salesOther, "Sales Manager", "me"), true);
  assert.equal(taskVisibleToRole(financeOther, "Sales Manager", "me"), false);
  assert.equal(defaultTaskView("Sales Manager"), "Sales");
});

test("branch accountant sees only own actions", () => {
  assert.equal(taskVisibleToRole(financeMine, "Branch Accountant", "me"), true);
  assert.equal(taskVisibleToRole(financeOther, "Branch Accountant", "me"), false);
  assert.equal(defaultTaskView("Branch Accountant"), "My Tasks");
});

test("group finance sees Finance team actions", () => {
  assert.equal(taskVisibleToRole(financeMine, "Group Finance", "me"), true);
  assert.equal(taskVisibleToRole(financeOther, "Group Finance", "me"), true);
  assert.equal(taskVisibleToRole(salesOther, "Group Finance", "me"), false);
  assert.equal(defaultTaskView("Group Finance"), "Finance");
});

test("executive and admin see both operating teams", () => {
  assert.equal(taskVisibleToRole(salesOther, "Executive Management", "me"), true);
  assert.equal(taskVisibleToRole(financeOther, "Executive Management", "me"), true);
  assert.equal(taskVisibleToRole(salesOther, "Group Admin", "me"), true);
  assert.equal(defaultTaskView("Executive Management"), "All");
});
