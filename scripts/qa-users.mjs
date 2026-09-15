import assert from "node:assert/strict";
import { launchBrowser, startServer } from "./qa-harness.mjs";
const server = await startServer();
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const key = "trygc-workspace-hub-db-v1";
try {
  await page.goto(server.base + "/admin/users", { waitUntil: "networkidle" });
  assert.match(page.url(), /settings\?section=users/);
  await page.getByText("Master user management", { exact: true }).waitFor();
  await page.getByLabel("Filter users by workspace").selectOption("sales");
  await page.getByRole("button", { name: "Add user", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("QA Central User");
  await dialog.getByLabel("Email", { exact: true }).fill("qa-central@example.test");
  assert.equal(await dialog.getByLabel("Workspace", { exact: true }).inputValue(), "sales");
  await dialog.getByRole("button", { name: "Save user", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByLabel("Search users", { exact: true }).fill("QA Central User");
  await page.getByRole("button", { name: "Edit user", exact: true }).click();
  await dialog.getByLabel("Workspace", { exact: true }).selectOption("finance");
  assert.equal(await dialog.getByLabel("Role", { exact: true }).inputValue(), "Branch Accountant");
  assert.equal(await dialog.getByLabel("Department", { exact: true }).inputValue(), "Finance");
  await dialog.getByLabel("Data scope", { exact: true }).selectOption("entity");
  await dialog.getByRole("button", { name: "Save user", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("Filter users by workspace").selectOption("finance");
  await page.getByLabel("Search users", { exact: true }).fill("QA Central User");
  await page.getByRole("heading", { name: "QA Central User", exact: true }).waitFor();
  await page.getByRole("button", { name: "Remove user", exact: true }).click();
  await dialog.getByRole("button", { name: "Remove user permanently", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(
    await page.getByRole("heading", { name: "QA Central User", exact: true }).count(),
    0,
  );
  for (const workspace of ["management", "sales", "finance", "hr", "it", "pmo"]) {
    await page.goto(server.base + `/workspaces/${workspace}/home`, { waitUntil: "networkidle" });
    await page.locator('aside a[href="/settings?section=users"]').click();
    await page.getByText("Master user management", { exact: true }).waitFor();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.evaluate((key) => {
    const db = JSON.parse(localStorage.getItem(key));
    const user = db.users.find((u) => u.id === "core-essmat");
    Object.assign(user, { role: "HR Specialist", workspaceId: "hr", workspaceLevel: "member" });
    localStorage.setItem(key, JSON.stringify(db));
  }, key);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("alert").filter({ hasText: "Administrator access" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Add user", exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: master settings CRUD, persistence, six workspace shortcuts, mobile layout and authorization",
  );
} finally {
  await browser.close();
  await server.stop();
}
