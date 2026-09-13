import type {
  PmoAction,
  PmoE2EStage,
  PmoMilestone,
  PmoOwnerRole,
  PmoPriority,
  PmoQuestion,
  PmoRaidItem,
  PmoRequirement,
  PmoStatus,
  PmoWave,
} from "@/lib/types";

/**
 * Pure analytics over the workbook baseline. Every number here is derived from
 * the imported records — no hard-coded totals — so the reports cannot drift from
 * `src/lib/data/pmo-seed.ts`.
 */

const DONE_STATUSES: PmoStatus[] = ["Verify & Close", "Done"];
export const isDelivered = (r: PmoRequirement) => DONE_STATUSES.includes(r.pmoStatus);
export const isBlocked = (r: PmoRequirement) => r.pmoStatus === "Blocked - Clarification";

const DAY = 86_400_000;
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / DAY);

/** ISO week label such as "2026-W39"; Monday-based, matching the workbook weeks. */
export function weekLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  const thursday = new Date(date);
  thursday.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((thursday.getTime() - firstThursday.getTime()) / DAY -
        3 +
        ((firstThursday.getDay() + 6) % 7)) /
        7,
    );
  return `${thursday.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export interface WaveSummary {
  wave: PmoWave;
  name: string;
  count: number;
  effort: number;
  delivered: number;
  deliveredEffort: number;
  blocked: number;
  p0: number;
  avgPercent: number;
  start: string;
  finish: string;
  weeks: number;
}

export function waveSummaries(requirements: PmoRequirement[]): WaveSummary[] {
  const waves: PmoWave[] = ["W0", "W1", "W2", "W3", "W4", "W5", "W6"];
  return waves.map((wave) => {
    const rows = requirements.filter((r) => r.wave === wave);
    const delivered = rows.filter(isDelivered);
    const dates = rows
      .flatMap((r) => [r.startDate ?? "", r.etaDate ?? ""])
      .filter(Boolean)
      .sort();
    const start = dates[0] ?? "";
    const finish = dates.at(-1) ?? "";
    return {
      wave,
      name: rows[0]?.waveName ?? wave,
      count: rows.length,
      effort: rows.reduce((n, r) => n + r.effortDays, 0),
      delivered: delivered.length,
      deliveredEffort: delivered.reduce((n, r) => n + r.effortDays, 0),
      blocked: rows.filter(isBlocked).length,
      p0: rows.filter((r) => r.priority === "P0").length,
      avgPercent: rows.length
        ? Math.round(rows.reduce((n, r) => n + r.percentDone, 0) / rows.length)
        : 0,
      start,
      finish,
      weeks: start && finish ? Math.max(1, Math.ceil((daysBetween(start, finish) + 1) / 7)) : 0,
    };
  });
}

export interface OwnerSummary {
  owner: PmoOwnerRole;
  count: number;
  effort: number;
  p0: number;
  p1: number;
  p2: number;
  delivered: number;
  blocked: number;
  waves: number;
}

export function ownerSummaries(requirements: PmoRequirement[]): OwnerSummary[] {
  const byOwner = new Map<PmoOwnerRole, PmoRequirement[]>();
  for (const r of requirements) byOwner.set(r.ownerRole, [...(byOwner.get(r.ownerRole) ?? []), r]);
  return [...byOwner.entries()]
    .map(([owner, rows]) => ({
      owner,
      count: rows.length,
      effort: rows.reduce((n, r) => n + r.effortDays, 0),
      p0: rows.filter((r) => r.priority === "P0").length,
      p1: rows.filter((r) => r.priority === "P1").length,
      p2: rows.filter((r) => r.priority === "P2").length,
      delivered: rows.filter(isDelivered).length,
      blocked: rows.filter(isBlocked).length,
      waves: new Set(rows.map((r) => r.wave)).size,
    }))
    .sort((a, b) => b.effort - a.effort);
}

export interface ModuleSummary {
  module: string;
  moduleAr: string;
  count: number;
  effort: number;
  p0: number;
  delivered: number;
  blocked: number;
}

export function moduleSummaries(requirements: PmoRequirement[]): ModuleSummary[] {
  const byModule = new Map<string, PmoRequirement[]>();
  for (const r of requirements) byModule.set(r.module, [...(byModule.get(r.module) ?? []), r]);
  return [...byModule.entries()]
    .map(([module, rows]) => ({
      module,
      moduleAr: rows[0]?.moduleAr ?? module,
      count: rows.length,
      effort: rows.reduce((n, r) => n + r.effortDays, 0),
      p0: rows.filter((r) => r.priority === "P0").length,
      delivered: rows.filter(isDelivered).length,
      blocked: rows.filter(isBlocked).length,
    }))
    .sort((a, b) => b.effort - a.effort);
}

export interface E2EStageSummary {
  stage: PmoE2EStage;
  count: number;
  effort: number;
  delivered: number;
  blocked: number;
  start: string;
  finish: string;
  weeks: number;
  progress: number;
}

export function e2eSummaries(
  requirements: PmoRequirement[],
  stages: PmoE2EStage[],
): E2EStageSummary[] {
  return stages.map((stage) => {
    const rows = requirements.filter((r) => r.e2eStage === stage.name);
    const delivered = rows.filter(isDelivered);
    const etas = rows
      .map((r) => r.etaDate ?? "")
      .filter(Boolean)
      .sort();
    const start = etas[0] ?? "";
    const finish = etas.at(-1) ?? "";
    return {
      stage,
      count: rows.length,
      effort: rows.reduce((n, r) => n + r.effortDays, 0),
      delivered: delivered.length,
      blocked: rows.filter(isBlocked).length,
      start,
      finish,
      weeks: start && finish ? Math.max(1, Math.ceil((daysBetween(start, finish) + 1) / 7)) : 0,
      progress: rows.length ? Math.round((delivered.length / rows.length) * 100) : 0,
    };
  });
}

export interface WeekLoad {
  week: string;
  start: string;
  count: number;
  effort: number;
  p0: number;
}

/** Delivery load per ETA week — what must land in each week. */
export function weeklyLoad(requirements: PmoRequirement[]): WeekLoad[] {
  const byWeek = new Map<string, PmoRequirement[]>();
  for (const r of requirements) {
    const eta = r.etaDate;
    if (!eta) continue;
    const key = weekLabel(eta);
    byWeek.set(key, [...(byWeek.get(key) ?? []), r]);
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, rows]) => ({
      week,
      start: rows.map((r) => r.etaDate ?? "").sort()[0] ?? "",
      count: rows.length,
      effort: rows.reduce((n, r) => n + r.effortDays, 0),
      p0: rows.filter((r) => r.priority === "P0").length,
    }));
}

export interface CumulativePoint {
  week: string;
  planned: number;
  delivered: number;
}

/** S-curve: cumulative planned effort by ETA week versus the delivered portion. */
export function cumulativeEffort(requirements: PmoRequirement[]): CumulativePoint[] {
  const load = weeklyLoad(requirements);
  let planned = 0;
  let delivered = 0;
  return load.map((w) => {
    const rows = requirements.filter((r) => r.etaDate && weekLabel(r.etaDate) === w.week);
    planned += w.effort;
    delivered += rows.filter(isDelivered).reduce((n, r) => n + r.effortDays, 0);
    return { week: w.week, planned, delivered };
  });
}

export interface ScheduleHealth {
  overdue: PmoRequirement[];
  dueSoon: PmoRequirement[];
  unblockedNotStarted: PmoRequirement[];
}

/**
 * Schedule position relative to a reference date. Nothing is flagged overdue
 * before the plan starts, which is the honest reading of the workbook.
 */
export function scheduleHealth(
  requirements: PmoRequirement[],
  today: string,
  horizonDays = 14,
): ScheduleHealth {
  const open = requirements.filter((r) => !isDelivered(r));
  return {
    overdue: open.filter((r) => r.etaDate && r.etaDate < today),
    dueSoon: open.filter((r) => {
      if (!r.etaDate) return false;
      const days = daysBetween(today, r.etaDate);
      return days >= 0 && days <= horizonDays;
    }),
    unblockedNotStarted: open.filter((r) => r.pmoStatus === "Not Started" && r.priority === "P0"),
  };
}

export interface StatusMixRow {
  status: PmoStatus;
  count: number;
  effort: number;
}

export function statusMix(requirements: PmoRequirement[]): StatusMixRow[] {
  const statuses: PmoStatus[] = [
    "Verify & Close",
    "Not Started",
    "In Progress",
    "Blocked - Clarification",
    "Done",
  ];
  return statuses
    .map((status) => {
      const rows = requirements.filter((r) => r.pmoStatus === status);
      return { status, count: rows.length, effort: rows.reduce((n, r) => n + r.effortDays, 0) };
    })
    .filter((row) => row.count > 0);
}

export interface PriorityMixRow {
  priority: PmoPriority;
  count: number;
  effort: number;
  delivered: number;
}

export function priorityMix(requirements: PmoRequirement[]): PriorityMixRow[] {
  const priorities: PmoPriority[] = ["P0", "P1", "P2"];
  return priorities.map((priority) => {
    const rows = requirements.filter((r) => r.priority === priority);
    return {
      priority,
      count: rows.length,
      effort: rows.reduce((n, r) => n + r.effortDays, 0),
      delivered: rows.filter(isDelivered).length,
    };
  });
}

const SEVERITY_WEIGHT: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

export interface RaidSummary {
  item: PmoRaidItem;
  score: number;
}

/** Risks ranked by impact × likelihood, then severity weight. */
export function raidRanking(items: PmoRaidItem[]): RaidSummary[] {
  return items
    .map((item) => ({
      item,
      score:
        (SEVERITY_WEIGHT[item.impact] ?? 1) *
        (SEVERITY_WEIGHT[item.likelihood] ?? 1) *
        (SEVERITY_WEIGHT[item.severity] ?? 1),
    }))
    .sort((a, b) => b.score - a.score);
}

export interface RaidMatrix {
  impacts: string[];
  likelihoods: string[];
  cells: Record<string, PmoRaidItem[]>;
}

export function raidMatrix(items: PmoRaidItem[]): RaidMatrix {
  const impacts = ["High", "Medium", "Low"];
  const likelihoods = ["High", "Medium", "Low"];
  const cells: Record<string, PmoRaidItem[]> = {};
  for (const impact of impacts)
    for (const likelihood of likelihoods) cells[`${impact}|${likelihood}`] = [];
  for (const item of items) {
    const key = `${item.impact}|${item.likelihood}`;
    if (cells[key]) cells[key]!.push(item);
  }
  return { impacts, likelihoods, cells };
}

export interface GovernanceLoad {
  clarifications: number;
  actionsOpen: number;
  questionsOpen: number;
  questions: PmoQuestion[];
  actions: PmoAction[];
}

export function governanceLoad(q: PmoQuestion[], a: PmoAction[]): GovernanceLoad {
  return {
    clarifications: 0,
    actionsOpen: a.filter((x) => x.status === "Open").length,
    questionsOpen: q.filter((x) => x.status === "Open").length,
    questions: q,
    actions: a,
  };
}

export interface MilestoneForecast extends PmoMilestone {
  waveDelivered: number;
  waveTotal: number;
  progress: number;
  daysFromStart: number;
}

export function milestoneForecast(
  milestones: PmoMilestone[],
  requirements: PmoRequirement[],
  planStart: string,
): MilestoneForecast[] {
  return milestones.map((m) => {
    const waveRows = requirements.filter((r) => r.wave === m.wave);
    const delivered = waveRows.filter(isDelivered).length;
    return {
      ...m,
      waveDelivered: delivered,
      waveTotal: waveRows.length,
      progress: waveRows.length ? Math.round((delivered / waveRows.length) * 100) : 0,
      daysFromStart: m.forecastDate ? daysBetween(planStart, m.forecastDate) : 0,
    };
  });
}

export interface PmoOverview {
  requirements: number;
  effort: number;
  moduleCount: number;
  ownerCount: number;
  delivered: number;
  deliveredEffort: number;
  blocked: number;
  p0: number;
  p0Delivered: number;
  progressPct: number;
  risksHigh: number;
  actionsOpen: number;
  questionsOpen: number;
  waves: WaveSummary[];
  owners: OwnerSummary[];
  modules: ModuleSummary[];
  weeklyLoad: WeekLoad[];
  cumulative: CumulativePoint[];
  health: ScheduleHealth;
  statusMix: StatusMixRow[];
  priorityMix: PriorityMixRow[];
  raid: RaidSummary[];
  milestones: MilestoneForecast[];
}

/** One call that assembles every derived view so the pages stay presentational. */
export function buildOverview(input: {
  requirements: PmoRequirement[];
  stages: PmoE2EStage[];
  milestones: PmoMilestone[];
  raid: PmoRaidItem[];
  questions: PmoQuestion[];
  actions: PmoAction[];
  planStart: string;
  today: string;
}): PmoOverview {
  const deliveredRows = input.requirements.filter(isDelivered);
  return {
    requirements: input.requirements.length,
    effort: input.requirements.reduce((n, r) => n + r.effortDays, 0),
    moduleCount: new Set(input.requirements.map((r) => r.module)).size,
    ownerCount: new Set(input.requirements.map((r) => r.ownerRole)).size,
    delivered: deliveredRows.length,
    deliveredEffort: deliveredRows.reduce((n, r) => n + r.effortDays, 0),
    blocked: input.requirements.filter(isBlocked).length,
    p0: input.requirements.filter((r) => r.priority === "P0").length,
    p0Delivered: input.requirements.filter((r) => r.priority === "P0" && isDelivered(r)).length,
    progressPct: input.requirements.length
      ? Math.round((deliveredRows.length / input.requirements.length) * 100)
      : 0,
    risksHigh: input.raid.filter((r) => r.severity === "High" && r.status === "Open").length,
    actionsOpen: input.actions.filter((a) => a.status === "Open").length,
    questionsOpen: input.questions.filter((q) => q.status === "Open").length,
    waves: waveSummaries(input.requirements),
    owners: ownerSummaries(input.requirements),
    modules: moduleSummaries(input.requirements),
    weeklyLoad: weeklyLoad(input.requirements),
    cumulative: cumulativeEffort(input.requirements),
    health: scheduleHealth(input.requirements, input.today),
    statusMix: statusMix(input.requirements),
    priorityMix: priorityMix(input.requirements),
    raid: raidRanking(input.raid),
    milestones: milestoneForecast(input.milestones, input.requirements, input.planStart),
  };
}
