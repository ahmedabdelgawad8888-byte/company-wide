import type { Actor, HubState } from "./model.ts";
import { today, closed } from "./model.ts";
import tasks from "./it-manual-tasks.json" with { type: "json" };
export function reconcileOperationalPeople(s: HubState, users: Actor[]) {
  let changed = false;
  const obsoleteHR = ["hr-lead", "hr-specialist"].filter((id) => !users.some((u) => u.id === id));
  for (const r of s.records) {
    if (r.workspaceId === "hr" && obsoleteHR.includes(r.ownerId)) {
      const pristine =
        !s.comments.some((c) => c.recordId === r.id) &&
        !s.attachments.some((a) => a.recordId === r.id) &&
        !s.audit.some(
          (a) =>
            a.recordId === r.id && ["Updated", "File uploaded", "Comment added"].includes(a.action),
        );
      if (
        pristine &&
        (r.id.startsWith("DEMO-") || (r.kind === "hr-task" && r.status === "Not Started"))
      )
        r.archived = true;
      r.ownerId = "unassigned";
      if (r.sourceId === "hr-guide:v1") r.details["enabled"] = "false";
      changed = true;
    }
    if (r.workspaceId === "hr" && obsoleteHR.includes(r.details["approverId"] ?? "")) {
      r.details["approverId"] = "";
      changed = true;
    }
  }
  if (!s.executions.includes("hr-no-demo-v1")) {
    s.records
      .filter(
        (r) =>
          r.workspaceId === "hr" &&
          r.id.startsWith("DEMO-") &&
          r.description.startsWith("Illustrative TryGC workflow data.") &&
          !s.audit.some((a) => a.recordId === r.id && a.action === "Updated"),
      )
      .forEach((r) => (r.archived = true));
    s.rules = s.rules.filter((r) => r.id !== "rule-hr-daily");
    s.executions.push("hr-no-demo-v1");
    changed = true;
  }
  if (s.executions.includes("it-real-owners-v1")) return changed;
  if (!users.some((u) => u.id === "it-nasef")) return changed;
  const byPortfolio = (text: string) =>
    /Backup|Disaster|Veeam|Sophos|TrueNAS|backup/i.test(text)
      ? "it-mahmoud"
      : /Finance|Subscription|Vendor|invoice|payment/i.test(text)
        ? "core-abdelfattah"
        : /Governance|meeting|SOP|report|workload/i.test(text)
          ? "core-sabry"
          : "it-nasef";
  for (const r of s.records.filter((r) => r.workspaceId === "it")) {
    if (r.sourceId === "IT workspace operating model") {
      r.ownerId = byPortfolio(`${r.title} ${r.details["portfolio"] ?? ""}`);
      r.collaborators = r.ownerId === "core-sabry" ? ["it-nasef"] : ["core-sabry"];
      if (/Router connectivity/.test(r.title)) {
        r.ownerId = "it-nasef";
        r.collaborators = ["it-reda", "it-eslam", "it-mahmoud"];
        r.details["rotation"] = "Nasef / Reda / Eslam / Taha (Rotating)";
      }
      for (const k of ["backupOwner", "documentOwner", "escalationOwner"])
        if (r.details[k]) r.details[k] = k === "documentOwner" ? r.ownerId : "core-sabry";
      r.details["ownershipSource"] = "trygc_it_manual.html";
    }
    if (r.ownerId === "u13") r.ownerId = "core-sabry";
    r.collaborators = r.collaborators.map((id) => (id === "u13" ? "core-sabry" : id));
  }
  for (const r of s.rules.filter((r) => r.workspaceId === "it"))
    if (r.ownerId === "u13" || r.ownerId === "it-mahmoud") r.ownerId = "core-sabry";
  const alias: Record<string, string> = {
    Nasef: "it-nasef",
    Taha: "it-mahmoud",
    Hamid: "core-abdelfattah",
    Sabri: "core-sabry",
    Reda: "it-reda",
    Raafat: "it-raafat",
    Team: "core-sabry",
    Support: "it-reda",
  };
  for (const row of tasks) {
    const id = `IT-MANUAL-${row.ref}`;
    if (s.records.some((r) => r.id === id)) continue;
    const owners = row.owner.split(", ").map((n) => alias[n] ?? "core-sabry");
    s.records.push({
      id,
      workspaceId: "it",
      kind: "task",
      title: row.task,
      description: "Source: trygc_it_manual.html task board. Dates were not supplied.",
      ownerId: owners[0]!,
      collaborators: owners.slice(1),
      entityId: "eg",
      status:
        row.status === "Completed" ? "Done" : row.status === "On Hold" ? "Waiting" : row.status,
      priority: row.priority as "High" | "Medium",
      startDate: today(),
      dueDate: "",
      progress: row.progress,
      nextAction:
        row.status === "Completed" ? "" : "Confirm next action and due date with the task owner",
      details: { sourceOwner: row.owner, sourceStatus: row.status, sourceReference: row.ref },
      createdBy: "core-sabry",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: "",
      sourceId: "trygc_it_manual.html",
      archived: false,
    });
  }
  s.executions.push("it-real-owners-v1");
  return true;
}
