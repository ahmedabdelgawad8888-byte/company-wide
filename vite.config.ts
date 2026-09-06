// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    optimizeDeps: {
      include: [
        "@tanstack/react-store",
        "@tanstack/store",
        "use-sync-external-store",
        "use-sync-external-store/shim/with-selector.js",
        "use-sync-external-store/shim/index.js",
      ],
    },
    server: {
      // Native Windows watchers can repeatedly invalidate config on subst drives.
      ...(process.platform === "win32" ? { watch: { usePolling: true, interval: 500 } } : {}),
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
