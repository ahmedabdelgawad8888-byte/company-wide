import test from "node:test";
import assert from "node:assert/strict";
import {
  getRoleExperience,
  getVisibleNavGroups,
  getQuickCreateKinds,
  isIndividualContributor,
  isFinanceSalesHubRole,
  canSeePath,
} from "../src/lib/role-ux.ts";

const navGroups = [
  {
    label: "Command Center",
    labelAr: "",
    items: [
      { to: "/dashboard" },
      { to: "/workspace" },
      { to: "/alerts" },
      { to: "/approvals" },
      { to: "/activity" },
    ],
  },
  {
    label: "Sales",
    labelAr: "",
    items: [{ to: "/sales" }, { to: "/crm/clients" }, { to: "/meetings" }],
  },
  {
    label: "Execution",
    labelAr: "",
    items: [{ to: "/tasks" }, { to: "/overdue" }, { to: "/calendar" }],
  },
  {
    label: "Finance",
    labelAr: "",
    items: [{ to: "/finance" }, { to: "/finance/invoices" }, { to: "/finance/payments" }],
  },
  { label: "Reporting", labelAr: "", items: [{ to: "/reports" }] },
  {
    label: "Administration",
    labelAr: "",
    items: [
      { to: "/admin/automations" },
      { to: "/admin/users" },
      { to: "/admin/roles" },
      { to: "/settings" },
    ],
  },
];

test("Account Manager gets a sales-first individual workflow", () => {
  const ux = getRoleExperience("Account Manager");
  assert.equal(ux.homePath, "/workspace");
  assert.equal(ux.mode, "sales-individual");
  assert.equal(isIndividualContributor("Account Manager"), true);
  assert.deepEqual(getQuickCreateKinds("Account Manager"), [
    "Sales Activity",
    "Meeting",
    "Task",
    "Client",
  ]);
  const paths = getVisibleNavGroups(navGroups, "Account Manager").flatMap((g) =>
    g.items.map((i) => i.to),
  );
  assert.ok(paths.includes("/sales"));
  assert.ok(paths.includes("/meetings"));
  assert.ok(paths.includes("/tasks"));
  assert.ok(!paths.includes("/finance"));
  assert.ok(!paths.includes("/admin/automations"));
});

test("Sales Manager gets team execution but not Finance or admin configuration", () => {
  const ux = getRoleExperience("Sales Manager");
  assert.equal(ux.mode, "sales-manager");
  const paths = getVisibleNavGroups(navGroups, "Sales Manager").flatMap((g) =>
    g.items.map((i) => i.to),
  );
  for (const path of [
    "/workspace",
    "/sales",
    "/crm/clients",
    "/meetings",
    "/tasks",
    "/overdue",
    "/calendar",
    "/reports",
  ])
    assert.ok(paths.includes(path), path);
  assert.ok(!paths.includes("/finance"));
  assert.ok(!paths.includes("/admin/users"));
});

test("Branch Accountant gets a finance-first individual workflow", () => {
  const ux = getRoleExperience("Branch Accountant");
  assert.equal(ux.homePath, "/workspace");
  assert.equal(ux.mode, "finance-individual");
  assert.equal(isIndividualContributor("Branch Accountant"), true);
  assert.deepEqual(getQuickCreateKinds("Branch Accountant"), [
    "Bill",
    "Payment",
    "Task",
    "Meeting",
  ]);
  const paths = getVisibleNavGroups(navGroups, "Branch Accountant").flatMap((g) =>
    g.items.map((i) => i.to),
  );
  assert.ok(paths.includes("/finance"));
  assert.ok(paths.includes("/finance/invoices"));
  assert.ok(paths.includes("/finance/payments"));
  assert.ok(!paths.includes("/sales"));
  assert.ok(!paths.includes("/crm/clients"));
});

test("Group Finance gets finance leadership views and approvals", () => {
  const ux = getRoleExperience("Group Finance");
  assert.equal(ux.mode, "finance-manager");
  const paths = getVisibleNavGroups(navGroups, "Group Finance").flatMap((g) =>
    g.items.map((i) => i.to),
  );
  assert.ok(paths.includes("/finance"));
  assert.ok(paths.includes("/approvals"));
  assert.ok(paths.includes("/reports"));
  assert.ok(!paths.includes("/sales"));
});

test("Executive Management gets cross-functional decision views without admin setup", () => {
  const ux = getRoleExperience("Executive Management");
  assert.equal(ux.homePath, "/dashboard");
  assert.equal(ux.mode, "executive");
  const paths = getVisibleNavGroups(navGroups, "Executive Management").flatMap((g) =>
    g.items.map((i) => i.to),
  );
  assert.ok(paths.includes("/dashboard"));
  assert.ok(paths.includes("/sales"));
  assert.ok(paths.includes("/finance"));
  assert.ok(paths.includes("/reports"));
  assert.ok(!paths.includes("/admin/users"));
});

test("Group Admin can access the complete operating and administration experience", () => {
  const ux = getRoleExperience("Group Admin");
  assert.equal(ux.mode, "admin");
  const paths = getVisibleNavGroups(navGroups, "Group Admin").flatMap((g) =>
    g.items.map((i) => i.to),
  );
  assert.ok(paths.includes("/admin/automations"));
  assert.ok(paths.includes("/admin/users"));
  assert.ok(paths.includes("/admin/roles"));
  assert.ok(paths.includes("/settings"));
});

test("hub role filtering excludes legacy Community and Operations roles from the Finance & Sales administration UX", () => {
  assert.equal(isFinanceSalesHubRole("Group Admin"), true);
  assert.equal(isFinanceSalesHubRole("Executive Management"), true);
  assert.equal(isFinanceSalesHubRole("Group Finance"), true);
  assert.equal(isFinanceSalesHubRole("Branch Accountant"), true);
  assert.equal(isFinanceSalesHubRole("Sales Manager"), true);
  assert.equal(isFinanceSalesHubRole("Account Manager"), true);
  assert.equal(isFinanceSalesHubRole("IT Admin"), true);
  assert.equal(isFinanceSalesHubRole("Viewer"), true);
  assert.equal(isFinanceSalesHubRole("Community Manager"), false);
  assert.equal(isFinanceSalesHubRole("Operations Manager"), false);
});

test("Account Manager can reach their own overdue queue", () => {
  assert.equal(canSeePath("Account Manager", "/overdue"), true);
});
