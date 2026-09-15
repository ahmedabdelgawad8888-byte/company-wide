import { createFileRoute } from "@tanstack/react-router";
import { UserDirectory } from "../../features/workspaces/user-directory";
function Users() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">People & Access</h1>
      <UserDirectory />
    </div>
  );
}
export const Route = createFileRoute("/admin/users")({ component: Users });
