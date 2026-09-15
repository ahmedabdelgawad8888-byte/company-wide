import type { User } from "./types";
import { isHRDemoUser } from "./user-management.ts";
export const IT_PEOPLE = [
  {
    id: "it-adel",
    name: "Adel Hammad",
    jobTitle: "CEO",
    role: "Executive Management",
    workspaceLevel: "lead",
    managerId: "",
  },
  {
    id: "core-sabry",
    name: "A. Sabri",
    jobTitle: "IT Lead / Manager",
    role: "IT Admin",
    workspaceLevel: "lead",
    managerId: "it-adel",
  },
  {
    id: "it-nasef",
    name: "Mohamed Nasef",
    jobTitle: "Senior IT Engineer",
    role: "IT Admin",
    workspaceLevel: "supervisor",
    managerId: "core-sabry",
  },
  {
    id: "it-mahmoud",
    name: "Mahmoud Taha",
    jobTitle: "IT Engineer",
    role: "IT Admin",
    workspaceLevel: "member",
    managerId: "core-sabry",
  },
  {
    id: "core-abdelfattah",
    name: "Abdelfatah Hamid",
    jobTitle: "HR / Finance Liaison",
    role: "IT Admin",
    workspaceLevel: "member",
    managerId: "core-sabry",
  },
  {
    id: "it-reda",
    name: "Reda",
    jobTitle: "IT Support",
    role: "IT Admin",
    workspaceLevel: "member",
    managerId: "it-nasef",
  },
  {
    id: "it-raafat",
    name: "Raafat",
    jobTitle: "IT Support",
    role: "IT Admin",
    workspaceLevel: "member",
    managerId: "it-nasef",
  },
  {
    id: "it-eslam",
    name: "Eslam",
    jobTitle: "IT Support",
    role: "IT Admin",
    workspaceLevel: "member",
    managerId: "it-nasef",
  },
] as const;
export function reconcilePeople(users: User[], imported = false): User[] {
  let result = users.filter((u) => !isHRDemoUser(u));
  if (imported) return result;
  result = result.filter((u) => !(u.id === "u13" && u.name === "Bader Al-Qahtani"));
  for (const person of IT_PEOPLE) {
    const existing = result.find((u) => u.id === person.id);
    // Only replace the bundled profiles. Keep independently edited records and supplied emails.
    const bundled = existing && ["Sabry", "Mahmoud Taha", "Abdel Fattah"].includes(existing.name);
    if (existing && !bundled) continue;
    const profile: User = {
      ...person,
      email:
        existing?.email &&
        ![
          "mahmoud.taha@trygc.com",
          "sabry.automation@trygc.com",
          "abdelfattah.it@trygc.com",
        ].includes(existing.email)
          ? existing.email
          : "",
      department: "IT",
      entityId: existing?.entityId ?? "eg",
      scope: "group",
      status: "active",
      lastLogin: "—",
      workspaceId: "it",
      source: "trygc_it_manual.html",
    };
    if (existing) result = result.map((u) => (u.id === person.id ? profile : u));
    else result.push(profile);
  }
  return result;
}
