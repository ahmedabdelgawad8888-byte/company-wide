import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";

import appCss from "../styles.css?url";
import { AppProvider } from "../lib/store";
import { LangProvider } from "../lib/i18n";
import { ThemeProvider } from "../lib/theme";
import { ExportPrefsProvider } from "../lib/export-prefs";
import { DrillProvider } from "../lib/drill";
import { ExportQueueProvider } from "../lib/export-queue";
import { DrillPanel } from "../components/drill-panel";
import { AppShell } from "../components/layout/app-shell";
import { HubProvider } from "../features/workspaces/provider";
import { Toaster } from "../components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AgentSettingsProvider } from "../features/agent/agent-settings";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TryGC Workspace Hub — Command Center" },
      {
        name: "description",
        content:
          "The TryGC workspace-first operating environment for Management, Finance, Sales and HR.",
      },
      { name: "author", content: "TryGC" },
      { name: "theme-color", content: "#0b0b0f" },
      { property: "og:title", content: "TryGC Workspace Hub" },
      {
        property: "og:description",
        content:
          "Four focused workspaces at TryGC: Management, Finance, Sales and HR, each with its own role hierarchy.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/android-chrome-512x512.png" },
      { name: "twitter:card", content: "summary_large_image" },

      { name: "twitter:image", content: "/android-chrome-512x512.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "64x64" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        {/*
          Vercel Analytics fetches /_vercel/insights/script.js, which only exists when the
          app is served by Vercel. This build targets Cloudflare, so leaving it on made
          every page load 404 in the console. Opt in with VITE_ENABLE_ANALYTICS=true.
        */}
        {import.meta.env["VITE_ENABLE_ANALYTICS"] === "true" ? <Analytics /> : null}
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <ThemeProvider>
          <AppProvider>
            <ExportPrefsProvider>
              <ExportQueueProvider>
                <DrillProvider>
                  <AgentSettingsProvider>
                    <HubProvider>
                      <AppShell>
                        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
                        <Outlet />
                      </AppShell>
                    </HubProvider>
                  </AgentSettingsProvider>
                  <DrillPanel />
                  <Toaster position="top-right" richColors />
                </DrillProvider>
              </ExportQueueProvider>
            </ExportPrefsProvider>
          </AppProvider>
        </ThemeProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}
