import { useCallback, useEffect, useState } from "react";

import type { UIMessage } from "ai";

const HISTORY_KEY = "trygc:agent-conversations:v1";

/** Enough to keep a working session without exhausting browser storage. */
const MAX_CONVERSATIONS = 40;
const MAX_MESSAGES_PER_CONVERSATION = 200;

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  provider?: string;
  model?: string;
  messages: UIMessage[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  provider?: string;
  model?: string;
}

const newId = () => `cnv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function firstUserText(messages: UIMessage[]) {
  for (const message of messages) {
    if (message.role !== "user") continue;
    for (const part of message.parts) {
      if (part.type === "text" && part.text.trim()) return part.text.trim();
    }
  }
  return "";
}

/** Titles come from the opening question, which is how people recognise a thread. */
export function deriveTitle(messages: UIMessage[]) {
  const text = firstUserText(messages);
  if (!text) return "New conversation";
  const firstLine = text.split("\n")[0]?.trim() ?? text;
  return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine;
}

function read(): Conversation[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(HISTORY_KEY);
    return [];
  }
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = read();
    setConversations(stored);
    setCurrentId(stored[0]?.id ?? null);
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Conversation[]) => {
    setConversations(next);
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, MAX_CONVERSATIONS)));
    } catch {
      // Storage full: the session keeps working, history simply stops growing.
    }
  }, []);

  /**
   * Writes the live transcript into the current thread, creating one on the
   * first exchange. Called after each turn settles rather than on every token.
   */
  const save = useCallback(
    (messages: UIMessage[], meta: { provider?: string; model?: string }) => {
      if (!hydrated || !messages.length) return;
      const trimmed = messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
      const now = new Date().toISOString();
      setConversations((current) => {
        const id = currentId ?? newId();
        const existing = current.find((item) => item.id === id);
        // Opening a thread replays its own messages; rewriting them would only
        // bump the timestamp and reorder the list for a read.
        const unchanged =
          existing?.messages.length === trimmed.length && existing?.messages.at(-1)?.id === trimmed.at(-1)?.id;
        if (unchanged) return current;
        const record: Conversation = {
          id,
          title: existing?.title && existing.title !== "New conversation" ? existing.title : deriveTitle(trimmed),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          ...(meta.provider ? { provider: meta.provider } : {}),
          ...(meta.model ? { model: meta.model } : {}),
          messages: trimmed,
        };
        const next = [record, ...current.filter((item) => item.id !== id)].slice(0, MAX_CONVERSATIONS);
        try {
          window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {
          // Ignored for the same reason as above.
        }
        if (!currentId) setCurrentId(id);
        return next;
      });
    },
    [currentId, hydrated],
  );

  // A fresh thread has no id until it has content, so an unused one is never stored.
  const startNew = useCallback(() => setCurrentId(null), []);

  const open = useCallback(
    (id: string) => {
      setCurrentId(id);
      return conversations.find((item) => item.id === id) ?? null;
    },
    [conversations],
  );

  const remove = useCallback(
    (id: string) => {
      const next = conversations.filter((item) => item.id !== id);
      persist(next);
      if (currentId === id) setCurrentId(null);
    },
    [conversations, currentId, persist],
  );

  const rename = useCallback(
    (id: string, title: string) => {
      const clean = title.trim();
      if (!clean) return;
      persist(conversations.map((item) => (item.id === id ? { ...item, title: clean } : item)));
    },
    [conversations, persist],
  );

  const clearAll = useCallback(() => {
    persist([]);
    setCurrentId(null);
  }, [persist]);

  const summaries: ConversationSummary[] = conversations.map((item) => ({
    id: item.id,
    title: item.title,
    updatedAt: item.updatedAt,
    messageCount: item.messages.length,
    ...(item.provider ? { provider: item.provider } : {}),
    ...(item.model ? { model: item.model } : {}),
  }));

  return { hydrated, summaries, currentId, save, startNew, open, remove, rename, clearAll };
}
