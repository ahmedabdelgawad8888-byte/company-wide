import { createFileRoute } from "@tanstack/react-router";
import { configuredProviders, type ModelRequest } from "../lib/agent-model";

export const Route = createFileRoute("/api/agent/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as ModelRequest;
        const ready = configuredProviders(body);
        return Response.json({ ready, anyConfigured: ready.length > 0 });
      },
    },
  },
});
