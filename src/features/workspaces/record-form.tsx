import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { useLang } from "../../lib/i18n";
import { useApp } from "../../lib/store";
import type { WorkspaceId } from "../../lib/workspace-hub";
import { useHub } from "./provider";
import { access, createRecord, updateRecord, permission, visible } from "./service";
import {
  titles,
  fields,
  statuses,
  today,
  workspaceKinds,
  type Draft,
  type Kind,
  type WorkRecord,
} from "./model";

export const control =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export function FieldLabel({
  en,
  ar,
  children,
}: {
  en: string;
  ar: string;
  children: React.ReactNode;
}) {
  const { t } = useLang();
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {t(en, ar)}
      {children}
    </label>
  );
}
export function RecordForm({
  kind,
  workspaceId,
  record,
  initialDraft,
  onClose,
  onSaved,
}: {
  kind: Kind;
  workspaceId: WorkspaceId;
  record?: WorkRecord;
  initialDraft?: Draft;
  onClose: () => void;
  onSaved?: (r: WorkRecord) => void;
}) {
  const { actor, users, state, transact } = useHub();
  const { t } = useLang();
  const [draft, setDraft] = useState<Draft>(() =>
    record
      ? structuredClone(record)
      : (initialDraft ?? {
          kind,
          workspaceId,
          title: "",
          description: "",
          ownerId: actor.id,
          collaborators: [],
          entityId: actor.entityId,
          status: statuses[kind][0] ?? "Open",
          priority: "Medium",
          startDate: today(),
          dueDate: today(),
          progress: 0,
          nextAction: "",
          details: Object.fromEntries(
            fields[kind].flatMap((f) =>
              f.options?.[0]
                ? [[f.key, f.options[0]]]
                : f.type === "time"
                  ? [[f.key, f.key === "startTime" ? "10:00" : "11:00"]]
                  : f.type === "date"
                    ? [[f.key, today()]]
                    : [],
            ),
          ),
        }),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((p) => ({ ...p, [key]: value }));
  const detail = (key: string, value: string) =>
    setDraft((p) => ({ ...p, details: { ...p.details, [key]: value } }));
  const members = users.filter((u) => access(u, workspaceId));
  const assign = permission(actor, workspaceId, "assign", record);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = transact((s) =>
        record
          ? updateRecord(s, actor, record.id, draft, users)
          : createRecord(s, actor, draft, users),
      );
      toast.success(
        t(
          "Saved. Ownership and next steps are recorded.",
          "تم الحفظ وتسجيل المسؤول والخطوات التالية.",
        ),
      );
      onSaved?.(r);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save. Please retry.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {record ? t("Edit", "تعديل") : t("Create", "إنشاء")} {t(...titles[kind])}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Give this work an owner, a date and a clear next action.",
              "حدد المسؤول والموعد والخطوة التالية بوضوح.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
          <FieldLabel
            en={kind === "employee" ? "Name" : "Title"}
            ar={kind === "employee" ? "الاسم" : "العنوان"}
          >
            <Input
              autoFocus
              required
              minLength={3}
              maxLength={180}
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </FieldLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel en="Owner" ar="المسؤول">
              <select
                className={control}
                value={draft.ownerId}
                disabled={!assign}
                onChange={(e) => set("ownerId", e.target.value)}
              >
                {members.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel en="Due date" ar="الموعد النهائي">
              <Input
                type="date"
                required
                value={draft.dueDate}
                min={draft.startDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </FieldLabel>
            <FieldLabel en="Priority" ar="الأولوية">
              <select
                className={control}
                value={draft.priority}
                onChange={(e) => set("priority", e.target.value as Draft["priority"])}
              >
                {["Low", "Medium", "High", "Critical"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel en="Status" ar="الحالة">
              <select
                className={control}
                disabled={["payment", "approval", "bill"].includes(kind)}
                value={draft.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {statuses[kind].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </FieldLabel>
          </div>
          {fields[kind]
            .filter((f) => f.required || f.options || f.link)
            .map((f) => {
              const value = draft.details[f.key] ?? "";
              return (
                <FieldLabel
                  key={f.key}
                  en={f.en + (f.required ? " *" : "")}
                  ar={f.ar + (f.required ? " *" : "")}
                >
                  {f.options || f.link ? (
                    <select
                      required={f.required}
                      className={control}
                      value={value}
                      onChange={(e) => detail(f.key, e.target.value)}
                    >
                      <option value="">{t("Select…", "اختر…")}</option>
                      {f.options?.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                      {f.link &&
                        state.records
                          .filter(
                            (r) =>
                              r.workspaceId === workspaceId &&
                              r.kind === f.link &&
                              r.id !== record?.id &&
                              visible(actor, r),
                          )
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.title}
                            </option>
                          ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <Textarea
                      required={f.required}
                      value={value}
                      onChange={(e) => detail(f.key, e.target.value)}
                    />
                  ) : (
                    <Input
                      type={f.type ?? "text"}
                      required={f.required}
                      min={f.type === "number" ? "0.001" : undefined}
                      step={f.type === "number" ? "any" : undefined}
                      value={value}
                      onChange={(e) => detail(f.key, e.target.value)}
                    />
                  )}
                </FieldLabel>
              );
            })}
          <FieldLabel en="Next action" ar="الخطوة التالية">
            <Input
              required={!["payment", "file", "employee"].includes(kind)}
              value={draft.nextAction}
              onChange={(e) => set("nextAction", e.target.value)}
            />
          </FieldLabel>
          <details open={kind === "hr-task"} className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {t(
                "Context, collaborators and advanced details",
                "السياق والمشاركون والتفاصيل الإضافية",
              )}
            </summary>
            <div className="mt-4 grid gap-4">
              <FieldLabel en="Context / notes" ar="السياق والملاحظات">
                <Textarea
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </FieldLabel>
              <div className="grid grid-cols-2 gap-4">
                <FieldLabel en="Start date" ar="تاريخ البداية">
                  <Input
                    type="date"
                    required
                    value={draft.startDate}
                    max={draft.dueDate}
                    onChange={(e) => set("startDate", e.target.value)}
                  />
                </FieldLabel>
                <FieldLabel en="Progress %" ar="نسبة الإنجاز">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.progress}
                    onChange={(e) => set("progress", Number(e.target.value))}
                  />
                </FieldLabel>
              </div>
              <FieldLabel
                en="Collaborators (Ctrl / Cmd to select)"
                ar="المشاركون (Ctrl للاختيار المتعدد)"
              >
                <select
                  className={control + " h-28"}
                  multiple
                  value={draft.collaborators}
                  onChange={(e) =>
                    set(
                      "collaborators",
                      Array.from(e.target.selectedOptions).map((o) => o.value),
                    )
                  }
                >
                  {members.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </FieldLabel>
              {fields[kind]
                .filter((f) => !f.required && !f.options && !f.link)
                .map((f) => (
                  <FieldLabel key={f.key} en={f.en} ar={f.ar}>
                    {kind === "hr-task" && f.key === "approverId" ? (
                      <select
                        className={control}
                        value={draft.details[f.key] ?? ""}
                        onChange={(e) => detail(f.key, e.target.value)}
                      >
                        <option value="">Select assigned approver</option>
                        {members
                          .filter((u) => u.id !== draft.ownerId)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} — {u.role}
                            </option>
                          ))}
                      </select>
                    ) : f.type === "textarea" ? (
                      <Textarea
                        readOnly={
                          kind === "hr-task" &&
                          !!draft.details["guideId"] &&
                          !["approvalReason", "evidenceLink"].includes(f.key)
                        }
                        value={draft.details[f.key] ?? ""}
                        onChange={(e) => detail(f.key, e.target.value)}
                      />
                    ) : (
                      <Input
                        readOnly={
                          kind === "hr-task" &&
                          !!draft.details["guideId"] &&
                          !["approverId", "approvalReason", "evidenceLink"].includes(f.key)
                        }
                        type={f.type ?? "text"}
                        min={f.type === "number" ? "1" : undefined}
                        value={draft.details[f.key] ?? ""}
                        onChange={(e) => detail(f.key, e.target.value)}
                      />
                    )}
                  </FieldLabel>
                ))}
            </div>
          </details>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button disabled={busy} type="submit">
              {busy ? t("Saving…", "جارٍ الحفظ…") : t("Save", "حفظ")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export type QuickCreateKind = Kind;
export function QuickCreate({
  open,
  kind,
  onOpenChange,
}: {
  open: boolean;
  kind: Kind;
  onOpenChange: (open: boolean) => void;
  allowedKinds: Kind[];
}) {
  const { activeWorkspace } = useApp();
  return open && workspaceKinds[activeWorkspace].includes(kind) ? (
    <RecordForm
      key={`${activeWorkspace}:${kind}`}
      kind={kind}
      workspaceId={activeWorkspace}
      onClose={() => onOpenChange(false)}
    />
  ) : null;
}
