/**
 * Shared QA harness.
 *
 * Every QA script used to assume a dev server was already running on a hardcoded
 * port, launched a headed browser through the "chrome" channel, and (in the case
 * of qa-smoke) exited 0 no matter what it found. This module fixes all three:
 * it boots the server itself, picks whichever browser is actually installed, and
 * gives the scripts a reporter that decides the exit code.
 *
 * Env overrides:
 *   QA_BASE     - test an already-running server instead of booting one
 *   QA_HEADED=1 - watch the run in a headed browser
 *   QA_PORT     - port to boot the dev server on (default 5173)
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HOST = "127.0.0.1";
const READY_TIMEOUT_MS = 180_000;

/** Bundled Chromium is preferred; system Chrome is the fallback when it was never downloaded. */
export async function launchBrowser() {
  const headless = process.env.QA_HEADED !== "1";
  try {
    return await chromium.launch({ headless });
  } catch (bundledError) {
    try {
      return await chromium.launch({ channel: "chrome", headless });
    } catch {
      throw new Error(
        "No usable browser. Install Playwright's browser with `npx playwright install chromium`, " +
          `or install Google Chrome.\nBundled launch failed with: ${String(bundledError).slice(0, 200)}`,
      );
    }
  }
}

async function waitForServer(base, childExited) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (childExited.code !== null) {
      throw new Error(`Dev server exited early with code ${childExited.code}.\n${childExited.log}`);
    }
    try {
      const res = await fetch(base, { signal: AbortSignal.timeout(5000) });
      if (res.status < 500) return;
    } catch {
      // not listening yet
    }
    await sleep(500);
  }
  throw new Error(`Server did not become ready at ${base} within ${READY_TIMEOUT_MS}ms.`);
}

/**
 * Boots `vite dev` and resolves once it answers, unless QA_BASE points at a
 * server that is already running. Returns the base URL plus a stop() to call
 * in a finally block.
 */
export async function startServer() {
  if (process.env.QA_BASE) {
    const base = process.env.QA_BASE.replace(/\/$/, "");
    process.stdout.write(`Using existing server at ${base}\n`);
    return { base, stop: async () => {} };
  }

  const port = process.env.QA_PORT ?? "5173";
  const base = `http://${HOST}:${port}`;
  process.stdout.write(`Starting dev server on ${base} ...\n`);

  // Spawn Vite's bin with the current Node rather than going through the npx
  // shim: no shell, so no argument-escaping caveat and no .cmd wrapper process.
  const viteBin = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--port", port, "--strictPort", "--host", HOST],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  const tracked = { code: null, log: "" };
  const capture = (chunk) => {
    tracked.log = (tracked.log + chunk.toString()).slice(-4000);
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  child.on("exit", (code) => {
    tracked.code = code ?? 0;
  });

  const stop = async () => {
    if (tracked.code !== null) return;
    // The npx shim spawns vite as a grandchild, so kill the whole tree on Windows.
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
    await sleep(500);
  };

  try {
    await waitForServer(base, tracked);
  } catch (error) {
    await stop();
    throw error;
  }

  process.stdout.write("Dev server ready.\n");
  return { base, stop };
}

/**
 * Records checks and console noise, then decides the process exit code.
 *
 * Console errors raised by third-party origins (the web-font CDN, for example) are
 * reported separately and do not fail the run: they say something about the network
 * the suite happens to be on, not about this app. Anything the app itself logs still
 * fails, so the gate keeps its teeth.
 */
export function createReporter(name) {
  const results = [];
  const errors = [];
  const external = [];

  const isExternal = (url) =>
    Boolean(url) && !/^https?:\/\/127\.0\.0\.1|^https?:\/\/localhost/.test(url);

  return {
    /** Attach to a page so console errors and uncaught exceptions are counted. */
    watch(page) {
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const url = m.location()?.url ?? "";
        if (isExternal(url)) external.push(`${m.text()} (${url})`);
        else errors.push(m.text());
      });
      page.on("pageerror", (e) => errors.push(String(e)));
      return page;
    },

    check(label, ok, extra = "") {
      results.push([label, Boolean(ok), extra]);
      process.stdout.write(`${ok ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}\n`);
      return Boolean(ok);
    },

    /**
     * Prints the summary and exits non-zero when anything failed. Console errors
     * are failures too — a page that renders while throwing is not a pass.
     */
    finish({ failOnConsoleErrors = true } = {}) {
      const failed = results.filter(([, ok]) => !ok);
      const unique = [...new Set(errors)];

      process.stdout.write(`\n=== ${name} RESULTS ===\n`);
      process.stdout.write(`${results.length - failed.length}/${results.length} checks passed\n`);
      for (const [label, , extra] of failed) {
        process.stdout.write(`  FAIL ${label}${extra ? ` — ${extra}` : ""}\n`);
      }

      process.stdout.write(`CONSOLE ERRORS: ${unique.length}\n`);
      unique.slice(0, 20).forEach((e) => process.stdout.write(` - ${e.slice(0, 200)}\n`));

      const uniqueExternal = [...new Set(external)];
      if (uniqueExternal.length) {
        process.stdout.write(
          `THIRD-PARTY RESOURCE ERRORS (not failing the run): ${uniqueExternal.length}\n`,
        );
        uniqueExternal.slice(0, 10).forEach((e) => process.stdout.write(` - ${e.slice(0, 200)}\n`));
      }

      const failing = failed.length > 0 || (failOnConsoleErrors && unique.length > 0);
      if (failing) {
        process.stdout.write(`\n${name} FAILED\n`);
        process.exitCode = 1;
      } else {
        process.stdout.write(`\n${name} PASSED\n`);
      }
      return !failing;
    },
  };
}

/** Boots the server, runs `fn({ base, browser, reporter })`, and always tears down. */
export async function runSuite(name, fn, options = {}) {
  const reporter = createReporter(name);
  let server;
  let browser;
  try {
    server = await startServer();
    browser = await launchBrowser();
    await fn({ base: server.base, browser, reporter });
  } catch (error) {
    process.stdout.write(`\n${name} CRASHED: ${String(error)}\n`);
    process.exitCode = 1;
    return;
  } finally {
    await browser?.close().catch(() => {});
    await server?.stop().catch(() => {});
  }
  reporter.finish(options);
}
