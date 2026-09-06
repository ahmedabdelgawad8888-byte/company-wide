import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, KeyRound, Loader2, PlugZap, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { Pill } from "../../components/kit";
import { type ProviderId, providerCatalogue, useAgentSettings } from "./agent-settings";
import { categoryLabels, defaultPolicies, type ToolPolicy, toolCategories } from "./agent-tools";

interface CatalogueModel {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
}

const policyLabels: Record<ToolPolicy, string> = {
  auto: "Run automatically",
  confirm: "Ask me first",
  blocked: "Block entirely",
};

const control =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function FieldRow({
  label,
  htmlFor,
  hint,
  action,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-medium">
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Provider, model, endpoint and credentials. */
export function ConnectionSection() {
  const settings = useAgentSettings();
  const provider = settings.provider;
  const activeKey = settings.activeKey;
  const [models, setModels] = useState<CatalogueModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [detectedProviders, setDetectedProviders] = useState<ProviderId[]>([]);
  const [scanningProviders, setScanningProviders] = useState(false);

  const scanProviders = useCallback(async () => {
    setScanningProviders(true);
    try {
      const response = await fetch("/api/agent/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerId: settings.providerId,
          configured: settings.configuredProviderIds,
          baseUrls: settings.baseUrlMap,
        }),
      });
      const payload = (await response.json()) as { ready?: Array<{ id: ProviderId }> };
      setDetectedProviders((payload.ready ?? []).map((item) => item.id));
    } catch {
      setDetectedProviders([]);
      toast.error("Provider scan could not reach the agent service.");
    } finally {
      setScanningProviders(false);
    }
  }, [settings.providerId, settings.configuredProviderIds, settings.baseUrlMap]);

  const loadCatalogue = useCallback(async () => {
    setLoading(true);
    setCatalogueError(null);
    try {
      const response = await fetch(
        `/api/agent/models?provider=${provider.id}`,
        activeKey ? { headers: { "x-agent-key": activeKey } } : undefined,
      );
      const payload = (await response.json()) as { models?: CatalogueModel[]; error?: string };
      setModels(payload.models ?? []);
      setCatalogueError(payload.error ?? null);
    } catch {
      setModels([]);
      setCatalogueError("Could not reach the model catalogue. Type the model id directly.");
    } finally {
      setLoading(false);
    }
  }, [activeKey, provider.id]);

  useEffect(() => {
    void loadCatalogue();
  }, [loadCatalogue]);

  useEffect(() => {
    void scanProviders();
  }, [scanProviders]);

  const foundProviders = providerCatalogue.filter((item) => detectedProviders.includes(item.id));
  const otherProviders = providerCatalogue.filter((item) => !detectedProviders.includes(item.id));

  const availableModels = useMemo(() => {
    if (provider.id === "compatible") return [];
    const fallback = provider.fallbackModels.map((id) => ({
      id,
      name: id,
      provider: provider.id,
    }));
    // Providers with their own catalogue already return exactly their own ids.
    if (["gateway", "ollamaDesktop", "ollama", "zen", "qwen", "openai"].includes(provider.id))
      return models.length ? models : fallback;
    const own = models
      .filter((model) => model.provider === provider.id || model.id.startsWith(`${provider.id}/`))
      .map((model) => ({ ...model, id: model.id.replace(`${provider.id}/`, "") }));
    return own.length ? own : fallback;
  }, [models, provider]);

  return (
    <div className="grid gap-5">
      <FieldRow
        label="Provider"
        htmlFor="agent-provider"
        hint={
          detectedProviders.length
            ? `${detectedProviders.length} provider${detectedProviders.length === 1 ? "" : "s"} found and ready. ${provider.blurb}`
            : `No ready provider found yet. ${provider.blurb}`
        }
        action={
          <Button variant="ghost" size="sm" onClick={() => void scanProviders()} disabled={scanningProviders}>
            <RefreshCw className={`size-3.5 ${scanningProviders ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh providers
          </Button>
        }
      >
        <select
          id="agent-provider"
          className={control}
          value={settings.providerId}
          onChange={(event) => settings.update({ providerId: event.target.value as ProviderId })}
        >
          {foundProviders.length ? (
            <optgroup label="Found and ready">
              {foundProviders.map((item) => (
                <option key={item.id} value={item.id}>{item.name} — Ready</option>
              ))}
            </optgroup>
          ) : null}
          {otherProviders.length ? (
            <optgroup label="Other providers">
              {otherProviders.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </FieldRow>

      <FieldRow
        label="Model"
        htmlFor="agent-model"
        action={
          <Button variant="ghost" size="sm" onClick={() => void loadCatalogue()} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
        }
        hint={
          availableModels.length
            ? `${availableModels.length} models available.`
            : (catalogueError ?? "Enter the model id exactly as your endpoint expects it.")
        }
      >
        {provider.id === "compatible" || !availableModels.length ? (
          <Input
            id="agent-model"
            value={settings.modelId}
            onChange={(event) => settings.update({ modelId: event.target.value })}
            placeholder="Model id, for example gpt-4.1"
          />
        ) : (
          <select
            id="agent-model"
            className={control}
            value={settings.modelId}
            onChange={(event) => settings.update({ modelId: event.target.value })}
          >
            {!availableModels.some((m) => m.id === settings.modelId) && settings.modelId ? (
              <option value={settings.modelId}>{settings.modelId}</option>
            ) : null}
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        )}
      </FieldRow>

      {provider.needsBaseUrl || provider.defaultBaseUrl ? (
        <FieldRow
          label="Base URL"
          htmlFor="agent-base-url"
          hint={
            provider.defaultBaseUrl
              ? "Prefilled for the hosted endpoint. Change it for a self-hosted or regional deployment."
              : "Any OpenAI-compatible endpoint. Local runtimes must allow this origin."
          }
        >
          <Input
            id="agent-base-url"
            value={settings.activeBaseUrl ?? ""}
            onChange={(event) => settings.setBaseUrl(provider.id, event.target.value)}
            placeholder={provider.defaultBaseUrl ?? "http://localhost:11434/v1"}
          />
        </FieldRow>
      ) : null}

      <ApiKeyField key={provider.id} />
      <div className="flex justify-end border-t pt-4">
        <Button
          onClick={() => {
            settings.saveNow();
            toast.success("API provider, model, endpoint, and saved key are stored in this browser.");
          }}
        >
          <Save className="size-4" aria-hidden="true" /> Save API settings
        </Button>
      </div>
    </div>
  );
}

/**
 * Keys are only committed on an explicit save, so a half-typed value never
 * reaches storage, and the visitor can confirm the key actually works.
 */
export function ApiKeyField() {
  const settings = useAgentSettings();
  const provider = settings.provider;
  const saved = settings.activeKey ?? "";
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const masked =
    saved.length > 8 ? `${"•".repeat(Math.min(saved.length - 4, 28))}${saved.slice(-4)}` : "••••••••";

  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    settings.setApiKey(provider.id, trimmed);
    setDraft("");
    setEditing(false);
    setResult(null);
    toast.success(`${provider.name} key saved in this browser.`);
  };

  const remove = () => {
    settings.setApiKey(provider.id, "");
    setDraft("");
    setEditing(false);
    setResult(null);
    toast.success(`${provider.name} key removed.`);
  };

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      const response = await fetch("/api/agent/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerId: provider.id,
          modelId: settings.modelId,
          apiKey: saved || undefined,
          baseURL: settings.activeBaseUrl || undefined,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string; error?: string };
      setResult({
        ok: payload.ok,
        text: payload.ok ? (payload.message ?? "Connected.") : (payload.error ?? "Failed."),
      });
    } catch {
      setResult({ ok: false, text: "Could not reach the verification endpoint." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <FieldRow
      label={
        <>
          <KeyRound className="size-3.5" aria-hidden="true" /> API key
        </>
      }
      htmlFor="agent-key"
      hint={
        <>
          Held in this browser only and sent with each request. Leave it empty and the server uses{" "}
          <code className="font-mono">{provider.envVar}</code> from{" "}
          <code className="font-mono">.env</code>.
        </>
      }
    >
      {saved && !editing ? (
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-sm">
            {masked}
          </code>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Change
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            id="agent-key"
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                save();
              }
            }}
            placeholder={`Paste your ${provider.name} key`}
          />
          <Button size="sm" onClick={save} disabled={!draft.trim()}>
            Save API key
          </Button>
          {saved ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setDraft("");
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Pill tone={saved ? "brand" : "neutral"}>
          {saved ? "Saved in this browser" : "Using server key"}
        </Pill>
        <Button variant="ghost" size="sm" onClick={() => void test()} disabled={testing}>
          {testing ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <PlugZap className="size-3.5" aria-hidden="true" />
          )}
          Test connection
        </Button>
        {saved ? (
          <Button variant="ghost" size="sm" onClick={remove}>
            <Trash2 className="size-3.5" aria-hidden="true" /> Remove
          </Button>
        ) : null}
      </div>

      {result ? (
        <p className={result.ok ? "text-xs text-primary" : "text-xs text-destructive"}>
          {result.text}
        </p>
      ) : null}

      {provider.keyUrl ? (
        <a
          href={provider.keyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs underline underline-offset-4"
        >
          Get a key <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      ) : null}
    </FieldRow>
  );
}

/** The permission matrix that decides what runs without asking. */
export function PermissionSection() {
  const settings = useAgentSettings();
  const changed = toolCategories.some(
    (category) => settings.policies[category] !== defaultPolicies[category],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">What the agent may do</p>
          <p className="text-xs text-muted-foreground">
            Confirmed actions show a card you approve before anything changes.
          </p>
        </div>
        {changed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              settings.update({ policies: { ...defaultPolicies } });
              toast.success("Permissions restored to the safe defaults.");
            }}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" /> Defaults
          </Button>
        ) : null}
      </div>
      {toolCategories.map((category) => (
        <div key={category} className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{categoryLabels[category].title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {categoryLabels[category].description}
            </p>
          </div>
          <select
            aria-label={`${categoryLabels[category].title} policy`}
            className={`${control} w-44 shrink-0`}
            value={settings.policies[category]}
            onChange={(event) => settings.setPolicy(category, event.target.value as ToolPolicy)}
          >
            {(["auto", "confirm", "blocked"] as ToolPolicy[]).map((policy) => (
              <option key={policy} value={policy}>
                {policyLabels[policy]}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

export function VoiceSection() {
  const settings = useAgentSettings();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium">Voice</p>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm">Dictation</p>
          <p className="text-xs text-muted-foreground">Speak instead of typing.</p>
        </div>
        <Switch
          checked={settings.voiceInput}
          onCheckedChange={(checked) => settings.update({ voiceInput: checked })}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm">Read replies aloud</p>
          <p className="text-xs text-muted-foreground">Speaks each finished answer.</p>
        </div>
        <Switch
          checked={settings.voiceOutput}
          onCheckedChange={(checked) => settings.update({ voiceOutput: checked })}
        />
      </div>
    </div>
  );
}

export function ScheduleSection() {
  const settings = useAgentSettings();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Scheduled briefs</p>
      {settings.schedules.length ? (
        settings.schedules.map((schedule) => {
          const prompt = settings.savedPrompts.find((item) => item.id === schedule.promptId);
          return (
            <div
              key={schedule.id}
              className="flex items-center justify-between gap-2 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{prompt?.title ?? "Removed prompt"}</p>
                <p className="text-xs text-muted-foreground">
                  {schedule.cadence} at {String(schedule.hour).padStart(2, "0")}:00
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Pill tone={schedule.enabled ? "success" : "neutral"}>
                  {schedule.enabled ? "On" : "Paused"}
                </Pill>
                <Button variant="ghost" size="sm" onClick={() => settings.removeSchedule(schedule.id)}>
                  Remove
                </Button>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-xs text-muted-foreground">
          Schedule a brief from the prompt library. Briefs run while the agent page is open.
        </p>
      )}
    </div>
  );
}
