import { createFileRoute } from "@tanstack/react-router";
import { ExecDashboard } from "@/features/exec-dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Executive Overview | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Consolidated Sales and Finance execution, collections, meetings, overdue actions and employee performance across TryGC.",
      },
      { property: "og:title", content: "Executive Overview | TryGC Workspace Hub" },
      {
        property: "og:description",
        content:
          "Consolidated Sales and Finance execution, collections, meetings, overdue actions and employee performance across TryGC.",
      },
    ],
  }),
  component: ExecDashboard,
});
