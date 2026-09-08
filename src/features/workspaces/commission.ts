import { z } from "zod";
import type { Currency } from "../../lib/types";

/**
 * Commission calculator engine.
 *
 * Pure arithmetic: it takes a plan plus a list of already-normalised, already
 * converted sources and returns what each person earned. Nothing in here knows
 * about React, storage or where the numbers came from — `commission-data.ts`
 * owns that translation, so the maths stays testable on its own.
 */

/** What a person is paid on. Sales credits business won; Finance credits cash collected. */
export type CommissionBasis = "booked" | "collected";
/**
 * flat        - one rate on every unit of volume
 * tiered      - the rate of the reached tier applied to the whole volume
 * progressive - each slice of volume pays the rate of the tier it falls in
 */
export type CommissionMethod = "flat" | "tiered" | "progressive";
export type CommissionWorkspace = "sales" | "finance";

/** A tier starts at `from` (group currency) and runs to the next tier's `from`. */
export interface CommissionTier {
  from: number;
  rate: number;
}

export interface CommissionPlan {
  id: string;
  name: string;
  nameAr: string;
  workspaceId: CommissionWorkspace;
  basis: CommissionBasis;
  method: CommissionMethod;
  /** Percent used when method is "flat". */
  flatRate: number;
  tiers: CommissionTier[];
  /** Per-person quota for the period, in group currency. 0 disables target mechanics. */
  target: number;
  /** No commission is earned below this attainment percentage. */
  floorPct: number;
  /** Attainment percentage where the accelerator starts paying. */
  acceleratorFromPct: number;
  /** Multiplier applied to commission earned above the accelerator threshold. */
  acceleratorMultiplier: number;
  /** Fixed amount added once attainment reaches 100%. */
  targetBonus: number;
  /** Maximum payout per person. 0 means uncapped. */
  capAmount: number;
  /** Percent of the commission on at-risk volume that is held back. */
  clawbackRate: number;
  /** Percent of each deal credited to its owner; the rest is split across collaborators. */
  splitOwnerShare: number;
  /** Payout rounding step, in group currency. */
  roundTo: number;
}

/** One crediting event: a won deal, a signed contract, a collected payment. */
export interface CommissionSource {
  id: string;
  /** deal | quotation | proposal | contract | payment — used for grouping and labels. */
  kind: string;
  title: string;
  clientName: string;
  ownerId: string;
  collaborators: string[];
  entityId: string;
  /** Crediting date, YYYY-MM-DD. */
  date: string;
  amount: number;
  currency: Currency;
  /** `amount` converted to the group currency; all maths runs on this. */
  baseAmount: number;
  status: string;
  /** Booked business still uncollected past due, or cash collected late. Drives clawback. */
  atRisk: boolean;
  /** Workspace route for the underlying record, when one exists. */
  href: string;
}

export interface CommissionLine {
  sourceId: string;
  kind: string;
  title: string;
  clientName: string;
  date: string;
  status: string;
  currency: Currency;
  amount: number;
  /** Share of the source credited to this person, 0–1. */
  share: number;
  /** Group-currency volume credited to this person. */
  credited: number;
  atRisk: boolean;
  /** This line's slice of the person's net payout. */
  commission: number;
  href: string;
}

export interface PersonCommission {
  personId: string;
  personName: string;
  personRole: string;
  volume: number;
  atRiskVolume: number;
  attainmentPct: number;
  /** Effective plan rate at this person's volume, before target mechanics. */
  rate: number;
  raw: number;
  accelerator: number;
  bonus: number;
  gross: number;
  clawback: number;
  /** Negative when the cap trimmed the payout. */
  capAdjustment: number;
  net: number;
  /** True when attainment sat under the plan floor and nothing was earned. */
  belowFloor: boolean;
  lines: CommissionLine[];
}

export interface CommissionPeriod {
  from: string;
  to: string;
  label: string;
}

export interface CommissionRun {
  plan: CommissionPlan;
  period: CommissionPeriod;
  people: PersonCommission[];
  totals: {
    volume: number;
    atRiskVolume: number;
    target: number;
    attainmentPct: number;
    gross: number;
    clawback: number;
    net: number;
    payees: number;
  };
}

export interface CommissionPerson {
  id: string;
  name: string;
  role: string;
}

const tierSchema = z.object({ from: z.number().min(0), rate: z.number().min(0).max(100) });
export const commissionPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  nameAr: z.string().trim().max(80),
  workspaceId: z.enum(["sales", "finance"]),
  basis: z.enum(["booked", "collected"]),
  method: z.enum(["flat", "tiered", "progressive"]),
  flatRate: z.number().min(0).max(100),
  tiers: z.array(tierSchema).min(1).max(8),
  target: z.number().min(0),
  floorPct: z.number().min(0).max(200),
  acceleratorFromPct: z.number().min(0).max(500),
  acceleratorMultiplier: z.number().min(1).max(5),
  targetBonus: z.number().min(0),
  capAmount: z.number().min(0),
  clawbackRate: z.number().min(0).max(100),
  splitOwnerShare: z.number().min(0).max(100),
  roundTo: z.number().min(0).max(1000),
});

/**
 * Starting plans a workspace lead is expected to tune. Sales pays on business
 * won; Finance pays on cash actually collected, with a hold-back on collections
 * that landed after the due date.
 */
export const defaultPlans: Record<CommissionWorkspace, CommissionPlan> = {
  sales: {
    id: "plan-sales",
    name: "Sales commission plan",
    nameAr: "خطة عمولة المبيعات",
    workspaceId: "sales",
    basis: "booked",
    method: "progressive",
    flatRate: 3,
    tiers: [
      { from: 0, rate: 2 },
      { from: 250000, rate: 3 },
      { from: 750000, rate: 4.5 },
    ],
    target: 400000,
    floorPct: 50,
    acceleratorFromPct: 100,
    acceleratorMultiplier: 1.25,
    targetBonus: 5000,
    capAmount: 0,
    clawbackRate: 50,
    splitOwnerShare: 70,
    roundTo: 1,
  },
  finance: {
    id: "plan-finance",
    name: "Collection incentive plan",
    nameAr: "خطة حوافز التحصيل",
    workspaceId: "finance",
    basis: "collected",
    method: "tiered",
    flatRate: 1,
    tiers: [
      { from: 0, rate: 0.75 },
      { from: 250000, rate: 1 },
      { from: 600000, rate: 1.5 },
    ],
    target: 300000,
    floorPct: 50,
    acceleratorFromPct: 110,
    acceleratorMultiplier: 1.2,
    targetBonus: 2500,
    capAmount: 60000,
    clawbackRate: 40,
    splitOwnerShare: 100,
    roundTo: 1,
  },
};

export const basisLabel: Record<CommissionBasis, [string, string]> = {
  booked: ["Business won", "الأعمال المحققة"],
  collected: ["Cash collected", "النقد المحصل"],
};
export const methodLabel: Record<CommissionMethod, [string, string]> = {
  flat: ["Flat rate", "نسبة ثابتة"],
  tiered: ["Tiered (whole volume)", "شرائح على الإجمالي"],
  progressive: ["Progressive (per slice)", "شرائح تصاعدية"],
};
/** What "at risk" means for each basis — shown next to the clawback control. */
export const atRiskLabel: Record<CommissionBasis, [string, string]> = {
  booked: ["Booked, still uncollected past due", "محقق ولم يُحصّل بعد الاستحقاق"],
  collected: ["Collected after the due date", "محصل بعد تاريخ الاستحقاق"],
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const money = (v: number) => Math.round(v * 100) / 100;
const share = (v: number) => Math.round(v * 1e6) / 1e6;
const roundPayout = (v: number, step: number) =>
  step > 0 ? Math.round(v / step) * step : money(v);

/** Tiers sorted ascending and anchored at zero, so a lookup can never fall through. */
export function normalizeTiers(tiers: CommissionTier[]): CommissionTier[] {
  const clean = tiers
    .filter((t) => Number.isFinite(t.from) && Number.isFinite(t.rate))
    .map((t) => ({ from: Math.max(0, t.from), rate: Math.max(0, t.rate) }))
    .sort((a, b) => a.from - b.from);
  if (!clean.length) return [{ from: 0, rate: 0 }];
  if ((clean[0]?.from ?? 0) > 0) clean.unshift({ from: 0, rate: clean[0]?.rate ?? 0 });
  // A repeated boundary is a typo, not two tiers: the last entry wins.
  return clean.filter((t, i) => i === clean.length - 1 || clean[i + 1]?.from !== t.from);
}

/** The headline rate a person sees at their volume. */
export function tierRateAt(plan: CommissionPlan, volume: number): number {
  if (plan.method === "flat") return plan.flatRate;
  let rate = 0;
  for (const tier of normalizeTiers(plan.tiers)) if (volume >= tier.from) rate = tier.rate;
  return rate;
}

/** Plan rate applied to volume, before floor, accelerator, bonus, clawback and cap. */
export function rawCommission(plan: CommissionPlan, volume: number): number {
  if (volume <= 0) return 0;
  if (plan.method === "flat") return (volume * plan.flatRate) / 100;
  const tiers = normalizeTiers(plan.tiers);
  if (plan.method === "tiered") return (volume * tierRateAt(plan, volume)) / 100;
  let total = 0;
  tiers.forEach((tier, i) => {
    const to = tiers[i + 1]?.from ?? Infinity;
    const slice = Math.min(volume, to) - tier.from;
    if (slice > 0) total += (slice * tier.rate) / 100;
  });
  return total;
}

/** Extra earned on the volume above the accelerator threshold. */
export function acceleratorUplift(plan: CommissionPlan, volume: number): number {
  if (plan.acceleratorMultiplier <= 1 || plan.target <= 0) return 0;
  const threshold = (plan.target * plan.acceleratorFromPct) / 100;
  if (volume <= threshold) return 0;
  const above = rawCommission(plan, volume) - rawCommission(plan, threshold);
  return Math.max(0, above) * (plan.acceleratorMultiplier - 1);
}

/** How one source is credited: the owner keeps their share, collaborators split the rest. */
export function creditShares(
  source: CommissionSource,
  plan: CommissionPlan,
): { personId: string; share: number }[] {
  const collaborators = Array.from(
    new Set(source.collaborators.filter((id) => id && id !== source.ownerId)),
  );
  const ownerShare = clamp(plan.splitOwnerShare, 0, 100) / 100;
  if (!collaborators.length || ownerShare >= 1) return [{ personId: source.ownerId, share: 1 }];
  // Rounded so binary-float noise never reaches a credited amount or a printed share.
  const each = share((1 - ownerShare) / collaborators.length);
  return [
    { personId: source.ownerId, share: share(ownerShare) },
    ...collaborators.map((personId) => ({ personId, share: each })),
  ];
}

export const withinPeriod = (source: CommissionSource, period: CommissionPeriod) =>
  !!source.date && source.date >= period.from && source.date <= period.to;

/** Everything one person earned from their own credited lines. */
export function calculatePerson(
  plan: CommissionPlan,
  person: CommissionPerson,
  lines: CommissionLine[],
): PersonCommission {
  const volume = money(lines.reduce((n, l) => n + l.credited, 0));
  const atRiskVolume = money(lines.filter((l) => l.atRisk).reduce((n, l) => n + l.credited, 0));
  const attainmentPct = plan.target > 0 ? (volume / plan.target) * 100 : 0;
  const belowFloor = plan.target > 0 && plan.floorPct > 0 && attainmentPct < plan.floorPct;
  const raw = belowFloor ? 0 : rawCommission(plan, volume);
  const accelerator = belowFloor ? 0 : acceleratorUplift(plan, volume);
  const bonus = !belowFloor && plan.target > 0 && attainmentPct >= 100 ? plan.targetBonus : 0;
  const gross = money(raw + accelerator + bonus);
  // Clawback is proportional: the at-risk share of volume loses part of its commission.
  const clawback =
    volume > 0
      ? money(gross * (atRiskVolume / volume) * (clamp(plan.clawbackRate, 0, 100) / 100))
      : 0;
  const afterClawback = gross - clawback;
  const capped = plan.capAmount > 0 ? Math.min(afterClawback, plan.capAmount) : afterClawback;
  const net = roundPayout(capped, plan.roundTo);
  const allocate = (line: CommissionLine) =>
    volume > 0 ? money(net * (line.credited / volume)) : 0;
  return {
    personId: person.id,
    personName: person.name,
    personRole: person.role,
    volume,
    atRiskVolume,
    attainmentPct,
    rate: tierRateAt(plan, volume),
    raw: money(raw),
    accelerator: money(accelerator),
    bonus,
    gross,
    clawback,
    capAdjustment: money(capped - afterClawback),
    net,
    belowFloor,
    lines: lines
      .map((line) => ({ ...line, commission: allocate(line) }))
      .sort((a, b) => b.credited - a.credited),
  };
}

/**
 * Runs the plan over every source in the period and returns one row per person.
 * People with no credited volume are still returned, so a quota miss stays
 * visible rather than silently absent.
 */
export function calculateCommission(
  plan: CommissionPlan,
  sources: CommissionSource[],
  people: CommissionPerson[],
  period: CommissionPeriod,
): CommissionRun {
  const byPerson = new Map<string, CommissionLine[]>();
  for (const person of people) byPerson.set(person.id, []);
  for (const source of sources) {
    if (!withinPeriod(source, period)) continue;
    for (const { personId, share } of creditShares(source, plan)) {
      const lines = byPerson.get(personId);
      if (!lines) continue; // person sits outside the viewer's scope
      lines.push({
        sourceId: source.id,
        kind: source.kind,
        title: source.title,
        clientName: source.clientName,
        date: source.date,
        status: source.status,
        currency: source.currency,
        amount: source.amount,
        share,
        credited: money(source.baseAmount * share),
        atRisk: source.atRisk,
        commission: 0,
        href: source.href,
      });
    }
  }
  const results = people
    .map((person) => calculatePerson(plan, person, byPerson.get(person.id) ?? []))
    .sort((a, b) => b.net - a.net || b.volume - a.volume);
  const sum = (pick: (p: PersonCommission) => number) =>
    money(results.reduce((n, p) => n + pick(p), 0));
  const volume = sum((p) => p.volume);
  const target = plan.target * results.length;
  return {
    plan,
    period,
    people: results,
    totals: {
      volume,
      atRiskVolume: sum((p) => p.atRiskVolume),
      target,
      attainmentPct: target > 0 ? (volume / target) * 100 : 0,
      gross: sum((p) => p.gross),
      clawback: sum((p) => p.clawback),
      net: sum((p) => p.net),
      payees: results.filter((p) => p.net > 0).length,
    },
  };
}

const csvCell = (value: string | number) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Statement rows: one line per credited record, plus a per-person summary row. */
export function commissionCsv(run: CommissionRun, currency: string): string {
  const head = [
    "Person",
    "Role",
    "Record",
    "Type",
    "Client",
    "Date",
    "Status",
    "Amount",
    "Currency",
    `Credited (${currency})`,
    "Share %",
    "At risk",
    `Commission (${currency})`,
  ];
  const rows: (string | number)[][] = [];
  for (const person of run.people) {
    for (const line of person.lines)
      rows.push([
        person.personName,
        person.personRole,
        line.title,
        line.kind,
        line.clientName,
        line.date,
        line.status,
        line.amount,
        line.currency,
        line.credited,
        Math.round(line.share * 100),
        line.atRisk ? "Yes" : "No",
        line.commission,
      ]);
    rows.push([
      person.personName,
      person.personRole,
      "TOTAL",
      run.plan.basis,
      "",
      `${run.period.from}..${run.period.to}`,
      person.belowFloor ? "Below floor" : `${Math.round(person.attainmentPct)}% of target`,
      "",
      "",
      person.volume,
      "",
      person.clawback ? `-${person.clawback}` : "No",
      person.net,
    ]);
  }
  return [head, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
