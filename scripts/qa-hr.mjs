import { launchBrowser, startServer } from "./qa-harness.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
const server = await startServer();
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const base = server.base;
const storageKey = "trygc-workspace-hub-operating-v2";
const stored = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
try {
  await page.goto(base + "/workspaces/hr/home", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Daily Attendance Monitoring", exact: true }).waitFor();
  const nav = await page.locator("aside a").allTextContents();
  for (const removed of [
    "People Action",
    "Onboarding",
    "Interview",
    "Attendance Exception",
    "Document",
    "Automation Center",
    "Management",
  ])
    assert.ok(!nav.some((n) => n.trim() === removed), removed);
  assert.ok(!(await page.locator("body").innerText()).includes("Default calendar:"));
  assert.equal(
    (await stored()).records.filter(
      (r) => r.sourceId === "hr-guide:v1" && r.details.enabled === "true",
    ).length,
    84,
  );
  assert.ok(!(await page.locator("body").innerText()).includes("Hala Nasser"));
  await page.goto(base + "/workspaces/hr/employee", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add user", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill("QA HR Operator");
  await page.getByRole("dialog").getByLabel("Email", { exact: true }).fill("qa-hr@example.test");
  await page.getByRole("dialog").getByRole("button", { name: "Save user", exact: true }).click();
  await page.getByRole("heading", { name: "QA HR Operator", exact: true }).waitFor();
  await page.getByLabel("Search users", { exact: true }).fill("QA HR Operator");
  await page.getByRole("button", { name: "Edit user", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Job title", { exact: true }).fill("HR operations");
  await page.getByRole("dialog").getByRole("button", { name: "Save user", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.goto(base + "/workspaces/hr/home", { waitUntil: "networkidle" });
  await page.waitForFunction(
    (key) => JSON.parse(localStorage.getItem(key)).records.some((r) => r.kind === "hr-task"),
    storageKey,
  );
  const initial = await stored();
  assert.equal(initial.records.filter((r) => r.sourceId === "hr-guide:v1").length, 168);
  assert.equal(
    initial.records.filter((r) => r.sourceId === "hr-guide:v1" && r.details.enabled === "true")
      .length,
    84,
  );
  assert.ok(initial.records.some((r) => r.kind === "hr-task"));
  await page.screenshot({ path: "artifacts/hr-audit/desktop.png" });
  await page.getByLabel("HR category", { exact: true }).selectOption("Payroll & Benefits");
  assert.equal(
    await page
      .locator("section")
      .filter({ has: page.getByRole("button", { name: "Start task", exact: true }) })
      .count(),
    5,
  );
  await page.getByRole("button", { name: "Configure owner & schedule" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Save configuration" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.ok((await stored()).audit.some((a) => a.action === "HR schedule configured"));
  await page.getByLabel("HR category", { exact: true }).selectOption("");
  await page.getByLabel("Search HR guide").fill("Leave Requests & Records");
  await page.getByRole("button", { name: "Start task", exact: true }).click();
  const dialog = page.getByRole("dialog");
  assert.equal(
    await dialog.getByLabel("Title", { exact: true }).inputValue(),
    "Leave Requests & Records",
  );
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("heading", { name: "Leave Requests & Records", exact: true }).waitFor();
  assert.equal(
    (await stored()).records.filter(
      (r) => r.kind === "hr-task" && r.title === "Leave Requests & Records",
    ).length,
    1,
  );
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: /^Status/ })
    .selectOption("Completed");
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  assert.match(await page.getByRole("alert").innerText(), /flow one step/);
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  const before = (await stored()).records.length;
  await page.reload({ waitUntil: "networkidle" });
  assert.equal((await stored()).records.length, before);
  await page.goto(base + "/workspaces/hr/hr-task", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "HR Task", exact: true }).waitFor();
  await page.screenshot({ path: "artifacts/hr-audit/tasks.png" });
  await page.getByLabel("Task frequency", { exact: true }).selectOption("Daily");
  await page.goto(base + "/workspaces/hr/reports", { waitUntil: "networkidle" });
  await page.getByText("Execution by HR category", { exact: true }).waitFor();
  await page.goto(base + "/workspaces/hr/file", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Task evidence", exact: true }).waitFor();
  await page.goto(base + "/workspaces/it/people", { waitUntil: "networkidle" });
  for (const name of [
    "Adel Hammad",
    "A. Sabri",
    "Mohamed Nasef",
    "Mahmoud Taha",
    "Abdelfatah Hamid",
    "Reda",
    "Raafat",
    "Eslam",
  ])
    await page.getByRole("heading", { name, exact: true }).waitFor();
  assert.ok(!(await page.locator("body").innerText()).includes("Bader Al-Qahtani"));
  await page.screenshot({ path: "artifacts/hr-audit/it-team.png" });
  await page.goto(base + "/workspaces/hr/employee", { waitUntil: "networkidle" });
  await page.getByLabel("Search users", { exact: true }).fill("QA HR Operator");
  await page.getByRole("button", { name: "Remove user", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: /Replacement owner/ })
    .selectOption("core-essmat");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove user permanently", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.getByRole("heading", { name: "QA HR Operator", exact: true }).count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/workspaces/hr/home", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Daily Attendance Monitoring", exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: "artifacts/hr-audit/mobile.png" });
  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    definitions: 168,
    enabledSchedules: 84,
    checks: [
      "real user add/edit/remove and no resurrection",
      "eight IT names from manual",
      "category filter",
      "schedule save and audit",
      "request task creation",
      "completion guard",
      "reload persistence and deduplication",
      "task tracker",
      "mobile overflow",
    ],
    runtimeErrors: errors,
  };
  fs.writeFileSync("artifacts/hr-audit/browser.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (e) {
  await page.screenshot({ path: "artifacts/hr-audit/failure.png" });
  console.log((await page.locator("body").innerText()).slice(-2500));
  throw e;
} finally {
  await browser.close();
  await server.stop();
}
