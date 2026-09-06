import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useLang } from "../../lib/i18n";
import type { WorkspaceId } from "../../lib/workspace-hub";
import { useHub } from "./provider";
import { id, permission, runRule, access } from "./service";
import { workspaceKinds, titles, today, type Rule } from "./model";
import { control, FieldLabel } from "./record-form";
export function AutomationCenter({ workspaceId }: { workspaceId: WorkspaceId }) {
  const { actor, state, users, transact } = useHub();
  const { t } = useLang();
  const [edit, setEdit] = useState<Rule | null>(null);
  const [error, setError] = useState("");
  const admin = permission(actor, workspaceId, "administer");
  const run = (rule: Rule, test: boolean) => {
    try {
      transact((s) => {
        const target = s.rules.find((r) => r.id === rule.id);
        if (target) runRule(s, actor, target, today(), new Date().toTimeString().slice(0, 5), test);
      });
      toast.success(
        test
          ? "Test complete. Review execution history."
          : "Run evaluated. Review execution history.",
      );
    } catch (e) {
      toast.error(String(e));
    }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t(
            "Rules run while the app is open and catch up when reopened. Email and webhook delivery require configuration; no external messages are sent.",
            "تعمل القواعد أثناء فتح التطبيق وتراجع الاستحقاقات عند إعادة فتحه. البريد وWebhooks يحتاجان إلى إعداد؛ لا ترسل رسائل خارجية.",
          )}
        </p>
        {admin && (
          <Button
            onClick={() =>
              setEdit({
                id: id("RULE"),
                workspaceId,
                title: "",
                trigger: "due",
                days: 3,
                hour: "08:00",
                kind: "task",
                action: "notify",
                channel: "in-app",
                ownerId: actor.id,
                enabled: true,
                lastRun: "",
              })
            }
          >
            {t("Create rule", "إنشاء قاعدة")}
          </Button>
        )}
      </div>
      {edit && (
        <form
          className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              if (!admin) throw new Error("Permission denied.");
              if (!edit.title.trim()) throw new Error("Rule title is required.");
              transact((s) => {
                const i = s.rules.findIndex((r) => r.id === edit.id);
                if (i < 0) s.rules.push(edit);
                else s.rules[i] = edit;
              });
              setEdit(null);
              setError("");
              toast.success("Rule saved");
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          <FieldLabel en="Rule" ar="القاعدة">
            <Input
              required
              value={edit.title}
              onChange={(e) => setEdit({ ...edit, title: e.target.value })}
            />
          </FieldLabel>
          <FieldLabel en="WHEN" ar="عندما">
            <select
              className={control}
              value={edit.trigger}
              onChange={(e) => setEdit({ ...edit, trigger: e.target.value as Rule["trigger"] })}
            >
              {["due", "daily", "blocked", "sla"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel en="IF record type" ar="نوع السجل">
            <select
              className={control}
              value={edit.kind}
              onChange={(e) => setEdit({ ...edit, kind: e.target.value as Rule["kind"] })}
            >
              {workspaceKinds[workspaceId].map((k) => (
                <option key={k} value={k}>
                  {t(...titles[k])}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel
            en="Days before due (negative = overdue)"
            ar="أيام قبل الموعد (السالب بعد الموعد)"
          >
            <Input
              type="number"
              min={-365}
              max={365}
              value={edit.days}
              onChange={(e) => setEdit({ ...edit, days: Number(e.target.value) })}
            />
          </FieldLabel>
          <FieldLabel en="Run after (local time)" ar="التنفيذ بعد (التوقيت المحلي)">
            <Input
              type="time"
              required
              value={edit.hour}
              onChange={(e) => setEdit({ ...edit, hour: e.target.value })}
            />
          </FieldLabel>
          <FieldLabel en="THEN" ar="الإجراء">
            <select
              className={control}
              value={edit.action}
              onChange={(e) => setEdit({ ...edit, action: e.target.value as Rule["action"] })}
            >
              {["notify", "task", "escalate"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel en="Channel" ar="القناة">
            <select
              className={control}
              value={edit.channel}
              onChange={(e) => setEdit({ ...edit, channel: e.target.value as Rule["channel"] })}
            >
              {["in-app", "Email", "Webhook"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel en="Rule / escalation owner" ar="مسؤول القاعدة والتصعيد">
            <select
              className={control}
              value={edit.ownerId}
              onChange={(e) => setEdit({ ...edit, ownerId: e.target.value })}
            >
              {users
                .filter((u) => access(u, workspaceId))
                .map((u) => (
                  <option value={u.id} key={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </FieldLabel>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">{t("Save rule", "حفظ القاعدة")}</Button>
            <Button type="button" variant="outline" onClick={() => setEdit(null)}>
              {t("Cancel", "إلغاء")}
            </Button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Rule", "When → Then", "Channel", "Status", "Last run", "Results", "Actions"].map(
                (x) => (
                  <th key={x} className="p-3 text-start">
                    {x}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {state.rules
              .filter((r) => r.workspaceId === workspaceId)
              .map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.title}</td>
                  <td className="p-3">
                    {r.trigger} · {r.kind} → {r.action}
                  </td>
                  <td className="p-3">{r.channel}</td>
                  <td className="p-3">{r.enabled ? "Enabled" : "Disabled"}</td>
                  <td className="p-3">{r.lastRun || "Not run"}</td>
                  <td className="p-3">
                    {state.runs.filter((x) => x.ruleId === r.id && x.status === "Success").length} ✓
                    / {state.runs.filter((x) => x.ruleId === r.id && x.status === "Failed").length}{" "}
                    !
                  </td>
                  <td className="flex flex-wrap gap-1 p-3">
                    {admin && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setEdit({ ...r })}>
                          {t("Edit", "تعديل")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            transact((s) => {
                              const x = s.rules.find((x) => x.id === r.id);
                              if (x) x.enabled = !x.enabled;
                            });
                          }}
                        >
                          {r.enabled ? t("Disable", "تعطيل") : t("Enable", "تفعيل")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => run(r, true)}>
                          {t("Test", "اختبار")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => run(r, false)}>
                          {t("Run", "تشغيل")}
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          {t("Execution history & failures", "سجل التنفيذ والأخطاء")}
        </h2>
        {state.runs
          .filter((run) =>
            state.rules.some((r) => r.id === run.ruleId && r.workspaceId === workspaceId),
          )
          .slice(0, 40)
          .map((run) => (
            <div className="border-b py-3 text-sm" key={run.id}>
              <span className={run.status === "Failed" ? "text-destructive" : "text-primary"}>
                {run.status}
              </span>{" "}
              · {new Date(run.at).toLocaleString()}
              <p>{run.message}</p>
            </div>
          ))}
      </section>
    </div>
  );
}
