/**
 * Creates a task in each operating workspace and verifies the full loop:
 * the detail drawer opens, the record appears in the list, and it survives a
 * reload (storage persistence).
 */
import { runSuite } from "./qa-harness.mjs";

const WORKSPACES = ["management", "sales", "finance", "hr"];

await runSuite("qa-workflow", async ({ base, browser, reporter }) => {
  const page = reporter.watch(await browser.newPage());

  for (const ws of WORKSPACES) {
    await page.goto(`${base}/workspaces/${ws}/task`, { waitUntil: "networkidle" });

    const btn = page.getByRole("button", { name: /create task/i }).first();
    if (!reporter.check(`${ws} create button present`, (await btn.count()) > 0)) continue;
    await btn.click();

    const dialog = page.getByRole("dialog").first();
    await dialog.waitFor({ state: "visible", timeout: 5000 });

    const title = `QA ${ws} task ${Date.now()}`;
    await dialog.getByLabel("Title", { exact: true }).fill(title);
    await dialog.getByLabel("Due date", { exact: true }).fill("2026-09-30");
    await dialog.getByLabel("Next action", { exact: true }).fill("QA verification follow-up");

    for (const field of await dialog.locator("input[required], textarea[required]").all()) {
      if ((await field.inputValue()) !== "") continue;
      const type = await field.getAttribute("type");
      await field.fill(type === "date" ? "2026-09-30" : type === "number" ? "1" : "QA value");
    }

    await dialog.getByRole("button", { name: /^save$/i }).click();
    await page.waitForTimeout(1000);

    // Saving opens the new record's detail view (a full page, not a drawer).
    const back = page.getByRole("button", { name: /back to workspace/i }).first();
    const heading = page.getByRole("heading", { name: title, exact: true }).first();
    reporter.check(
      `${ws} detail view opens on new record`,
      (await back.count()) > 0 && (await heading.count()) > 0,
    );

    if (await back.count()) {
      await back.click();
      await page.waitForTimeout(600);
    } else {
      await page.goto(`${base}/workspaces/${ws}/task`, { waitUntil: "networkidle" });
    }

    // Back on the list: narrow to the new record so a long seeded list cannot hide it.
    const search = page.getByLabel("Search work", { exact: true }).first();
    if (await search.count()) {
      await search.fill(title);
      await page.waitForTimeout(600);
    }
    reporter.check(
      `${ws} task persisted in list`,
      (await page.locator("body").innerText()).includes(title),
    );

    // Reload the list route itself to prove it came back from storage.
    await page.goto(`${base}/workspaces/${ws}/task`, { waitUntil: "networkidle" });
    const searchAfter = page.getByLabel("Search work", { exact: true }).first();
    if (await searchAfter.count()) {
      await searchAfter.fill(title);
      await page.waitForTimeout(600);
    }
    reporter.check(
      `${ws} task persisted after reload`,
      (await page.locator("body").innerText()).includes(title),
    );
  }
});
