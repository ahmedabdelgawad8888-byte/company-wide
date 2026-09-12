import { createFileRoute } from "@tanstack/react-router";
import { HubPage } from "../features/workspaces/hub-page";
import type { WorkspaceId } from "../lib/workspace-hub";
function Page() {
  const { workspace, _splat } = Route.useParams();
  const [module, recordId] = (_splat ?? "dashboard").split("/");
  if (!["management", "sales", "finance", "hr", "it"].includes(workspace))
    return <p>Workspace not found.</p>;
  return (
    <HubPage
      workspaceId={workspace as WorkspaceId}
      module={module ?? "home"}
      {...(recordId ? { recordId } : {})}
    />
  );
}
export const Route = createFileRoute("/workspaces/$workspace/$")({ component: Page });
