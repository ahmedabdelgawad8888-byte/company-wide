import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gauge,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Panel, Pill, ShareBar, Stat, type PillTone } from "../../components/kit";
import {
  BarChartCard,
  ChartRow,
  ShareChartCard,
  SeriesBarChartCard,
  TrendChartCard,
  countBy,
} from "../../components/charts";
import { useLang } from "../../lib/i18n";
import { getWorkspace, type WorkspaceId } from "../../lib/workspace-hub";
import { useHub } from "./provider";
import { manager } from "./service";
import {
  attentionScore,
  closed,
  dayOffset,
  overdue,
  titles,
  today,
  type Kind,
  type WorkRecord,
} from "./model";
import { modulePath, validModules, type Module } from "./navigation";

const RANGES = [
  ["7", "7 days", "٧ أيام"],
  ["30", "30 days", "٣٠ يوماً"],
  ["90", "90 days", "٩٠ يوماً"],
] as const;

const money = (n: number) => Math.round(n).toLocaleString();
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

/** Records that represent actual work (not reference data such as clients or files). */
const workable = (r: WorkRecord) =>
  !["employee", "client", "file", "payment"].includes(r.kind) && !r.archived;

export function WorkspaceDashboard({
  rows,
  workspaceId,
  onOpen,
}: {
  rows: WorkRecord[];
  workspaceId: WorkspaceId;
  onOpen: (id: string) => void;
}) {
  const { actor, users } = useHub();
  const { t } = useLang();
  const [days, setDays] = useState<string>("30");
  const ws = getWorkspace(workspaceId);
  const from = dayOffset(today(), -Number(days));

  const scope = useMemo(
    () =>
      manager(actor)
        ? rows
        : rows.filter((r) => r.ownerId === actor.id || r.collaborators.includes(actor.id)),
    [rows, actor],
  );
  const work = useMemo(() => scope.filter(workable), [scope]);
  const period = useMemo(() => work.filter((r) => r.createdAt.slice(0, 10) >= from), [work, from]);
  const openRows = work.filter((r) => !closed(r));
  const overdueRows = openRows.filter((r) => overdue(r));
  const dueToday = openRows.filter((r) => r.dueDate === today());
  const dueWeek = openRows.filter(
    (r) => r.dueDate >= today() && r.dueDate <= dayOffset(today(), 7),
  );
  const blocked = openRows.filter(
    (r) => r.status === "Blocked" || r.status === "Escalated" || r.kind === "blocker",
  );
  const doneAll = work.filter((r) => closed(r));
  const onTime = doneAll.filter((r) => r.completedAt && r.completedAt.slice(0, 10) <= r.dueDate);

  // 12-period trend of created vs completed.
  const buckets = Number(days) <= 7 ? 7 : Number(days) <= 30 ? 10 : 12;
  const step = Math.max(1, Math.round(Number(days) / buckets));
  const trend = useMemo(() => {
    const created: { name: string; value: number }[] = [];
    const completed: { name: string; value: number }[] = [];
    for (let i = buckets - 1; i >= 0; i--) {
      const end = dayOffset(today(), -i * step);
      const start = dayOffset(end, -step + 1);
      const label = end.slice(5);
      created.push({
        name: label,
        value: work.filter((r) => {
          const d = r.createdAt.slice(0, 10);
          return d >= start && d <= end;
        }).length,
      });
      completed.push({
        name: label,
        value: work.filter((r) => {
          const d = (r.completedAt || "").slice(0, 10);
          return d && d >= start && d <= end;
        }).length,
      });
    }
    return { created, completed };
  }, [work, buckets, step]);

  const byOwner = useMemo(
    () =>
      users
        .map((u) => ({
          user: u,
          items: openRows.filter((r) => r.ownerId === u.id),
        }))
        .filter((g) => g.items.length)
        .sort((a, b) => b.items.length - a.items.length)
        .slice(0, 8),
    [users, openRows],
  );

  const aging = useMemo(() => {
    const band = (r: WorkRecord) => {
      const late = Math.floor((Date.parse(today()) - Date.parse(r.dueDate)) / 86400000);
      if (late <= 0) return t("On schedule", "في الموعد");
      if (late <= 7) return "1–7";
      if (late <= 30) return "8–30";
      return "30+";
    };
    return countBy(openRows, band);
  }, [openRows, t]);

  const priorities = countBy(openRows, (r) => r.priority);
  const kindMix = countBy(openRows, (r) => t(...titles[r.kind as Kind]));

  const bills = scope.filter((r) => r.kind === "bill" && r.status !== "Cancelled");
  const outstanding = bills.reduce(
    (n, r) => n + Number(r.details["amount"] ?? 0) - Number(r.details["paid"] ?? 0),
    0,
  );
  const overdueValue = bills
    .filter((r) => overdue(r))
    .reduce((n, r) => n + Number(r.details["amount"] ?? 0) - Number(r.details["paid"] ?? 0), 0);

  const throughput = trend.completed.reduce((n, d) => n + d.value, 0);
  const intake = trend.created.reduce((n, d) => n + d.value, 0);
  const flow = trend.created.map((point, index) => ({
    name: point.name,
    intake: point.value,
    throughput: trend.completed[index]?.value ?? 0,
  }));
  const flowDelta = throughput - intake;

  const insights = buildInsights({
    t,
    openRows,
    overdueRows,
    blocked,
    dueToday,
    onTime: onTime.length,
    doneAll: doneAll.length,
    intake,
    throughput,
    outstanding,
    overdueValue,
    byOwner,
    workspaceId,
  });

  const top = [...openRows].sort((a, b) => attentionScore(b) - attentionScore(a)).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Scope and freshness */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Gauge className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {t("Operational snapshot", "لقطة تشغيلية")} · {t(ws.title, ws.titleAr)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t(
                `${work.length} work records in scope · refreshed from the local workspace`,
                `${work.length} سجل عمل ضمن النطاق · محدثة من مساحة العمل المحلية`,
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted/60 p-1" aria-label={t("Analysis period", "فترة التحليل")}>
          {RANGES.map(([v, en, ar]) => (
            <Button
              key={v}
              size="sm"
              variant={days === v ? "secondary" : "ghost"}
              onClick={() => setDays(v)}
            >
              {t(en, ar)}
            </Button>
          ))}
        </div>
      </section>

      {/* Headline KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Open work", "العمل المفتوح")}
          value={String(openRows.length)}
          tone="brand"
          icon={<TrendingUp className="size-4" />}
          hint={t(
            `${period.length} created in the last ${days} days`,
            `${period.length} سجل جديد خلال ${days} يوماً`,
          )}
        />
        <Stat
          label={t("Overdue", "متأخرة")}
          value={String(overdueRows.length)}
          tone={overdueRows.length ? "danger" : "success"}
          icon={<AlertTriangle className="size-4" />}
          hint={t(
            `${pct(overdueRows.length, Math.max(1, openRows.length))}% of open work`,
            `${pct(overdueRows.length, Math.max(1, openRows.length))}% من العمل المفتوح`,
          )}
        />
        <Stat
          label={t("Due today / this week", "مستحق اليوم / الأسبوع")}
          value={`${dueToday.length} / ${dueWeek.length}`}
          tone={dueToday.length ? "warning" : "default"}
          icon={<Clock3 className="size-4" />}
          hint={t("Commitments landing soon", "التزامات قريبة الاستحقاق")}
        />
        <Stat
          label={t("On-time delivery", "الالتزام بالمواعيد")}
          value={`${pct(onTime.length, Math.max(1, doneAll.length))}%`}
          tone={pct(onTime.length, Math.max(1, doneAll.length)) >= 80 ? "success" : "warning"}
          icon={<CheckCircle2 className="size-4" />}
          hint={t(
            `${onTime.length} of ${doneAll.length} completed on time`,
            `${onTime.length} من ${doneAll.length} أُنجزت في موعدها`,
          )}
        />
      </section>

      {/* Insights */}
      <Panel className="border-primary/25 bg-primary/[0.03]">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            {t("What the data is telling you", "ما تقوله البيانات")}
          </h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {insights.map((i, index) => (
            <div key={i.title} className={`flex gap-3 rounded-xl border bg-card p-4 leading-relaxed ${index === 0 ? "lg:col-span-2 lg:p-5" : ""}`}>
              <span className="mt-0.5">
                <Pill tone={i.tone}>{i.badge}</Pill>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{i.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{i.body}</p>
                {i.to ? (
                  <Link
                    to={i.to as never}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary"
                  >
                    {i.action} <ArrowRight className="size-3" />
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Charts */}
      <ChartRow>
        <SeriesBarChartCard
          className="lg:col-span-2"
          title={t("Flow balance", "توازن التدفق")}
          description={t(
            `${intake} added and ${throughput} completed · ${flowDelta >= 0 ? "+" : ""}${flowDelta} net capacity`,
            `${intake} وارد و${throughput} منجز · صافي القدرة ${flowDelta >= 0 ? "+" : ""}${flowDelta}`,
          )}
          data={flow}
          series={[
            { key: "intake", label: t("Intake", "الوارد") },
            { key: "throughput", label: t("Completed", "المنجز") },
          ]}
        />
        <ShareChartCard
          title={t("Work mix", "توزيع أنواع العمل")}
          description={t("Open work by type", "العمل المفتوح حسب النوع")}
          data={kindMix}
        />
      </ChartRow>

      <ChartRow cols={2}>
        <BarChartCard
          title={t("Overdue aging", "أعمار التأخير")}
          description={t("How long open work has been late", "منذ متى تأخر العمل المفتوح")}
          data={aging}
          colorful
        />
        <BarChartCard
          title={t("Owner load", "توزيع العمل على الفريق")}
          description={t("Open records per owner", "السجلات المفتوحة لكل مسؤول")}
          data={byOwner.map((g) => ({ name: g.user.name, value: g.items.length }))}
          horizontal
          colorful
        />
      </ChartRow>

      {/* Health composition + attention list */}
      <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr]">
        <Panel>
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            {t("Portfolio health", "صحة العمل")}
          </h2>
          <p className="mt-0.5 mb-4 text-xs text-muted-foreground">
            {t("Composition of everything currently open", "تركيبة كل ما هو مفتوح حالياً")}
          </p>
          <ShareBar
            segments={[
              {
                name: t("Overdue", "متأخر"),
                value: overdueRows.length,
                className: "bg-danger",
              },
              {
                name: t("Blocked / escalated", "معطل أو مُصعّد"),
                value: blocked.filter((r) => !overdue(r)).length,
                className: "bg-warning",
              },
              {
                name: t("Due this week", "مستحق هذا الأسبوع"),
                value: dueWeek.filter((r) => !blocked.includes(r)).length,
                className: "bg-accent-orange",
              },
              {
                name: t("On track", "على المسار"),
                value: Math.max(
                  0,
                  openRows.length -
                    overdueRows.length -
                    blocked.filter((r) => !overdue(r)).length -
                    dueWeek.filter((r) => !blocked.includes(r)).length,
                ),
                className: "bg-success",
              },
            ]}
          />
          <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t("Priorities", "الأولويات")}</p>
              <p className="mt-1">
                {priorities
                  .sort((a, b) => b.value - a.value)
                  .map((p) => `${p.name} ${p.value}`)
                  .join(" · ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("Flow balance", "توازن التدفق")}</p>
              <p className="mt-1">
                {intake} {t("in", "وارد")} · {throughput} {t("out", "منجز")}
              </p>
            </div>
          </div>
          {bills.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("Outstanding", "المتبقي")}</p>
                <p className="mt-1 text-xl font-semibold">{money(outstanding)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("Overdue value", "قيمة متأخرة")}</p>
                <p className="mt-1 text-xl font-semibold text-destructive">{money(overdueValue)}</p>
              </div>
            </div>
          )}
        </Panel>

        <Panel className="p-0">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="text-sm font-semibold tracking-wide uppercase">
                {t("Priority queue", "قائمة الأولويات")}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t(
                  "Ranked by deadline, impact and blockage",
                  "مرتبة حسب الموعد والأثر ودرجة التعطل",
                )}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to={modulePath(workspaceId, "my-work" as Module) as never}>
                {t("Open queue", "فتح القائمة")}
              </Link>
            </Button>
          </div>
          {top.map((r) => (
            <button
              key={r.id}
              onClick={() => onOpen(r.id)}
              className="grid w-full gap-2 border-b p-4 text-start leading-relaxed transition-colors last:border-0 hover:bg-muted/40 sm:grid-cols-[1fr_auto]"
            >
              <span className="min-w-0">
                <span className="block font-medium">{r.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {users.find((u) => u.id === r.ownerId)?.name} ·{" "}
                  {r.nextAction || t("No next action set", "لم تُحدد خطوة تالية")}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs">
                <Pill tone={overdue(r) ? "danger" : r.status === "Blocked" ? "warning" : "brand"}>
                  {r.status}
                </Pill>
                <span className={overdue(r) ? "text-destructive" : "text-muted-foreground"}>
                  {r.dueDate}
                </span>
              </span>
            </button>
          ))}
          {top.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              {t("Nothing open right now.", "لا يوجد عمل مفتوح حالياً.")}
            </p>
          )}
        </Panel>
      </div>

      {/* Team table */}
      <Panel className="p-0">
        <div className="border-b p-5">
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            {t("Team execution", "تنفيذ الفريق")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t(
              "Volume is context, not a score. Review deadlines and blockers with each owner.",
              "العدد سياق وليس تقييماً. راجع المواعيد والمعوقات مع كل مسؤول.",
            )}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground uppercase">
              <tr>
                {[
                  t("Owner", "المسؤول"),
                  t("Open", "مفتوح"),
                  t("Overdue", "متأخر"),
                  t("Blocked", "معطل"),
                  t("Completed", "منجز"),
                  t("Load", "الحمل"),
                ].map((h) => (
                  <th key={h} className="p-4 text-start font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byOwner.map(({ user, items }) => {
                const max = byOwner[0]?.items.length ?? 1;
                const done = doneAll.filter((r) => r.ownerId === user.id).length;
                return (
                  <tr key={user.id} className="border-t">
                    <td className="p-4">
                      <span className="flex items-center gap-2 font-medium">
                        <Users className="size-4 text-muted-foreground" />
                        {user.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {user.department} · {user.role}
                      </span>
                    </td>
                    <td className="p-4">{items.length}</td>
                    <td className="p-4 text-destructive">
                      {items.filter((r) => overdue(r)).length}
                    </td>
                    <td className="p-4">{items.filter((r) => r.status === "Blocked").length}</td>
                    <td className="p-4 text-emerald-600">{done}</td>
                    <td className="w-48 p-4">
                      <span className="block h-2 rounded-full bg-muted">
                        <span
                          className="block h-2 rounded-full bg-primary/70"
                          style={{ width: `${(items.length / max) * 100}%` }}
                        />
                      </span>
                    </td>
                  </tr>
                );
              })}
              {byOwner.length === 0 && (
                <tr>
                  <td className="p-8 text-center text-muted-foreground" colSpan={6}>
                    {t("No open work assigned.", "لا يوجد عمل مفتوح مُسند.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/** Only offer a link when the target module exists in this workspace. */
function linkTo(w: WorkspaceId, m: Module): { to?: string } {
  return validModules(w).includes(m) ? { to: modulePath(w, m) } : {};
}

type Insight = {
  title: string;
  body: string;
  badge: string;
  tone: PillTone;
  to?: string;
  action?: string;
};

function buildInsights({
  t,
  openRows,
  overdueRows,
  blocked,
  dueToday,
  onTime,
  doneAll,
  intake,
  throughput,
  outstanding,
  overdueValue,
  byOwner,
  workspaceId,
}: {
  t: (en: string, ar: string) => string;
  openRows: WorkRecord[];
  overdueRows: WorkRecord[];
  blocked: WorkRecord[];
  dueToday: WorkRecord[];
  onTime: number;
  doneAll: number;
  intake: number;
  throughput: number;
  outstanding: number;
  overdueValue: number;
  byOwner: { user: { id: string; name: string }; items: WorkRecord[] }[];
  workspaceId: WorkspaceId;
}): Insight[] {
  const out: Insight[] = [];
  const share = pct(overdueRows.length, Math.max(1, openRows.length));

  if (overdueRows.length) {
    out.push({
      badge: t("Risk", "خطر"),
      tone: "danger",
      title: t(
        `${overdueRows.length} records are past their deadline`,
        `${overdueRows.length} سجلاً تجاوز موعده`,
      ),
      body: t(
        `That is ${share}% of open work. The oldest is ${[...overdueRows].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.dueDate}. Re-date or escalate them before adding new work.`,
        `أي ${share}% من العمل المفتوح. الأقدم منذ ${[...overdueRows].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.dueDate}. أعد جدولتها أو صعّدها قبل إضافة عمل جديد.`,
      ),
      ...linkTo(workspaceId, "overdue"),
      action: t("Review overdue", "مراجعة المتأخرات"),
    });
  } else {
    out.push({
      badge: t("Healthy", "سليم"),
      tone: "success",
      title: t("No overdue work", "لا يوجد عمل متأخر"),
      body: t(
        "Every open record is still inside its deadline. Keep the intake balanced to hold this.",
        "كل السجلات المفتوحة ضمن مواعيدها. حافظ على توازن العمل الوارد للاستمرار.",
      ),
    });
  }

  if (intake > throughput) {
    out.push({
      badge: t("Flow", "التدفق"),
      tone: "warning",
      title: t("Work is arriving faster than it closes", "العمل يصل أسرع من إنجازه"),
      body: t(
        `${intake} records came in against ${throughput} completed. The backlog will keep growing unless capacity or scope changes.`,
        `${intake} سجلاً وارداً مقابل ${throughput} منجزاً. سيستمر تراكم العمل ما لم تتغير القدرة أو النطاق.`,
      ),
    });
  } else if (throughput > 0) {
    out.push({
      badge: t("Flow", "التدفق"),
      tone: "success",
      title: t("The backlog is shrinking", "التراكم في انخفاض"),
      body: t(
        `${throughput} completed against ${intake} new. Capacity is currently ahead of demand.`,
        `${throughput} منجزاً مقابل ${intake} وارداً. القدرة الحالية تتجاوز الطلب.`,
      ),
    });
  }

  if (blocked.length) {
    out.push({
      badge: t("Blocked", "معطل"),
      tone: "warning",
      title: t(
        `${blocked.length} records need an intervention`,
        `${blocked.length} سجلاً يحتاج تدخلاً`,
      ),
      body: t(
        "These are blocked or escalated, so effort spent elsewhere will not move them. Assign a decision owner today.",
        "هذه السجلات معطلة أو مُصعّدة، ولن تتحرك بالعمل في غيرها. حدّد مسؤول قرار اليوم.",
      ),
    });
  }

  if (doneAll > 0 && pct(onTime, doneAll) < 80) {
    out.push({
      badge: t("Quality", "الجودة"),
      tone: "orange",
      title: t(
        `On-time delivery is ${pct(onTime, doneAll)}%`,
        `الالتزام بالمواعيد ${pct(onTime, doneAll)}%`,
      ),
      body: t(
        "Deadlines are being set optimistically or capacity is short. Compare planned versus actual before the next commitment.",
        "المواعيد متفائلة أو القدرة غير كافية. قارن المخطط بالفعلي قبل الالتزام القادم.",
      ),
    });
  }

  const hot = byOwner[0];
  if (hot && byOwner.length > 1 && hot.items.length >= 2 * (byOwner[1]?.items.length ?? 0)) {
    out.push({
      badge: t("Capacity", "القدرة"),
      tone: "brand",
      title: t(`${hot.user.name} carries the heaviest load`, `${hot.user.name} يحمل أكبر عبء`),
      body: t(
        `${hot.items.length} open records, more than double the next owner. Rebalance before deadlines slip.`,
        `${hot.items.length} سجلاً مفتوحاً، أي أكثر من ضعف التالي. أعد التوزيع قبل تأخر المواعيد.`,
      ),
      ...linkTo(workspaceId, "workload"),
      action: t("Open workload", "فتح توزيع العمل"),
    });
  }

  if (outstanding > 0) {
    out.push({
      badge: t("Cash", "النقد"),
      tone: overdueValue > 0 ? "danger" : "brand",
      title: t(
        `${money(outstanding)} still outstanding`,
        `${money(outstanding)} ما زالت غير محصلة`,
      ),
      body: t(
        `${money(overdueValue)} of that is already past due (${pct(overdueValue, outstanding)}%). Chase the oldest balances first.`,
        `${money(overdueValue)} منها متأخرة فعلاً (${pct(overdueValue, outstanding)}%). ابدأ بأقدم الأرصدة.`,
      ),
      ...linkTo(workspaceId, "collections"),
      action: t("Open collections", "فتح التحصيل"),
    });
  }

  if (dueToday.length) {
    out.push({
      badge: t("Today", "اليوم"),
      tone: "info",
      title: t(`${dueToday.length} commitments land today`, `${dueToday.length} التزاماً اليوم`),
      body: t(
        "Confirm each one has an owner and a next action before the day fills up.",
        "تأكد أن لكل منها مسؤولاً وخطوة تالية قبل ازدحام اليوم.",
      ),
    });
  }

  if (!out.length)
    out.push({
      badge: t("Start", "ابدأ"),
      tone: "neutral",
      title: t("Not enough activity to analyse yet", "لا توجد بيانات كافية للتحليل بعد"),
      body: t(
        "Create work in this workspace and the dashboard will start reporting trends and risks.",
        "أنشئ عملاً في هذه المساحة وستبدأ اللوحة بعرض الاتجاهات والمخاطر.",
      ),
    });

  return out.slice(0, 6);
}
