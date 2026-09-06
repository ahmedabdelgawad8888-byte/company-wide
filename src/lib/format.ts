import type { Currency } from "./types";
import { fxRates, TODAY } from "./data/seed";

export const GROUP_CURRENCY: Currency = "SAR";

export function rateToSAR(currency: Currency): number {
  return fxRates.find((r) => r.currency === currency)?.toSAR ?? 1;
}

export function toSAR(amount: number, currency: Currency): number {
  return amount * rateToSAR(currency);
}

const nf = (max = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: max, minimumFractionDigits: 0 });

/** Always renders the currency code — never a silent conversion. */
export function money(amount: number, currency: Currency, opts?: { decimals?: number }): string {
  const decimals = opts?.decimals ?? (currency === "KWD" || currency === "BHD" ? 0 : 0);
  return `${currency} ${nf(decimals).format(Math.round(amount))}`;
}

export function compactMoney(amount: number, currency: Currency): string {
  const abs = Math.abs(amount);
  const fmt = (v: number, s: string) =>
    `${currency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(v)}${s}`;
  if (abs >= 1_000_000) return fmt(amount / 1_000_000, "M");
  if (abs >= 1_000) return fmt(amount / 1_000, "K");
  return money(amount, currency);
}

export function num(v: number): string {
  return nf().format(v);
}

export function pct(v: number): string {
  return `${Math.round(v)}%`;
}

export function daysBetween(from: string, to: string = TODAY): number {
  const a = new Date(from.slice(0, 10)).getTime();
  const b = new Date(to.slice(0, 10)).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function ageLabel(from: string): string {
  const d = daysBetween(from);
  if (d <= 0) return "today";
  if (d === 1) return "1 day";
  return `${d} days`;
}

export function shortDate(d: string): string {
  if (!d || d === "—") return "—";
  const date = new Date(d.slice(0, 10));
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
