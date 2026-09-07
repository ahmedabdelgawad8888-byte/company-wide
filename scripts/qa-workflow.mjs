import { chromium } from "playwright";

const base = "http://127.0.0.1:5173";
const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

const results = [];
const check = (n, ok, extra = "") => {
  results.push([n, ok, extra]);
};

for (const ws of ["management", "sales", "finance", "hr"]) {
  await page.goto(`${base}/workspaces/${ws}/task`, { waitUntil: "networkidle" });
  const btn = page.getByRole("button", { name: /create task/i }).first();
  if (!(await btn.count())) {
    check(`${ws} create button`, false);
    continue;
  }
  await btn.click();

  const dialog = page.getByRole("dialog").first();
  await dialog.waitFor({ state: "visible", timeout: 5000 });

  const title = `QA ${ws} task ${Date.now()}`;
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByLabel("Due date", { exact: true }).fill("2026-09-30");
  await dialog.getByLabel("Next action", { exact: true }).fill("QA verification follow-up");

  // fill any remaining required empty fields inside the dialog
  const reqs = await dialog.locator("input[required], textarea[required]").all();
  for (const f of reqs) {
    if ((await f.inputValue()) === "") {
      const t = await f.getAttribute("type");
      await f.fill(t === "date" ? "2026-09-30" : t === "number" ? "1" : "QA value");
    }
  }

  await dialog.getByRole("button", { name: /^save$/i }).click();
  await page.waitForTimeout(1000);

  // create dialog should close and the new record's detail drawer should open
  const openDialog = page.getByRole("dialog").first();
  const dialogText = (await openDialog.count()) ? await openDialog.innerText() : "";
  check(
    `${ws} detail drawer opens on new record`,
    dialogText.includes(title),
    dialogText.slice(0, 80).replace(/\s+/g, " "),
  );
  if (await openDialog.count()) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  // verify persisted: search for it
  const search = page.getByLabel("Search work", { exact: true }).first();
  if (await search.count()) {
    await search.fill(title);
    await page.waitForTimeout(600);
  }
  const body = await page.locator("body").innerText();
  check(`${ws} task persisted in list`, body.includes(title));

  // verify survives reload (storage persistence)
  await page.reload({ waitUntil: "networkidle" });
  const body2 = await page.locator("body").innerText();
  check(`${ws} task persisted after reload`, body2.includes(title));
}

console.log("\n=== RESULTS ===");
let fails = 0;
for (const [n, ok, x] of results) {
  if (!ok) fails++;
  console.log(ok ? "PASS" : "FAIL", n, x);
}
console.log("CONSOLE ERRORS:", errors.length);
[...new Set(errors)].slice(0, 15).forEach((e) => console.log(" -", e.slice(0, 200)));
await browser.close();
process.exit(fails ? 1 : 0);
