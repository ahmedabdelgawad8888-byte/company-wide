import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Panel } from "../components/kit";
import { ConnectionSection, PermissionSection, VoiceSection } from "../features/agent/agent-settings-sections";

function AgentSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" asChild><Link to="/agent"><ArrowLeft className="size-4" /> Back to agent</Link></Button>
      <header><p className="text-xs font-semibold uppercase tracking-wider text-primary">AI Agent</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Connection & controls</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Choose the provider and model used by this build. Browser keys stay in this browser; server environment keys remain on the server.</p></header>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel><h2 className="mb-5 text-lg font-semibold">Model connection</h2><ConnectionSection /></Panel>
        <Panel><h2 className="mb-2 flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="size-5 text-primary" /> Agent permissions</h2><p className="mb-5 text-sm text-muted-foreground">Policies are ready for future action tools. The current assistant is read-only.</p><PermissionSection /></Panel>
      </div>
      <Panel><h2 className="mb-5 text-lg font-semibold">Voice</h2><VoiceSection /></Panel>
    </div>
  );
}

export const Route = createFileRoute("/agent/settings")({ component: AgentSettingsPage });
