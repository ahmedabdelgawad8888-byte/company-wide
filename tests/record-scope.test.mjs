import test from "node:test";
import assert from "node:assert/strict";
import {
  clientVisibleToRole,
  eventVisibleToRole,
  exceptionVisibleToRole,
  activityVisibleToRole,
  approvalVisibleToRole,
  notificationVisibleToRole,
  reminderVisibleToRole,
} from "../src/lib/record-scope.ts";

const users = [
  { id: "sales1", role: "Account Manager", department: "Sales", entityId: "sa", scope: "entity" },
  { id: "sales2", role: "Account Manager", department: "Sales", entityId: "sa", scope: "entity" },
  { id: "sm", role: "Sales Manager", department: "Sales", entityId: "sa", scope: "entity" },
  { id: "fin1", role: "Branch Accountant", department: "Finance", entityId: "sa", scope: "entity" },
  { id: "fm", role: "Group Finance", department: "Finance", entityId: "sa", scope: "group" },
];
const sales1 = users[0];
const salesManager = users[2];
const finance1 = users[3];
const financeManager = users[4];

test("Account Manager client center is limited to assigned clients", () => {
  assert.equal(
    clientVisibleToRole({ accountManagerId: "sales1" }, sales1, "Account Manager"),
    true,
  );
  assert.equal(
    clientVisibleToRole({ accountManagerId: "sales2" }, sales1, "Account Manager"),
    false,
  );
});

test("individual calendars show only owned or attended events", () => {
  assert.equal(
    eventVisibleToRole(
      { organizerId: "sales1", attendeeIds: [] },
      sales1,
      "Account Manager",
      users,
    ),
    true,
  );
  assert.equal(
    eventVisibleToRole(
      { organizerId: "sales2", attendeeIds: ["sales1"] },
      sales1,
      "Account Manager",
      users,
    ),
    true,
  );
  assert.equal(
    eventVisibleToRole(
      { organizerId: "sales2", attendeeIds: [] },
      sales1,
      "Account Manager",
      users,
    ),
    false,
  );
});

test("manager calendars include their functional team but not the other function", () => {
  assert.equal(
    eventVisibleToRole(
      { organizerId: "sales2", attendeeIds: [] },
      salesManager,
      "Sales Manager",
      users,
    ),
    true,
  );
  assert.equal(
    eventVisibleToRole(
      { organizerId: "fin1", attendeeIds: [] },
      salesManager,
      "Sales Manager",
      users,
    ),
    false,
  );
  assert.equal(
    eventVisibleToRole(
      { organizerId: "fin1", attendeeIds: [] },
      financeManager,
      "Group Finance",
      users,
    ),
    true,
  );
});

test("exception queues follow ownership for individuals and department for managers", () => {
  assert.equal(
    exceptionVisibleToRole({ ownerId: "sales1" }, sales1, "Account Manager", users),
    true,
  );
  assert.equal(
    exceptionVisibleToRole({ ownerId: "sales2" }, sales1, "Account Manager", users),
    false,
  );
  assert.equal(
    exceptionVisibleToRole({ ownerId: "sales2" }, salesManager, "Sales Manager", users),
    true,
  );
  assert.equal(
    exceptionVisibleToRole({ ownerId: "fin1" }, salesManager, "Sales Manager", users),
    false,
  );
  assert.equal(
    exceptionVisibleToRole({ ownerId: "fin1" }, financeManager, "Group Finance", users),
    true,
  );
});

test("reminder schedules follow recipient and team relevance", () => {
  assert.equal(
    reminderVisibleToRole(
      { ownerId: "sm", recipientIds: ["sales1"] },
      sales1,
      "Account Manager",
      users,
    ),
    true,
  );
  assert.equal(
    reminderVisibleToRole(
      { ownerId: "fm", recipientIds: ["fin1"] },
      sales1,
      "Account Manager",
      users,
    ),
    false,
  );
  assert.equal(
    reminderVisibleToRole(
      { ownerId: "sales2", recipientIds: ["sales2"] },
      salesManager,
      "Sales Manager",
      users,
    ),
    true,
  );
});

test("notifications hide cross-functional noise for individual roles", () => {
  assert.equal(notificationVisibleToRole({ category: "Sales" }, "Account Manager"), true);
  assert.equal(notificationVisibleToRole({ category: "Finance" }, "Account Manager"), false);
  assert.equal(notificationVisibleToRole({ category: "Finance" }, "Branch Accountant"), true);
  assert.equal(notificationVisibleToRole({ category: "Sales" }, "Branch Accountant"), false);
  assert.equal(notificationVisibleToRole({ category: "Approval" }, "Executive Management"), true);
});

test("approval inbox is decision-focused by role", () => {
  const invoice = { type: "Invoice Approval", approverId: "fm" };
  const proposal = { type: "Proposal Approval", approverId: "exec" };
  const access = { type: "Access Request", approverId: "admin" };
  const campaign = { type: "Campaign Change", approverId: "exec" };
  assert.equal(approvalVisibleToRole(invoice, financeManager, "Group Finance"), true);
  assert.equal(approvalVisibleToRole(proposal, financeManager, "Group Finance"), false);
  assert.equal(
    approvalVisibleToRole(proposal, { ...sales1, id: "exec" }, "Executive Management"),
    true,
  );
  assert.equal(approvalVisibleToRole(access, { ...sales1, id: "admin" }, "Group Admin"), true);
  assert.equal(approvalVisibleToRole(campaign, { ...sales1, id: "admin" }, "Group Admin"), false);
  assert.equal(approvalVisibleToRole(invoice, finance1, "Branch Accountant"), false);
});

test("activity feed only shows audit events useful to the current role", () => {
  assert.equal(activityVisibleToRole({ module: "Finance" }, "Executive Management"), true);
  assert.equal(activityVisibleToRole({ module: "Campaigns" }, "Executive Management"), false);
  assert.equal(activityVisibleToRole({ module: "Admin" }, "IT Admin"), true);
  assert.equal(activityVisibleToRole({ module: "Sales" }, "IT Admin"), false);
  assert.equal(activityVisibleToRole({ module: "Admin" }, "Group Admin"), true);
  assert.equal(activityVisibleToRole({ module: "Campaigns" }, "Group Admin"), false);
});
