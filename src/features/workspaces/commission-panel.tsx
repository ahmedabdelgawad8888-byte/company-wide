import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Download, RotateCcw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Bar, Pill, Stat } from "../../components/kit";
import { useApp } from "../../lib/store";
import { useLang } from "../../lib/i18n";
import { useExportQueue } from "../../lib/export-queue";
import { compactMoney, GROUP_CURRENCY, money, pct } from "../../lib/format";
import { today, type WorkRecord } from "./model";
import { useHub } from "./provider";
import { manager, payeeVisible } from "./service";
import { buildSources } from "./commission-data";
import {
  atRiskLabel,
  basisLabel,
  calculateCommission,
  commissionCsv,
  commissionPlanSchema,
  defaultPlans,
  methodLabel,
  normalizeTiers,
  rawCommission,
  type CommissionMethod,
  type CommissionPeriod,
  type CommissionPlan,
  type CommissionWorkspace,
  type PersonCommission,
} from "./commission";

const PLAN_STORAGE_KEY = "trygc-commission-plans-v1";

const pad = (n: number) => String(n).padStart(2, "0");
const monthStart = (d: string) => `${d.slice(0, 7)}-01`;
const monthEnd = (d: string) => {
  const [y, m] = d.split("-").map(Number);
  return `${y}-${pad(m ?? 1)}-${pad(new Date(y ?? 1970, m ?? 1, 0).getDate())}`;
};
const addMonths = (d: string, n: number) => {
  const [y, m] = d.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1 + n, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;
};

type PresetId = "month" | "last" | "quarter" | "ytd" | "custom";
const presets: { id: PresetId; label: [string, string] }[] = [
  { id: "month", label: ["This month", "هذا الشهر"] },
  { id: "last", label: ["Last month", "الشهر الماضي"] },
  { id: "quarter", label: ["This quarter", "هذا الربع"] },
  { id: "ytd", label: ["Year to date", "منذ بداية العام"] },
  { id: "custom", label: ["Custom", "مخصص"] },
];

function presetPeriod(
  id: PresetId,
  day: string,
  custom: { from: string; to: string },
): CommissionPeriod {
  const year = day.slice(0, 4);
  if (id === "last") {
    const start = addMonths(monthStart(day), -1);
    return { from: start, to: monthEnd(start), label: "Last month" };
  }
  if (id === "quarter") {
    const month = Number(day.slice(5, 7));
    const first = Math.floor((month - 1) / 3) * 3 + 1;
    return { from: `${year}-${pad(first)}-01`, to: day, label: "This quarter" };
  }
  if (id === "ytd") return { from: `${year}-01-01`, to: day, label: "Year to date" };
  if (id === "custom")
    return { from: custom.from, to: custom.to, label: `${custom.from} → ${custom.to}` };
  return { from: monthStart(day), to: day, label: "This month" };
}

/** Plans live beside the workspace data, one per workspace, edited only by leads. */
function loadPlans(): Partial<Record<CommissionWorkspace, CommissionPlan>> {
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<Record<CommissionWorkspace, CommissionPlan>> = {};
    for (const id of ["sales", "finance"] as CommissionWorkspace[]) {
      const candidate = commissionPlanSchema.safeParse(parsed[id]);
      if (candidate.success) out[id] = candidate.data as CommissionPlan;
    }
    return out;
  } catch {
    return {};
  }
}

function useCommissionPlan(workspaceId: CommissionWorkspace) {
  const [plan, setPlan] = useState<CommissionPlan>(defaultPlans[workspaceId]);
  useEffect(() => {
    setPlan(loadPlans()[workspaceId] ?? defaultPlans[workspaceId]);
  }, [workspaceId]);
  const save = (next: CommissionPlan) => {
    const checked = commissionPlanSchema.safeParse(next);
    if (!checked.success) {
      toast.error(checked.error.issues[0]?.message ?? "Plan values are out of range.");
      return;
    }
    setPlan(next);
    try {
      window.localStorage.setItem(
        PLAN_STORAGE_KEY,
        JSON.stringify({ ...loadPlans(), [workspaceId]: next }),
      );
    } catch {
      toast.error("Plan changes could not be saved to this browser.");
    }
  };
  const reset = () => save(defaultPlans[workspaceId]);
  return { plan, save, reset };
}

export function CommissionCenter({
  workspaceId,
  rows,
  onOpen,
}: {
  workspaceId: CommissionWorkspace;
  rows: WorkRecord[];
  onOpen: (id: string) => void;
}) {
  const { t } = useLang();
  const { db } = useApp();
  const { actor, users } = useHub();
  const { enqueue } = useExportQueue();
  const { plan, save, reset } = useCommissionPlan(workspaceId);
  const day = today();
  const [preset, setPreset] = useState<PresetId>("month");
  const [customFrom, setCustomFrom] = useState(monthStart(day));
  const [customTo, setCustomTo] = useState(day);
  const [expanded, setExpanded] = useState<string | null>(null);
  const editable = manager(actor);
  const period = useMemo(
    () => presetPeriod(preset, day, { from: customFrom, to: customTo }),
    [preset, day, customFrom, customTo],
  );

  const people = useMemo(
    () =>
      users
        .filter((u) => payeeVisible(actor, u, workspaceId))
        .map((u) => ({ id: u.id, name: u.name, role: u.role })),
    [users, actor, workspaceId],
  );
  const sources = useMemo(
    () =>
      buildSources({
        workspaceId,
        records: rows,
        clients: db.clients,
        deals: db.deals,
        invoices: db.invoices,
        payments: db.payments,
        today: day,
        entityId: actor.scope === "entity" ? actor.entityId : undefined,
      }),
    [workspaceId, rows, db, day, actor.scope, actor.entityId],
  );
  const run = useMemo(
    () => calculateCommission(plan, sources, people, period),
    [plan, sources, people, period],
  );
  const earning = run.people.filter((p) => p.volume > 0 || p.net > 0);

  const exportStatement = () => {
    if (!earning.length) {
      toast.error(t("Nothing to export for this period.", "لا توجد بيانات للتصدير في هذه الفترة."));
      return;
    }
    enqueue({
      title: `${plan.name} · ${period.label}`,
      kind: "csv",
      rows: earning.reduce((n, p) => n + p.lines.length + 1, 0),
      columns: 13,
      filters: `${period.from} → ${period.to} · ${t(...basisLabel[plan.basis])}`,
      filename: `commission-${workspaceId}-${period.from}-${period.to}.csv`,
      build: () => commissionCsv({ ...run, people: earning }, GROUP_CURRENCY),
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{t(plan.name, plan.nameAr)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Paid on", "تُحتسب على")} <strong>{t(...basisLabel[plan.basis])}</strong> ·{" "}
              {t(...methodLabel[plan.method])} · {t("settled in", "وتسوّى بعملة")} {GROUP_CURRENCY}
            </p>
          </div>
          <Button variant="outline" onClick={exportStatement}>
            <Download className="size-4" />
            {t("Export statement", "تصدير الكشف")}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={preset === p.id ? "secondary" : "outline"}
              onClick={() => setPreset(p.id)}
            >
              {t(...p.label)}
            </Button>
          ))}
          {preset === "custom" && (
            <>
              <Input
                aria-label={t("Commission period start", "بداية فترة العمولة")}
                type="date"
                className="w-40"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <Input
                aria-label={t("Commission period end", "نهاية فترة العمولة")}
                type="date"
                className="w-40"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t(...basisLabel[plan.basis])}
          value={compactMoney(run.totals.volume, GROUP_CURRENCY)}
          hint={`${sources.filter((s) => s.date >= period.from && s.date <= period.to).length} ${t("credited records", "سجل محتسب")}`}
        />
        <Stat
          label={t("Attainment", "نسبة التحقيق")}
          value={run.totals.target > 0 ? pct(run.totals.attainmentPct) : "—"}
          tone={run.totals.attainmentPct >= 100 ? "success" : "brand"}
          hint={
            run.totals.target > 0
              ? `${t("of", "من")} ${compactMoney(run.totals.target, GROUP_CURRENCY)}`
              : t("No target set", "لا يوجد مستهدف")
          }
        />
        <Stat
          label={t("Gross commission", "إجمالي العمولة")}
          value={money(run.totals.gross, GROUP_CURRENCY)}
          hint={`${run.totals.payees} ${t("people earning", "أشخاص مستحقون")}`}
        />
        <Stat
          label={t("Net payable", "الصافي المستحق")}
          value={money(run.totals.net, GROUP_CURRENCY)}
          tone={run.totals.clawback > 0 ? "warning" : "success"}
          hint={
            run.totals.clawback > 0
              ? `${t("held back", "محتجز")} ${money(run.totals.clawback, GROUP_CURRENCY)}`
              : t("No hold-back", "بدون احتجاز")
          }
        />
      </section>

      <PlanEditor plan={plan} editable={editable} onChange={save} onReset={reset} />

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <h2 className="font-semibold">{t("Commission by person", "العمولة لكل شخص")}</h2>
          <span className="text-xs text-muted-foreground">
            {period.from} → {period.to}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {[
                  t("Person", "الشخص"),
                  t(...basisLabel[plan.basis]),
                  t("Attainment", "التحقيق"),
                  t("Rate", "النسبة"),
                  t("Gross", "الإجمالي"),
                  t("Hold-back", "الاحتجاز"),
                  t("Net", "الصافي"),
                ].map((h) => (
                  <th key={h} className="p-3 text-start font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {earning.map((person) => (
                <PersonRows
                  key={person.personId}
                  person={person}
                  target={plan.target}
                  expanded={expanded === person.personId}
                  onToggle={() =>
                    setExpanded((id) => (id === person.personId ? null : person.personId))
                  }
                  onOpen={onOpen}
                />
              ))}
            </tbody>
          </table>
        </div>
        {!earning.length && (
          <p className="p-8 text-sm text-muted-foreground">
            {t(
              plan.basis === "booked"
                ? "No business was won in this period. Won deals, accepted quotations and signed contracts are credited here — widen the period to see earlier wins."
                : "No cash was collected in this period. Recorded payments against bills are credited here — widen the period to see earlier collections.",
              plan.basis === "booked"
                ? "لا توجد أعمال محققة في هذه الفترة. تُحتسب هنا الصفقات المكسوبة وعروض الأسعار المقبولة والعقود الموقعة — وسّع الفترة لعرض الأعمال السابقة."
                : "لا يوجد تحصيل نقدي في هذه الفترة. تُحتسب هنا المدفوعات المسجلة على الفواتير — وسّع الفترة لعرض التحصيلات السابقة.",
            )}
          </p>
        )}
      </section>

      <PlanCurve plan={plan} />
    </div>
  );
}

function PersonRows({
  person,
  target,
  expanded,
  onToggle,
  onOpen,
}: {
  person: PersonCommission;
  target: number;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (id: string) => void;
}) {
  const { t } = useLang();
  return (
    <>
      <tr className="border-t">
        <td className="p-3">
          <button className="flex items-center gap-2 text-start" onClick={onToggle}>
            <ChevronDown
              className={`size-4 shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`}
            />
            <span>
              <span className="font-medium">{person.personName}</span>
              <small className="block text-muted-foreground">{person.personRole}</small>
            </span>
          </button>
        </td>
        <td className="num p-3">
          {money(person.volume, GROUP_CURRENCY)}
          {person.atRiskVolume > 0 && (
            <small className="block text-warning">
              {t("at risk", "معرض للخصم")} {money(person.atRiskVolume, GROUP_CURRENCY)}
            </small>
          )}
        </td>
        <td className="p-3">
          {target > 0 ? (
            <>
              <span className="num text-xs">{pct(person.attainmentPct)}</span>
              <div className="mt-1 w-28">
                <Bar
                  value={person.attainmentPct}
                  max={100}
                  tone={
                    person.attainmentPct >= 100 ? "success" : person.belowFloor ? "danger" : "brand"
                  }
                />
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="num p-3">
          {person.rate}%
          {person.accelerator > 0 && (
            <small className="block text-success">
              +{money(person.accelerator, GROUP_CURRENCY)} {t("accelerator", "تسريع")}
            </small>
          )}
        </td>
        <td className="num p-3">
          {money(person.gross, GROUP_CURRENCY)}
          {person.bonus > 0 && (
            <small className="block text-muted-foreground">
              {t("incl. bonus", "شامل المكافأة")} {money(person.bonus, GROUP_CURRENCY)}
            </small>
          )}
        </td>
        <td className="num p-3 text-warning">
          {person.clawback > 0 ? `-${money(person.clawback, GROUP_CURRENCY)}` : "—"}
          {person.capAdjustment < 0 && (
            <small className="block text-muted-foreground">
              {t("cap", "سقف")} {money(person.capAdjustment, GROUP_CURRENCY)}
            </small>
          )}
        </td>
        <td className="num p-3 font-semibold">
          {money(person.net, GROUP_CURRENCY)}
          {person.belowFloor && (
            <Pill tone="danger" className="mt-1">
              <TriangleAlert className="size-3" />
              {t("Below floor", "تحت الحد الأدنى")}
            </Pill>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-t bg-muted/20">
          <td colSpan={7} className="p-0">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  {[
                    t("Record", "السجل"),
                    t("Client", "العميل"),
                    t("Date", "التاريخ"),
                    t("Amount", "المبلغ"),
                    t("Credited", "المحتسب"),
                    t("Share", "الحصة"),
                    t("Commission", "العمولة"),
                  ].map((h) => (
                    <th key={h} className="p-2 text-start font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {person.lines.map((line) => (
                  <tr key={line.sourceId} className="border-t">
                    <td className="p-2">
                      {line.sourceId.includes(":") ? (
                        // Ledger rows (CRM deals, finance payments) live outside the hub.
                        <Link to={line.href as never} className="text-start hover:underline">
                          {line.title}
                        </Link>
                      ) : (
                        <button
                          className="text-start hover:underline"
                          onClick={() => onOpen(line.sourceId)}
                        >
                          {line.title}
                        </button>
                      )}
                      <small className="block text-muted-foreground">
                        {line.kind} · {line.status}
                        {line.atRisk && ` · ${t("at risk", "معرض للخصم")}`}
                      </small>
                    </td>
                    <td className="p-2">{line.clientName}</td>
                    <td className="num p-2">{line.date}</td>
                    <td className="num p-2">{money(line.amount, line.currency)}</td>
                    <td className="num p-2">{money(line.credited, GROUP_CURRENCY)}</td>
                    <td className="num p-2">{pct(line.share * 100)}</td>
                    <td className="num p-2 font-medium">
                      {money(line.commission, GROUP_CURRENCY)}
                    </td>
                  </tr>
                ))}
                {!person.lines.length && (
                  <tr>
                    <td colSpan={7} className="p-4 text-muted-foreground">
                      {t(
                        "No credited records in this period.",
                        "لا توجد سجلات محتسبة في هذه الفترة.",
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

function NumberField({
  label,
  hint,
  value,
  suffix,
  step,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  suffix?: string;
  step?: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <Input
          type="number"
          step={step ?? 1}
          min={0}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PlanEditor({
  plan,
  editable,
  onChange,
  onReset,
}: {
  plan: CommissionPlan;
  editable: boolean;
  onChange: (plan: CommissionPlan) => void;
  onReset: () => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const set = <K extends keyof CommissionPlan>(key: K, value: CommissionPlan[K]) =>
    onChange({ ...plan, [key]: value });
  const setTier = (index: number, patch: Partial<{ from: number; rate: number }>) =>
    onChange({
      ...plan,
      tiers: plan.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)),
    });
  return (
    <section className="rounded-xl border bg-card">
      <button
        className="flex w-full items-center justify-between gap-3 p-4 text-start"
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <span className="font-semibold">{t("Plan rules", "قواعد الخطة")}</span>
          <small className="block text-muted-foreground">
            {t(...methodLabel[plan.method])} · {t("target", "المستهدف")}{" "}
            {money(plan.target, GROUP_CURRENCY)} · {t("floor", "الحد الأدنى")} {plan.floorPct}% ·{" "}
            {t("cap", "السقف")}{" "}
            {plan.capAmount > 0 ? money(plan.capAmount, GROUP_CURRENCY) : t("none", "بدون")}
          </small>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && (
        <div className="space-y-5 border-t p-4">
          {!editable && (
            <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              {t(
                "Plan rules are set by the workspace lead. You are seeing the rules applied to your own commission.",
                "قواعد الخطة يحددها قائد المساحة. أنت ترى القواعد المطبقة على عمولتك.",
              )}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label className="text-xs text-muted-foreground">
                {t("Calculation method", "طريقة الاحتساب")}
              </Label>
              <Select
                value={plan.method}
                disabled={!editable}
                onValueChange={(value) => set("method", value as CommissionMethod)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["flat", "tiered", "progressive"] as CommissionMethod[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {t(...methodLabel[m])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {plan.method === "flat" && (
              <NumberField
                label={t("Flat rate", "النسبة الثابتة")}
                value={plan.flatRate}
                suffix="%"
                step={0.05}
                disabled={!editable}
                onChange={(v) => set("flatRate", v)}
              />
            )}
            <NumberField
              label={t("Target per person", "المستهدف للفرد")}
              hint={t(
                "0 turns off targets, floors and bonuses.",
                "القيمة 0 تلغي المستهدف والحد الأدنى والمكافأة.",
              )}
              value={plan.target}
              suffix={GROUP_CURRENCY}
              step={10000}
              disabled={!editable}
              onChange={(v) => set("target", v)}
            />
            <NumberField
              label={t("Floor", "الحد الأدنى للاستحقاق")}
              hint={t(
                "Nothing is earned under this attainment.",
                "لا تُحتسب عمولة تحت هذه النسبة.",
              )}
              value={plan.floorPct}
              suffix="%"
              disabled={!editable}
              onChange={(v) => set("floorPct", v)}
            />
            <NumberField
              label={t("Accelerator from", "بداية التسريع")}
              value={plan.acceleratorFromPct}
              suffix="%"
              disabled={!editable}
              onChange={(v) => set("acceleratorFromPct", v)}
            />
            <NumberField
              label={t("Accelerator multiplier", "معامل التسريع")}
              hint={t("1 turns the accelerator off.", "القيمة 1 تلغي التسريع.")}
              value={plan.acceleratorMultiplier}
              suffix="×"
              step={0.05}
              disabled={!editable}
              onChange={(v) => set("acceleratorMultiplier", v)}
            />
            <NumberField
              label={t("Target bonus", "مكافأة تحقيق المستهدف")}
              value={plan.targetBonus}
              suffix={GROUP_CURRENCY}
              step={500}
              disabled={!editable}
              onChange={(v) => set("targetBonus", v)}
            />
            <NumberField
              label={t("Payout cap", "سقف الصرف")}
              hint={t("0 means uncapped.", "القيمة 0 تعني بدون سقف.")}
              value={plan.capAmount}
              suffix={GROUP_CURRENCY}
              step={1000}
              disabled={!editable}
              onChange={(v) => set("capAmount", v)}
            />
            <NumberField
              label={t("Hold-back on at-risk", "نسبة الاحتجاز")}
              hint={t(...atRiskLabel[plan.basis])}
              value={plan.clawbackRate}
              suffix="%"
              disabled={!editable}
              onChange={(v) => set("clawbackRate", v)}
            />
            <NumberField
              label={t("Owner share on shared work", "حصة المسؤول في العمل المشترك")}
              hint={t("The rest is split across collaborators.", "الباقي يوزع على المشاركين.")}
              value={plan.splitOwnerShare}
              suffix="%"
              step={5}
              disabled={!editable}
              onChange={(v) => set("splitOwnerShare", v)}
            />
            <NumberField
              label={t("Rounding", "تقريب الصرف")}
              value={plan.roundTo}
              suffix={GROUP_CURRENCY}
              disabled={!editable}
              onChange={(v) => set("roundTo", v)}
            />
          </div>

          {plan.method !== "flat" && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t("Rate tiers", "شرائح النسب")}</h3>
                <p className="text-xs text-muted-foreground">
                  {plan.method === "tiered"
                    ? t(
                        "The reached tier's rate applies to the whole volume.",
                        "تُطبق نسبة الشريحة المحققة على كامل الحجم.",
                      )
                    : t(
                        "Each slice of volume pays its own tier rate.",
                        "كل شريحة من الحجم تُحتسب بنسبتها.",
                      )}
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {plan.tiers.map((tier, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2">
                    <div className="w-44">
                      <Label className="text-xs text-muted-foreground">
                        {t("From", "من")} ({GROUP_CURRENCY})
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step={10000}
                        className="mt-1"
                        value={tier.from}
                        disabled={!editable || i === 0}
                        onChange={(e) => setTier(i, { from: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="w-28">
                      <Label className="text-xs text-muted-foreground">
                        {t("Rate", "النسبة")} %
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.05}
                        className="mt-1"
                        value={tier.rate}
                        disabled={!editable}
                        onChange={(e) => setTier(i, { rate: Number(e.target.value) || 0 })}
                      />
                    </div>
                    {editable && plan.tiers.length > 1 && i > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onChange({ ...plan, tiers: plan.tiers.filter((_, x) => x !== i) })
                        }
                      >
                        {t("Remove", "حذف")}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {editable && plan.tiers.length < 8 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    onChange({
                      ...plan,
                      tiers: [
                        ...plan.tiers,
                        {
                          from: (plan.tiers[plan.tiers.length - 1]?.from ?? 0) + 500000,
                          rate: (plan.tiers[plan.tiers.length - 1]?.rate ?? 0) + 0.5,
                        },
                      ],
                    })
                  }
                >
                  {t("Add tier", "إضافة شريحة")}
                </Button>
              )}
            </div>
          )}

          {editable && (
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="size-4" />
              {t("Reset to default plan", "إعادة الخطة الافتراضية")}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/** What the plan pays at a few attainment points — the sanity check before a lead saves a change. */
function PlanCurve({ plan }: { plan: CommissionPlan }) {
  const { t } = useLang();
  if (plan.target <= 0) return null;
  const points = [50, 75, 100, 125, 150];
  const tiers = normalizeTiers(plan.tiers);
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold">{t("What the plan pays", "ماذا تدفع الخطة")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "Payout for one person at each attainment level, before hold-backs.",
          "الاستحقاق لشخص واحد عند كل مستوى تحقيق، قبل الاحتجاز.",
        )}
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2 text-start font-medium">{t("Attainment", "التحقيق")}</th>
              <th className="p-2 text-start font-medium">{t("Volume", "الحجم")}</th>
              <th className="p-2 text-start font-medium">{t("Commission", "العمولة")}</th>
              <th className="p-2 text-start font-medium">
                {t("Effective rate", "النسبة الفعلية")}
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => {
              const volume = (plan.target * point) / 100;
              const below = point < plan.floorPct;
              const threshold = (plan.target * plan.acceleratorFromPct) / 100;
              const uplift =
                plan.acceleratorMultiplier > 1 && volume > threshold
                  ? Math.max(0, rawCommission(plan, volume) - rawCommission(plan, threshold)) *
                    (plan.acceleratorMultiplier - 1)
                  : 0;
              const payout = below
                ? 0
                : rawCommission(plan, volume) + uplift + (point >= 100 ? plan.targetBonus : 0);
              const capped = plan.capAmount > 0 ? Math.min(payout, plan.capAmount) : payout;
              return (
                <tr key={point} className="border-t">
                  <td className="num p-2">{point}%</td>
                  <td className="num p-2">{compactMoney(volume, GROUP_CURRENCY)}</td>
                  <td className="num p-2 font-medium">
                    {money(capped, GROUP_CURRENCY)}
                    {below && (
                      <small className="ms-2 text-muted-foreground">
                        {t("below floor", "تحت الحد الأدنى")}
                      </small>
                    )}
                    {capped < payout && (
                      <small className="ms-2 text-warning">{t("capped", "مسقوف")}</small>
                    )}
                  </td>
                  <td className="num p-2 text-muted-foreground">
                    {volume > 0 ? `${Math.round((capped / volume) * 10000) / 100}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {plan.method !== "flat" && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("Tiers", "الشرائح")}:{" "}
          {tiers
            .map(
              (tier, i) =>
                `${compactMoney(tier.from, GROUP_CURRENCY)}${
                  tiers[i + 1] ? `–${compactMoney(tiers[i + 1]!.from, GROUP_CURRENCY)}` : "+"
                } @ ${tier.rate}%`,
            )
            .join(" · ")}
        </p>
      )}
    </section>
  );
}
