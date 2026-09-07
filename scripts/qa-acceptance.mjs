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
const check = (n, ok, extra = "") => results.push([n, ok, extra]);

async function fillRequired(dialog, title) {
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  for (const f of await dialog.locator("input[required], textarea[required]").all()) {
    if ((await f.inputValue()) !== "") continue;
    const t = await f.getAttribute("type");
    await f.fill(
      t === "date" ? "2026-09-30" : t === "time" ? "10:00" : t === "number" ? "1" : "QA value",
    );
  }
}

async function createRecord(ws, module, buttonRe, title) {
  await page.goto(`${base}/workspaces/${ws}/${module}`, { waitUntil: "networkidle" });
  const btn = page.getByRole("button", { name: buttonRe }).first();
  if (!(await btn.count())) return { ok: false, reason: "no create button" };
  await btn.click();
  const dialog = page.getByRole("dialog").first();
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  await fillRequired(dialog, title);
  await dialog.getByRole("button", { name: /^save$/i }).click();
  await page.waitForTimeout(1000);
  const alert = page.getByRole("alert").first();
  if (await alert.count()) return { ok: false, reason: (await alert.innerText()).slice(0, 120) };
  return { ok: true };
}

// 1. Meeting creation
const meetingTitle = `QA meeting ${Date.now()}`;
const m = await createRecord("management", "meeting", /create meeting/i, meetingTitle);
check("meeting created", m.ok, m.reason ?? "");
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
await page.goto(`${base}/workspaces/management/meeting`, { waitUntil: "networkidle" });
check("meeting listed", (await page.locator("body").innerText()).includes(meetingTitle));

// 2. Blocker creation and visibility in "what is blocked"
const blockerTitle = `QA blocker ${Date.now()}`;
const b = await createRecord("management", "blocker", /create blocker/i, blockerTitle);
check("blocker created", b.ok, b.reason ?? "");
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
await page.goto(`${base}/workspaces/management/blocker`, { waitUntil: "networkidle" });
check("blocker listed", (await page.locator("body").innerText()).includes(blockerTitle));

// 3. Approvals page renders decision-focused queue
await page.goto(`${base}/workspaces/management/approval`, { waitUntil: "networkidle" });
const approvalsText = await page.locator("body").innerText();
check(
  "approvals page renders",
  approvalsText.length > 200 && !/page not found/i.test(approvalsText),
);

// 4. My work answers "what do I need to do"
await page.goto(`${base}/workspaces/management/my-work`, { waitUntil: "networkidle" });
const myWork = await page.locator("body").innerText();
check("my-work renders actionable queue", /overdue|due|next action|today/i.test(myWork));

// 5. Global search finds the created meeting
await page.goto(`${base}/workspaces/management/home`, { waitUntil: "networkidle" });
const paletteBtn = page.getByRole("button", { name: /search priorities/i }).first();
if (await paletteBtn.count()) {
  await paletteBtn.click();
  await page.waitForTimeout(500);
  const input = page.locator("input[placeholder]:visible").first();
  await input.fill(meetingTitle.slice(0, 20));
  await page.waitForTimeout(800);
  const dlg = page.getByRole("dialog").first();
  const txt = (await dlg.count()) ? await dlg.innerText() : "";
  check(
    "global search finds new record",
    txt.includes(meetingTitle),
    txt.slice(0, 100).replace(/\s+/g, " "),
  );
  await page.keyboard.press("Escape");
} else {
  check("command palette present", false);
}

// 6. Dark mode toggle does not break the shell
await page.goto(`${base}/workspaces/management/home`, { waitUntil: "networkidle" });
await page.evaluate(() => document.documentElement.classList.add("dark"));
await page.waitForTimeout(300);
check("dark mode renders", (await page.locator("body").innerText()).length > 200);

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
