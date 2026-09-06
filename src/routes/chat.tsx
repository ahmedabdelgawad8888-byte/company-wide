import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Hash, Lock, Plus, SendHorizontal, Users } from "lucide-react";
import { toast } from "sonner";

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
import { PageHeader, Panel, Pill } from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const QUICK_REACTIONS = ["👍", "✅", "🔥", "🙏", "👀"];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

function ChatPage() {
  const { db, inScope, currentUser, userName, actions } = useApp();
  const { t } = useLang();

  const channels = inScope(db.chatChannels);
  const [activeId, setActiveId] = useState(channels[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [draftChannel, setDraftChannel] = useState({ name: "", topic: "" });
  const endRef = useRef<HTMLDivElement>(null);

  const active = channels.find((c) => c.id === activeId) ?? channels[0] ?? null;
  const messages = useMemo(
    () =>
      db.chatMessages
        .filter((m) => m.channelId === active?.id)
        .sort((a, b) => a.at.localeCompare(b.at)),
    [db.chatMessages, active?.id],
  );

  const groups = channels.filter((c) => c.kind === "channel");
  const directs = channels.filter((c) => c.kind === "direct");

  const send = () => {
    const text = body.trim();
    if (!text || !active) return;
    actions.sendChat(active.id, text);
    setBody("");
    // Let the new node paint before scrolling to it.
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const createChannel = () => {
    const name = draftChannel.name.trim().replace(/\s+/g, "-").toLowerCase();
    if (!name) {
      toast.error(t("Give the channel a name", "أضف اسمًا للقناة"));
      return;
    }
    const channel = actions.addChannel({
      name,
      kind: "channel",
      topic: draftChannel.topic,
      memberIds: [currentUser.id],
      entityId: currentUser.entityId,
      private: false,
    });
    setActiveId(channel.id);
    setNewOpen(false);
    setDraftChannel({ name: "", topic: "" });
    toast.success(t("Channel created", "تم إنشاء القناة"), { description: `#${name}` });
  };

  /** Highlight @mentions that resolve to a real teammate. */
  const renderBody = (text: string) =>
    text.split(/(@\w+)/g).map((part, i) => {
      if (!part.startsWith("@")) return <span key={i}>{part}</span>;
      const handle = part.slice(1).toLowerCase();
      const user = db.users.find(
        (u) =>
          u.id.toLowerCase() === handle || (u.name.split(" ")[0] ?? "").toLowerCase() === handle,
      );
      if (!user) return <span key={i}>{part}</span>;
      const isMe = user.id === currentUser.id;
      return (
        <span
          key={i}
          className={cn(
            "rounded px-1 py-0.5 text-xs font-medium",
            isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          @{user.name.split(" ")[0]}
        </span>
      );
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Team Chat", "محادثة الفريق")}
        subtitle={t(
          "Channels for delivery, finance and each branch — mention a teammate with @ and they get a notification.",
          "قنوات للتنفيذ والمالية وكل فرع — اذكر زميلًا بـ @ ليصله إشعار.",
        )}
        actions={
          <Button variant="outline" onClick={() => setNewOpen(true)}>
            <Plus className="size-4" /> {t("New channel", "قناة جديدة")}
          </Button>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Panel className="p-2">
          <div className="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t("Channels", "القنوات")}
          </div>
          <nav className="space-y-0.5">
            {groups.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  active?.id === c.id
                    ? "bg-muted font-medium"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                {c.private ? (
                  <Lock className="size-3.5 shrink-0" />
                ) : (
                  <Hash className="size-3.5 shrink-0" />
                )}
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </nav>

          <div className="mt-3 px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t("Direct messages", "رسائل مباشرة")}
          </div>
          <nav className="space-y-0.5">
            {directs.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  active?.id === c.id
                    ? "bg-muted font-medium"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[9px] font-semibold">
                  {initials(c.name)}
                </span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </nav>
        </Panel>

        <Panel className="flex flex-col p-0">
          {active ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b p-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                    {active.kind === "channel" ? (
                      active.private ? (
                        <Lock className="size-3.5" />
                      ) : (
                        <Hash className="size-3.5" />
                      )
                    ) : null}
                    {active.name}
                  </h2>
                  {active.topic ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{active.topic}</p>
                  ) : null}
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3.5" /> {active.memberIds.length}
                </span>
              </div>

              <div className="max-h-[calc(100vh-24rem)] min-h-64 flex-1 space-y-3 overflow-y-auto p-3">
                {messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const grouped = prev?.authorId === m.authorId;
                  const mine = m.authorId === currentUser.id;
                  return (
                    <div key={m.id} className={cn("flex gap-2", grouped && "mt-1")}>
                      <div className="w-7 shrink-0">
                        {!grouped ? (
                          <span
                            className={cn(
                              "grid size-7 place-items-center rounded-full text-[10px] font-semibold",
                              mine ? "bg-primary text-primary-foreground" : "bg-muted",
                            )}
                          >
                            {initials(userName(m.authorId))}
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        {!grouped ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold">{userName(m.authorId)}</span>
                            <span className="num text-[10px] text-muted-foreground">
                              {m.at.slice(11)}
                            </span>
                          </div>
                        ) : null}
                        <p className="text-sm leading-relaxed break-words">{renderBody(m.body)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {m.reactions.map((r) => (
                            <button
                              key={r.emoji}
                              type="button"
                              onClick={() => actions.toggleReaction(m.id, r.emoji)}
                              className={cn(
                                "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
                                r.userIds.includes(currentUser.id)
                                  ? "border-primary bg-primary/10"
                                  : "hover:bg-muted",
                              )}
                              title={r.userIds.map((u) => userName(u)).join(", ")}
                            >
                              <span>{r.emoji}</span>
                              <span className="num">{r.userIds.length}</span>
                            </button>
                          ))}
                          <span className="flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 hover:opacity-100">
                            {QUICK_REACTIONS.map((e) => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => actions.toggleReaction(m.id, e)}
                                className="rounded px-1 text-[11px] hover:bg-muted"
                                aria-label={`React ${e}`}
                              >
                                {e}
                              </button>
                            ))}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="border-t p-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={2}
                    placeholder={
                      active.kind === "direct"
                        ? t(`Message ${active.name}…`, `راسل ${active.name}…`)
                        : t(
                            `Message #${active.name}… use @name to notify someone`,
                            `اكتب في #${active.name}… استخدم @الاسم للإشعار`,
                          )
                    }
                    className="min-h-0 resize-none"
                  />
                  <Button onClick={send} disabled={!body.trim()} aria-label={t("Send", "إرسال")}>
                    <SendHorizontal className="size-4" />
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {t(
                    "Enter sends · Shift+Enter for a new line · @mentions notify that person",
                    "Enter للإرسال · Shift+Enter لسطر جديد · @ لإشعار الشخص",
                  )}
                </p>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {t("No channels in this scope.", "لا توجد قنوات في هذا النطاق.")}
            </div>
          )}
        </Panel>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("New channel", "قناة جديدة")}</DialogTitle>
            <DialogDescription>
              {t("Channels are scoped to your current entity.", "القنوات مرتبطة بالكيان الحالي.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ch-name">{t("Name", "الاسم")}</Label>
              <Input
                id="ch-name"
                value={draftChannel.name}
                onChange={(e) => setDraftChannel((d) => ({ ...d, name: e.target.value }))}
                placeholder={t("campaign-delivery", "قناة-التنفيذ")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ch-topic">{t("Topic", "الموضوع")}</Label>
              <Input
                id="ch-topic"
                value={draftChannel.topic}
                onChange={(e) => setDraftChannel((d) => ({ ...d, topic: e.target.value }))}
              />
            </div>
            <Pill tone="brand">{t("You will be the first member", "ستكون العضو الأول")}</Pill>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button onClick={createChannel}>{t("Create", "إنشاء")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/chat")({ component: ChatPage });
