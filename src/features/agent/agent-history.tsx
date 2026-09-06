import { useState } from "react";

import { Check, MessageSquarePlus, Pencil, Trash2, X } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

import type { ConversationSummary } from "./use-conversations";

function relativeTime(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

export function AgentHistory({
  summaries,
  currentId,
  onOpen,
  onNew,
  onRename,
  onDelete,
  onClearAll,
}: {
  summaries: ConversationSummary[];
  currentId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);

  const commitRename = (id: string) => {
    onRename(id, draft);
    setEditingId(null);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium text-sm">History</p>
          <p className="text-muted-foreground text-xs">
            {summaries.length
              ? `${summaries.length} saved ${summaries.length === 1 ? "conversation" : "conversations"}, in this browser.`
              : "Conversations are saved here as you go."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onNew}>
          <MessageSquarePlus className="size-3.5" aria-hidden="true" /> New
        </Button>
      </div>

      {summaries.length > 0 && (
        <>
          <div className="max-h-72 divide-y overflow-y-auto rounded-lg border">
            {summaries.map((item) => {
              const active = item.id === currentId;
              if (editingId === item.id) {
                return (
                  <div key={item.id} className="flex items-center gap-1 p-2">
                    <Input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitRename(item.id);
                        }
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      className="h-8"
                      aria-label="Conversation title"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => commitRename(item.id)}
                      aria-label="Save title"
                    >
                      <Check className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel rename"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                );
              }
              return (
                <div
                  key={item.id}
                  className={
                    active ? "flex items-center gap-1 bg-accent p-2" : "flex items-center gap-1 p-2"
                  }
                >
                  <button
                    type="button"
                    onClick={() => onOpen(item.id)}
                    className="min-w-0 flex-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="truncate font-medium text-sm">{item.title}</p>
                    <p className="truncate text-muted-foreground text-xs">
                      {relativeTime(item.updatedAt)} · {item.messageCount} messages
                      {item.model ? ` · ${item.model}` : ""}
                    </p>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(item.id);
                      setDraft(item.title);
                    }}
                    aria-label={`Rename ${item.title}`}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(item.id)}
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              );
            })}
          </div>

          {confirmingClear ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm">Delete every saved conversation?</p>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  onClearAll();
                  setConfirmingClear(false);
                }}
              >
                Delete all
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmingClear(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="self-start"
              onClick={() => setConfirmingClear(true)}
            >
              <Trash2 className="size-3.5" aria-hidden="true" /> Clear history
            </Button>
          )}
        </>
      )}
    </div>
  );
}
