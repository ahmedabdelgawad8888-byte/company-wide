/**
 * Builds the app for a plain Node server.
 *
 * `npm run build` uses the default Cloudflare preset, whose output is a worker:
 * it cannot be started with `node`, and `vite preview` cannot serve it either
 * (that command looks for dist/server/server.js, which this build never emits).
 * This script selects Nitro's node-server preset so `npm start` can run the
 * result locally, and sets the env var in a way that works on Windows too.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const viteBin = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));

const child = spawn(process.execPath, [viteBin, "build", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NITRO_PRESET: "node-server" },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
