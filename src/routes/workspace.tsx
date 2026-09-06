import { createFileRoute } from "@tanstack/react-router";
import { HubPage } from "../features/workspaces/hub-page";
import { useApp } from "../lib/store";
function Home() {
  const { activeWorkspace } = useApp();
  return <HubPage workspaceId={activeWorkspace} module="dashboard" />;
}
export const Route = createFileRoute("/workspace")({ component: Home });
