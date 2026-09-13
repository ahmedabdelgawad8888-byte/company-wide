import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Health } from "@/lib/types";

export function PageHeader({
  title,
  subtitle,
  actions,
  meta,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle ? (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {title ? (
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Panel({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn("rounded-xl border bg-card p-5 shadow-[var(--shadow-panel)]", className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/** A period-over-period movement. `pct` is signed; `baseline` names what it is measured against. */
export interface Delta {
  pct: number;
  baseline?: string;
  /** Set when a fall is the good outcome (overdue debt, exceptions, breaches). */
  inverse?: boolean;
}

/** Coloured movement pill: up/down arrow, signed percentage, and the baseline it compares to. */
export function DeltaPill({ delta }: { delta: Delta }) {
  const up = delta.pct >= 0;
  const good = delta.inverse ? !up : up;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "num inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
          good ? "bg-success/12 text-success" : "bg-danger/12 text-danger",
        )}
      >
        {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
        {up ? "+" : ""}
        {Math.abs(delta.pct) >= 1000 ? ">999" : delta.pct.toFixed(1)}%
      </span>
      {delta.baseline ? (
        <span className="text-[11px] text-muted-foreground">{delta.baseline}</span>
      ) : null}
    </span>
  );
}

export function Stat({
  label,
  value,
  delta,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  delta?: Delta | undefined;
  hint?: string;
  tone?: "default" | "brand" | "orange" | "danger" | "success" | "warning";
  icon?: ReactNode;
}) {
  const toneRing: Record<string, string> = {
    default: "",
    brand: "border-brand/30",
    orange: "border-accent-orange/40",
    danger: "border-danger/40",
    success: "border-success/40",
    warning: "border-warning/40",
  };
  const toneText: Record<string, string> = {
    default: "text-foreground",
    brand: "text-brand",
    orange: "text-accent-orange",
    danger: "text-danger",
    success: "text-success",
    warning: "text-warning",
  };
  return (
    <div
      className={cn("rounded-xl border bg-card p-4 shadow-[var(--shadow-panel)]", toneRing[tone])}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <div className={cn("num mt-2 text-2xl font-semibold", toneText[tone])}>{value}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {delta ? <DeltaPill delta={delta} /> : null}
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  );
}

const pillTones: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-brand-soft text-brand",
  orange: "bg-accent-orange-soft text-accent-orange",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-muted text-info",
};

export type PillTone = keyof typeof pillTones;

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: PillTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        pillTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): PillTone {
  const s = status.toLowerCase();
  if (
    [
      "won",
      "paid",
      "approved",
      "completed",
      "active",
      "connected",
      "done",
      "green",
      "posting coverage verified",
      "valid",
    ].some((k) => s === k || s.includes(k))
  )
    return "success";
  if (
    [
      "lost",
      "overdue",
      "critical",
      "rejected",
      "error",
      "blocked",
      "red",
      "missed visit",
      "missing posting coverage",
      "escalated",
      "at risk",
      "revoked",
      "failing",
      "expired",
      "cancelled",
    ].some((k) => s.includes(k))
  )
    return "danger";
  if (
    [
      "pending",
      "amber",
      "partial",
      "needs configuration",
      "on hold",
      "returned",
      "suspended",
      "postponed",
      "replacement required",
      "no response",
      "onboarding",
      "draft",
    ].some((k) => s.includes(k))
  )
    return "warning";
  if (
    [
      "in progress",
      "delivery",
      "negotiation",
      "proposal",
      "issued",
      "scheduled",
      "confirmed",
      "submitted to client",
    ].some((k) => s.includes(k))
  )
    return "brand";
  return "neutral";
}

export function StatusPill({ status }: { status: string }) {
  return <Pill tone={statusTone(status)}>{status}</Pill>;
}

export function HealthPill({ health }: { health: Health }) {
  const map: Record<Health, PillTone> = {
    green: "success",
    amber: "warning",
    red: "danger",
    critical: "danger",
  };
  const label: Record<Health, string> = {
    green: "Healthy",
    amber: "Watch",
    red: "At risk",
    critical: "Critical",
  };
  return (
    <Pill tone={map[health]}>
      <span className="size-1.5 rounded-full bg-current" />
      {label[health]}
    </Pill>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function Bar({
  value,
  max,
  tone = "brand",
}: {
  value: number;
  max: number;
  tone?: "brand" | "orange" | "success" | "danger";
}) {
  const pct = max <= 0 ? 0 : Math.min(100, (value / max) * 100);
  const bg = {
    brand: "bg-brand",
    orange: "bg-accent-orange",
    success: "bg-success",
    danger: "bg-danger",
  }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", bg)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Progress toward a target: "12 of 18 sent" with a segmented meter and the share reached. */
export function GoalMeter({
  label,
  value,
  target,
  unit,
  caption,
  segments = 32,
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
  caption?: string;
  segments?: number;
}) {
  const pct = target <= 0 ? 0 : Math.min(100, (value / target) * 100);
  const filled = Math.round((pct / 100) * segments);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <span className="num text-xs text-muted-foreground">of {target}</span>
      </div>
      <div className="num mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold">{value}</span>
        {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
      </div>
      <div className="mt-2 flex gap-px" aria-hidden>
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn("h-4 flex-1 rounded-[1px]", i < filled ? "bg-chart-1" : "bg-muted")}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {caption ?? (
          <>
            <span className="num font-medium text-foreground">{Math.round(pct)}%</span> of target
            reached
          </>
        )}
      </p>
    </div>
  );
}

/** A ratio between two named quantities: a bar with the count at each end. */
export function RatioBar({
  label,
  value,
  total,
  valueLabel,
  totalLabel,
  display,
  caption,
  tone = "brand",
}: {
  label: string;
  value: number;
  total: number;
  valueLabel: string;
  totalLabel: string;
  /** Preformatted headline, for money or any value that should not print raw. */
  display?: string;
  caption?: string;
  tone?: "brand" | "orange" | "success" | "danger";
}) {
  const pct = total <= 0 ? 0 : Math.min(100, (value / total) * 100);
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="num mt-1 text-2xl font-semibold">{display ?? value}</div>
      {caption ? <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p> : null}
      <div className="mt-2">
        <Bar value={value} max={total} tone={tone} />
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span className="num">{valueLabel}</span>
          <span className="num">{totalLabel}</span>
        </div>
      </div>
      <div className="num mt-1 text-[11px] font-medium">{Math.round(pct)}%</div>
    </div>
  );
}

/** Proportional segments of a whole, each labelled with its share. */
export function ShareBar({
  segments,
  total,
}: {
  segments: { name: string; value: number; className: string }[];
  total?: number;
}) {
  const sum = total ?? segments.reduce((n, s) => n + s.value, 0);
  const pct = (v: number) => (sum > 0 ? (v / sum) * 100 : 0);
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((s) => (
          <div
            key={s.name}
            className={s.className}
            style={{ width: `${pct(s.value)}%` }}
            title={`${s.name}: ${s.value}`}
          />
        ))}
      </div>
      <div className="mt-2.5 space-y-2">
        {segments.map((s) => (
          <div key={s.name} className="flex items-center gap-2 text-xs">
            <span className={cn("size-2 shrink-0 rounded-full", s.className)} />
            <span className="text-muted-foreground">{s.name}</span>
            <span className="num ms-auto font-semibold">{s.value}</span>
            <span className="num w-10 text-end text-muted-foreground">
              {Math.round(pct(s.value))}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
