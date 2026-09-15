import type { User } from "./types";
export type UserInput = Omit<User, "id" | "lastLogin">;
export const HR_DEMO_USERS = [
  { id: "hr-lead", name: "HR Team Lead", email: "hr@trygc.com" },
  { id: "hr-specialist", name: "Hala Nasser", email: "hala.n@trygc.com" },
];
export const isHRDemoUser = (u: Pick<User, "id" | "name" | "email">) =>
  HR_DEMO_USERS.some((d) => d.id === u.id && d.name === u.name && d.email === u.email);
export const canManageAllUsers = (actor: Pick<User, "role" | "status">) =>
  actor.status === "active" && ["Group Admin", "Executive Management"].includes(actor.role);
export function canManageUser(actor: User, target?: Pick<User, "workspaceId" | "role">) {
  if (actor.status !== "active") return false;
  if (canManageAllUsers(actor)) return true;
  if (actor.workspaceId === "it" && actor.workspaceLevel === "lead")
    return !target || (target.workspaceId === "it" && target.role === "IT Admin");
  return (
    actor.role === "HR Manager" &&
    (!target ||
      (target.workspaceId === "hr" && ["HR Manager", "HR Specialist"].includes(target.role)))
  );
}
export function validateUser(users: User[], actor: User, input: UserInput, id?: string): UserInput {
  const old = users.find((u) => u.id === id);
  if (!canManageUser(actor, input) || (old && !canManageUser(actor, old)))
    throw new Error("You cannot manage this user or access profile.");
  if (!input.name.trim()) throw new Error("Enter the user name.");
  const email = input.email.trim().toLowerCase();
  if (
    !(
      ["trygc_it_manual.html", "HR country team supplied by user"].includes(old?.source ?? "") &&
      email === ""
    ) &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    throw new Error("Enter a valid email address.");
  if (email && users.some((u) => u.id !== id && u.email.toLowerCase() === email))
    throw new Error("A user with this email already exists.");
  if (
    id === actor.id &&
    (input.status !== "active" ||
      input.role !== old?.role ||
      input.workspaceId !== old?.workspaceId)
  )
    throw new Error("You cannot remove your own access.");
  if (
    old?.role === "Group Admin" &&
    old.status === "active" &&
    (input.role !== "Group Admin" || input.status !== "active") &&
    !users.some((u) => u.id !== id && u.role === "Group Admin" && u.status === "active")
  )
    throw new Error("Keep at least one active Group Admin.");
  if (input.managerId) {
    if (input.managerId === id) throw new Error("A user cannot report to themselves.");
    const manager = users.find((u) => u.id === input.managerId && u.status === "active");
    if (!manager || manager.workspaceId !== input.workspaceId)
      throw new Error("Choose an active manager in the same workspace.");
    const seen = new Set<string>(id ? [id] : []);
    let next: User | undefined = manager;
    while (next) {
      if (seen.has(next.id)) throw new Error("Reporting lines cannot contain a cycle.");
      seen.add(next.id);
      next = users.find((u) => u.id === next?.managerId);
    }
  }
  return { ...input, name: input.name.trim(), email };
}
export function validateRemoval(users: User[], actor: User, id: string) {
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error("User not found.");
  if (!canManageUser(actor, user)) throw new Error("You cannot remove this user.");
  if (id === actor.id) throw new Error("You cannot remove your signed-in account.");
  if (
    user.role === "Group Admin" &&
    user.status === "active" &&
    !users.some((u) => u.id !== id && u.role === "Group Admin" && u.status === "active")
  )
    throw new Error("Keep at least one active Group Admin.");
  return user;
}
