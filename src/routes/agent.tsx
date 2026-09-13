import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  Download,
  FileSpreadsheet,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Printer,
  RotateCcw,
  SendHorizontal,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Panel, Pill } from "../components/kit";
import { useApp } from "../lib/store";
import { getWorkspace } from "../lib/workspace-hub";
import { useHub, useRecords } from "../features/workspaces/provider";
import { closed, overdue } from "../features/workspaces/model";
import { useAgentSettings } from "../features/agent/agent-settings";
import { AgentPromptLibrary } from "../features/agent/agent-prompts";
import {
  AgentReadyBadge,
  AgentSetupCard,
  useAgentReadiness,
} from "../features/agent/agent-setup-card";
import {
  downloadHtml,
  exportConversationCsv,
  printConversation,
  type ExportMessage,
} from "../features/agent/agent-export";
import { AgentMessageRenderer, parseAgentMessage } from "../features/agent/agent-blocks";
import { AgentHistory } from "../features/agent/agent-history";
import { useConversations, type AgentMessage } from "../features/agent/use-conversations";
import {
  CONTINUE_PROMPT,
  MAX_CONTINUATIONS,
  joinContinuation,
} from "../features/agent/continuation";

type Attachment = { name: string; content: string; size: number };
type Message = AgentMessage;

function AgentPage() {
  const settings = useAgentSettings();
  const { activeWorkspace } = useApp();
  const [showSidebar, setShowSidebar] = useState(false);
  const { actor, users } = useHub();
  const rows = useRecords().filter((record) => record.workspaceId === activeWorkspace);
  const workspace = getWorkspace(activeWorkspace);
  const readiness = useAgentReadiness();
  const history = useConversations(actor.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Switching accounts must not carry one person's transcript into another's
  // history, so the open thread resets with the acting user.
  useEffect(() => {
    setMessages([]);
    setAttachments([]);
    setError(null);
  }, [actor.id]);

  const context = useMemo(
    () =>
      JSON.stringify({
        workspace: { id: workspace.id, title: workspace.title },
        actingUser: { name: actor.name, role: actor.role },
        summary: {
          total: rows.length,
          open: rows.filter((record) => !closed(record)).length,
          overdue: rows.filter((record) => !closed(record) && overdue(record)).length,
        },
        records: rows.slice(0, 120).map((record) => ({
          id: record.id,
          type: record.kind,
          title: record.title,
          status: record.status,
          priority: record.priority,
          owner: users.find((user) => user.id === record.ownerId)?.name,
          dueDate: record.dueDate,
          progress: record.progress,
          nextAction: record.nextAction,
        })),
      }),
    [workspace, actor, rows, users],
  );

  /** One call to the chat endpoint. `continuation` resumes a reply cut off at the limit. */
  const callAgent = async (payloadMessages: Message[], continuation = false) => {
    const response = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        providerId: settings.providerId,
        modelId: settings.modelId,
        apiKey: settings.activeKey,
        baseURL: settings.activeBaseUrl,
        configured: settings.configuredProviderIds,
        baseUrls: settings.baseUrlMap,
        workspaceContext: context,
        messages: payloadMessages,
        continuation,
      }),
    });
    const payload = (await response.json()) as {
      text?: string;
      error?: string;
      finishReason?: string;
    };
    if (!response.ok || !payload.text)
      throw new Error(payload.error ?? "The agent did not return an answer.");
    return payload;
  };

  const requestAgent = async (next: Message[]) => {
    if (sending) return;
    setMessages(next);
    setSending(true);
    setError(null);
    try {
      const first = await callAgent(next);
      let answer = first.text ?? "";
      let finishReason = first.finishReason;

      // Show the first part immediately, then keep resuming so a long reply is not
      // left truncated mid-sentence. Each round is appended to the same message.
      setMessages([...next, { role: "assistant", content: answer }]);

      for (let round = 0; round < MAX_CONTINUATIONS && finishReason === "length"; round += 1) {
        const resumed = await callAgent(
          [
            ...next,
            { role: "assistant", content: answer },
            { role: "user", content: CONTINUE_PROMPT },
          ],
          true,
        );
        const addition = resumed.text ?? "";
        if (!addition.trim()) break;
        answer = joinContinuation(answer, addition);
        finishReason = resumed.finishReason;
        setMessages([...next, { role: "assistant", content: answer }]);
      }

      if (finishReason === "length")
        setError(
          "The answer was still running when it reached the length limit. Ask the agent to continue for the rest.",
        );

      const settled: Message[] = [...next, { role: "assistant", content: answer }];
      setMessages(settled);
      history.save(settled, { provider: settings.provider.name, model: settings.modelId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The agent request failed.");
    } finally {
      setSending(false);
    }
  };

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = input.trim();
    if ((!text && !attachments.length) || sending) return;
    const attachmentContext = attachments
      .map(
        (file) =>
          `\n\n--- Attached file: ${file.name} (${file.size.toLocaleString()} bytes) ---\n${file.content}`,
      )
      .join("");
    const displayContent = text || "Review the attached file(s).";
    const next: Message[] = [
      ...messages,
      {
        role: "user",
        content: displayContent + attachmentContext,
        displayContent,
        attachments: attachments.map((file) => file.name),
      },
    ];
    setInput("");
    setAttachments([]);
    await requestAgent(next);
  };

  const retry = async () => {
    let lastUser = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "user") {
        lastUser = index;
        break;
      }
    }
    if (lastUser < 0 || sending) return;
    await requestAgent(messages.slice(0, lastUser + 1));
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const remaining = Math.max(0, 5 - attachments.length);
    const accepted = files.slice(0, remaining);
    const tooLarge = accepted.find((file) => file.size > 1_000_000);
    if (tooLarge) {
      setError(
        `${tooLarge.name} is larger than 1 MB. Use a smaller text, CSV, JSON, Markdown, HTML, XML, or log file.`,
      );
      return;
    }
    const loaded = await Promise.all(
      accepted.map(async (file) => ({
        name: file.name,
        size: file.size,
        content: await file.text(),
      })),
    );
    setAttachments((current) => [...current, ...loaded]);
    setError(
      files.length > remaining ? "A maximum of five files can be attached to one message." : null,
    );
  };

  const startNewConversation = () => {
    history.startNew();
    setMessages([]);
    setAttachments([]);
    setError(null);
  };

  const openConversation = (id: string) => {
    const conversation = history.open(id);
    if (!conversation) return;
    setMessages(conversation.messages);
    setAttachments([]);
    setError(null);
    setShowSidebar(true);
  };

  const toExportMessage = (message: Message, index: number): ExportMessage => {
    if (message.role === "user") {
      return {
        id: `message-${index}`,
        role: "user",
        parts: [
          {
            type: "text",
            text: `${message.displayContent ?? message.content}${
              message.attachments?.length ? `\nAttachments: ${message.attachments.join(", ")}` : ""
            }`,
          },
        ],
      };
    }

    const segments = parseAgentMessage(message.content);
    const parts = segments.map((seg) => {
      if (seg.type === "block") {
        return {
          type: `tool-${seg.payload.kind}`,
          input: {},
          output: { ok: true, render: seg.payload },
        };
      }
      if (seg.type === "code") {
        return {
          type: "text",
          text: `\`\`\`${seg.lang ?? ""}\n${seg.code}\n\`\`\``,
        };
      }
      return {
        type: "text",
        text: seg.content,
      };
    });

    return {
      id: `message-${index}`,
      role: "assistant",
      parts,
    };
  };

  const exportMessages: ExportMessage[] = messages.map(toExportMessage);
  const exportMeta = {
    provider: settings.provider.name,
    model: settings.modelId,
    scope: workspace.title,
    currency: "Workspace currencies",
  };

  /**
   * One answer is usually the thing worth keeping, so each reply exports on its
   * own rather than dragging the whole thread along.
   */
  const exportReply = (message: Message, index: number, format: "html" | "pdf" | "csv") => {
    const single = [toExportMessage(message, index)];
    if (format === "html") downloadHtml(single, exportMeta, "answer");
    else if (format === "pdf") printConversation(single, exportMeta);
    else exportConversationCsv(single, "answer");
  };

  return (
    <div className="w-full space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {workspace.title} · Operating assistant
          </p>
          <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Bot className="size-6 text-primary" /> TryGC AI Agent
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AgentReadyBadge ready={readiness.status?.ready ?? []} />
          {messages.length ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadHtml(exportMessages, exportMeta)}
              >
                <Download className="size-3.5" /> Export thread (HTML)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => printConversation(exportMessages, exportMeta)}
              >
                <Printer className="size-3.5" /> Export thread (PDF)
              </Button>
            </>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSidebar((s) => !s)}
            title={showSidebar ? "Hide sidebar" : "Show history, prompts & workspace info"}
          >
            {showSidebar ? (
              <>
                <PanelRightClose className="size-4" />
                <span className="hidden sm:inline">Hide sidebar</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="size-4" />
                <span className="hidden sm:inline">Briefs & info</span>
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/agent/settings">
              <Settings2 className="size-3.5" /> Settings
            </Link>
          </Button>
        </div>
      </header>
      {(readiness.status?.ready ?? []).length === 0 ? (
        <AgentSetupCard
          ready={readiness.status?.ready ?? []}
          onRecheck={readiness.recheck}
          checking={readiness.checking}
        />
      ) : null}
      <div
        className={`grid gap-4 ${
          showSidebar
            ? "xl:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_280px]"
            : "grid-cols-1"
        }`}
      >
        <Panel className="flex h-[calc(100vh-10.5rem)] flex-col overflow-hidden rounded-2xl border bg-card p-0 shadow-xs">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="mx-auto flex max-w-xl flex-col items-center py-20 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="size-5" />
                </span>
                <h2 className="mt-4 text-xl font-semibold">What needs attention?</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  The agent has a read-only snapshot of {rows.length} records in {workspace.title}.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <article
                  key={index}
                  className={
                    message.role === "user"
                      ? "ms-auto max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow-xs"
                      : "w-full rounded-2xl border bg-card/60 p-5 sm:p-7 text-sm text-card-foreground shadow-xs"
                  }
                >
                  {message.role === "user" ? (
                    <div>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {message.displayContent ?? message.content}
                      </p>
                      {message.attachments?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {message.attachments.map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1 rounded-md bg-primary-foreground/15 px-2 py-1 text-xs"
                            >
                              <FileText className="size-3" aria-hidden="true" /> {name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
                        <Bot className="size-3.5 text-primary" aria-hidden="true" />
                        <span>TryGC Operating Intelligence</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span>
                          {settings.provider.name} ({settings.modelId})
                        </span>
                        <div className="ms-auto flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => exportReply(message, index, "html")}
                            title="Export this answer as HTML"
                          >
                            <Download className="size-3.5" aria-hidden="true" /> HTML
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => exportReply(message, index, "csv")}
                            title="Export this answer as CSV"
                          >
                            <FileSpreadsheet className="size-3.5" aria-hidden="true" /> CSV
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => exportReply(message, index, "pdf")}
                            title="Export this answer as PDF"
                          >
                            <Printer className="size-3.5" aria-hidden="true" /> PDF
                          </Button>
                        </div>
                      </div>
                      <AgentMessageRenderer content={message.content} />
                    </div>
                  )}
                </article>
              ))
            )}
            {sending && (
              <p className="text-sm text-muted-foreground">Thinking with {settings.modelId}…</p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            {(error || messages.some((message) => message.role === "user")) && !sending ? (
              <Button variant="outline" size="sm" onClick={() => void retry()}>
                <RotateCcw className="size-4" /> Retry last request
              </Button>
            ) : null}
          </div>
          <form onSubmit={send} className="border-t p-4 sm:p-5">
            <label htmlFor="agent-message" className="mb-2 block text-sm font-medium">
              Message the agent
            </label>
            {attachments.length ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((file) => (
                  <span
                    key={file.name}
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-muted px-2.5 py-1.5 text-xs"
                  >
                    <FileText className="size-3.5" />
                    {file.name}
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((current) =>
                          current.filter((item) => item.name !== file.name),
                        )
                      }
                      className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <Textarea
                id="agent-message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={3}
                placeholder="What should I act on first today?"
                className="resize-none"
              />
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                multiple
                accept=".txt,.md,.csv,.json,.html,.xml,.log,text/*"
                onChange={(event) => void upload(event)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || attachments.length >= 5}
                aria-label="Attach files"
              >
                <Paperclip className="size-4" />
              </Button>
              <Button
                type="submit"
                size="icon"
                className="size-11 shrink-0"
                disabled={sending || (!input.trim() && !attachments.length)}
                aria-label="Send message"
              >
                <SendHorizontal className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Attach up to five text, CSV, JSON, Markdown, HTML, XML, or log files, 1 MB each.
            </p>
          </form>
        </Panel>
        {showSidebar ? (
          <aside className="h-[calc(100vh-10.5rem)] overflow-y-auto space-y-3">
            <Panel>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Connection
              </p>
              <p className="mt-2 font-medium">{settings.provider.name}</p>
              <p className="text-sm text-muted-foreground">{settings.modelId}</p>
            </Panel>
            <Panel>
              <AgentHistory
                summaries={history.summaries}
                currentId={history.currentId}
                onOpen={openConversation}
                onNew={startNewConversation}
                onRename={history.rename}
                onDelete={history.remove}
                onClearAll={history.clearAll}
              />
            </Panel>
            <Panel>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Suggested briefs
              </p>
              <AgentPromptLibrary compact onPick={setInput} />
            </Panel>
            <Panel>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Current scope
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone="brand">{workspace.title}</Pill>
                <Pill>{rows.length} records</Pill>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Responses use the current workspace snapshot. Refresh the page after major data
                changes.
              </p>
            </Panel>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function AgentRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname === "/agent" ? <AgentPage /> : <Outlet />;
}

export const Route = createFileRoute("/agent")({ component: AgentRoute });
