import { useState } from "react";
import { toast } from "sonner";
import { guide, hrDraft } from "./hr-workspace";
import { useHub } from "./provider";
import { permission, access } from "./service";
import { today, type WorkRecord } from "./model";
import { RecordForm, control } from "./record-form";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";

export function HRGuide({ onOpen }: { onOpen: (id: string) => void }) {
  const { state, actor, users, transact } = useHub();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState("");
  const [start, setStart] = useState<WorkRecord | null>(null);
  const [editing, setEditing] = useState<WorkRecord | null>(null);
  const admin = permission(actor, "hr", "administer");
  const rows = guide.tasks.filter(
    (t) =>
      (!category || t.category === category) &&
      (!frequency || t.frequency === frequency) &&
      JSON.stringify(t).toLowerCase().includes(query.toLowerCase()),
  );
  const definitions = state.records.filter((r) => r.sourceId === "hr-guide:v1" && !r.archived);
  function save() {
    if (!editing) return;
    try {
      if (!admin) throw new Error("Only the HR workspace lead can configure schedules.");
      if (!users.some((u) => u.id === editing.ownerId && access(u, "hr")))
        throw new Error("Select an active HR owner.");
      if (
        editing.details["enabled"] === "true" &&
        (!editing.details["nextExecution"] || !editing.details["selectedCadence"])
      )
        throw new Error("Select a frequency and first due date before enabling.");
      if (
        editing.details["enabled"] === "true" &&
        (!editing.details["approverId"] || editing.details["approverId"] === editing.ownerId)
      )
        throw new Error("Assign a separate approver before enabling.");
      transact((s) => {
        const r = s.records.find((x) => x.id === editing.id)!;
        const before = JSON.stringify(r);
        Object.assign(r, editing);
        if (r.details["nextExecution"] !== JSON.parse(before).details.nextExecution)
          r.details["anchorDay"] = String(Number(r.details["nextExecution"]?.slice(8)));
        r.updatedAt = new Date().toISOString();
        s.audit.unshift({
          id: crypto.randomUUID(),
          workspaceId: "hr",
          recordId: r.id,
          actorId: actor.id,
          action: "HR schedule configured",
          at: r.updatedAt,
          before,
          after: JSON.stringify(r),
        });
      });
      setEditing(null);
      toast.success("HR schedule saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save");
    }
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Guide tasks", guide.tasks.length],
          ["Categories", new Set(guide.tasks.map((t) => t.category)).size],
          ["Enabled schedules", definitions.filter((r) => r.details["enabled"] === "true").length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4 text-sm space-y-2">
        <p className="font-semibold">{guide.instructions["STATUS FLOW"]}</p>
      </div>
      <details className="rounded-xl border p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          SLA and accountability instructions
        </summary>
        <dl className="mt-3 space-y-2">
          {Object.entries(guide.instructions).map(([k, v]) => (
            <div key={k}>
              <dt className="font-medium">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </details>
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          aria-label="Search HR guide"
          placeholder="Search tasks, SLA, evidence or approver"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="HR category"
          className={control}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {[...new Set(guide.tasks.map((t) => t.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="HR frequency"
          className={control}
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
        >
          <option value="">All frequencies</option>
          {[...new Set(guide.tasks.map((t) => t.frequency))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <p className="text-sm text-muted-foreground">{rows.length} tasks</p>
      <div className="space-y-3">
        {rows.map((task) => {
          const r = definitions.find((r) => r.id === task.id);
          return (
            <section key={task.id} className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{task.category}</p>
                  <h2 className="mt-1 font-semibold">{task.task}</h2>
                </div>
                <span className="text-sm">
                  {task.frequency} · {task.priority}
                </span>
              </div>
              <dl className="my-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Owner roles", task.owner],
                  ["Deadline", task.deadline],
                  ["SLA", task.sla],
                  ["Required evidence", task.evidence],
                  ["Approver", task.approver],
                  ["Guide status", task.sourceStatus],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mb-3 text-sm">
                Accountable owner:{" "}
                {users.find((u) => u.id === r?.ownerId)?.name ?? "Needs assignment"} ·{" "}
                {r?.details["enabled"] === "true"
                  ? `Next: ${r.details["nextExecution"]} (${r.details["selectedCadence"]})`
                  : task.frequency === "As Needed"
                    ? "Start when requested"
                    : "Schedule needs confirmation"}
              </p>
              <div className="flex flex-wrap gap-2">
                {r && permission(actor, "hr", "create") && (
                  <Button
                    size="sm"
                    onClick={() => setStart({ ...r, ownerId: admin ? r.ownerId : actor.id })}
                  >
                    Start task
                  </Button>
                )}
                {r && admin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(structuredClone(r))}
                  >
                    Configure owner & schedule
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {start && (
        <RecordForm
          kind="hr-task"
          workspaceId="hr"
          initialDraft={hrDraft(start)}
          onClose={() => setStart(null)}
          onSaved={(r) => onOpen(r.id)}
        />
      )}
      {editing && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-auto space-y-4">
            <DialogHeader>
              <DialogTitle>{editing.title}</DialogTitle>
              <DialogDescription>
                Confirm ownership, approver and calendar schedule.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm">
              {editing.details["cadence"]} · {editing.details["schedule"]}
            </p>
            <label className="grid gap-1">
              Accountable owner
              <select
                className={control}
                value={editing.ownerId}
                onChange={(e) => setEditing({ ...editing, ownerId: e.target.value })}
              >
                <option value="unassigned">Assign a real team member</option>
                {users
                  .filter((u) => access(u, "hr"))
                  .map((u) => (
                    <option value={u.id} key={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="grid gap-1">
              Assigned approver
              <select
                className={control}
                value={editing.details["approverId"] ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    details: { ...editing.details, approverId: e.target.value },
                  })
                }
              >
                <option value="">Select approver</option>
                {users
                  .filter((u) => access(u, "hr") && u.id !== editing.ownerId)
                  .map((u) => (
                    <option value={u.id} key={u.id}>
                      {u.name} — {u.role}
                    </option>
                  ))}
              </select>
            </label>
            <label className="grid gap-1">
              Calendar frequency
              <select
                className={control}
                value={editing.details["selectedCadence"] ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    details: { ...editing.details, selectedCadence: e.target.value },
                  })
                }
              >
                <option value="">Request-based / select cycle</option>
                {(editing.details["cadence"] ?? "")
                  .split(" / ")
                  .filter((c) =>
                    ["Daily", "Weekly", "Monthly", "Quarterly", "Semi-Annual", "Annual"].includes(
                      c,
                    ),
                  )
                  .map((c) => (
                    <option key={c}>{c}</option>
                  ))}
              </select>
            </label>
            <label className="grid gap-1">
              First / next due date
              <Input
                type="date"
                value={editing.details["nextExecution"] ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    details: { ...editing.details, nextExecution: e.target.value },
                  })
                }
              />
            </label>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={editing.details["enabled"] === "true"}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    details: { ...editing.details, enabled: String(e.target.checked) },
                  })
                }
              />
              Enable recurring execution
            </label>
            <div className="flex gap-2">
              <Button onClick={save}>Save configuration</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
