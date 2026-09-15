import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, CheckCircle2, Copy, Pencil, UserRound } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import { Progress } from "../../components/ui/progress";
import { useLang } from "../../lib/i18n";
import { useHub } from "./provider";
import { RecordForm, control, FieldLabel } from "./record-form";
import { fields, titles, href, overdue, today, type WorkRecord } from "./model";
import {
  addComment,
  archive,
  decide,
  meetingAction,
  permission,
  startOnboarding,
  updateRecord,
  visible,
  id,
  access,
} from "./service";

export function RecordDetail({ recordId, onClose }: { recordId: string; onClose: () => void }) {
  const { state, actor, users, transact } = useHub();
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState("");
  const [action, setAction] = useState("");
  const [owner, setOwner] = useState(actor.id);
  const [due, setDue] = useState(today());
  const [reason, setReason] = useState("");
  const [promise, setPromise] = useState("");
  const [tab, setTab] = useState("details");
  const r = state.records.find((r) => r.id === recordId && visible(actor, r));
  const perform = (fn: () => void, message: string) => {
    try {
      fn();
      toast.success(message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to complete action. Retry.");
    }
  };
  if (!r)
    return (
      <section className="rounded-2xl border bg-card p-8">
        <h1 className="text-2xl font-semibold">{t("Record unavailable", "السجل غير متاح")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "This record was archived or you do not have access.",
            "تمت أرشفة السجل أو لا تملك صلاحية الوصول.",
          )}
        </p>
        <Button className="mt-6" variant="outline" onClick={onClose}>
          <ArrowLeft className="size-4" /> {t("Back to workspace", "العودة إلى مساحة العمل")}
        </Button>
      </section>
    );
  const editable = permission(actor, r.workspaceId, "edit", r);
  const linked = state.records.filter(
    (x) =>
      visible(actor, x) &&
      (x.sourceId.startsWith(`${r.id}:`) || Object.values(x.details).includes(r.id)),
  );
  const currency = r.details["currency"] ?? "";
  const remaining = Number(r.details["amount"] ?? 0) - Number(r.details["paid"] ?? 0);
  const upload = async (file: File) => {
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error(
          "Local files are limited to 2 MB each. Use an external link for larger files.",
        );
      if (!/^(image\/(png|jpeg|webp)|application\/pdf|text\/plain|text\/csv)$/.test(file.type))
        throw new Error("Choose PDF, PNG, JPEG, WebP, text or CSV.");
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      transact((s) => {
        if (!permission(actor, r.workspaceId, "edit", r)) throw new Error("Permission denied.");
        const version =
          s.attachments.filter((a) => a.recordId === r.id && a.name === file.name).length + 1;
        s.attachments.push({
          id: id("FILE"),
          recordId: r.id,
          name: file.name,
          mime: file.type,
          size: file.size,
          version,
          at: new Date().toISOString(),
          by: actor.id,
          data,
        });
        s.audit.unshift({
          id: id("AUD"),
          recordId: r.id,
          workspaceId: r.workspaceId,
          actorId: actor.id,
          action: "File uploaded",
          at: new Date().toISOString(),
          before: "",
          after: `${file.name} v${version}`,
        });
      });
      toast.success(t("File uploaded", "تم رفع الملف"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "File upload failed. Please retry.");
    }
  };
  return (
    <>
      <section className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        <header className="space-y-0 border-b bg-card px-6 pt-6 pb-5 text-start sm:px-8">
          <Button variant="ghost" size="sm" className="mb-5 -ms-2" onClick={onClose}>
            <ArrowLeft className="size-4" /> {t("Back to workspace", "العودة إلى مساحة العمل")}
          </Button>
          <div className="flex flex-wrap items-center gap-2 pe-10">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {t(...titles[r.kind])}
            </span>
            <p className="text-xs text-muted-foreground">
              {r.workspaceId} · {r.id.slice(0, 16)}
            </p>
          </div>
          <h1 className="mt-3 max-w-4xl text-2xl leading-snug font-semibold sm:text-3xl">
            {r.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1 font-medium">{r.status}</span>
            <span className="rounded-full bg-muted px-2.5 py-1">
              {r.kind === "hr-task" ? r.details["sourcePriority"] || r.priority : r.priority}
            </span>
            {overdue(r) && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 font-medium text-destructive">
                {t("Overdue", "متأخر")}
              </span>
            )}
            {r.progress >= 100 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-600">
                <CheckCircle2 className="size-3" /> {t("Complete", "مكتمل")}
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                perform(
                  () => {
                    void navigator.clipboard
                      .writeText(location.origin + href(r))
                      .then(() => toast.success(t("Link copied", "تم نسخ الرابط")))
                      .catch(() => toast.error("Unable to access clipboard."));
                  },
                  t("Record link ready", "رابط السجل جاهز"),
                )
              }
            >
              <Copy className="size-4" /> {t("Copy link", "نسخ الرابط")}
            </Button>
            {editable && r.kind !== "payment" && (
              <Button size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-4" /> {t("Edit", "تعديل")}
              </Button>
            )}
          </div>
        </header>
        <div className="space-y-7 px-6 pt-7 pb-12 leading-relaxed sm:px-8">
          <div className="grid gap-5 rounded-2xl border bg-muted/25 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase">
                <UserRound className="size-3.5" /> {t("Owner", "المسؤول")}
              </p>
              <p className="font-medium">
                {users.find((u) => u.id === r.ownerId)?.name ?? r.ownerId}
              </p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase">
                <CalendarDays className="size-3.5" /> {t("Deadline", "الموعد النهائي")}
              </p>
              <p className={`font-medium ${overdue(r) ? "text-destructive" : ""}`}>{r.dueDate}</p>
            </div>
            <div className="space-y-1 lg:col-span-2">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                {t("Next action", "الخطوة التالية")}
              </p>
              <p>{r.nextAction || t("No next action recorded", "لم تسجل خطوة تالية")}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="mb-2 flex items-baseline justify-between text-xs">
                <span className="tracking-wide text-muted-foreground uppercase">
                  {t("Progress", "التقدم")}
                </span>
                <span className="text-sm font-semibold">{r.progress}%</span>
              </div>
              <Progress value={r.progress} />
            </div>
          </div>
          <div
            role="tablist"
            className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-xl border bg-background/95 p-1.5 shadow-sm backdrop-blur"
          >
            {[
              ["details", "Details", "التفاصيل"],
              ["comments", "Comments", "التعليقات"],
              ["files", "Files", "الملفات"],
              ["history", "History", "السجل"],
            ].map(([key, en, ar]) => (
              <button
                role="tab"
                aria-selected={tab === key}
                key={key}
                className={`min-h-11 min-w-28 flex-1 rounded-lg px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  tab === key
                    ? "bg-card font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab(key ?? "details")}
              >
                {t(en ?? "", ar ?? "")}
              </button>
            ))}
          </div>
          {tab === "details" && (
            <div className="space-y-4">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.description}</p>
              <dl className="grid gap-3 text-sm">
                {fields[r.kind]
                  .filter((f) => r.details[f.key])
                  .map((f) => (
                    <div key={f.key} className="grid grid-cols-[140px_1fr] gap-3 border-b pb-2">
                      <dt className="text-muted-foreground">{t(f.en, f.ar)}</dt>
                      <dd className="break-words whitespace-pre-wrap">
                        {f.link ? (
                          (state.records.find((x) => x.id === r.details[f.key] && visible(actor, x))
                            ?.title ?? "—")
                        ) : f.type === "url" ? (
                          <a
                            className="text-primary underline"
                            href={r.details[f.key]}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t("Open link", "فتح الرابط")}
                          </a>
                        ) : (
                          r.details[f.key]
                        )}
                      </dd>
                    </div>
                  ))}
              </dl>
              {r.details["sourceSheet"] && (
                <section className="rounded-lg border p-4">
                  <h2 className="mb-3 font-semibold">Excel source · {r.details["sourceSheet"]}</h2>
                  <dl className="space-y-3 text-sm">
                    {Object.entries(r.details)
                      .filter(([, value]) => value !== "")
                      .map(([key, value]) => (
                        <div key={key} className="grid gap-2 sm:grid-cols-[180px_1fr]">
                          <dt className="text-muted-foreground">{key}</dt>
                          <dd className="whitespace-pre-wrap break-words">{value}</dd>
                        </div>
                      ))}
                  </dl>
                </section>
              )}
              {r.collaborators.length > 0 && (
                <p className="text-sm">
                  {t("Collaborators", "المشاركون")}:{" "}
                  {r.collaborators.map((id) => users.find((u) => u.id === id)?.name).join(", ")}
                </p>
              )}
              {r.kind === "bill" && (
                <section className="space-y-3 rounded-lg border p-4">
                  <p className="text-lg font-semibold">
                    {t("Outstanding", "المتبقي")}: {remaining.toLocaleString()} {currency}
                  </p>
                  <p className="text-sm">
                    {t("Paid", "المدفوع")}: {Number(r.details["paid"] ?? 0).toLocaleString()}{" "}
                    {currency}
                  </p>
                  {editable && remaining > 0 && (
                    <>
                      <FieldLabel en="Promise-to-pay date" ar="تاريخ وعد السداد">
                        <Input
                          type="date"
                          value={promise}
                          onChange={(e) => setPromise(e.target.value)}
                        />
                      </FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            perform(() => {
                              if (!promise) throw new Error("Select a promise-to-pay date.");
                              transact((s) =>
                                updateRecord(
                                  s,
                                  actor,
                                  r.id,
                                  {
                                    ...r,
                                    status: "Promise to Pay",
                                    details: {
                                      ...r.details,
                                      promiseDate: promise,
                                      lastContact: today(),
                                    },
                                  },
                                  users,
                                ),
                              );
                            }, "Promise to pay recorded")
                          }
                        >
                          {t("Record promise", "تسجيل وعد")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            perform(() => {
                              transact((s) =>
                                updateRecord(s, actor, r.id, { ...r, status: "Escalated" }, users),
                              );
                            }, "Collection escalated")
                          }
                        >
                          {t("Escalate", "تصعيد")}
                        </Button>
                      </div>
                    </>
                  )}
                </section>
              )}
              {["meeting", "interview"].includes(r.kind) && editable && (
                <section className="space-y-3 rounded-lg border p-4">
                  <h3 className="font-semibold">
                    {t(
                      "Turn outcomes into owned actions",
                      "حوّل نتائج الاجتماع إلى إجراءات مسؤولة",
                    )}
                  </h3>
                  <FieldLabel en="Action / commitment" ar="الإجراء أو الالتزام">
                    <Input value={action} onChange={(e) => setAction(e.target.value)} />
                  </FieldLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldLabel en="Action owner" ar="مسؤول الإجراء">
                      <select
                        className={control}
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                      >
                        {users
                          .filter(
                            (u) =>
                              access(u, r.workspaceId) &&
                              (permission(actor, r.workspaceId, "assign", r) || u.id === actor.id),
                          )
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                      </select>
                    </FieldLabel>
                    <FieldLabel en="Due date" ar="الموعد النهائي">
                      <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                    </FieldLabel>
                  </div>
                  <Button
                    onClick={() =>
                      perform(() => {
                        transact((s) => meetingAction(s, actor, r.id, action, owner, due, users));
                        setAction("");
                      }, "Linked task created")
                    }
                  >
                    {t("Create linked task", "إنشاء مهمة مرتبطة")}
                  </Button>
                </section>
              )}
              {r.kind === "onboarding" && editable && (
                <Button
                  onClick={() =>
                    perform(() => {
                      transact((s) => startOnboarding(s, actor, r));
                    }, "Onboarding checklist is ready. Existing items were preserved.")
                  }
                >
                  {t("Launch onboarding checklist", "بدء قائمة التهيئة")}
                </Button>
              )}
              {r.kind === "approval" &&
                permission(actor, r.workspaceId, "approve", r) &&
                r.status === "Pending" && (
                  <section className="space-y-3 rounded-lg border p-4">
                    <FieldLabel en="Decision reason" ar="سبب القرار">
                      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
                    </FieldLabel>
                    <div className="flex gap-2">
                      {(["Approved", "Rejected", "Returned"] as const).map((status) => (
                        <Button
                          key={status}
                          variant={status === "Approved" ? "default" : "outline"}
                          onClick={() =>
                            perform(() => {
                              transact((s) => decide(s, actor, r.id, status, reason));
                            }, `Request ${status.toLowerCase()}`)
                          }
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </section>
                )}
              {linked.length > 0 && (
                <section>
                  <h3 className="mb-2 font-semibold">{t("Related work", "العمل المرتبط")}</h3>
                  {linked.map((x) => (
                    <Link
                      key={x.id}
                      to={href(x) as never}
                      className="flex justify-between gap-2 border-b py-2 text-sm"
                      onClick={onClose}
                    >
                      <span>{x.title}</span>
                      <span className="text-muted-foreground">{x.status}</span>
                    </Link>
                  ))}
                </section>
              )}
              {permission(actor, r.workspaceId, "delete", r) &&
                !["payment", "bill"].includes(r.kind) && (
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          t(
                            "Archive this record? It will remain in the audit history.",
                            "أرشفة هذا السجل؟ سيظل موجوداً في سجل التدقيق.",
                          ),
                        )
                      )
                        perform(() => {
                          transact((s) => archive(s, actor, r.id));
                          onClose();
                        }, "Record archived");
                    }}
                  >
                    {t("Archive record", "أرشفة السجل")}
                  </Button>
                )}
            </div>
          )}
          {tab === "comments" && (
            <div className="space-y-4">
              {state.comments
                .filter((c) => c.recordId === r.id)
                .map((c) => (
                  <article key={c.id} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      {users.find((u) => u.id === c.by)?.name} · {new Date(c.at).toLocaleString()}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{c.body}</p>
                  </article>
                ))}
              {editable && (
                <>
                  <FieldLabel en="Comment · mention @Full Name" ar="تعليق · اذكر @الاسم الكامل">
                    <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
                  </FieldLabel>
                  <Button
                    onClick={() =>
                      perform(() => {
                        transact((s) => addComment(s, actor, r.id, comment, users));
                        setComment("");
                      }, "Comment added")
                    }
                  >
                    {t("Add comment", "إضافة تعليق")}
                  </Button>
                </>
              )}
            </div>
          )}
          {tab === "files" && (
            <div className="space-y-4">
              {editable && (
                <FieldLabel en="Upload a file · up to 2 MB" ar="رفع ملف · حتى ٢ ميجابايت">
                  <Input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void upload(file);
                      e.target.value = "";
                    }}
                  />
                </FieldLabel>
              )}
              {state.attachments
                .filter((a) => a.recordId === r.id)
                .map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <span>
                      {a.name} · v{a.version} · {Math.ceil(a.size / 1024)} KB
                    </span>
                    <a href={a.data} download={a.name} className="text-primary underline">
                      {t("Download", "تنزيل")}
                    </a>
                  </div>
                ))}
              {state.attachments.filter((a) => a.recordId === r.id).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "No files attached. Upload evidence or add a delivery link in the record.",
                    "لا توجد ملفات مرفقة. ارفع مستنداً أو أضف رابط التسليم في السجل.",
                  )}
                </p>
              )}
            </div>
          )}
          {tab === "history" && (
            <div className="space-y-3">
              {state.audit
                .filter((a) => a.recordId === r.id)
                .map((a) => (
                  <details key={a.id} className="rounded-lg border p-3 text-sm">
                    <summary className="cursor-pointer">
                      {a.action} · {users.find((u) => u.id === a.actorId)?.name ?? a.actorId}
                      <span className="block text-xs text-muted-foreground">
                        {new Date(a.at).toLocaleString()}
                      </span>
                    </summary>
                    <p className="mt-3 text-xs">
                      {t("Previous value → New value", "القيمة السابقة ← القيمة الجديدة")}
                    </p>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">
                      {a.before}
                      {"\n→\n"}
                      {a.after}
                    </pre>
                  </details>
                ))}
            </div>
          )}
        </div>
      </section>
      {editing && (
        <RecordForm
          kind={r.kind}
          workspaceId={r.workspaceId}
          record={r}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
