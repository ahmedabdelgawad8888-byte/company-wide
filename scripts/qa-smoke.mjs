/**
 * Crawls every internal link reachable from /workspace and asserts each route
 * renders. Previously this printed its findings and exited 0 regardless; now a
 * bad status, a "not found" body or a console error fails the run.
 */
import { runSuite } from "./qa-harness.mjs";

await runSuite("qa-smoke", async ({ base, browser, reporter }) => {
  const page = reporter.watch(await browser.newPage());

  await page.goto(`${base}/workspace`, { waitUntil: "networkidle" });
  const links = await page.$$eval("a[href]", (as) =>
    [...new Set(as.map((a) => a.getAttribute("href")))].filter((h) => h && h.startsWith("/")),
  );

  reporter.check("workspace entry exposes navigation", links.length > 0, `${links.length} links`);

  for (const route of links) {
    const res = await page.goto(base + route, { waitUntil: "networkidle" });
    const status = res?.status() ?? 0;
    const body = await page.locator("body").innerText();
    const notFound = /not found|404/i.test(body.slice(0, 4000));
    reporter.check(
      `route ${route}`,
      status < 400 && !notFound,
      notFound ? "rendered not-found" : `status ${status}`,
    );
  }
});
