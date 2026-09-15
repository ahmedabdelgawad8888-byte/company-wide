import type {
  User,
  PmoRequirement,
  PmoE2EStage,
  PmoMilestone,
  PmoRaidItem,
  PmoAction,
  PmoQuestion,
  PmoPlanConfig,
} from "./types";
export interface PmoData {
  pmoRequirements: PmoRequirement[];
  pmoE2EStages: PmoE2EStage[];
  pmoMilestones: PmoMilestone[];
  pmoRaidItems: PmoRaidItem[];
  pmoActions: PmoAction[];
  pmoQuestions: PmoQuestion[];
  pmoPlanConfig: PmoPlanConfig;
}
export type PmoCollection = Exclude<keyof PmoData, "pmoPlanConfig">;
export const canEditPmo = (u: User) =>
  u.status === "active" &&
  (["Group Admin", "Executive Management"].includes(u.role) ||
    (u.workspaceId === "pmo" && u.role !== "Viewer"));
export function validatePmoRecord(value: Record<string, unknown>) {
  if (!String(value["id"] ?? "").trim()) throw new Error("Enter a record ID.");
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "number" && (!Number.isFinite(entry) || entry < 0))
      throw new Error(`${key} must be a non-negative number.`);
    if (key === "percentDone" && Number(entry) > 100)
      throw new Error("Progress must be between 0 and 100.");
    if (/Date$/.test(key) && entry && !/^\d{4}-\d{2}-\d{2}$/.test(String(entry)))
      throw new Error("Use a valid calendar date.");
  }
  if (
    value["startDate"] &&
    value["etaDate"] &&
    String(value["startDate"]) > String(value["etaDate"])
  )
    throw new Error("Finish date must be on or after start date.");
}
