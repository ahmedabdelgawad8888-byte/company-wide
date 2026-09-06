import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeftRight, CircleCheck, KeyRound, RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Pill } from "../../components/kit";
import { useAgentSettings } from "./agent-settings";

interface StatusPayload {
  ready: { id: string; label: string }[];
  anyConfigured: boolean;
}

/**
 * Asks the server which providers can actually answer, so an unconfigured agent
 * says so up front rather than failing on the first message.
 */
export function useAgentReadiness() {
  const settings = useAgentSettings();
  const configured = settings.configuredProviderIds;
  const baseUrls = settings.baseUrlMap;
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/agent/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ configured, baseUrls }),
      });
      setStatus((await response.json()) as StatusPayload);
    } catch {
      setStatus(null);
    } finally {
      setChecking(false);
    }
  }, [configured, baseUrls]);

  useEffect(() => {
    void check();
  }, [check]);

  return { status, checking, recheck: check };
}

/**
 * Two distinct states: nothing is configured at all, or the selected provider
 * has no key while another one does. The second needs a switch, not a key.
 */
export function AgentSetupCard({
  ready,
  onRecheck,
  checking,
}: {
  ready: { id: string; label: string }[];
  onRecheck: () => void;
  checking: boolean;
}) {
  const settings = useAgentSettings();
  const alternatives = ready.filter((item) => item.id !== settings.providerId);
  const selectedIsReady = ready.some((item) => item.id === settings.providerId);

  if (selectedIsReady) return null;

  return (
    <div className="rounded-lg border border-dashed p-4">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {alternatives.length ? (
            <>
              <p className="text-sm font-medium">{settings.provider.name} has no API key</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {alternatives.length === 1 ? "This provider is" : "These providers are"} ready.
                Switching also selects that provider&rsquo;s default model.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {alternatives.map((item) => (
                  <Button
                    key={item.id}
                    size="sm"
                    onClick={() =>
                      settings.update({ providerId: item.id as typeof settings.providerId })
                    }
                  >
                    <ArrowLeftRight className="size-3.5" aria-hidden="true" /> Use {item.label}
                  </Button>
                ))}
                <Button variant="outline" size="sm" asChild>
                  <Link to="/agent/settings">
                    <KeyRound className="size-3.5" aria-hidden="true" /> Add a key instead
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">No model provider is configured yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The agent needs a key for the provider you select before it can answer.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" asChild>
                  <Link to="/agent/settings">
                    <KeyRound className="size-3.5" aria-hidden="true" /> Add a key
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={onRecheck} disabled={checking}>
                  <RefreshCw
                    className={`size-3.5 ${checking ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />{" "}
                  Re-check
                </Button>
              </div>
            </>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Or add <code className="font-mono">{settings.provider.envVar}</code> to{" "}
            <code className="font-mono">.env</code> and restart the dev server.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AgentReadyBadge({ ready }: { ready: { id: string; label: string }[] }) {
  if (!ready.length) return null;
  return (
    <Pill tone="success">
      <CircleCheck className="size-3" aria-hidden="true" />
      {ready.length === 1 ? ready[0]?.label : `${ready.length} providers ready`}
    </Pill>
  );
}
