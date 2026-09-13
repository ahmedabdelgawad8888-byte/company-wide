/**
 * Responsive and accessibility gate.
 *
 * Checks the things that silently rot as pages change: sideways scrolling on a
 * phone, interactive controls with no accessible name, unlabelled form fields,
 * and pages that lost their single top-level heading.
 */
import { runSuite } from "./qa-harness.mjs";

const ROUTES = [
  "/workspace",
  "/workspaces/management/home",
  "/workspaces/sales/home",
  "/workspaces/finance/home",
  "/workspaces/hr/home",
  "/workspaces/it/home",
  "/workspaces/pmo/home",
  "/workspaces/management/task",
  "/workspaces/management/dashboard",
  "/settings",
];

const PHONE = { width: 390, height: 844 };

/** Runs in the page: reports layout overflow and missing accessible names. */
function auditPage() {
  const root = document.documentElement;
  const viewport = root.clientWidth;

  const visible = (el) => el.getBoundingClientRect().width > 0 && el.offsetParent !== null;

  const named = (el) =>
    Boolean(
      (el.innerText || "").trim() ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.getAttribute("title"),
    );

  const unnamed = [...document.querySelectorAll('button, a[href], [role="button"], [role="tab"]')]
    .filter(visible)
    .filter((el) => !named(el))
    .map((el) => `${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 40)}`);

  const unlabelledFields = [
    ...document.querySelectorAll("input:not([type=hidden]), select, textarea"),
  ]
    .filter(visible)
    .filter(
      (el) =>
        !el.labels?.length &&
        !el.getAttribute("aria-label") &&
        !el.getAttribute("aria-labelledby") &&
        !el.getAttribute("placeholder"),
    )
    .map((el) => `${el.tagName.toLowerCase()}#${el.id || "(no id)"}`);

  return {
    overflow: root.scrollWidth - viewport,
    headings: document.querySelectorAll("h1").length,
    unnamed: [...new Set(unnamed)],
    unlabelledFields: [...new Set(unlabelledFields)],
  };
}

await runSuite("qa-responsive", async ({ base, browser, reporter }) => {
  const page = reporter.watch(await browser.newPage({ viewport: PHONE }));

  for (const route of ROUTES) {
    await page.goto(base + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    const audit = await page.evaluate(auditPage);

    // A couple of pixels of rounding is not a layout bug; a scrollbar's worth is.
    reporter.check(
      `${route} fits a ${PHONE.width}px viewport`,
      audit.overflow <= 2,
      audit.overflow > 2 ? `overflows by ${audit.overflow}px` : "",
    );
    reporter.check(
      `${route} names every control`,
      audit.unnamed.length === 0,
      audit.unnamed.slice(0, 3).join(" | "),
    );
    reporter.check(
      `${route} labels every field`,
      audit.unlabelledFields.length === 0,
      audit.unlabelledFields.slice(0, 3).join(" | "),
    );
    reporter.check(`${route} has exactly one h1`, audit.headings === 1, `found ${audit.headings}`);
  }
});
