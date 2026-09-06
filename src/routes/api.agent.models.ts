import { createFileRoute } from "@tanstack/react-router";
import type { AgentProviderId } from "../lib/agent-model";

const models: Record<AgentProviderId, string[]> = {
  openai: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini", "o4-mini"],
  gateway: ["anthropic/claude-sonnet-4", "openai/gpt-4.1", "google/gemini-2.5-flash"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3-7-sonnet-latest", "claude-3-5-haiku-latest"],
  google: ["gemini-2.5-flash", "gemini-2.5-pro"],
  ollamaDesktop: ["kimi-k3:cloud", "qwen3.5:397b-cloud", "gpt-oss:120b-cloud"],
  ollama: ["gpt-oss:120b", "qwen3:32b", "llama3.3:70b"],
  qwen: [
    "qwen3.8-max",
    "qwen3.8-flash",
    "qwen3.7-plus",
    "qwen3.6-flash",
    "deepseek-v4-pro",
    "deepseek-v4-flash",
    "kimi-k2.7-code",
  ],
  zen: ["claude-sonnet-4", "big-pickle"],
  compatible: [],
};

export const Route = createFileRoute("/api/agent/models")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const provider = new URL(request.url).searchParams.get(
          "provider",
        ) as AgentProviderId | null;
        if (!provider || !(provider in models))
          return Response.json({ error: "Unknown provider.", models: [] }, { status: 400 });
        if (provider === "ollamaDesktop") {
          try {
            const response = await fetch("http://127.0.0.1:11434/api/tags", {
              signal: AbortSignal.timeout(2500),
            });
            if (response.ok) {
              const payload = (await response.json()) as { models?: Array<{ name?: string }> };
              const liveModels = (payload.models ?? [])
                .map((item) => item.name?.trim())
                .filter((id): id is string => Boolean(id));
              if (liveModels.length) {
                return Response.json({
                  models: liveModels.map((id) => ({ id, name: id, provider })),
                });
              }
            }
          } catch {
            // Keep Settings usable when the desktop service is temporarily offline.
          }
        }
        if (provider === "qwen") {
          const key =
            request.headers.get("x-agent-key") ||
            process.env["DASHSCOPE_API_KEY"] ||
            process.env["QWEN_API_KEY"];
          if (key) {
            try {
              const response = await fetch(
                "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models",
                {
                  headers: { Authorization: `Bearer ${key}` },
                  signal: AbortSignal.timeout(3500),
                },
              );
              if (response.ok) {
                const payload = (await response.json()) as {
                  data?: Array<{ id: string }>;
                };
                const liveIds = (payload.data ?? [])
                  .map((item) => item.id)
                  .filter(
                    (id) =>
                      !id.includes("embedding") &&
                      !id.includes("rerank") &&
                      !id.includes("audio") &&
                      !id.includes("image") &&
                      !id.includes("wanx") &&
                      !id.includes("whisper"),
                  );
                if (liveIds.length) {
                  const priority = [
                    "qwen3.8-max",
                    "qwen3.8-flash",
                    "qwen3.7-plus",
                    "qwen3.6-flash",
                    "deepseek-v4-pro",
                    "deepseek-v4-flash",
                    "kimi-k3",
                    "kimi-k2.7-code",
                  ];
                  const sorted = [
                    ...priority.filter((id) => liveIds.includes(id)),
                    ...liveIds.filter((id) => !priority.includes(id)),
                  ];
                  return Response.json({
                    models: sorted.map((id) => ({ id, name: id, provider })),
                  });
                }
              }
            } catch {
              // Fallback to static catalogue
            }
          }
        }
        return Response.json({
          models: models[provider].map((id) => ({ id, name: id, provider })),
        });
      },
    },
  },
});
