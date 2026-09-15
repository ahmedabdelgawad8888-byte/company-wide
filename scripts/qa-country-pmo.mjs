import assert from "node:assert/strict";
import { launchBrowser, startServer } from "./qa-harness.mjs";
const server = await startServer();
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("dialog", (d) => d.accept());
const key = "trygc-workspace-hub-db-v1";
try {
  await page.goto(server.base + "/workspaces/hr/home", { waitUntil: "networkidle" });
  for (const [country, names] of [
    ["ae", ["Menna"]],
    ["sa", ["Fatma"]],
    ["eg", ["Zakaria", "Aya"]],
  ]) {
    await page.getByLabel("HR country", { exact: true }).selectOption(country);
    assert.equal(await page.getByRole("button", { name: "Start task", exact: true }).count(), 56);
    for (const name of names) assert.ok((await page.locator("main").innerText()).includes(name));
  }
  const hr = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("trygc-workspace-hub-operating-v2")),
  );
  assert.equal(hr.records.filter((r) => r.sourceId === "hr-guide:v1" && !r.archived).length, 168);
  assert.equal(
    hr.records.filter(
      (r) => r.sourceId === "hr-guide:v1" && r.details.enabled === "true" && !r.archived,
    ).length,
    84,
  );
  assert.ok(
    hr.records.some((r) => r.kind === "hr-task" && r.entityId === "ae" && r.ownerId === "hr-menna"),
  );
  for (const [route, collection, titleField] of [
    ["requirements", "pmoRequirements", "Title"],
    ["actions", "pmoActions", "Action"],
    ["questions", "pmoQuestions", "Question"],
    ["raid", "pmoRaidItems", "Description"],
    ["milestones", "pmoMilestones", "Name"],
    ["e2e", "pmoE2EStages", "Name"],
  ]) {
    console.log("Testing", route);
    await page.goto(server.base + "/pmo/" + route, { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: /^Manage / })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Add record", exact: true }).click();
    await dialog.getByLabel(titleField, { exact: true }).fill("QA Editable " + route);
    const id = await dialog.getByLabel("ID", { exact: true }).inputValue();
    await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.reload({ waitUntil: "networkidle" });
    assert.ok(
      await page.evaluate(
        ({ key, collection, id }) =>
          JSON.parse(localStorage.getItem(key))[collection].some((r) => String(r.id) === id),
        { key, collection, id },
      ),
    );
    await page
      .getByRole("button", { name: /^Manage / })
      .first()
      .click();
    await dialog.getByLabel("Select record", { exact: true }).selectOption(id);
    await dialog.getByLabel(titleField, { exact: true }).fill("QA Updated " + route);
    await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: /^Manage / })
      .first()
      .click();
    await dialog.getByLabel("Select record", { exact: true }).selectOption(id);
    assert.equal(
      await dialog.getByLabel(titleField, { exact: true }).inputValue(),
      "QA Updated " + route,
    );
    await dialog.getByRole("button", { name: "Remove record", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.reload({ waitUntil: "networkidle" });
    assert.ok(
      await page.evaluate(
        ({ key, collection, id }) =>
          !JSON.parse(localStorage.getItem(key))[collection].some((r) => String(r.id) === id),
        { key, collection, id },
      ),
    );
  }
  for (const route of ["", "timeline", "capacity", "reports"]) {
    console.log("Testing", route);
    await page.goto(server.base + "/pmo/" + route, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Manage workspace data", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Edit delivery plan", exact: true }).click();
    await dialog.getByLabel("Program Duration Weeks", { exact: true }).fill("27");
    await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
  }
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).pmoPlanConfig.programDurationWeeks,
      key,
    ),
    27,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: HR three countries/168 definitions/84 schedules; all six PMO registers create-edit-remove persist; all four analytical pages expose plan editing.",
  );
} catch (e) {
  console.error(
    "URL",
    page.url(),
    "ERRORS",
    errors,
    "BODY",
    (await page.locator("body").innerText()).slice(0, 1800),
  );
  throw e;
} finally {
  await browser.close();
  await server.stop();
}
