import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

function WorkspaceLanding() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/workspace", replace: true } as never);
  }, [navigate]);
  return null;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TryGC Workspace Hub" },
      {
        name: "description",
        content: "TryGC workspace-first operating hub for Management, Finance, Sales and HR.",
      },
    ],
  }),
  component: WorkspaceLanding,
});
