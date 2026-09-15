import type { User } from "./types";
export const HR_COUNTRIES = [
  { id: "ae", name: "UAE", people: ["Menna"] },
  { id: "sa", name: "KSA", people: ["Fatma"] },
  { id: "eg", name: "Egypt", people: ["Zakaria", "Aya"] },
];
export function reconcileHRPeople(users: User[], migrated = false): User[] {
  if (migrated) return users;
  const result = [...users];
  for (const country of HR_COUNTRIES)
    for (const name of country.people) {
      if (result.some((u) => u.workspaceId === "hr" && u.name.toLowerCase() === name.toLowerCase()))
        continue;
      result.push({
        id: `hr-${name.toLowerCase()}`,
        name,
        email: "",
        source: "HR country team supplied by user",
        role: "HR Specialist",
        department: "HR",
        entityId: country.id,
        scope: "entity",
        status: "active",
        lastLogin: "",
        workspaceId: "hr",
        workspaceLevel: "member",
        managerId: "",
      });
    }
  return result;
}
