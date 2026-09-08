import { useCallback, useEffect, useRef, useState } from "react";

/** The transcript shape the agent page works with. */
export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  displayContent?: string;
  attachments?: string[];
}

const HISTORY_PREFIX = "trygc:agent-conversations:v2";

/** Each user keeps their ten most recent threads; older ones drop off. */
export const MAX_CONVERSATIONS = 10;
const MAX_MESSAGES_PER_CONVERSATION = 200;

/** History is per user, so switching accounts on one browser never mixes threads. */
export const storageKey = (userId: string) => `${HISTORY_PREFIX}:${userId}`;

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  provider?: string;
  model?: string;
  messages: AgentMessage[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  provider?: string;
  model?: string;
}

/**
 * Puts a thread at the top of the list, replacing any earlier copy of it, and
 * keeps only the newest {@link MAX_CONVERSATIONS} for that user.
 */
export function pushConversation(list: Conversation[], record: Conversation): Conversation[] {
  return [record, ...list.filter((item) => item.id !== record.id)].slice(0, MAX_CONVERSATIONS);
}

const newId = () => `cnv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function firstUserText(messages: AgentMessage[]) {
  for (const message of messages) {
    if (message.role !== "user") continue;
    const text = (message.displayContent ?? message.content).trim();
    if (text) return text;
  }
  return "";
}

/** Titles come from the opening question, which is how people recognise a thread. */
export function deriveTitle(messages: AgentMessage[]) {
  const text = firstUserText(messages);
  if (!text) return "New conversation";
  const firstLine = text.split("\n")[0]?.trim() ?? text;
  return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine;
}

function read(userId: string): Conversation[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) return [];
    // A stored list can predate the current cap, so trim on the way in too.
    return parsed
      .filter((item) => item && Array.isArray(item.messages))
      .slice(0, MAX_CONVERSATIONS);
  } catch {
    window.localStorage.removeItem(storageKey(userId));
    return [];
  }
}

function write(userId: string, conversations: Conversation[]) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(conversations));
  } catch {
    // Storage full: the session keeps working, history simply stops growing.
  }
}

export function useConversations(userId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // save() runs from an event handler, so it reads the live id without re-binding.
  const currentIdRef = useRef<string | null>(null);

  const selectCurrent = useCallback((id: string | null) => {
    currentIdRef.current = id;
    setCurrentId(id);
  }, []);

  useEffect(() => {
    setHydrated(false);
    const stored = read(userId);
    setConversations(stored);
    selectCurrent(null);
    setHydrated(true);
  }, [userId, selectCurrent]);

  const persist = useCallback(
    (next: Conversation[]) => {
      const capped = next.slice(0, MAX_CONVERSATIONS);
      setConversations(capped);
      write(userId, capped);
    },
    [userId],
  );

  /**
   * Writes the live transcript into the current thread, creating one on the
   * first exchange. Called after each turn settles rather than on every token.
   */
  const save = useCallback(
    (messages: AgentMessage[], meta: { provider?: string; model?: string }) => {
      if (!hydrated || !messages.length || !userId) return;
      const trimmed = messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
      const now = new Date().toISOString();
      const id = currentIdRef.current ?? newId();
      currentIdRef.current = id;
      setConversations((current) => {
        const existing = current.find((item) => item.id === id);
        const record: Conversation = {
          id,
          title:
            existing?.title && existing.title !== "New conversation"
              ? existing.title
              : deriveTitle(trimmed),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          ...(meta.provider ? { provider: meta.provider } : {}),
          ...(meta.model ? { model: meta.model } : {}),
          messages: trimmed,
        };
        const next = pushConversation(current, record);
        write(userId, next);
        return next;
      });
      setCurrentId(id);
    },
    [hydrated, userId],
  );

  // A fresh thread has no id until it has content, so an unused one is never stored.
  const startNew = useCallback(() => selectCurrent(null), [selectCurrent]);

  const open = useCallback(
    (id: string) => {
      const found = conversations.find((item) => item.id === id) ?? null;
      if (found) selectCurrent(id);
      return found;
    },
    [conversations, selectCurrent],
  );

  const remove = useCallback(
    (id: string) => {
      persist(conversations.filter((item) => item.id !== id));
      if (currentIdRef.current === id) selectCurrent(null);
    },
    [conversations, persist, selectCurrent],
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
    selectCurrent(null);
  }, [persist, selectCurrent]);

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
