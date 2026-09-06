import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { formatModelError, resolveAgentModel, type ModelRequest } from "../lib/agent-model";

export const Route = createFileRoute("/api/agent/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as ModelRequest;
        const resolved = resolveAgentModel(body);
        if ("error" in resolved)
          return Response.json({ ok: false, error: resolved.error }, { status: 400 });
        try {
          await generateText({
            model: resolved.model,
            prompt: "Reply with the single word: connected",
            maxOutputTokens: 32,
          });
          return Response.json({
            ok: true,
            message: `${resolved.providerId} / ${resolved.modelId} connected.`,
          });
        } catch (error) {
          return Response.json({ ok: false, error: formatModelError(error) }, { status: 502 });
        }
      },
    },
  },
});
