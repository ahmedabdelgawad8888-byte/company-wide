import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { DataTable, type Column } from "../../components/data-table";
import { useLang } from "../../lib/i18n";
import type { WorkspaceId } from "../../lib/workspace-hub";
import { useHub } from "./provider";
import { id, manager, supervisor, permission, updateRecord } from "./service";
import { closed, dayOffset, overdue, statuses, today, titles, type WorkRecord } from "./model";
import { control } from "./record-form";

export function WorkTable({
  rows,
  workspaceId,
  module,
  onOpen,
}: {
  rows: WorkRecord[];
  workspaceId: WorkspaceId;
  module: string;
  onOpen: (id: string) => void;
}) {
  const { state, actor, users, transact } = useHub();
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState("");
  const [status, setStatus] = useState("all");
  // Leads and supervisors open on their full scope; members open on their own work.
  const [owner, setOwner] = useState(supervisor(actor) ? "all" : actor.id);
  const [view, setView] = useState("Table");
  const [savedName, setSavedName] = useState("");
  const [saving, setSaving] = useState(false);
  const filtered = rows.filter(
    (r) =>
      (!category || r.details["category"] === category) &&
      (!frequency || r.details["frequency"] === frequency) &&
      (status === "all" || status === "overdue"
        ? status === "all" || overdue(r)
        : r.status === status) &&
      (owner === "all" || r.ownerId === owner || r.collaborators.includes(owner)) &&
      `${r.id} ${r.title} ${r.nextAction} ${Object.values(r.details).join(" ")} ${users.find((u) => u.id === r.ownerId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const change = (r: WorkRecord, nextStatus: string) => {
    try {
      transact((s) => updateRecord(s, actor, r.id, { ...r, status: nextStatus }, users));
      toast.success(t("Status updated", "تم تحديث الحالة"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };
  const columns: Column<WorkRecord>[] = [
    {
      key: "title",
      header: t("Work / record", "العمل أو السجل"),
      sortValue: (r) => r.title,
      render: (r) => (
        <button
          className="max-w-[340px] text-start font-medium text-foreground hover:text-primary"
          onClick={() => onOpen(r.id)}
        >
          <span className="block">{r.title}</span>
          <span className="text-[10px] font-normal text-muted-foreground">
            {t(...titles[r.kind])} · {r.id.slice(0, 16)}
          </span>
        </button>
      ),
    },
    {
      key: "owner",
      header: t("Owner", "المسؤول"),
      sortValue: (r) => users.find((u) => u.id === r.ownerId)?.name ?? "",
      render: (r) => users.find((u) => u.id === r.ownerId)?.name ?? r.ownerId,
    },
    {
      key: "status",
      header: t("Status", "الحالة"),
      sortValue: (r) => r.status,
      render: (r) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${closed(r) ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : r.status === "Blocked" || overdue(r) ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "priority",
      header: t("Priority", "الأولوية"),
      sortValue: (r) => r.priority,
      render: (r) =>
        r.kind === "hr-task" ? r.details["sourcePriority"] || r.priority : r.priority,
    },
    {
      key: "dueDate",
      header: t("Due date", "الموعد"),
      sortValue: (r) => r.dueDate,
      render: (r) => (
        <span className={overdue(r) ? "text-destructive" : ""}>
          {r.dueDate}
          {overdue(r) && (
            <span className="block text-[10px]">
              {Math.ceil((Date.parse(today()) - Date.parse(r.dueDate)) / 86400000)}{" "}
              {t("days overdue", "أيام تأخير")}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "nextAction",
      header: t("Next action", "الخطوة التالية"),
      sortValue: (r) => r.nextAction,
      render: (r) => (
        <span className="block max-w-[300px] whitespace-normal text-muted-foreground">
          {r.nextAction || "—"}
        </span>
      ),
    },
  ];
  if (workspaceId === "hr" && rows.some((r) => r.kind === "hr-task"))
    columns.splice(
      1,
      0,
      ...["category", "frequency"].map((key) => ({
        key,
        header: key === "category" ? "Category" : "Frequency",
        render: (r: WorkRecord) => r.details[key] || "—",
      })),
    );
  if (rows.some((r) => r.kind === "bill" || r.kind === "payment"))
    columns.splice(3, 0, {
      key: "amount",
      header: t("Amount / currency", "المبلغ والعملة"),
      sortValue: (r) => Number(r.details["amount"] ?? 0),
      render: (r) => (
        <span className="whitespace-nowrap font-medium">
          {(
            Number(r.details["amount"] ?? 0) -
            (r.kind === "bill" ? Number(r.details["paid"] ?? 0) : 0)
          ).toLocaleString()}{" "}
          {r.details["currency"]}
        </span>
      ),
    });
  if (module === "collections")
    columns.push(
      {
        key: "promiseDate",
        header: t("Promise to pay", "وعد السداد"),
        sortValue: (r) => r.details["promiseDate"] ?? "",
        render: (r) => r.details["promiseDate"] || "—",
      },
      {
        key: "lastContact",
        header: t("Last contact", "آخر تواصل"),
        sortValue: (r) => r.details["lastContact"] ?? "",
        render: (r) => r.details["lastContact"] || "—",
      },
    );
  const save = () => {
    if (!savedName.trim()) return;
    try {
      transact((s) =>
        s.views.push({
          id: id("VIEW"),
          workspaceId,
          userId: actor.id,
          module,
          name: savedName.trim(),
          query,
          category,
          frequency,
          status,
          owner,
          view,
        }),
      );
      setSaving(false);
      setSavedName("");
      toast.success("View saved");
    } catch (e) {
      toast.error(String(e));
    }
  };
  const options = Array.from(new Set(rows.map((r) => r.status)));
  const advanced = ["task", "hr-task", "project", "portfolio", "my-work"].includes(module);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label={t("Search work", "بحث في العمل")}
          className="w-full sm:w-64"
          placeholder={t("Search names, IDs, clients…", "ابحث بالأسماء أو الأرقام أو العملاء…")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {workspaceId === "hr" && module === "hr-task" && (
          <>
            <select
              aria-label="Task category"
              className={control + " !w-auto max-w-full"}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {[...new Set(rows.map((r) => r.details["category"]).filter(Boolean))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Task frequency"
              className={control + " !w-auto max-w-full"}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="">All frequencies</option>
              {[...new Set(rows.map((r) => r.details["frequency"]).filter(Boolean))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </>
        )}
        <select
          aria-label="Status filter"
          className={control + " !w-auto"}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">{t("All statuses", "كل الحالات")}</option>
          <option value="overdue">{t("Overdue", "المتأخرات")}</option>
          {options.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Owner filter"
          className={control + " !w-auto"}
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        >
          <option value="all">{t("Team work", "عمل الفريق")}</option>
          <option value={actor.id}>{t("My work", "عملي")}</option>
          {users
            .filter((u) => u.id !== actor.id && rows.some((r) => r.ownerId === u.id))
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </select>
        <Button variant="outline" onClick={() => setSaving((v) => !v)}>
          {t("Save view", "حفظ العرض")}
        </Button>
        {(query || category || frequency || status !== "all" || owner !== "all") && (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setCategory("");
              setFrequency("");
              setStatus("all");
              setOwner("all");
            }}
          >
            {t("Clear filters", "مسح الفلاتر")}
          </Button>
        )}
      </div>
      {saving && (
        <div className="flex gap-2">
          <Input
            aria-label="Saved view name"
            placeholder={t("View name", "اسم العرض")}
            value={savedName}
            onChange={(e) => setSavedName(e.target.value)}
          />
          <Button onClick={save}>{t("Save", "حفظ")}</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {state.views
          .filter(
            (v) => v.userId === actor.id && v.workspaceId === workspaceId && v.module === module,
          )
          .map((v) => (
            <div key={v.id} className="flex rounded-lg border">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQuery(v.query);
                  setCategory(v.category ?? "");
                  setFrequency(v.frequency ?? "");
                  setStatus(v.status);
                  setOwner(v.owner);
                  setView(v.view);
                }}
              >
                {v.name}
              </Button>
              <button
                aria-label={`Remove ${v.name}`}
                className="px-2 text-muted-foreground"
                onClick={() =>
                  transact((s) => {
                    s.views = s.views.filter((x) => x.id !== v.id);
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
      </div>
      {advanced && (
        <div className="flex flex-wrap gap-1 border-b pb-2">
          {[
            "Table",
            "List",
            "Kanban",
            "Timeline",
            "Calendar",
            "Workload",
            ...(module === "project" || module === "portfolio" ? ["Portfolio"] : []),
          ].map((v) => (
            <Button
              size="sm"
              variant={view === v ? "secondary" : "ghost"}
              key={v}
              onClick={() => setView(v)}
            >
              {v}
            </Button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <h3 className="font-semibold">
            {t("No work matches this view", "لا توجد أعمال تطابق هذا العرض")}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "Clear filters to see all permitted work, or use Create to add the next action.",
              "امسح الفلاتر لعرض العمل المتاح، أو استخدم إنشاء لإضافة الإجراء التالي.",
            )}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              setOwner("all");
              setCategory("");
              setFrequency("");
              setQuery("");
              setStatus("all");
            }}
          >
            {t("Show all work", "عرض كل العمل")}
          </Button>
        </div>
      ) : view === "Kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {options.map((s) => (
            <section key={s} className="w-72 shrink-0 rounded-xl bg-muted/40 p-3">
              <h3 className="mb-3 flex justify-between text-sm font-semibold">
                {s}
                <span>{filtered.filter((r) => r.status === s).length}</span>
              </h3>
              {filtered
                .filter((r) => r.status === s)
                .map((r) => (
                  <article
                    key={r.id}
                    className="mb-3 space-y-3 rounded-lg border bg-card p-3 shadow-sm"
                  >
                    <button className="text-start text-sm font-medium" onClick={() => onOpen(r.id)}>
                      {r.title}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {users.find((u) => u.id === r.ownerId)?.name} · {r.dueDate}
                    </p>
                    {permission(actor, r.workspaceId, "edit", r) && (
                      <select
                        aria-label={`Move ${r.title}`}
                        className={control}
                        value={r.status}
                        onChange={(e) => change(r, e.target.value)}
                      >
                        {statuses[r.kind].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </article>
                ))}
            </section>
          ))}
        </div>
      ) : view === "Calendar" ? (
        <WorkCalendar rows={filtered} onOpen={onOpen} />
      ) : view === "Workload" ? (
        <Workload rows={filtered} />
      ) : view === "Timeline" ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="min-w-[800px] p-4">
            <p className="mb-4 text-xs text-muted-foreground">
              {t(
                "Schedule spans each record’s start and due date",
                "الجدول يعرض بداية ونهاية كل سجل",
              )}
            </p>
            {filtered.map((r) => {
              const min = Math.min(...filtered.map((x) => Date.parse(x.startDate)));
              const max = Math.max(...filtered.map((x) => Date.parse(x.dueDate)));
              const range = Math.max(86400000, max - min);
              return (
                <button
                  key={r.id}
                  className="grid w-full grid-cols-[230px_1fr] items-center gap-4 border-b py-3 text-start text-sm"
                  onClick={() => onOpen(r.id)}
                >
                  <span>
                    {r.title}
                    <small className="block text-muted-foreground">
                      {r.startDate} → {r.dueDate}
                    </small>
                  </span>
                  <span className="relative block h-6 rounded bg-muted">
                    <span
                      className="absolute block h-6 rounded bg-primary/65"
                      style={{
                        insetInlineStart: `${((Date.parse(r.startDate) - min) / range) * 85}%`,
                        width: `${Math.max(3, ((Date.parse(r.dueDate) - Date.parse(r.startDate)) / range) * 85)}%`,
                      }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : view === "List" || view === "Portfolio" ? (
        <div
          className={
            view === "Portfolio"
              ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "divide-y rounded-xl border bg-card"
          }
        >
          {filtered.map((r) => (
            <button
              key={r.id}
              className={`p-4 text-start hover:bg-muted/30 ${view === "Portfolio" ? "rounded-xl border bg-card" : ""}`}
              onClick={() => onOpen(r.id)}
            >
              <div className="flex justify-between gap-3">
                <span className="font-semibold">{r.title}</span>
                <span className="text-xs text-primary">{r.status}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{r.nextAction}</p>
              <p className="mt-3 text-xs">
                {users.find((u) => u.id === r.ownerId)?.name} · {r.dueDate} · {r.progress}%
              </p>
            </button>
          ))}
        </div>
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id}
          onRowClick={(r) => onOpen(r.id)}
          exportName={`${workspaceId}-${module}`}
          selectable={manager(actor)}
          bulkActions={(ids, clear) => (
            <Button
              size="sm"
              onClick={() => {
                try {
                  transact((s) => {
                    for (const rid of ids) {
                      const r = s.records.find((r) => r.id === rid);
                      if (r && statuses[r.kind].includes("Done"))
                        updateRecord(s, actor, r.id, { ...r, status: "Done" }, users);
                      else throw new Error("Bulk completion is available for tasks only.");
                    }
                  });
                  clear();
                  toast.success("Selected tasks completed");
                } catch (e) {
                  toast.error(String(e));
                }
              }}
            >
              {t("Complete selected tasks", "إكمال المهام المحددة")}
            </Button>
          )}
        />
      )}
    </div>
  );
}

export function Workload({ rows }: { rows: WorkRecord[] }) {
  const { users } = useHub();
  const { t } = useLang();
  const open = rows.filter(
    (r) => !closed(r) && !["client", "employee", "file", "payment"].includes(r.kind),
  );
  const groups = users
    .map((u) => ({ u, items: open.filter((r) => r.ownerId === u.id) }))
    .filter((g) => g.items.length);
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold">
        {t("Open work and capacity risk", "العمل المفتوح ومخاطر القدرة الاستيعابية")}
      </h2>
      <p className="mt-1 mb-4 text-xs text-muted-foreground">
        {t(
          "Volume is context, not a performance score. Review deadlines, blockers and business impact with the owner.",
          "العدد يوفر سياقاً وليس تقييماً للأداء. راجع المواعيد والمعوقات والأثر مع المسؤول.",
        )}
      </p>
      {groups.map(({ u, items }) => (
        <div className="grid gap-2 border-b py-3 sm:grid-cols-[180px_1fr_240px]" key={u.id}>
          <span className="text-sm font-medium">{u.name}</span>
          <div className="mt-1 h-3 rounded bg-muted">
            <div
              className="h-full rounded bg-primary/70"
              style={{
                width: `${(items.length / Math.max(...groups.map((g) => g.items.length))) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {items.length} {t("open", "مفتوحة")} · {items.filter((r) => overdue(r)).length}{" "}
            {t("overdue", "متأخرة")} · {items.filter((r) => r.status === "Blocked").length}{" "}
            {t("blocked", "معطلة")}
          </span>
        </div>
      ))}
    </section>
  );
}

export function WorkCalendar({
  rows,
  onOpen,
}: {
  rows: WorkRecord[];
  onOpen: (id: string) => void;
}) {
  const { t } = useLang();
  const [date, setDate] = useState(today());
  const [mode, setMode] = useState("Month");
  const base = new Date(`${date}T12:00:00`);
  const first =
    mode === "Month"
      ? `${date.slice(0, 7)}-01`
      : mode === "Week"
        ? dayOffset(date, -base.getDay())
        : date;
  const days =
    mode === "Month"
      ? new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
      : mode === "Week"
        ? 7
        : 1;
  const dates = Array.from({ length: days }, (_, i) => dayOffset(first, i));
  const relevant = rows.filter(
    (r) => !["client", "employee", "file", "payment"].includes(r.kind) && !r.archived,
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() =>
            setDate(dayOffset(date, mode === "Month" ? -30 : mode === "Week" ? -7 : -1))
          }
        >
          ←
        </Button>
        <Input
          aria-label="Calendar date"
          type="date"
          className="w-40"
          value={date}
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
          }}
        />
        <Button
          variant="outline"
          onClick={() => setDate(dayOffset(date, mode === "Month" ? 30 : mode === "Week" ? 7 : 1))}
        >
          →
        </Button>
        <Button variant="ghost" onClick={() => setDate(today())}>
          {t("Today", "اليوم")}
        </Button>
        {["Day", "Week", "Month", "Agenda"].map((m) => (
          <Button key={m} variant={m === mode ? "secondary" : "ghost"} onClick={() => setMode(m)}>
            {m}
          </Button>
        ))}
      </div>
      {mode === "Agenda" ? (
        <div className="divide-y rounded-xl border bg-card">
          {[...relevant]
            .filter((r) => r.dueDate >= date)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .map((r) => (
              <button
                className="flex w-full gap-4 p-3 text-start text-sm"
                key={r.id}
                onClick={() => onOpen(r.id)}
              >
                <span className="w-24 shrink-0 text-muted-foreground">{r.dueDate}</span>
                <span>
                  {r.title} <small>{r.details["startTime"]}</small>
                </span>
              </button>
            ))}
        </div>
      ) : (
        <div
          className={`grid gap-px overflow-hidden rounded-xl border bg-border ${mode === "Day" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-7"}`}
        >
          {mode === "Month" &&
            Array.from({ length: new Date(`${first}T12:00:00`).getDay() }, (_, i) => (
              <div key={`blank-${i}`} className="hidden bg-muted/30 sm:block" />
            ))}
          {dates.map((day) => (
            <div
              key={day}
              className={`min-h-32 bg-card p-2 ${day === today() ? "ring-1 ring-inset ring-primary" : ""}`}
            >
              <p className="mb-2 text-xs font-semibold">
                {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                })}
              </p>
              {relevant
                .filter((r) => r.dueDate === day)
                .map((r) => (
                  <button
                    key={r.id}
                    className="mb-1 block w-full rounded bg-primary/10 p-1.5 text-start text-xs text-primary"
                    onClick={() => onOpen(r.id)}
                  >
                    {r.details["startTime"]} {r.title}
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
