import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  createRecord,
  updateRecord,
  meetingAction,
  startOnboarding,
  decide,
  visible,
  permission,
  addComment,
  runRule,
  sweep,
} from "../src/features/workspaces/service.ts";
const admin = {
  id: "admin",
  name: "Ahmed Essmat",
  role: "Group Admin",
  department: "Technology",
  entityId: "eg",
  scope: "group",
  status: "active",
};
const sales = {
  id: "sales",
  name: "Sales Specialist",
  role: "Account Manager",
  department: "Sales",
  entityId: "eg",
  scope: "entity",
  status: "active",
};
const hr = {
  id: "hr",
  name: "People Owner",
  role: "HR Manager",
  department: "HR",
  entityId: "eg",
  scope: "group",
  status: "active",
};
const analyst = {
  id: "analyst",
  name: "Analyst",
  role: "Data Analyst",
  department: "Data Analysis",
  entityId: "eg",
  scope: "group",
  status: "active",
};
// Sales hierarchy: lead -> supervisor -> member, used by the visibility tests below.
const salesLead = {
  id: "sales-lead",
  name: "Sales Lead",
  role: "Sales Manager",
  department: "Sales",
  entityId: "eg",
  scope: "group",
  status: "active",
  workspaceId: "sales",
  workspaceLevel: "lead",
  reportIds: ["sales-supervisor", "sales"],
};
const salesSupervisor = {
  id: "sales-supervisor",
  name: "Sales Supervisor",
  role: "Community Manager",
  department: "Sales",
  entityId: "eg",
  scope: "group",
  status: "active",
  workspaceId: "sales",
  workspaceLevel: "supervisor",
  managerId: "sales-lead",
  reportIds: ["sales"],
};
const users = [admin, sales, hr, analyst, salesLead, salesSupervisor];
const draft = (kind, workspaceId, details = {}, extra = {}) => ({
  kind,
  workspaceId,
  title: `Test ${kind}`,
  description: "Acceptance test",
  ownerId: "admin",
  collaborators: [],
  entityId: "eg",
  status:
    {
      task: "To Do",
      project: "Planned",
      decision: "Needed",
      blocker: "Open",
      meeting: "Scheduled",
      bill: "Upcoming",
      payment: "Recorded",
      employee: "Active",
      onboarding: "To Do",
      request: "New",
      approval: "Pending",
      client: "Prospect",
      action: "Open",
    }[kind] ?? "Open",
  priority: "High",
  startDate: "2026-09-01",
  dueDate: "2026-09-20",
  progress: 0,
  nextAction: "Confirm next action",
  details,
  ...extra,
});
const bill = (s) =>
  createRecord(
    s,
    admin,
    draft("bill", "finance", {
      clientName: "Demo client",
      invoice: "INV-TEST",
      amount: "1000",
      currency: "SAR",
      issueDate: "2026-09-01",
    }),
    users,
  );
test("bill schedules five dated tasks and rejects duplicate invoice IDs", () => {
  const s = emptyState();
  const b = bill(s);
  assert.deepEqual(
    s.records
      .filter((r) => r.sourceId.startsWith(b.id))
      .map((r) => r.dueDate)
      .sort(),
    ["2026-09-15", "2026-09-17", "2026-09-19", "2026-09-20", "2026-09-21"],
  );
  assert.throws(() => bill(s), /already exists/);
});
test("partial and full payment preserve currency and close outstanding reminder tasks", () => {
  const s = emptyState();
  const b = bill(s);
  const p = (amount) =>
    createRecord(
      s,
      admin,
      draft("payment", "finance", { billId: b.id, amount, reference: "BANK-TEST" }),
      users,
    );
  assert.equal(p("250").details.currency, "SAR");
  assert.equal(b.status, "Partially Paid");
  assert.equal(b.details.paid, "250");
  assert.throws(() => p("751"), /exceeds/);
  p("750");
  assert.equal(b.status, "Paid");
  assert.ok(s.records.filter((r) => r.sourceId.startsWith(b.id)).every((r) => r.status === "Done"));
});
test("bill due date reschedules outstanding linked tasks and payment totals cannot be edited", () => {
  const s = emptyState();
  const b = bill(s);
  updateRecord(s, admin, b.id, { ...b, dueDate: "2026-09-25" }, users);
  assert.equal(s.records.find((r) => r.sourceId === `${b.id}:bill:-5`).dueDate, "2026-09-20");
  assert.throws(
    () => updateRecord(s, admin, b.id, { ...b, details: { ...b.details, paid: "999" } }, users),
    /only change/,
  );
});
test("meeting commitment creates one linked task even when capture is retried", () => {
  const s = emptyState();
  const m = createRecord(
    s,
    admin,
    draft("meeting", "management", { startTime: "10:00", endTime: "11:00" }),
    users,
  );
  const t = meetingAction(s, admin, m.id, "Validate API", "admin", "2026-09-22", users);
  assert.equal(
    meetingAction(s, admin, m.id, "Validate API", "admin", "2026-09-22", users).id,
    t.id,
  );
  assert.equal(s.records.filter((r) => r.kind === "task").length, 1);
});
test("meeting time validation prevents impossible schedules", () => {
  const s = emptyState();
  assert.throws(
    () =>
      createRecord(
        s,
        admin,
        draft("meeting", "management", { startTime: "12:00", endTime: "11:00" }),
        users,
      ),
    /end must/,
  );
});
test("onboarding creates eight linked tasks once and assigns a workspace owner", () => {
  const s = emptyState();
  const e = createRecord(
    s,
    hr,
    draft(
      "employee",
      "hr",
      { email: "new@example.invalid", department: "Operations", joinDate: "2026-09-01" },
      { ownerId: "hr" },
    ),
    users,
  );
  const o = createRecord(
    s,
    hr,
    draft(
      "onboarding",
      "hr",
      { employeeId: e.id, template: "Standard employee" },
      { ownerId: "hr" },
    ),
    users,
  );
  startOnboarding(s, hr, o);
  assert.equal(s.records.filter((r) => r.sourceId.startsWith(o.id)).length, 8);
  assert.ok(s.records.filter((r) => r.kind === "task").every((r) => r.ownerId === "hr"));
});
test("analysis cannot be delivered without delivery evidence", () => {
  const s = emptyState();
  const r = createRecord(
    s,
    analyst,
    draft(
      "request",
      "management",
      {
        department: "Operations",
        businessQuestion: "What causes delays?",
        metrics: "On time rate",
        source: "Operations export",
      },
      { ownerId: "analyst" },
    ),
    users,
  );
  assert.throws(
    () => updateRecord(s, analyst, r.id, { ...r, status: "Delivered" }, users),
    /delivery link/,
  );
  updateRecord(
    s,
    analyst,
    r.id,
    {
      ...r,
      status: "Delivered",
      details: { ...r.details, deliveryUrl: "https://example.com/report" },
    },
    users,
  );
  assert.ok(r.completedAt);
});
test("permissions prevent cross-workspace reads, writes, private HR access and self approval", () => {
  const s = emptyState();
  const b = bill(s);
  assert.equal(visible(sales, b), false);
  assert.equal(permission(sales, "finance", "create"), false);
  assert.throws(
    () => updateRecord(s, sales, b.id, { ...b, title: "Attempted update" }, users),
    /Permission denied/,
  );
  const a = createRecord(
    s,
    admin,
    draft("approval", "management", { impact: "Release deadline" }),
    users,
  );
  assert.throws(() => decide(s, admin, a.id, "Approved", "Accepted"), /Permission denied/);
});
test("approval requires assigned approver, reason and pending state; decision is audited", () => {
  const s = emptyState();
  const a = createRecord(
    s,
    admin,
    draft("approval", "hr", { impact: "Equipment handover" }, { ownerId: "hr" }),
    users,
  );
  assert.throws(() => decide(s, hr, a.id, "Approved", ""), /reason/);
  decide(s, hr, a.id, "Approved", "Equipment budget confirmed");
  assert.equal(a.status, "Approved");
  assert.ok(s.audit.some((x) => x.action === "Approval Approved"));
  assert.throws(() => decide(s, hr, a.id, "Rejected", "Changed mind"), /no longer pending/);
});
test("sales next actions become tasks and comments notify only allowed mentions", () => {
  const s = emptyState();
  const c = createRecord(
    s,
    sales,
    draft("client", "sales", { contact: "Demo contact" }, { ownerId: "sales" }),
    users,
  );
  const a = createRecord(
    s,
    sales,
    draft("action", "sales", { clientId: c.id, outcome: "Follow-up" }, { ownerId: "sales" }),
    users,
  );
  assert.ok(s.records.some((r) => r.sourceId === `${a.id}:follow-up`));
  addComment(
    s,
    sales,
    a.id,
    "@Ahmed Essmat please review; @People Owner should not receive sales data",
    users,
  );
  assert.ok(s.notifications.some((n) => n.userId === "admin"));
  assert.ok(!s.notifications.some((n) => n.userId === "hr"));
});
test("dependencies reject cycles and closing work with unfinished dependencies", () => {
  const s = emptyState();
  const a = createRecord(s, admin, draft("task", "management"), users);
  const b = createRecord(s, admin, draft("task", "management", { dependencyId: a.id }), users);
  assert.throws(
    () => updateRecord(s, admin, a.id, { ...a, details: { dependencyId: b.id } }, users),
    /cycle/,
  );
  assert.throws(() => updateRecord(s, admin, b.id, { ...b, status: "Done" }, users), /dependency/);
});
test("automation dry run is safe and live retries are idempotent; unconfigured channels record failure", () => {
  const s = emptyState();
  createRecord(s, admin, draft("task", "management"), users);
  const rule = {
    id: "rule",
    workspaceId: "management",
    title: "Due reminder",
    trigger: "due",
    days: 0,
    hour: "08:00",
    kind: "task",
    action: "task",
    channel: "in-app",
    ownerId: "admin",
    enabled: true,
    lastRun: "",
  };
  runRule(s, admin, rule, "2026-09-20", "09:00", true);
  assert.equal(s.records.length, 1);
  runRule(s, admin, rule, "2026-09-20", "09:00");
  const count = s.records.length;
  runRule(s, admin, rule, "2026-09-20", "09:00");
  assert.equal(s.records.length, count);
  rule.channel = "Email";
  runRule(s, admin, rule, "2026-09-20", "09:00");
  assert.equal(s.runs[0].status, "Failed");
});
test("date sweep updates overdue bills and deduplicates personal daily notices", () => {
  const s = emptyState();
  const b = bill(s);
  sweep(s, admin, "2026-09-21", "09:00");
  assert.equal(b.status, "Overdue");
  const n = s.notifications.length;
  sweep(s, admin, "2026-09-21", "09:00");
  assert.equal(s.notifications.length, n);
});

test("workspace hierarchy scopes what each level can see", () => {
  const s = emptyState();
  const memberWork = createRecord(
    s,
    sales,
    draft("client", "sales", { contact: "Member contact" }, { ownerId: "sales" }),
    users,
  );
  const supervisorWork = createRecord(
    s,
    salesSupervisor,
    draft("client", "sales", { contact: "Supervisor contact" }, { ownerId: "sales-supervisor" }),
    users,
  );
  const leadWork = createRecord(
    s,
    salesLead,
    draft("client", "sales", { contact: "Lead contact" }, { ownerId: "sales-lead" }),
    users,
  );

  // Member: only their own record.
  assert.equal(visible(sales, memberWork), true);
  assert.equal(visible(sales, supervisorWork), false);
  assert.equal(visible(sales, leadWork), false);

  // Supervisor: their own plus their reports'.
  assert.equal(visible(salesSupervisor, memberWork), true);
  assert.equal(visible(salesSupervisor, supervisorWork), true);
  assert.equal(visible(salesSupervisor, leadWork), false);

  // Lead: the whole workspace.
  assert.ok([memberWork, supervisorWork, leadWork].every((r) => visible(salesLead, r)));

  // Admin: every workspace, including the ones they do not belong to.
  const hrWork = createRecord(
    s,
    hr,
    draft(
      "employee",
      "hr",
      { email: "x@example.invalid", department: "Ops", joinDate: "2026-09-01" },
      { ownerId: "hr" },
    ),
    users,
  );
  assert.ok([memberWork, supervisorWork, leadWork, hrWork].every((r) => visible(admin, r)));
  // ...while nobody outside HR sees HR records.
  assert.equal(visible(salesLead, hrWork), false);
});

test("assignment follows the hierarchy: members assign only to themselves", () => {
  const s = emptyState();
  assert.throws(
    () =>
      createRecord(
        s,
        sales,
        draft("client", "sales", { contact: "X" }, { ownerId: "sales-lead" }),
        users,
      ),
    /assign work to yourself/,
  );
  // A supervisor may assign to a direct report; a lead to anyone in the workspace.
  assert.ok(
    createRecord(
      s,
      salesSupervisor,
      draft("client", "sales", { contact: "Y" }, { ownerId: "sales" }),
      users,
    ).id,
  );
  assert.ok(
    createRecord(
      s,
      salesLead,
      draft("client", "sales", { contact: "Z" }, { ownerId: "sales-supervisor" }),
      users,
    ).id,
  );
});
