import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { defaultPolicies, type ToolCategory, type ToolPolicy } from "./agent-tools";

const SETTINGS_KEY = "trygc:agent-settings:v3";

export type ProviderId =
  | "gateway"
  | "anthropic"
  | "openai"
  | "google"
  | "ollamaDesktop"
  | "ollama"
  | "qwen"
  | "zen"
  | "compatible";

export interface ProviderDescriptor {
  id: ProviderId;
  name: string;
  blurb: string;
  /** Where a visitor gets a key, shown in the setup card. */
  keyUrl?: string;
  envVar: string;
  needsBaseUrl?: boolean;
  /** Prefilled for hosted endpoints; still editable for self-hosted or regional deployments. */
  defaultBaseUrl?: string;
  /** Used when the live catalogue is unavailable. */
  fallbackModels: string[];
}

export const providerCatalogue: ProviderDescriptor[] = [
  {
    id: "openai",
    name: "OpenAI",
    blurb: "GPT and o-series models, called directly.",
    keyUrl: "https://platform.openai.com/api-keys",
    envVar: "OPENAI_API_KEY",
    fallbackModels: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini", "o4-mini"],
  },
  {
    id: "gateway",
    name: "Vercel AI Gateway",
    blurb: "One key, every provider below plus more.",
    keyUrl: "https://vercel.com/docs/ai-gateway",
    envVar: "AI_GATEWAY_API_KEY",
    fallbackModels: [
      "anthropic/claude-sonnet-4",
      "openai/gpt-4.1",
      "google/gemini-2.5-flash",
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    blurb: "Claude models, called directly.",
    keyUrl: "https://console.anthropic.com/settings/keys",
    envVar: "ANTHROPIC_API_KEY",
    fallbackModels: ["claude-sonnet-4-20250514", "claude-3-7-sonnet-latest", "claude-3-5-haiku-latest"],
  },
  {
    id: "google",
    name: "Google",
    blurb: "Gemini models, called directly.",
    keyUrl: "https://aistudio.google.com/apikey",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    fallbackModels: ["gemini-2.5-flash", "gemini-2.5-pro"],
  },
  {
    id: "ollamaDesktop",
    name: "Ollama Desktop + Cloud",
    blurb: "Uses the Ollama app running on this computer, including cloud models available to the signed-in account.",
    envVar: "OLLAMA_DESKTOP_API_KEY",
    defaultBaseUrl: "http://127.0.0.1:11434/v1",
    fallbackModels: ["kimi-k3:cloud", "qwen3.5:397b-cloud", "gpt-oss:120b-cloud"],
  },
  {
    id: "ollama",
    name: "Ollama Cloud",
    blurb: "Hosted open models, or point the base URL at a local ollama serve.",
    keyUrl: "https://ollama.com/settings/keys",
    envVar: "OLLAMA_API_KEY",
    defaultBaseUrl: "https://ollama.com/v1",
    fallbackModels: ["gpt-oss:120b", "qwen3:32b", "llama3.3:70b"],
  },
  {
    id: "qwen",
    name: "QwenCloud",
    blurb: "Alibaba DashScope in OpenAI-compatible mode.",
    keyUrl: "https://home.qwencloud.com/api-keys",
    envVar: "DASHSCOPE_API_KEY",
    defaultBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    fallbackModels: [
      "qwen3.8-max",
      "qwen3.8-flash",
      "qwen3.7-plus",
      "qwen3.6-flash",
      "deepseek-v4-pro",
      "deepseek-v4-flash",
      "kimi-k2.7-code",
    ],
  },
  {
    id: "zen",
    name: "OpenCode Zen",
    blurb: "The OpenCode gateway, with frontier models behind one key.",
    keyUrl: "https://opencode.ai/zen",
    envVar: "OPENCODE_ZEN_API_KEY",
    defaultBaseUrl: "https://opencode.ai/zen/v1",
    fallbackModels: ["claude-sonnet-4", "big-pickle"],
  },
  {
    id: "compatible",
    name: "OpenAI-compatible",
    blurb:
      "Any endpoint speaking the OpenAI API: Groq, Together, OpenRouter, DeepSeek, Fireworks, vLLM, Ollama, LM Studio.",
    envVar: "OPENAI_COMPATIBLE_API_KEY",
    needsBaseUrl: true,
    fallbackModels: [],
  },
];

export interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
  builtIn?: boolean;
}

export interface ScheduledBrief {
  id: string;
  promptId: string;
  cadence: "daily" | "weekly" | "monthly";
  hour: number;
  enabled: boolean;
  lastRunAt?: string;
}

export const builtInPrompts: SavedPrompt[] = [
  {
    id: "sp-standup",
    title: "Morning stand-up",
    builtIn: true,
    prompt:
      "Give me today's stand-up for my active workspace. Headline metrics, everything due today, everything overdue with how many days late and who owns it, and the three things I should act on first. Keep it under 200 words plus the visuals.",
  },
  {
    id: "sp-overdue",
    title: "Overdue chase list",
    builtIn: true,
    prompt:
      "Build me an overdue chase list. List every open record past its deadline, oldest first, with owner, days overdue and the next action. Chart the overdue aging, then tell me which owner is carrying the most of it.",
  },
  {
    id: "sp-blocked",
    title: "Blocked and escalated",
    builtIn: true,
    prompt:
      "Show me everything blocked or escalated. For each one give the owner, how long it has been stuck, and what the recorded next action is. Recommend the single most urgent intervention.",
  },
  {
    id: "sp-workload",
    title: "Team workload review",
    builtIn: true,
    prompt:
      "Review team workload for this workspace. Show the open work per owner with overdue and blocked counts, chart it, and tell me whether the distribution is balanced or where I should rebalance.",
  },
  {
    id: "sp-collections",
    title: "Collections position",
    builtIn: true,
    prompt:
      "Show the collections position. Total outstanding by currency, everything past due with the balance and days overdue, and which accounts to chase first.",
  },
  {
    id: "sp-week",
    title: "Week ahead",
    builtIn: true,
    prompt:
      "Plan my week ahead. What lands in the next seven days, what is at risk of slipping given current progress, and what should I move now rather than later?",
  },
];

export interface AgentSettings {
  providerId: ProviderId;
  modelId: string;
  /** Held in the browser only, never written to the server except as a per-request header. */
  apiKeys: Partial<Record<ProviderId, string>>;
  baseUrls: Partial<Record<ProviderId, string>>;
  policies: Record<ToolCategory, ToolPolicy>;
  voiceInput: boolean;
  voiceOutput: boolean;
  savedPrompts: SavedPrompt[];
  schedules: ScheduledBrief[];
}

const defaultSettings: AgentSettings = {
  providerId: "ollamaDesktop",
  modelId: "kimi-k3:cloud",
  apiKeys: {},
  baseUrls: { ollamaDesktop: "http://127.0.0.1:11434/v1" },
  policies: { ...defaultPolicies },
  voiceInput: true,
  voiceOutput: false,
  savedPrompts: builtInPrompts,
  schedules: [],
};

interface AgentSettingsValue extends AgentSettings {
  hydrated: boolean;
  update: (patch: Partial<AgentSettings>) => void;
  setPolicy: (category: ToolCategory, policy: ToolPolicy) => void;
  setApiKey: (provider: ProviderId, key: string) => void;
  setBaseUrl: (provider: ProviderId, url: string) => void;
  addPrompt: (title: string, prompt: string) => void;
  removePrompt: (id: string) => void;
  toggleSchedule: (promptId: string, cadence: ScheduledBrief["cadence"], hour: number) => void;
  removeSchedule: (id: string) => void;
  saveNow: () => void;
  /** Key the browser holds for the active provider, if any. */
  activeKey?: string;
  /** Provider ids this browser holds a key for. Identifiers only, never values. */
  configuredProviderIds: ProviderId[];
  /** Base URLs this browser has set or inherits from a preset. */
  baseUrlMap: Partial<Record<ProviderId, string>>;
  activeBaseUrl?: string;
  provider: ProviderDescriptor;
}

const AgentSettingsContext = createContext<AgentSettingsValue | null>(null);

export function AgentSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AgentSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AgentSettings>;
        setSettings({
          ...defaultSettings,
          ...parsed,
          policies: { ...defaultPolicies, ...(parsed.policies ?? {}) },
          apiKeys: parsed.apiKeys ?? {},
          baseUrls: parsed.baseUrls ?? {},
          // Built-ins are code, not data, so they refresh with the app.
          savedPrompts: [
            ...builtInPrompts,
            ...(parsed.savedPrompts ?? []).filter((item) => !item.builtIn),
          ],
          schedules: parsed.schedules ?? [],
        });
      }
    } catch {
      window.localStorage.removeItem(SETTINGS_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // A full quota should not break the chat; settings simply stop persisting.
    }
  }, [hydrated, settings]);

  const update = useCallback((patch: Partial<AgentSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      // A model id belongs to one provider. Carrying it across a provider
      // change sends a name the new endpoint has never heard of.
      if (patch.providerId && patch.providerId !== current.providerId && patch.modelId === undefined) {
        const target = providerCatalogue.find((item) => item.id === patch.providerId);
        next.modelId = target?.fallbackModels[0] ?? "";
      }
      return next;
    });
  }, []);

  const value = useMemo<AgentSettingsValue>(() => {
    const provider =
      providerCatalogue.find((item) => item.id === settings.providerId) ??
      (providerCatalogue[0] as ProviderDescriptor);
    const activeKey = settings.apiKeys[settings.providerId];
    const activeBaseUrl = settings.baseUrls[settings.providerId] || provider.defaultBaseUrl;
    return {
      ...settings,
      hydrated,
      provider,
      ...(activeKey ? { activeKey } : {}),
      ...(activeBaseUrl ? { activeBaseUrl } : {}),
      configuredProviderIds: providerCatalogue
        .filter((item) => settings.apiKeys[item.id])
        .map((item) => item.id),
      baseUrlMap: Object.fromEntries(
        providerCatalogue
          .map((item) => [item.id, settings.baseUrls[item.id] || item.defaultBaseUrl])
          .filter(([, url]) => Boolean(url)),
      ),
      update,
      setPolicy: (category, policy) =>
        setSettings((current) => ({
          ...current,
          policies: { ...current.policies, [category]: policy },
        })),
      setApiKey: (providerId, key) =>
        setSettings((current) => ({ ...current, apiKeys: { ...current.apiKeys, [providerId]: key } })),
      setBaseUrl: (providerId, url) =>
        setSettings((current) => ({ ...current, baseUrls: { ...current.baseUrls, [providerId]: url } })),
      addPrompt: (title, prompt) =>
        setSettings((current) => ({
          ...current,
          savedPrompts: [
            ...current.savedPrompts,
            { id: `sp-${Date.now().toString(36)}`, title, prompt },
          ],
        })),
      removePrompt: (id) =>
        setSettings((current) => ({
          ...current,
          savedPrompts: current.savedPrompts.filter((item) => item.id !== id),
          schedules: current.schedules.filter((item) => item.promptId !== id),
        })),
      toggleSchedule: (promptId, cadence, hour) =>
        setSettings((current) => {
          const existing = current.schedules.find((item) => item.promptId === promptId);
          if (existing) {
            return {
              ...current,
              schedules: current.schedules.map((item) =>
                item.promptId === promptId ? { ...item, cadence, hour, enabled: !item.enabled } : item,
              ),
            };
          }
          return {
            ...current,
            schedules: [
              ...current.schedules,
              { id: `sc-${Date.now().toString(36)}`, promptId, cadence, hour, enabled: true },
            ],
          };
        }),
      removeSchedule: (id) =>
        setSettings((current) => ({
          ...current,
          schedules: current.schedules.filter((item) => item.id !== id),
        })),
      saveNow: () => window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)),
    };
  }, [settings, hydrated, update]);

  return <AgentSettingsContext.Provider value={value}>{children}</AgentSettingsContext.Provider>;
}

export function useAgentSettings() {
  const context = useContext(AgentSettingsContext);
  if (!context) throw new Error("useAgentSettings must be used inside AgentSettingsProvider");
  return context;
}
