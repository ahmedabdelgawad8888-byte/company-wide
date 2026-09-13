/**
 * Dashboard render check: charts, insight copy and KPI tiles per workspace,
 * plus the record preview panel and its tabs. Screenshots land in artifacts/.
 */
import { mkdir } from "node:fs/promises";
import { runSuite } from "./qa-harness.mjs";

const WORKSPACES = ["management", "sales", "finance", "hr"];
const SHOTS = "artifacts/qa";

await runSuite("qa-dashboard", async ({ base, browser, reporter }) => {
  await mkdir(SHOTS, { recursive: true });
  const page = reporter.watch(await browser.newPage({ viewport: { width: 1440, height: 1000 } }));

  for (const ws of WORKSPACES) {
    await page.goto(`${base}/workspaces/${ws}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);

    const txt = await page.locator("body").innerText();
    const charts = await page.locator("svg.recharts-surface").count();

    // Headings are uppercased in CSS, so innerText comes back shouting — match case-insensitively.
    reporter.check(`${ws} dashboard renders charts`, charts > 0, `${charts} charts`);
    reporter.check(`${ws} dashboard shows KPIs`, /On-time delivery|Open work/i.test(txt));
    reporter.check(`${ws} dashboard shows team execution`, /Team execution/i.test(txt));

    await page.screenshot({ path: `${SHOTS}/dash-${ws}.png`, fullPage: true });
  }

  // Record detail: opening a row replaces the list with a full detail view (not a drawer).
  await page.goto(`${base}/workspaces/management/task`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const row = page.locator("table tbody tr").first();
  if (!reporter.check("task list has rows", (await row.count()) > 0)) return;

  await row.click();
  await page.waitForTimeout(900);

  const back = page.getByRole("button", { name: /back to workspace/i }).first();
  reporter.check("record detail opens", (await back.count()) > 0);
  await page.screenshot({ path: `${SHOTS}/record-detail.png`, fullPage: true });

  for (const tab of ["Comments", "Files", "History"]) {
    const target = page.getByRole("tab", { name: tab }).first();
    if (!reporter.check(`detail tab ${tab} present`, (await target.count()) > 0)) continue;
    await target.click();
    await page.waitForTimeout(250);
    reporter.check(
      `detail tab ${tab} activates`,
      (await target.getAttribute("aria-selected")) === "true",
    );
  }

  await page.screenshot({ path: `${SHOTS}/record-detail-history.png`, fullPage: true });
});
