import type { RoleName, Task } from "./types.ts";
import { getRoleExperience } from "./role-ux.ts";

export type TaskView = "All" | "Sales" | "Finance" | "My Tasks";

export function defaultTaskView(role: RoleName | string): TaskView {
  const mode = getRoleExperience(role).mode;
  if (mode === "sales-individual" || mode === "finance-individual" || mode === "support")
    return "My Tasks";
  if (mode === "sales-manager") return "Sales";
  if (mode === "finance-manager") return "Finance";
  return "All";
}

export function taskVisibleToRole(
  task: Pick<Task, "ownerId" | "department" | "source">,
  role: RoleName | string,
  currentUserId: string,
): boolean {
  const mode = getRoleExperience(role).mode;
  if (mode === "sales-individual")
    return task.ownerId === currentUserId && task.department === "Sales";
  if (mode === "finance-individual")
    return task.ownerId === currentUserId && task.department === "Finance";
  if (mode === "sales-manager") return task.department === "Sales";
  if (mode === "finance-manager") return task.department === "Finance";
  if (mode === "executive" || mode === "admin")
    return (
      ["Sales", "Finance", "Management"].includes(task.department) ||
      ["Meeting", "Bill", "Sales Activity"].includes(task.source ?? "")
    );
  return task.ownerId === currentUserId;
}
