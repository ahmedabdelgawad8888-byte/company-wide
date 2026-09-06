import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Archive,
  Inbox,
  Paperclip,
  PenSquare,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, Panel, Pill } from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import type { MailMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const FOLDERS: { key: MailMessage["folder"]; en: string; ar: string }[] = [
  { key: "inbox", en: "Inbox", ar: "الوارد" },
  { key: "sent", en: "Sent", ar: "المرسل" },
  { key: "drafts", en: "Drafts", ar: "المسودات" },
  { key: "archive", en: "Archive", ar: "الأرشيف" },
  { key: "spam", en: "Spam", ar: "المزعج" },
  { key: "trash", en: "Trash", ar: "المهملات" },
];

/** Deep link an email back to the record it is about. Each branch is written out
    so the router keeps its route/param type checking. */
function RecordLink({ mail, label }: { mail: MailMessage; label: string }) {
  const cls = "ms-auto";
  if (!mail.linkedId) return null;
  switch (mail.linkedType) {
    case "campaign":
      return (
        <Button asChild size="sm" variant="outline" className={cls}>
          <Link to="/campaigns/$campaignId" params={{ campaignId: mail.linkedId }}>
            {label}
          </Link>
        </Button>
      );
    case "client":
      return (
        <Button asChild size="sm" variant="outline" className={cls}>
          <Link to="/crm/clients/$clientId" params={{ clientId: mail.linkedId }}>
            {label}
          </Link>
        </Button>
      );
    case "invoice":
      return (
        <Button asChild size="sm" variant="outline" className={cls}>
          <Link to="/finance/invoices">{label}</Link>
        </Button>
      );
    case "deal":
      return (
        <Button asChild size="sm" variant="outline" className={cls}>
          <Link to="/crm/deals">{label}</Link>
        </Button>
      );
    default:
      return null;
  }
}

function InboxPage() {
  const { db, inScope, currentUser, campaignName, clientName, actions } = useApp();
  const { t } = useLang();

  const [folder, setFolder] = useState<MailMessage["folder"]>("inbox");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compose, setCompose] = useState<{
    open: boolean;
    to: string;
    subject: string;
    body: string;
    threadId?: string;
  }>({
    open: false,
    to: "",
    subject: "",
    body: "",
  });

  const mail = inScope(db.mail);
  const counts = useMemo(() => {
    const m = new Map<MailMessage["folder"], number>();
    mail.forEach((x) => m.set(x.folder, (m.get(x.folder) ?? 0) + 1));
    return m;
  }, [mail]);
  const unread = mail.filter((m) => m.folder === "inbox" && !m.read).length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mail
      .filter((m) => m.folder === folder)
      .filter(
        (m) =>
          !q ||
          [m.subject, m.fromName, m.preview, ...m.labels].some((f) => f.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [mail, folder, query]);

  const selected = rows.find((m) => m.id === selectedId) ?? rows[0] ?? null;

  const open = (m: MailMessage) => {
    setSelectedId(m.id);
    if (!m.read) actions.setMailRead(m.id, true);
  };

  const send = () => {
    if (!compose.to.trim() || !compose.subject.trim()) {
      toast.error(t("A recipient and a subject are required", "المستلم والموضوع مطلوبان"));
      return;
    }
    actions.sendMail({
      fromName: currentUser.name,
      fromEmail: currentUser.email,
      fromUserId: currentUser.id,
      to: compose.to
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      subject: compose.subject,
      preview: compose.body.slice(0, 120),
      body: compose.body,
      starred: false,
      attachments: [],
      labels: [],
      entityId: currentUser.entityId,
      ...(compose.threadId ? { threadId: compose.threadId } : {}),
    });
    toast.success(t("Email sent", "تم إرسال البريد"), { description: compose.subject });
    setCompose({ open: false, to: "", subject: "", body: "" });
    setFolder("sent");
  };

  const replyTo = (m: MailMessage) =>
    setCompose({
      open: true,
      to: m.fromEmail,
      subject: m.subject.startsWith("Re:") ? m.subject : `Re: ${m.subject}`,
      body: `\n\n---\n${m.fromName} wrote on ${m.at}:\n${m.body}`,
      threadId: m.threadId,
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Email", "البريد")}
        subtitle={t(
          "Client and internal correspondence, linked to the campaigns, invoices and clients each message is actually about.",
          "المراسلات مع العملاء وداخل الفريق، مرتبطة بالحملات والفواتير والعملاء المعنيين.",
        )}
        meta={
          <span className="text-xs text-muted-foreground">
            {unread} {t("unread in inbox", "غير مقروء في الوارد")}
          </span>
        }
        actions={
          <Button onClick={() => setCompose({ open: true, to: "", subject: "", body: "" })}>
            <PenSquare className="size-4" /> {t("Compose", "رسالة جديدة")}
          </Button>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[180px_340px_minmax(0,1fr)]">
        {/* Folders */}
        <Panel className="p-2">
          <nav className="space-y-0.5">
            {FOLDERS.map((f) => {
              const n = f.key === "inbox" ? unread : (counts.get(f.key) ?? 0);
              const active = folder === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setFolder(f.key);
                    setSelectedId(null);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                    active ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {f.key === "inbox" ? <Inbox className="size-4" /> : null}
                    {t(f.en, f.ar)}
                  </span>
                  {n > 0 ? <span className="num text-xs">{n}</span> : null}
                </button>
              );
            })}
          </nav>
        </Panel>

        {/* Message list */}
        <Panel className="p-0 xl:max-h-[calc(100vh-16rem)] xl:overflow-y-auto">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search mail…", "بحث في البريد…")}
                className="ps-8"
              />
            </div>
          </div>
          <div className="divide-y">
            {rows.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => open(m)}
                className={cn(
                  "block w-full px-3 py-2.5 text-start transition-colors hover:bg-muted/50",
                  selected?.id === m.id && "bg-muted/70",
                )}
              >
                <div className="flex items-center gap-2">
                  {!m.read ? (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-primary"
                      aria-label={t("Unread", "غير مقروء")}
                    />
                  ) : null}
                  <span
                    className={cn("min-w-0 flex-1 truncate text-sm", !m.read && "font-semibold")}
                  >
                    {m.fromName}
                  </span>
                  <span className="num shrink-0 text-[11px] text-muted-foreground">
                    {m.at.slice(5, 10)}
                  </span>
                </div>
                <div
                  className={cn(
                    "mt-0.5 truncate text-xs",
                    !m.read ? "font-medium" : "text-muted-foreground",
                  )}
                >
                  {m.subject}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{m.preview}</div>
                <div className="mt-1 flex items-center gap-1">
                  {m.starred ? <Star className="size-3 fill-warning text-warning" /> : null}
                  {m.attachments.length ? (
                    <Paperclip className="size-3 text-muted-foreground" />
                  ) : null}
                  {m.labels.slice(0, 2).map((l) => (
                    <span
                      key={l}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </button>
            ))}
            {rows.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                {t("No messages here.", "لا توجد رسائل هنا.")}
              </div>
            ) : null}
          </div>
        </Panel>

        {/* Reading pane */}
        <div className="lg:col-span-2 xl:col-span-1">
          {selected ? (
            <Panel>
              <div className="flex items-start justify-between gap-3 border-b pb-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">{selected.subject}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{selected.fromName}</span> &lt;
                    {selected.fromEmail}&gt;
                  </p>
                  <p className="num mt-0.5 text-[11px] text-muted-foreground">
                    {t("to", "إلى")} {selected.to.join(", ")} · {selected.at}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => actions.toggleMailStar(selected.id)}
                    aria-label={t("Star", "تمييز")}
                  >
                    <Star
                      className={cn("size-4", selected.starred && "fill-warning text-warning")}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      actions.moveMail(selected.id, "archive");
                      toast.success(t("Archived", "تمت الأرشفة"));
                    }}
                    aria-label={t("Archive", "أرشفة")}
                  >
                    <Archive className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-danger"
                    onClick={() => {
                      actions.moveMail(selected.id, "trash");
                      toast.success(t("Moved to trash", "نُقلت إلى المهملات"));
                    }}
                    aria-label={t("Delete", "حذف")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {selected.linkedType && selected.linkedId ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/60 p-2 text-xs">
                  <span className="text-muted-foreground">
                    {t("Related record", "السجل المرتبط")}:
                  </span>
                  <span className="font-medium">
                    {selected.linkedType === "campaign"
                      ? campaignName(selected.linkedId)
                      : selected.linkedType === "client"
                        ? clientName(selected.linkedId)
                        : selected.linkedId}
                  </span>
                  <RecordLink mail={selected} label={t("Open", "فتح")} />
                </div>
              ) : null}

              <div className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">
                {selected.body}
              </div>

              {selected.attachments.length ? (
                <div className="mt-4 space-y-1.5 border-t pt-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    {t("Attachments", "المرفقات")}
                  </div>
                  {selected.attachments.map((a) => (
                    <div
                      key={a.name}
                      className="flex items-center gap-2 rounded-lg border p-2 text-xs"
                    >
                      <Paperclip className="size-3.5 text-muted-foreground" />
                      <span className="font-medium">{a.name}</span>
                      <span className="num ms-auto text-muted-foreground">{a.size}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                <Button size="sm" onClick={() => replyTo(selected)}>
                  <Reply className="size-4" /> {t("Reply", "رد")}
                </Button>
                {selected.labels.map((l) => (
                  <Pill key={l} tone="brand">
                    {l}
                  </Pill>
                ))}
              </div>
            </Panel>
          ) : (
            <Panel>
              <EmptyState
                title={t("Nothing selected", "لم يتم اختيار رسالة")}
                description={t(
                  "Pick a message on the left to read it here.",
                  "اختر رسالة من القائمة لعرضها هنا.",
                )}
              />
            </Panel>
          )}
        </div>
      </div>

      <Dialog open={compose.open} onOpenChange={(open) => setCompose((c) => ({ ...c, open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("New message", "رسالة جديدة")}</DialogTitle>
            <DialogDescription>
              {t(
                "Sent mail is logged to the activity feed.",
                "يتم تسجيل البريد المرسل في سجل النشاط.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mail-to">{t("To", "إلى")}</Label>
              <Input
                id="mail-to"
                value={compose.to}
                onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))}
                placeholder="name@client.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mail-subject">{t("Subject", "الموضوع")}</Label>
              <Input
                id="mail-subject"
                value={compose.subject}
                onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mail-body">{t("Message", "الرسالة")}</Label>
              <Textarea
                id="mail-body"
                rows={8}
                value={compose.body}
                onChange={(e) => setCompose((c) => ({ ...c, body: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompose((c) => ({ ...c, open: false }))}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button onClick={send}>
              <Send className="size-4" /> {t("Send", "إرسال")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/inbox")({ component: InboxPage });
