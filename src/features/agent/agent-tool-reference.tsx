import { Pill, type PillTone } from "../../components/kit";
import { useAgentSettings } from "./agent-settings";
import { agentTools, categoryLabels, type ToolPolicy, toolCategories } from "./agent-tools";

const policyTone: Record<ToolPolicy, PillTone> = {
  auto: "success",
  confirm: "warning",
  blocked: "danger",
};

const policyLabel: Record<ToolPolicy, string> = {
  auto: "Automatic",
  confirm: "Asks first",
  blocked: "Blocked",
};

/** Shows exactly what the agent can reach, and under which policy. */
export function AgentToolReference() {
  const settings = useAgentSettings();
  const entries = Object.entries(agentTools);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium">Capabilities</p>
        <p className="text-xs text-muted-foreground">
          {entries.length} tools across the work lifecycle. Change any policy in settings.
        </p>
      </div>
      <div className="divide-y overflow-hidden rounded-lg border">
        {toolCategories.map((category) => {
          const tools = entries.filter(([, spec]) => spec.category === category);
          if (!tools.length) return null;
          const policy = settings.policies[category];
          return (
            <div key={category} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{categoryLabels[category].title}</p>
                <Pill tone={policyTone[policy]}>{policyLabel[policy]}</Pill>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {categoryLabels[category].description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {tools.map(([name]) => (
                  <code key={name} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    {name}
                  </code>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
