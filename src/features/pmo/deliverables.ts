import type { PmoRequirement } from "@/lib/types";

/**
 * Delivered-versus-remaining view of a module or wave. Shared by the reports
 * page so the same definition of "delivered" is used everywhere.
 */
export interface DeliverableGroup {
  key: string;
  label: string;
  labelAr?: string;
  total: number;
  delivered: number;
  blocked: number;
  p0Remaining: number;
  effortRemaining: number;
  percent: number;
}

const DONE = new Set(["Verify & Close", "Done"]);

export function groupRequirements<T extends { key: string; label: string; labelAr?: string }>(
  requirements: PmoRequirement[],
  groups: T[],
  of: (r: PmoRequirement, group: T) => boolean,
): DeliverableGroup[] {
  return groups.map((group) => {
    const rows = requirements.filter((r) => of(r, group));
    const delivered = rows.filter((r) => DONE.has(r.pmoStatus));
    const remaining = rows.filter((r) => !DONE.has(r.pmoStatus));
    return {
      key: group.key,
      label: group.label,
      ...(group.labelAr ? { labelAr: group.labelAr } : {}),
      total: rows.length,
      delivered: delivered.length,
      blocked: rows.filter((r) => r.pmoStatus === "Blocked - Clarification").length,
      p0Remaining: remaining.filter((r) => r.priority === "P0").length,
      effortRemaining: remaining.reduce((n, r) => n + r.effortDays, 0),
      percent: rows.length ? Math.round((delivered.length / rows.length) * 100) : 0,
    };
  });
}
