import { toSAR } from "../../lib/format";
import type { Client, Deal, Invoice, Payment } from "../../lib/types";
import { href, type WorkRecord } from "./model";
import type { CommissionSource, CommissionWorkspace } from "./commission";

/**
 * Turns operational records into commission sources.
 *
 * Sales is credited on business won, Finance on cash collected. Both bases pull
 * from the workspace hub records the viewer can already see plus the finance and
 * CRM ledgers, so the calculator never invents a number that is not recorded
 * somewhere else in the app.
 */

/** Hub statuses that count as business won, per record kind. */
const wonStatus: Record<string, string> = {
  quotation: "Accepted",
  proposal: "Accepted",
  contract: "Signed",
};

export interface CommissionInput {
  workspaceId: CommissionWorkspace;
  /** Hub records, already filtered by the viewer's record visibility. */
  records: WorkRecord[];
  clients: Client[];
  deals: Deal[];
  invoices: Invoice[];
  payments: Payment[];
  today: string;
  /** Set for entity-scoped people, so they only ever credit their own entity. */
  entityId?: string | undefined;
}

const day = (value: string) => (value ? value.slice(0, 10) : "");
const amountOf = (record: WorkRecord) => Number(record.details["amount"] ?? 0) || 0;
const currencyOf = (record: WorkRecord) =>
  (record.details["currency"] ?? "SAR") as Invoice["currency"];

/**
 * Clients whose money is late: they hold an unpaid invoice or bill past its due
 * date. Business booked against them is flagged at risk, which is what the
 * clawback rate acts on.
 */
function lateClients(input: CommissionInput): Set<string> {
  const late = new Set<string>();
  const name = (id: string) => input.clients.find((c) => c.id === id)?.name ?? "";
  for (const invoice of input.invoices)
    if (
      invoice.paid < invoice.amount &&
      invoice.dueDate < input.today &&
      invoice.status !== "Cancelled"
    )
      late.add(name(invoice.clientId).toLowerCase());
  for (const bill of input.records)
    if (
      bill.kind === "bill" &&
      bill.status !== "Cancelled" &&
      Number(bill.details["paid"] ?? 0) < amountOf(bill) &&
      bill.dueDate < input.today
    )
      late.add((bill.details["clientName"] ?? "").toLowerCase());
  late.delete("");
  return late;
}

/** Won deals, accepted quotations and proposals, signed contracts. */
function bookedSources(input: CommissionInput): CommissionSource[] {
  const late = lateClients(input);
  const atRisk = (clientName: string) => late.has(clientName.toLowerCase());
  const sources: CommissionSource[] = [];
  for (const deal of input.deals) {
    if (deal.stage !== "Won") continue;
    if (input.entityId && deal.entityId !== input.entityId) continue;
    const clientName = input.clients.find((c) => c.id === deal.clientId)?.name ?? "—";
    sources.push({
      id: `deal:${deal.id}`,
      kind: "deal",
      title: deal.name,
      clientName,
      ownerId: deal.ownerId,
      collaborators: [],
      entityId: deal.entityId,
      date: day(deal.lastActivity || deal.expectedClose || deal.createdAt),
      amount: deal.value,
      currency: deal.currency,
      baseAmount: toSAR(deal.value, deal.currency),
      status: deal.stage,
      atRisk: atRisk(clientName),
      href: `/crm/deals`,
    });
  }
  for (const record of input.records) {
    const won = wonStatus[record.kind];
    if (!won || record.status !== won) continue;
    if (input.entityId && record.entityId !== input.entityId) continue;
    const amount = amountOf(record);
    if (amount <= 0) continue;
    const clientId = record.details["clientId"] ?? "";
    const clientName =
      input.records.find((r) => r.kind === "client" && r.id === clientId)?.title ??
      input.clients.find((c) => c.id === clientId)?.name ??
      "—";
    const currency = currencyOf(record);
    sources.push({
      id: record.id,
      kind: record.kind,
      title: record.title,
      clientName,
      ownerId: record.ownerId,
      collaborators: record.collaborators,
      entityId: record.entityId,
      date: day(record.completedAt || record.updatedAt || record.dueDate),
      amount,
      currency,
      baseAmount: toSAR(amount, currency),
      status: record.status,
      atRisk: atRisk(clientName),
      href: href(record),
    });
  }
  return sources;
}

/** Cash actually received: finance ledger payments plus payments recorded in the hub. */
function collectedSources(input: CommissionInput): CommissionSource[] {
  const sources: CommissionSource[] = [];
  const fallbackOwner = input.invoices.find((i) => i.ownerId)?.ownerId ?? "";
  for (const payment of input.payments) {
    if (input.entityId && payment.entityId !== input.entityId) continue;
    const invoice = input.invoices.find((i) => i.id === payment.invoiceId);
    const ownerId = invoice?.ownerId ?? fallbackOwner;
    if (!ownerId) continue;
    const clientName = input.clients.find((c) => c.id === invoice?.clientId)?.name ?? "—";
    sources.push({
      id: `payment:${payment.id}`,
      kind: "payment",
      title: `${invoice?.number ?? payment.invoiceId} · ${payment.reference}`,
      clientName,
      ownerId,
      collaborators: [],
      entityId: payment.entityId,
      date: day(payment.date),
      amount: payment.amount,
      currency: payment.currency,
      baseAmount: toSAR(payment.amount, payment.currency),
      status: payment.method,
      // Money that arrived after the invoice fell due earns a reduced rate.
      atRisk: !!invoice && day(payment.date) > invoice.dueDate,
      href: `/finance/payments`,
    });
  }
  for (const record of input.records) {
    if (record.kind !== "payment") continue;
    if (input.entityId && record.entityId !== input.entityId) continue;
    const amount = amountOf(record);
    if (amount <= 0) continue;
    const bill = input.records.find((r) => r.id === record.details["billId"]);
    const currency = currencyOf(record);
    const date = day(record.createdAt || record.updatedAt || record.dueDate);
    sources.push({
      id: record.id,
      kind: "payment",
      title: record.title,
      clientName: bill?.details["clientName"] ?? "—",
      ownerId: record.ownerId,
      collaborators: record.collaborators,
      entityId: record.entityId,
      date,
      amount,
      currency,
      baseAmount: toSAR(amount, currency),
      status: record.status,
      atRisk: !!bill && !!bill.dueDate && date > bill.dueDate,
      href: href(record),
    });
  }
  return sources;
}

export function buildSources(input: CommissionInput): CommissionSource[] {
  const sources = input.workspaceId === "sales" ? bookedSources(input) : collectedSources(input);
  return sources
    .filter((source) => source.ownerId && source.date && source.baseAmount !== 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}
