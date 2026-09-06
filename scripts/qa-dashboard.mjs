import { chromium } from "playwright";
const base = "http://127.0.0.1:8080";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));

for (const ws of ["core", "sales", "finance", "hr", "data"]) {
  await p.goto(`${base}/workspaces/${ws}/dashboard`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  const txt = await p.locator("body").innerText();
  const charts = await p.locator("svg.recharts-surface").count();
  console.log(
    ws.padEnd(8),
    "charts:",
    String(charts).padEnd(3),
    "insights:",
    /telling you|تقوله/.test(txt) ? "y" : "n",
    "kpis:",
    /On-time delivery|Open work/.test(txt) ? "y" : "n",
    "team:",
    /Team execution/.test(txt) ? "y" : "n",
  );
  await p.screenshot({ path: `qa-dash-${ws}.png`, fullPage: true });
}

// preview panel
await p.goto(`${base}/workspaces/core/task`, { waitUntil: "networkidle" });
await p.waitForTimeout(800);
const row = p.locator("table tbody tr").first();
await row.click();
await p.waitForTimeout(900);
const panel = p.locator('[role="dialog"]').last();
console.log("panel visible:", await panel.isVisible());
console.log("panel box:", JSON.stringify(await panel.boundingBox()));
await p.screenshot({ path: "qa-preview.png" });
const expand = panel.getByRole("button", { name: /Expand panel/i });
if (await expand.count()) {
  await expand.click();
  await p.waitForTimeout(600);
  console.log("wide box:", JSON.stringify(await panel.boundingBox()));
  await p.screenshot({ path: "qa-preview-wide.png" });
}
for (const tab of ["Comments", "Files", "History"]) {
  await panel.getByRole("tab", { name: tab }).click();
  await p.waitForTimeout(250);
}
console.log("ERRORS:", errs.length);
[...new Set(errs)].slice(0, 10).forEach((e) => console.log(" -", e.slice(0, 180)));
await b.close();
