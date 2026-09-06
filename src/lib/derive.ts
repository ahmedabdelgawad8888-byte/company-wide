import type {
  Campaign,
  CampaignInfluencer,
  Client,
  Deal,
  Entity,
  Expense,
  Health,
  Influencer,
  Invoice,
  Task,
  User,
} from "./types";
import { daysBetween, toSAR } from "./format";
import { TODAY } from "./data/seed";

const CONFIRMED_STAGES = [
  "Confirmed",
  "Submitted to Client",
  "Approved",
  "Scheduled",
  "Visited",
  "Posting Coverage Received",
  "Posting Coverage Verified",
  "Completed",
  "Missed Visit",
  "Missing Posting Coverage",
];
const APPROVED_STAGES = [
  "Approved",
  "Scheduled",
  "Visited",
  "Posting Coverage Received",
  "Posting Coverage Verified",
  "Completed",
  "Missing Posting Coverage",
  "Missed Visit",
];

export interface CampaignStats {
  target: number;
  identified: number;
  interested: number;
  confirmed: number;
  submitted: number;
  approved: number;
  remaining: number;
  missingCoverage: number;
  missedVisits: number;
  replacements: number;
  verified: number;
  completed: number;
}

export function campaignStats(campaign: Campaign, rows: CampaignInfluencer[]): CampaignStats {
  const mine = rows.filter((r) => r.campaignId === campaign.id);
  const count = (fn: (r: CampaignInfluencer) => boolean) => mine.filter(fn).length;
  const approved = count((r) => APPROVED_STAGES.includes(r.stage));
  return {
    target: campaign.targetInfluencers,
    identified: mine.length,
    interested: count((r) => ["Interested", "Confirmation Requested"].includes(r.stage)),
    confirmed: count((r) => CONFIRMED_STAGES.includes(r.stage)),
    submitted: count((r) => ["Submitted to Client", ...APPROVED_STAGES].includes(r.stage)),
    approved,
    remaining: Math.max(0, campaign.targetInfluencers - approved),
    missingCoverage: count((r) => r.stage === "Missing Posting Coverage"),
    missedVisits: count((r) => r.stage === "Missed Visit"),
    replacements: count((r) => ["Replacement Required", "Rejected", "Cancelled"].includes(r.stage)),
    verified: count((r) => ["Posting Coverage Verified", "Completed"].includes(r.stage)),
    completed: count((r) => r.stage === "Completed"),
  };
}

export interface HealthResult {
  health: Health;
  score: number;
  reasons: string[];
  rootCause: string;
  impact: string;
  action: string;
}

export function campaignHealth(campaign: Campaign, stats: CampaignStats): HealthResult {
  const reasons: string[] = [];
  let score = 100;
  const fill = stats.target ? stats.approved / stats.target : 1;
  if (fill < 0.5) {
    score -= 35;
    reasons.push(`Only ${stats.approved} of ${stats.target} creators client-approved`);
  } else if (fill < 0.8) {
    score -= 18;
    reasons.push(`${stats.remaining} approvals still required to hit target`);
  }
  if (stats.missingCoverage > 0) {
    score -= 12 * stats.missingCoverage;
    reasons.push(`${stats.missingCoverage} missing posting coverage submission(s)`);
  }
  if (stats.missedVisits > 0) {
    score -= 10 * stats.missedVisits;
    reasons.push(`${stats.missedVisits} missed visit(s)`);
  }
  if (stats.replacements > 0) {
    score -= 8 * stats.replacements;
    reasons.push(`${stats.replacements} replacement(s) required`);
  }
  if (campaign.clientApproval !== "Approved") {
    score -= campaign.clientApproval === "Pending" ? 15 : 8;
    reasons.push(`Client approval is ${campaign.clientApproval.toLowerCase()}`);
  }
  const daysLeft = daysBetween(TODAY, campaign.endDate);
  if (daysLeft < 14 && fill < 0.9 && campaign.status !== "Completed") {
    score -= 12;
    reasons.push(`${daysLeft} days to campaign end with delivery gap`);
  }
  score = Math.max(0, Math.min(100, score));
  const health: Health =
    score >= 80 ? "green" : score >= 60 ? "amber" : score >= 40 ? "red" : "critical";
  return {
    health,
    score,
    reasons,
    rootCause: reasons[0] ?? "Delivery on plan",
    impact:
      health === "green"
        ? "No client impact expected"
        : `${stats.remaining} creator slot(s) and ${stats.missingCoverage} coverage item(s) at risk of missing the client deadline`,
    action: reasons.length ? campaign.nextAction : "Continue delivery cadence",
  };
}

export function invoiceOutstanding(inv: Invoice) {
  return Math.max(0, inv.amount - inv.paid);
}

export function isOverdue(inv: Invoice) {
  return (
    invoiceOutstanding(inv) > 0 &&
    daysBetween(inv.dueDate) > 0 &&
    inv.status !== "Cancelled" &&
    inv.status !== "Draft"
  );
}

export function dealIsStuck(deal: Deal) {
  return !["Won", "Lost"].includes(deal.stage) && daysBetween(deal.lastActivity) >= 7;
}

export function taskIsOverdue(task: Task) {
  return !["Done", "Cancelled"].includes(task.status) && daysBetween(task.dueDate) > 0;
}

export interface EntityFinance {
  entity: Entity;
  revenue: number;
  expenses: number;
  profit: number;
  ar: number;
  ap: number;
  cash: number;
  revenueSAR: number;
  expensesSAR: number;
  profitSAR: number;
  arSAR: number;
  apSAR: number;
  cashSAR: number;
}

export function entityFinance(
  entity: Entity,
  invoices: Invoice[],
  expenses: Expense[],
): EntityFinance {
  const inv = invoices.filter(
    (i) => i.entityId === entity.id && i.status !== "Cancelled" && i.status !== "Draft",
  );
  const exp = expenses.filter((e) => e.entityId === entity.id && e.status !== "Rejected");
  const revenue = inv.reduce((s, i) => s + i.amount, 0);
  const expensesTotal = exp.reduce((s, e) => s + e.amount, 0);
  const ar = inv.reduce((s, i) => s + invoiceOutstanding(i), 0);
  const ap = exp.filter((e) => e.status !== "Paid").reduce((s, e) => s + e.amount, 0);
  const cash =
    inv.reduce((s, i) => s + i.paid, 0) -
    exp.filter((e) => e.status === "Paid").reduce((s, e) => s + e.amount, 0);
  const c = entity.currency;
  return {
    entity,
    revenue,
    expenses: expensesTotal,
    profit: revenue - expensesTotal,
    ar,
    ap,
    cash,
    revenueSAR: toSAR(revenue, c),
    expensesSAR: toSAR(expensesTotal, c),
    profitSAR: toSAR(revenue - expensesTotal, c),
    arSAR: toSAR(ar, c),
    apSAR: toSAR(ap, c),
    cashSAR: toSAR(cash, c),
  };
}

export interface Exception {
  id: string;
  category: string;
  issue: string;
  ownerId: string;
  entityId: string;
  age: string;
  impact: string;
  action: string;
  deadline: string;
  severity: "Critical" | "High" | "Medium";
  link: string;
}

export function buildExceptions(input: {
  deals: Deal[];
  campaigns: Campaign[];
  campaignInfluencers: CampaignInfluencer[];
  influencers: Influencer[];
  tasks: Task[];
  invoices: Invoice[];
  clients: Client[];
  users: User[];
  coaPending: number;
  fxMissing: { currency: string; entityId: string }[];
}): Exception[] {
  const out: Exception[] = [];
  const clientName = (id: string) => input.clients.find((c) => c.id === id)?.name ?? id;
  const infName = (id: string) => input.influencers.find((i) => i.id === id)?.name ?? id;

  for (const d of input.deals.filter(dealIsStuck)) {
    out.push({
      id: `EXC-${d.id}`,
      category: "Stuck deal",
      issue: `${d.name} — no activity for ${daysBetween(d.lastActivity)} days`,
      ownerId: d.ownerId,
      entityId: d.entityId,
      age: `${daysBetween(d.lastActivity)} days`,
      impact: `${d.currency} ${d.value.toLocaleString()} pipeline at risk`,
      action: d.nextAction,
      deadline: d.nextActionDate,
      severity: daysBetween(d.lastActivity) > 20 ? "Critical" : "High",
      link: "/crm/deals",
    });
  }

  for (const ci of input.campaignInfluencers) {
    const camp = input.campaigns.find((c) => c.id === ci.campaignId);
    if (!camp) continue;
    if (ci.stage === "Missing Posting Coverage") {
      out.push({
        id: `EXC-${ci.id}`,
        category: "Missing posting coverage",
        issue: `${infName(ci.influencerId)} — ${clientName(camp.clientId)} coverage not submitted`,
        ownerId: camp.opsOwnerId,
        entityId: camp.entityId,
        age: ci.coverageDue ? `${daysBetween(ci.coverageDue)} days` : "—",
        impact: "Client report incomplete; deliverable not billable",
        action: "Escalate to community owner and prepare replacement coverage",
        deadline: ci.coverageDue ?? camp.endDate,
        severity: "Critical",
        link: `/campaigns/${camp.id}`,
      });
    }
    if (ci.stage === "Missed Visit") {
      out.push({
        id: `EXC-${ci.id}`,
        category: "Missed visit",
        issue: `${infName(ci.influencerId)} did not attend the scheduled visit`,
        ownerId: camp.opsOwnerId,
        entityId: camp.entityId,
        age: ci.visitDate ? `${daysBetween(ci.visitDate)} days` : "—",
        impact: "Slot unfilled — target shortfall risk",
        action: "Reschedule or trigger replacement workflow",
        deadline: camp.endDate,
        severity: "High",
        link: `/campaigns/${camp.id}`,
      });
    }
    if (ci.stage === "Replacement Required") {
      out.push({
        id: `EXC-${ci.id}`,
        category: "Replacement required",
        issue: `${infName(ci.influencerId)} rejected — replacement needed for ${camp.name}`,
        ownerId: camp.ownerId,
        entityId: camp.entityId,
        age: "—",
        impact: "Confirmed count below client-approved target",
        action: "Source and submit replacement creator",
        deadline: camp.endDate,
        severity: "High",
        link: `/campaigns/${camp.id}`,
      });
    }
  }

  for (const camp of input.campaigns) {
    const stats = campaignStats(camp, input.campaignInfluencers);
    const h = campaignHealth(camp, stats);
    if (h.health === "red" || h.health === "critical") {
      out.push({
        id: `EXC-H-${camp.id}`,
        category: "Campaign behind target",
        issue: `${camp.name} — ${h.rootCause}`,
        ownerId: camp.ownerId,
        entityId: camp.entityId,
        age: `${daysBetween(camp.startDate)} days running`,
        impact: h.impact,
        action: camp.nextAction,
        deadline: camp.endDate,
        severity: h.health === "critical" ? "Critical" : "High",
        link: `/campaigns/${camp.id}`,
      });
    }
    if (camp.clientApproval === "Pending" && camp.status !== "Planning") {
      out.push({
        id: `EXC-CA-${camp.id}`,
        category: "Client approval pending",
        issue: `${clientName(camp.clientId)} has not approved the creator shortlist`,
        ownerId: camp.ownerId,
        entityId: camp.entityId,
        age: `${daysBetween(camp.startDate)} days`,
        impact: "Scheduling blocked until approval received",
        action: "Chase approval with client contact",
        deadline: camp.endDate,
        severity: "High",
        link: `/campaigns/${camp.id}`,
      });
    }
  }

  for (const inv of input.invoices.filter(isOverdue)) {
    out.push({
      id: `EXC-${inv.id}`,
      category: "Overdue invoice",
      issue: `${inv.number} — ${clientName(inv.clientId)}`,
      ownerId: "u3",
      entityId: inv.entityId,
      age: `${daysBetween(inv.dueDate)} days`,
      impact: `${inv.currency} ${invoiceOutstanding(inv).toLocaleString()} outstanding`,
      action: "Joint finance + account manager collection call",
      deadline: inv.dueDate,
      severity: daysBetween(inv.dueDate) > 30 ? "Critical" : "High",
      link: "/finance/invoices",
    });
  }

  for (const t of input.tasks.filter(taskIsOverdue)) {
    out.push({
      id: `EXC-${t.id}`,
      category: "Overdue task",
      issue: `${t.id} ${t.title}`,
      ownerId: t.ownerId,
      entityId: t.entityId,
      age: `${daysBetween(t.dueDate)} days`,
      impact: `${t.department} deliverable "${t.deliverable}" delayed`,
      action: "Reassign or unblock with department manager",
      deadline: t.dueDate,
      severity: t.priority === "Critical" ? "Critical" : "Medium",
      link: "/tasks",
    });
  }

  if (input.coaPending > 0) {
    out.push({
      id: "EXC-COA",
      category: "COA request pending",
      issue: `${input.coaPending} chart of accounts request(s) awaiting Group Finance review`,
      ownerId: "u3",
      entityId: "sa",
      age: "—",
      impact: "Branch accountants cannot post to the requested accounts",
      action: "Review and approve or reject in the Chart of Accounts workspace",
      deadline: TODAY,
      severity: "Medium",
      link: "/finance/coa",
    });
  }

  for (const fx of input.fxMissing) {
    out.push({
      id: `EXC-FX-${fx.currency}`,
      category: "FX rate missing",
      issue: `${fx.currency} monthly rate is not locked`,
      ownerId: "u3",
      entityId: fx.entityId,
      age: "—",
      impact: "Consolidation to SAR cannot be finalised for this entity",
      action: "Load and lock the official monthly rate",
      deadline: TODAY,
      severity: "High",
      link: "/finance/fx",
    });
  }

  const order = { Critical: 0, High: 1, Medium: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

/* ── Period-over-period movement ───────────────────────────────────────
   Compares a trailing window against the window immediately before it.
   Trailing windows are used rather than calendar months because a partial
   current month against a complete previous one produces a fall that is an
   artefact of the calendar rather than a real movement. */

export interface PeriodDelta {
  pct: number;
  current: number;
  previous: number;
  baseline: string;
}

const DAY = 86_400_000;
const shift = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() + days * DAY).getTime();

/**
 * Movement between the `days` before `today` and the `days` before that.
 *
 * Returns null when the prior window holds nothing to compare against — a
 * percentage against zero is not a movement, and showing one would invent a
 * number the data cannot support.
 */
export function periodDelta<T>(
  rows: T[],
  date: (r: T) => string,
  amount: (r: T) => number,
  today: string,
  days = 30,
  minSample = 3,
): PeriodDelta | null {
  const now = new Date(today).getTime();
  const midpoint = shift(today, -days);
  const start = shift(today, -days * 2);

  let current = 0;
  let previous = 0;
  let previousRows = 0;
  for (const r of rows) {
    const at = new Date(date(r)).getTime();
    if (Number.isNaN(at)) continue;
    if (at > midpoint && at <= now) current += amount(r);
    else if (at > start && at <= midpoint) {
      previous += amount(r);
      previousRows++;
    }
  }

  // Too thin a prior window produces a headline percentage that says more about
  // where a handful of rows landed than about the business. Report nothing instead.
  if (previousRows < minSample || previous === 0) return null;
  return {
    pct: ((current - previous) / Math.abs(previous)) * 100,
    current,
    previous,
    baseline: `vs previous ${days} days`,
  };
}

/** Count-based variant of {@link periodDelta}. */
export function countDelta<T>(
  rows: T[],
  date: (r: T) => string,
  today: string,
  days = 30,
  minSample = 3,
) {
  return periodDelta(rows, date, () => 1, today, days, minSample);
}
