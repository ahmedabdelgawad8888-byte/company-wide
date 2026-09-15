import { useState } from "react";
import { guide } from "./hr-workspace";
import { closed, overdue, today, type WorkRecord } from "./model";
import { useHub } from "./provider";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
export function HRReports({ rows, onOpen }: { rows: WorkRecord[]; onOpen: (id: string) => void }) {
  const { state } = useHub();
  const [from, setFrom] = useState(today().slice(0, 8) + "01");
  const [to, setTo] = useState(
    today().slice(0, 8) +
      String(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()),
  );
  const tasks = rows.filter((r) => r.kind === "hr-task" && r.dueDate >= from && r.dueDate <= to);
  const evidence = (r: WorkRecord) =>
    !!r.details["evidenceLink"] || state.attachments.some((a) => a.recordId === r.id);
  const categories = [...new Set(guide.tasks.map((t) => t.category))];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <label className="grid gap-1 text-sm">
          Due from
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          Due through
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      {from > to && <p role="alert">End date must be on or after start date.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Tasks due", tasks.length],
          ["Completed", tasks.filter(closed).length],
          ["Overdue", tasks.filter((r) => overdue(r)).length],
          ["Pending approval", tasks.filter((r) => r.status === "Pending Approval").length],
        ].map(([label, n]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{n}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <caption className="p-4 text-start font-semibold">Execution by HR category</caption>
          <thead>
            <tr>
              {["Category", "Due", "Completed", "Overdue", "Pending approval", "With evidence"].map(
                (h) => (
                  <th key={h} className="p-3 text-start">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => {
              const group = tasks.filter((r) => r.details["category"] === c);
              return (
                <tr key={c} className="border-t">
                  <th className="p-3 text-start font-medium">{c}</th>
                  {[
                    group.length,
                    group.filter(closed).length,
                    group.filter((r) => overdue(r)).length,
                    group.filter((r) => r.status === "Pending Approval").length,
                    group.filter(evidence).length,
                  ].map((n, i) => (
                    <td key={i} className="p-3">
                      {n}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Needs follow-up</h2>
        {tasks
          .filter((r) => overdue(r) || r.status === "Pending Approval")
          .map((r) => (
            <Button
              key={r.id}
              variant="ghost"
              className="h-auto w-full justify-start whitespace-normal text-start"
              onClick={() => onOpen(r.id)}
            >
              {r.title} · {r.dueDate} · {r.status}
            </Button>
          ))}
        {!tasks.some((r) => overdue(r) || r.status === "Pending Approval") && (
          <p className="text-sm text-muted-foreground">
            No overdue tasks or pending approvals in this period.
          </p>
        )}
      </section>
    </div>
  );
}

export function HREvidence({ rows, onOpen }: { rows: WorkRecord[]; onOpen: (id: string) => void }) {
  const { state } = useHub();
  const tasks = rows.filter((r) => r.kind === "hr-task");
  const items = tasks.filter(
    (r) => r.details["evidenceLink"] || state.attachments.some((a) => a.recordId === r.id),
  );
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Task evidence</h2>
      {items.length === 0 && (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          Evidence added to HR tasks will appear here.
        </p>
      )}
      {items.map((r) => (
        <article key={r.id} className="rounded-xl border bg-card p-4">
          <Button
            variant="link"
            className="h-auto p-0 text-start whitespace-normal"
            onClick={() => onOpen(r.id)}
          >
            {r.title}
          </Button>
          <p className="mt-2 text-sm">{r.details["evidenceLink"]}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {state.attachments
              .filter((a) => a.recordId === r.id)
              .map((a) => (
                <a className="text-sm underline" key={a.id} href={a.data} download={a.name}>
                  {a.name} · v{a.version}
                </a>
              ))}
          </div>
        </article>
      ))}
    </section>
  );
}
