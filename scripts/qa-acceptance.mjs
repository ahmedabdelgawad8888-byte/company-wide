/**
 * Acceptance pass over the Management workspace: record creation, the queues
 * that answer "what is blocked" and "what do I need to do", global search, and
 * dark mode.
 */
import { runSuite } from "./qa-harness.mjs";

await runSuite("qa-acceptance", async ({ base, browser, reporter }) => {
  const page = reporter.watch(await browser.newPage());

  async function fillRequired(dialog, title) {
    await dialog.getByLabel("Title", { exact: true }).fill(title);
    for (const field of await dialog.locator("input[required], textarea[required]").all()) {
      if ((await field.inputValue()) !== "") continue;
      const type = await field.getAttribute("type");
      await field.fill(
        type === "date"
          ? "2026-09-30"
          : type === "time"
            ? "10:00"
            : type === "number"
              ? "1"
              : "QA value",
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
  const meeting = await createRecord("management", "meeting", /create meeting/i, meetingTitle);
  reporter.check("meeting created", meeting.ok, meeting.reason ?? "");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.goto(`${base}/workspaces/management/meeting`, { waitUntil: "networkidle" });
  reporter.check("meeting listed", (await page.locator("body").innerText()).includes(meetingTitle));

  // 2. Blocker creation and visibility in the blocked queue
  const blockerTitle = `QA blocker ${Date.now()}`;
  const blocker = await createRecord("management", "blocker", /create blocker/i, blockerTitle);
  reporter.check("blocker created", blocker.ok, blocker.reason ?? "");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.goto(`${base}/workspaces/management/blocker`, { waitUntil: "networkidle" });
  reporter.check("blocker listed", (await page.locator("body").innerText()).includes(blockerTitle));

  // 3. Approvals page renders a decision-focused queue
  await page.goto(`${base}/workspaces/management/approval`, { waitUntil: "networkidle" });
  const approvalsText = await page.locator("body").innerText();
  reporter.check(
    "approvals page renders",
    approvalsText.length > 200 && !/page not found/i.test(approvalsText),
  );

  // 4. My work answers "what do I need to do"
  await page.goto(`${base}/workspaces/management/my-work`, { waitUntil: "networkidle" });
  reporter.check(
    "my-work renders actionable queue",
    /overdue|due|next action|today/i.test(await page.locator("body").innerText()),
  );

  // 5. Global search finds the created meeting
  await page.goto(`${base}/workspaces/management/home`, { waitUntil: "networkidle" });
  const paletteBtn = page.getByRole("button", { name: /search priorities/i }).first();
  if (await paletteBtn.count()) {
    await paletteBtn.click();
    await page.waitForTimeout(500);
    await page.locator("input[placeholder]:visible").first().fill(meetingTitle.slice(0, 20));
    await page.waitForTimeout(800);
    const dlg = page.getByRole("dialog").first();
    const txt = (await dlg.count()) ? await dlg.innerText() : "";
    reporter.check(
      "global search finds new record",
      txt.includes(meetingTitle),
      txt.slice(0, 100).replace(/\s+/g, " "),
    );
    await page.keyboard.press("Escape");
  } else {
    reporter.check("command palette present", false);
  }

  // 6. Dark mode does not break the shell
  await page.goto(`${base}/workspaces/management/home`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(300);
  reporter.check("dark mode renders", (await page.locator("body").innerText()).length > 200);

  // 7. Storage recovery is reachable before anything goes wrong
  await page.goto(`${base}/settings`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /data & exports/i }).click();
  await page.waitForTimeout(500);

  const backupBtn = page.getByRole("button", { name: /download recovery copy/i }).first();
  reporter.check("settings exposes a recovery download", (await backupBtn.count()) > 0);
  reporter.check(
    "settings exposes a restore control",
    (await page.getByRole("button", { name: /restore from file/i }).count()) > 0,
  );
  reporter.check(
    "settings exposes a data reset",
    (await page.getByRole("button", { name: /reset workspace data/i }).count()) > 0,
  );

  // The download must produce a real file, not just a wired-up button.
  if (await backupBtn.count()) {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10_000 }).catch(() => null),
      backupBtn.click(),
    ]);
    reporter.check(
      "recovery download produces a file",
      Boolean(download) && /workspace-backup/.test(download.suggestedFilename()),
      download?.suggestedFilename() ?? "no download event",
    );
  }
});
