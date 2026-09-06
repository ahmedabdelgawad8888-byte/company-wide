import { createAnthropic } from "@ai-sdk/anthropic";
import { createGateway } from "@ai-sdk/gateway";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/** Server-only. Resolves a provider selection into a language model. */

export type AgentProviderId =
  | "gateway"
  | "anthropic"
  | "openai"
  | "google"
  | "ollamaDesktop"
  | "ollama"
  | "qwen"
  | "zen"
  | "compatible";

export const agentProviderIds: AgentProviderId[] = [
  "gateway",
  "anthropic",
  "openai",
  "google",
  "ollamaDesktop",
  "zen",
  "ollama",
  "qwen",
  "compatible",
];

export interface ModelRequest {
  providerId?: AgentProviderId;
  modelId?: string;
  /** Sent only when the visitor is using a key held in their own browser. */
  apiKey?: string;
  baseURL?: string;
  /**
   * Provider ids the browser holds a key for, plus any base URLs it has set.
   * Only identifiers travel here: a key value is sent to the provider being
   * called and nowhere else.
   */
  configured?: AgentProviderId[];
  baseUrls?: Partial<Record<AgentProviderId, string>>;
}

interface ProviderProfile {
  label: string;
  envVars: string[];
  /** Hosted endpoint for the OpenAI-compatible presets. */
  baseURL?: string;
  requiresBaseUrl?: boolean;
}

const profiles: Record<AgentProviderId, ProviderProfile> = {
  gateway: { label: "Vercel AI Gateway", envVars: ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN"] },
  anthropic: { label: "Anthropic", envVars: ["ANTHROPIC_API_KEY"] },
  openai: { label: "OpenAI", envVars: ["OPENAI_API_KEY"] },
  google: { label: "Google", envVars: ["GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_API_KEY"] },
  ollamaDesktop: {
    label: "Ollama Desktop + Cloud",
    envVars: ["OLLAMA_DESKTOP_API_KEY"],
    baseURL: "http://127.0.0.1:11434/v1",
  },
  zen: {
    label: "OpenCode Zen",
    envVars: ["OPENCODE_ZEN_API_KEY"],
    baseURL: "https://opencode.ai/zen/v1",
  },
  ollama: { label: "Ollama Cloud", envVars: ["OLLAMA_API_KEY"], baseURL: "https://ollama.com/v1" },
  qwen: {
    label: "QwenCloud",
    envVars: ["DASHSCOPE_API_KEY", "QWEN_API_KEY"],
    baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  },
  compatible: {
    label: "OpenAI-compatible endpoint",
    envVars: ["OPENAI_COMPATIBLE_API_KEY"],
    requiresBaseUrl: true,
  },
};

export function envKey(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

/**
 * Only a runtime on this machine answers without a credential. Hosted endpoints
 * all require a key, so treating them as keyless would report a provider ready
 * and then fail on the first message.
 */
function isLocalEndpoint(baseURL?: string) {
  if (!baseURL) return false;
  try {
    const { hostname } = new URL(baseURL);
    return ["localhost", "127.0.0.1", "0.0.0.0", "::1", "host.docker.internal"].includes(hostname);
  } catch {
    return false;
  }
}

function baseUrlFor(providerId: AgentProviderId, supplied?: string) {
  if (supplied) return supplied;
  // QWEN_BASE_URL is a QwenCloud override only; it must not reach other presets.
  if (providerId === "qwen" && process.env["QWEN_BASE_URL"]) return process.env["QWEN_BASE_URL"];
  if (providerId === "compatible") return envKey("OPENAI_COMPATIBLE_BASE_URL");
  return profiles[providerId].baseURL;
}

/** Whether a provider could answer, without making a request. */
export function providerIsConfigured(providerId: AgentProviderId, request: ModelRequest = {}) {
  const profile = profiles[providerId];
  const isSelected = (request.providerId ?? "gateway") === providerId;
  const baseURL = baseUrlFor(
    providerId,
    (isSelected ? request.baseURL : undefined) ?? request.baseUrls?.[providerId],
  );
  if (profile.requiresBaseUrl && !baseURL) return false;
  if (isSelected && request.apiKey) return true;
  if (request.configured?.includes(providerId)) return true;
  if (envKey(...profile.envVars)) return true;
  return isLocalEndpoint(baseURL);
}

export interface ResolvedModel {
  model: LanguageModel;
  providerId: AgentProviderId;
  modelId: string;
}

export interface ResolutionFailure {
  error: string;
  /** Providers that could answer, so the interface can offer a one-click switch. */
  ready: { id: AgentProviderId; label: string }[];
}

/**
 * Resolves exactly the provider that was selected. Failing clearly beats
 * silently answering with a model nobody chose.
 */
export function resolveAgentModel(request: ModelRequest): ResolvedModel | ResolutionFailure {
  const providerId: AgentProviderId = request.providerId ?? "gateway";
  const profile = profiles[providerId];
  const modelId = request.modelId?.trim();
  const ready = configuredProviders(request).filter((item) => item.id !== providerId);

  if (!modelId) {
    return { error: `Choose a model for ${profile.label} in Agent settings.`, ready };
  }

  const apiKey = request.apiKey ?? envKey(...profile.envVars);
  const baseURL = baseUrlFor(providerId, request.baseURL);

  if (profile.requiresBaseUrl && !baseURL) {
    return { error: "Set a base URL for the OpenAI-compatible endpoint in Agent settings.", ready };
  }
  if (!apiKey && !isLocalEndpoint(baseURL)) {
    const hint = ready.length
      ? ` ${ready.map((item) => item.label).join(" and ")} ${ready.length === 1 ? "is" : "are"} ready if you switch.`
      : "";
    return {
      error: `${profile.label} has no API key. Add ${profile.envVars[0]} to .env, or save a key in Agent settings.${hint}`,
      ready,
    };
  }

  switch (providerId) {
    case "anthropic":
      return {
        model: createAnthropic({ ...(apiKey ? { apiKey } : {}), ...(baseURL ? { baseURL } : {}) })(
          modelId,
        ),
        providerId,
        modelId,
      };
    case "openai":
      return {
        model: createOpenAI({ ...(apiKey ? { apiKey } : {}), ...(baseURL ? { baseURL } : {}) })(
          modelId,
        ),
        providerId,
        modelId,
      };
    case "google":
      return {
        model: createGoogleGenerativeAI({
          ...(apiKey ? { apiKey } : {}),
          ...(baseURL ? { baseURL } : {}),
        })(modelId),
        providerId,
        modelId,
      };
    case "gateway":
      return {
        model: createGateway({ ...(apiKey ? { apiKey } : {}), ...(baseURL ? { baseURL } : {}) })(
          modelId,
        ),
        providerId,
        modelId,
      };
    default: {
      // Ollama Desktop, Ollama Cloud, QwenCloud, OpenCode Zen and compatible endpoints.
      if (!baseURL) return { error: "No base URL is configured for this provider.", ready };
      const customFetch =
        providerId === "qwen"
          ? ((async (url: string | URL | Request, init?: RequestInit) => {
              if (init && typeof init.body === "string") {
                try {
                  const payload = JSON.parse(init.body) as Record<string, unknown>;
                  payload["enable_thinking"] = false;
                  init.body = JSON.stringify(payload);
                } catch {
                  void 0;
                }
              }
              return fetch(url, init);
            }) as typeof fetch)
          : undefined;

      return {
        model: createOpenAI({
          apiKey: apiKey ?? "not-required",
          baseURL,
          name: providerId,
          ...(customFetch ? { fetch: customFetch } : {}),
        })(modelId),
        providerId,
        modelId,
      };
    }
  }
}

export function providerLabel(providerId: AgentProviderId) {
  return profiles[providerId].label;
}

/** Reports which providers are ready, for the setup card and the settings page. */
export function configuredProviders(request: ModelRequest = {}) {
  return agentProviderIds
    .filter((id) => providerIsConfigured(id, request))
    .map((id) => ({ id, label: profiles[id].label }));
}

/** Extract user-facing error message from an AI provider exception. */
export function formatModelError(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as {
      responseBody?: string;
      data?: unknown;
      message?: string;
    };
    if (typeof candidate.responseBody === "string") {
      try {
        const parsed = JSON.parse(candidate.responseBody) as {
          message?: string;
          code?: string;
          error?: { message?: string; code?: string };
        };
        const message = parsed.message || parsed.error?.message;
        if (message) {
          return parsed.code || parsed.error?.code
            ? `${message} (${parsed.code || parsed.error?.code})`
            : message;
        }
      } catch {
        void 0;
      }
    }
    if (candidate.data && typeof candidate.data === "object") {
      const parsed = candidate.data as {
        message?: string;
        code?: string;
        error?: { message?: string; code?: string };
      };
      const message = parsed.message || parsed.error?.message;
      if (message) return message;
    }
    if (typeof candidate.message === "string" && candidate.message) {
      return candidate.message;
    }
  }
  return error instanceof Error ? error.message : "The model request failed.";
}
