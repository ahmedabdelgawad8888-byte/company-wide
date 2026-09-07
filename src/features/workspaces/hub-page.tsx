import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, AlertTriangle, Clock3, CheckCircle2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useApp } from "../../lib/store";
import { useLang } from "../../lib/i18n";
import { getWorkspace, WORKSPACES, type WorkspaceId } from "../../lib/workspace-hub";
import { useHub, useRecords } from "./provider";
import { permission, access, executive, level, personVisible } from "./service";
import {
  attentionScore,
  closed,
  dayOffset,
  href,
  kinds,
  overdue,
  titles,
  today,
  workspaceKinds,
  type Kind,
  type WorkRecord,
} from "./model";
import { modulePath, moduleTitle, validModules, type Module } from "./navigation";
import { WorkspaceDashboard } from "./dashboard";
import { RecordForm } from "./record-form";
import { RecordDetail } from "./record-detail";
import { WorkTable, WorkCalendar, Workload } from "./work-views";
import { AutomationCenter } from "./automation-center";

const homeTitles: Record<WorkspaceId, [string, string]> = {
  management: ["Management Command Room", "غرفة قيادة الإدارة"],
  sales: ["My Sales Day", "يومي في المبيعات"],
  finance: ["My Finance Day", "يومي في الحسابات"],
  hr: ["People Operations Today", "عمليات الموظفين اليوم"],
};
const levelTitle = (value: "member" | "supervisor" | "lead"): [string, string] =>
  value === "lead"
    ? ["Workspace lead", "قائد المساحة"]
    : value === "supervisor"
      ? ["Supervisor", "مشرف"]
      : ["Member", "عضو"];
const defaultKind: Record<WorkspaceId, Kind> = {
  management: "project",
  sales: "action",
  finance: "bill",
  hr: "people-action",
};
export function HubPage({
  workspaceId,
  module = "home",
  recordId,
}: {
  workspaceId: WorkspaceId;
  module?: string;
  recordId?: string;
}) {
  const { actor, users, state, ready, error, reload, transact } = useHub();
  const all = useRecords();
  const { activeWorkspace, setActiveWorkspace } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();
  const [create, setCreate] = useState<Kind | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const allowed = access(actor, workspaceId);
  const ws = getWorkspace(workspaceId);
  const rows = all.filter((r) => r.workspaceId === workspaceId);
  useEffect(() => {
    if (allowed && activeWorkspace !== workspaceId) setActiveWorkspace(workspaceId);
  }, [allowed, workspaceId]);
  useEffect(() => {
    setSelected(recordId ?? null);
    setCreate(null);
  }, [workspaceId, module, recordId]);
  if (error)
    return (
      <div role="alert" className="rounded-xl border bg-card p-6">
        <h1 className="text-xl font-semibold">
          {t("Unable to load workspace data", "تعذر تحميل بيانات المساحة")}
        </h1>
        <p className="my-3 text-sm">{error}</p>
        <Button onClick={reload}>{t("Retry", "إعادة المحاولة")}</Button>
      </div>
    );
  if (!ready)
    return (
      <div className="animate-pulse rounded-xl bg-muted p-10" role="status">
        {t("Loading your workspace…", "جارٍ تحميل مساحة العمل…")}
      </div>
    );
  if (!allowed || (module === "management" && !executive(actor)))
    return (
      <div className="rounded-xl border bg-card p-6">
        <h1 className="text-xl font-semibold">{t("Permission denied", "الوصول غير مسموح")}</h1>
        <p className="my-3 text-sm text-muted-foreground">
          {t(
            "Your role does not grant access to this workspace or management view.",
            "دورك لا يمنحك صلاحية الوصول إلى هذه المساحة أو عرض الإدارة.",
          )}
        </p>
        <Button asChild>
          <Link to="/workspace">{t("Open my workspace", "فتح مساحتي")}</Link>
        </Button>
      </div>
    );
  if (!validModules(workspaceId).includes(module as Module))
    return (
      <div className="rounded-xl border p-6">
        <h1>{t("Page not available in this workspace", "الصفحة غير متاحة في هذه المساحة")}</h1>
        <Button asChild>
          <Link to={modulePath(workspaceId, "home") as never}>
            {t("Workspace home", "رئيسية المساحة")}
          </Link>
        </Button>
      </div>
    );
  const kind = kinds.includes(module as Kind)
    ? (module as Kind)
    : module === "collections"
      ? "bill"
      : module === "portfolio"
        ? "project"
        : null;
  const quick = kind ?? defaultKind[workspaceId];
  const title =
    module === "dashboard"
      ? ([`${ws.title} Dashboard`, `لوحة ${ws.titleAr}`] as [string, string])
      : module === "home"
        ? homeTitles[workspaceId]
        : moduleTitle(module);
  const open = (id: string) => setSelected(id);
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  if (selected) {
    return (
      <RecordDetail
        key={selected}
        recordId={selected}
        onClose={() => {
          setSelected(null);
          if (recordId) void navigate({ to: modulePath(workspaceId, module as Module) } as never);
        }}
      />
    );
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
            {t(ws.title, ws.titleAr)} · {t("Workspace", "مساحة العمل")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t(...title)}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {t(ws.purpose, ws.purposeAr)}
          </p>
        </div>
        {permission(actor, workspaceId, "create") && (
          <Button onClick={() => setCreate(quick)}>
            <Plus className="size-4" />
            {t("Create", "إنشاء")} {t(...titles[quick])}
          </Button>
        )}
      </header>
      {module === "dashboard" ? (
        <WorkspaceDashboard rows={rows} workspaceId={workspaceId} onOpen={open} />
      ) : module === "home" ? (
        <Home rows={rows} workspaceId={workspaceId} onOpen={open} />
      ) : module === "management" ? (
        <Management rows={all} onOpen={open} />
      ) : module === "my-work" ? (
        <>
          <DailyBrief
            rows={all.filter((r) => r.ownerId === actor.id || r.collaborators.includes(actor.id))}
          />
          <WorkTable
            key={`personal:${actor.id}`}
            rows={all.filter((r) => r.ownerId === actor.id || r.collaborators.includes(actor.id))}
            workspaceId={workspaceId}
            module={module}
            onOpen={open}
          />
        </>
      ) : module === "calendar" ? (
        <WorkCalendar rows={rows} onOpen={open} />
      ) : module === "reports" ? (
        <Reports rows={rows} />
      ) : module === "workload" ? (
        <Workload rows={rows} />
      ) : module === "automations" ? (
        <AutomationCenter workspaceId={workspaceId} />
      ) : module === "people" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {users
            .filter((u) => personVisible(actor, u, workspaceId))
            .map((u) => (
              <article key={u.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">
                      {u.name}
                      {u.id === actor.id && ` · ${t("you", "أنت")}`}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {u.department} · {u.role} · {t(...levelTitle(level(u)))}
                    </p>
                    {u.managerId && (
                      <p className="text-xs text-muted-foreground">
                        {t("Reports to", "يتبع")} {name(u.managerId)}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-4 text-sm">
                  {rows.filter((r) => r.ownerId === u.id && !closed(r)).length}{" "}
                  {t("open actions", "إجراءات مفتوحة")}
                </p>
              </article>
            ))}
        </div>
      ) : module === "notifications" ? (
        <div className="divide-y rounded-xl border bg-card">
          {state.notifications
            .filter(
              (n) =>
                n.workspaceId === workspaceId &&
                n.userId === actor.id &&
                rows.some((r) => r.id === n.recordId),
            )
            .map((n) => (
              <button
                key={n.id}
                className="flex w-full justify-between gap-4 p-4 text-start"
                onClick={() => {
                  transact((s) => {
                    const x = s.notifications.find((x) => x.id === n.id);
                    if (x) x.read = true;
                  });
                  open(n.recordId);
                }}
              >
                <span className={n.read ? "text-muted-foreground" : "font-semibold"}>
                  {n.title}
                  <small className="mt-1 block font-normal text-muted-foreground">
                    {new Date(n.at).toLocaleString()}
                  </small>
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </button>
            ))}
          {!state.notifications.some(
            (n) => n.workspaceId === workspaceId && n.userId === actor.id,
          ) && (
            <p className="p-8 text-sm text-muted-foreground">
              {t(
                "You’re up to date. New assignments, mentions and reminders will appear here.",
                "أنت على اطلاع. ستظهر هنا التكليفات والإشارات والتذكيرات الجديدة.",
              )}
            </p>
          )}
        </div>
      ) : module === "activity" ? (
        <Activity workspaceId={workspaceId} onOpen={open} />
      ) : (
        <WorkTable
          key={`${workspaceId}:${module}:${actor.id}`}
          rows={
            kind
              ? rows.filter((r) => r.kind === kind && (module !== "collections" || !closed(r)))
              : rows.filter((r) => overdue(r))
          }
          workspaceId={workspaceId}
          module={module}
          onOpen={open}
        />
      )}
      {create && (
        <RecordForm
          kind={create}
          workspaceId={workspaceId}
          onClose={() => setCreate(null)}
          onSaved={(r) => setSelected(r.id)}
        />
      )}
    </div>
  );
}

function DailyBrief({ rows }: { rows: WorkRecord[] }) {
  const { actor } = useHub();
  const { t } = useLang();
  const open = rows.filter(
    (r) => !closed(r) && !["employee", "client", "file", "payment"].includes(r.kind),
  );
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {t("Your daily brief", "ملخصك اليومي")} · {actor.name}
        </h2>
        <span className="text-sm text-muted-foreground">{today()}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <span>
          {open.filter((r) => r.dueDate === today()).length} {t("due today", "مستحقة اليوم")}
        </span>
        <span className="text-destructive">
          {open.filter((r) => overdue(r)).length} {t("overdue", "متأخرة")}
        </span>
        <span>
          {open.filter((r) => r.kind === "meeting" && r.dueDate === today()).length}{" "}
          {t("meetings today", "اجتماعات اليوم")}
        </span>
        <span>
          {open.filter((r) => r.kind === "decision").length}{" "}
          {t("decisions required", "قرارات مطلوبة")}
        </span>
      </div>
      <details className="mt-4 border-t pt-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          {t("End-of-day summary & tomorrow", "ملخص نهاية اليوم والغد")}
        </summary>
        <p className="mt-2">
          {rows.filter((r) => r.completedAt.startsWith(today())).length}{" "}
          {t("completed today", "مكتملة اليوم")} ·{" "}
          {open.filter((r) => r.status === "Blocked").length} {t("blocked", "معطلة")} ·{" "}
          {open.filter((r) => r.dueDate === dayOffset(today(), 1)).length}{" "}
          {t("due tomorrow", "مستحقة غداً")}
        </p>
        {open
          .filter((r) => r.dueDate <= dayOffset(today(), 1))
          .slice(0, 8)
          .map((r) => (
            <p key={r.id} className="mt-2">
              {r.title} · {r.dueDate}
            </p>
          ))}
      </details>
    </section>
  );
}
function Home({
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
  // `rows` is already scoped by the workspace hierarchy: leads see the whole
  // workspace, supervisors their reports, members only their own records.
  const focused = rows;
  const work = focused.filter((r) => !["employee", "client", "file", "payment"].includes(r.kind));
  const attention = [...work]
    .filter((r) => !closed(r))
    .sort((a, b) => attentionScore(b) - attentionScore(a));
  const stats = [
    {
      label: t("Overdue actions", "الإجراءات المتأخرة"),
      value: work.filter((r) => overdue(r)).length,
      icon: AlertTriangle,
      color: "text-destructive",
    },
    {
      label: t("Due today", "مستحقة اليوم"),
      value: work.filter((r) => !closed(r) && r.dueDate === today()).length,
      icon: Clock3,
      color: "text-primary",
    },
    {
      label: t("Blocked / intervention", "معطل أو يحتاج تدخلاً"),
      value: work.filter(
        (r) =>
          !closed(r) && (r.status === "Blocked" || r.kind === "blocker" || r.kind === "decision"),
      ).length,
      icon: AlertTriangle,
      color: "text-orange-500",
    },
    {
      label: t("Completed today", "مكتملة اليوم"),
      value: work.filter((r) => r.completedAt.startsWith(today())).length,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
  ];
  return (
    <>
      <DailyBrief rows={focused} />
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <article
            key={s.label}
            className="flex items-center justify-between rounded-xl border bg-card p-4"
          >
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`mt-2 text-3xl font-semibold ${s.color}`}>{s.value}</p>
            </div>
            <s.icon className={`size-5 ${s.color}`} />
          </article>
        ))}
      </section>
      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">{t("Needs your attention", "يحتاج انتباهك")}</h2>
          <span className="text-xs text-muted-foreground">
            {t("Deadline · impact · dependency", "الموعد · الأثر · الاعتماد")}
          </span>
        </div>
        {attention.slice(0, 10).map((r) => (
          <button
            key={r.id}
            className="grid w-full gap-2 border-b p-4 text-start transition-colors last:border-0 hover:bg-muted/40 sm:grid-cols-[1fr_160px_110px]"
            onClick={() => onOpen(r.id)}
          >
            <span>
              <span className="font-medium">{r.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {r.nextAction || t("Confirm the next action", "حدد الخطوة التالية")}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              {users.find((u) => u.id === r.ownerId)?.name}
              <span className="mt-1 block">{r.status}</span>
            </span>
            <span
              className={`text-xs ${overdue(r) ? "text-destructive" : "text-muted-foreground"}`}
            >
              {r.dueDate}
              <ArrowRight className="mt-2 size-4" />
            </span>
          </button>
        ))}
        {attention.length === 0 && (
          <p className="p-8 text-muted-foreground">
            {t(
              "No urgent actions. Plan the next piece of work using Create.",
              "لا توجد إجراءات عاجلة. خطط للعمل التالي باستخدام إنشاء.",
            )}
          </p>
        )}
      </section>
      {workspaceId === "finance" && (
        <CurrencySummary rows={focused.filter((r) => r.kind === "bill")} />
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">{t("Upcoming meetings", "الاجتماعات القادمة")}</h2>
          {focused
            .filter(
              (r) =>
                ["meeting", "interview"].includes(r.kind) && r.dueDate >= today() && !closed(r),
            )
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .slice(0, 5)
            .map((r) => (
              <button
                key={r.id}
                className="flex w-full justify-between gap-4 border-b py-3 text-start text-sm"
                onClick={() => onOpen(r.id)}
              >
                <span>{r.title}</span>
                <span className="text-xs text-muted-foreground">
                  {r.dueDate} {r.details["startTime"]}
                </span>
              </button>
            ))}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">{t("Keep work moving", "حرّك العمل للأمام")}</h2>
          {(workspaceId === "sales"
            ? ["action", "client", "quotation"]
            : workspaceId === "finance"
              ? ["collections", "bill", "payment"]
              : workspaceId === "hr"
                ? ["onboarding", "interview", "people-action"]
                : ["project", "decision", "blocker", "request"]
          ).map((m) => (
            <Link
              key={m}
              to={modulePath(workspaceId, m as Module) as never}
              className="flex justify-between border-b py-3 text-sm"
            >
              <span>{t(...moduleTitle(m))}</span>
              <ArrowRight className="size-4" />
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
function CurrencySummary({ rows }: { rows: WorkRecord[] }) {
  const { t } = useLang();
  const currencies = Array.from(new Set(rows.map((r) => r.details["currency"] ?? "SAR")));
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="mb-3 font-semibold">
        {t("Collection exposure by currency", "التحصيلات حسب العملة")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {currencies.map((c) => {
          const bills = rows.filter((r) => r.details["currency"] === c && r.status !== "Cancelled");
          return (
            <div key={c}>
              <p className="text-xs text-muted-foreground">{c}</p>
              <p className="text-xl font-semibold">
                {bills
                  .reduce(
                    (n, r) => n + Number(r.details["amount"] ?? 0) - Number(r.details["paid"] ?? 0),
                    0,
                  )
                  .toLocaleString()}
              </p>
              <p className="text-xs text-destructive">
                {t("Overdue", "متأخر")}:{" "}
                {bills
                  .filter((r) => overdue(r))
                  .reduce(
                    (n, r) => n + Number(r.details["amount"] ?? 0) - Number(r.details["paid"] ?? 0),
                    0,
                  )
                  .toLocaleString()}{" "}
                {c}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function Reports({ rows }: { rows: WorkRecord[] }) {
  const { t } = useLang();
  const [range, setRange] = useState("30");
  const [start, setStart] = useState(dayOffset(today(), -30));
  const [end, setEnd] = useState(today());
  const from = range === "custom" ? start : dayOffset(today(), -Number(range));
  const filtered = rows.filter(
    (r) => r.createdAt.slice(0, 10) >= from && r.createdAt.slice(0, 10) <= end,
  );
  const distribution = Array.from(new Set(filtered.map((r) => r.kind))).map((kind) => ({
    kind,
    items: filtered.filter((r) => r.kind === kind),
  }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {[
          ["0", "Today"],
          ["7", "7 Days"],
          ["30", "30 Days"],
          ["90", "90 Days"],
          ["custom", "Custom"],
        ].map(([v, label]) => (
          <Button
            key={v}
            variant={range === v ? "secondary" : "outline"}
            onClick={() => setRange(v ?? "30")}
          >
            {label}
          </Button>
        ))}
        {range === "custom" && (
          <>
            <Input
              aria-label="Report start date"
              type="date"
              className="w-40"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <Input
              aria-label="Report end date"
              type="date"
              className="w-40"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {t(
          "Report cohort: records created in the selected period. Current state is shown; historical trends require recorded history.",
          "تشمل النتائج السجلات المنشأة في الفترة المحددة. يعرض التقرير الحالة الحالية؛ الاتجاهات التاريخية تحتاج إلى سجل فعلي.",
        )}
      </p>
      {filtered.some((r) => r.kind === "bill") && (
        <>
          <CurrencySummary rows={filtered.filter((r) => r.kind === "bill")} />
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 font-semibold">
              {t("Finance aging by currency", "أعمار المديونية حسب العملة")}
            </h2>
            {Array.from(
              new Set(filtered.filter((r) => r.kind === "bill").map((r) => r.details["currency"])),
            ).map((c) => (
              <div key={c} className="border-b py-3">
                <h3>{c}</h3>
                <div className="mt-2 flex flex-wrap gap-6 text-sm">
                  {[
                    [0, 0, "Current"],
                    [1, 30, "1–30"],
                    [31, 60, "31–60"],
                    [61, 90, "61–90"],
                    [91, 99999, "90+"],
                  ].map(([lo, hi, label]) => (
                    <span key={label}>
                      {label}:{" "}
                      {filtered
                        .filter(
                          (r) => r.kind === "bill" && r.details["currency"] === c && !closed(r),
                        )
                        .filter((r) => {
                          const age = Math.max(
                            0,
                            Math.floor((Date.parse(today()) - Date.parse(r.dueDate)) / 86400000),
                          );
                          return age >= Number(lo) && age <= Number(hi);
                        })
                        .reduce(
                          (n, r) =>
                            n + Number(r.details["amount"]) - Number(r.details["paid"] ?? 0),
                          0,
                        )
                        .toLocaleString()}{" "}
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </>
      )}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {["Workflow", "Total", "Completed", "Overdue", "Blocked", "On-time completions"].map(
                (h) => (
                  <th key={h} className="p-3 text-start">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {distribution.map(({ kind, items }) => (
              <tr key={kind} className="border-t">
                <td className="p-3 font-medium">{t(...titles[kind])}</td>
                <td className="p-3">{items.length}</td>
                <td className="p-3">{items.filter(closed).length}</td>
                <td className="p-3">{items.filter((r) => overdue(r)).length}</td>
                <td className="p-3">{items.filter((r) => r.status === "Blocked").length}</td>
                <td className="p-3">
                  {
                    items.filter((r) => r.completedAt && r.completedAt.slice(0, 10) <= r.dueDate)
                      .length
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Workload rows={filtered} />
    </div>
  );
}
function Management({ rows, onOpen }: { rows: WorkRecord[]; onOpen: (id: string) => void }) {
  const { t } = useLang();
  return (
    <div className="space-y-5">
      {WORKSPACES.map((w) => {
        const exceptions = rows.filter(
          (r) =>
            r.workspaceId === w.id &&
            !closed(r) &&
            (overdue(r) ||
              r.status === "Blocked" ||
              r.kind === "decision" ||
              r.status === "Escalated"),
        );
        return (
          <section key={w.id} className="rounded-xl border bg-card p-5">
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold">{t(w.title, w.titleAr)}</h2>
              <span className="text-sm text-muted-foreground">
                {exceptions.length} {t("interventions", "حالات تدخل")}
              </span>
            </div>
            {exceptions
              .sort((a, b) => attentionScore(b) - attentionScore(a))
              .slice(0, 5)
              .map((r) => (
                <button
                  key={r.id}
                  onClick={() => onOpen(r.id)}
                  className="flex w-full justify-between gap-3 border-b py-3 text-start text-sm"
                >
                  <span>
                    {r.title}
                    <small className="mt-1 block text-muted-foreground">{r.nextAction}</small>
                  </span>
                  <span className="text-destructive">
                    {r.status} · {r.dueDate}
                  </span>
                </button>
              ))}
            {!exceptions.length && (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("No intervention required.", "لا توجد حالات تستدعي التدخل.")}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
function Activity({
  workspaceId,
  onOpen,
}: {
  workspaceId: WorkspaceId;
  onOpen: (id: string) => void;
}) {
  const { state, users, actor } = useHub();
  const rows = useRecords();
  const { t } = useLang();
  const [query, setQuery] = useState("");
  return (
    <div className="space-y-3">
      <Input
        placeholder={t(
          "Filter by person, action, record or date…",
          "بحث بالشخص أو الإجراء أو السجل أو التاريخ…",
        )}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {state.audit
        .filter(
          (a) =>
            a.workspaceId === workspaceId &&
            (executive(actor) || rows.some((r) => r.id === a.recordId)) &&
            `${a.action} ${a.recordId} ${a.at} ${users.find((u) => u.id === a.actorId)?.name}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .slice(0, 200)
        .map((a) => (
          <button
            className="flex w-full justify-between gap-4 rounded-lg border bg-card p-4 text-start text-sm"
            key={a.id}
            onClick={() => onOpen(a.recordId)}
          >
            <span>
              {users.find((u) => u.id === a.actorId)?.name ?? a.actorId} · {a.action}
              <small className="block text-muted-foreground">
                {state.records.find((r) => r.id === a.recordId)?.title ?? a.recordId}
              </small>
            </span>
            <span className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString()}</span>
          </button>
        ))}
    </div>
  );
}
