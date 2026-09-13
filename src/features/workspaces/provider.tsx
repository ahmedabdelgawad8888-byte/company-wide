import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useApp } from "../../lib/store";
import { LocalRepository, STORAGE_KEY } from "./repository";
import { seedHub } from "./seed";
import { emptyState, sweep, visible } from "./service";
import { today, type Actor, type HubState } from "./model";
import { ensureITWorkspace } from "./it-seed";
import { ensurePmoWorkspace, pmoOwners } from "./pmo-seed";

type HubContext = {
  state: HubState;
  ready: boolean;
  error: string;
  actor: Actor;
  users: Actor[];
  transact: <T>(fn: (s: HubState) => T) => T;
  reload: () => void;
};
const Ctx = createContext<HubContext | null>(null);
/**
 * Resolves the reporting tree once: every person gets the ids of everyone reporting
 * to them, directly or further down the line. A supervisor's visibility is built on this.
 */
export function withReportIds<T extends { id: string; managerId?: string }>(people: T[]) {
  const children = new Map<string, string[]>();
  for (const person of people)
    if (person.managerId && person.managerId !== person.id)
      children.set(person.managerId, [...(children.get(person.managerId) ?? []), person.id]);
  const collect = (id: string, seen = new Set<string>()): string[] => {
    for (const childId of children.get(id) ?? [])
      if (!seen.has(childId)) {
        seen.add(childId);
        collect(childId, seen);
      }
    return [...seen];
  };
  return people.map((person) => ({ ...person, reportIds: collect(person.id) }));
}
export function HubProvider({ children }: { children: ReactNode }) {
  const { db, currentUser } = useApp();
  const [state, setState] = useState<HubState>(emptyState);
  const latest = useRef(state);
  const repo = useRef<LocalRepository | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  // Every actor carries the ids of everyone below them in the workspace hierarchy,
  // so record visibility can be resolved without re-walking the directory each time.
  const users = withReportIds([...db.users, ...pmoOwners]);
  const actor = users.find((u) => u.id === currentUser.id) ?? currentUser;
  const initialDb = useRef(db);
  const reload = () => {
    try {
      repo.current = new LocalRepository(window.localStorage);
      const stored = repo.current.load();
      const next = stored ?? seedHub(initialDb.current);
      if (!stored) repo.current.save(next, 0);
      else {
        const itAdded = ensureITWorkspace(next, users);
        const pmoAdded = ensurePmoWorkspace(next, users);
        if (itAdded || pmoAdded) {
          const previousRevision = next.revision;
          next.revision += 1;
          repo.current.save(next, previousRevision);
        }
      }
      latest.current = next;
      setState(next);
      setError("");
      setReady(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Storage unavailable. Enable local storage and retry.",
      );
      setReady(false);
    }
  };
  useEffect(() => {
    reload();
    const listener = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) reload();
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);
  function transact<T>(fn: (s: HubState) => T): T {
    if (!ready || !repo.current) throw new Error("Workspace storage is not ready.");
    const base = latest.current;
    const next = structuredClone(base);
    const result = fn(next);
    next.revision = base.revision + 1;
    repo.current.save(next, base.revision);
    latest.current = next;
    setState(next);
    return result;
  }
  useEffect(() => {
    if (!ready) return;
    const run = () => {
      try {
        const base = latest.current;
        const next = structuredClone(base);
        sweep(next, actor, today(), new Date().toTimeString().slice(0, 5));
        if (JSON.stringify(next) !== JSON.stringify(base)) {
          next.revision = base.revision + 1;
          repo.current?.save(next, base.revision);
          latest.current = next;
          setState(next);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Automation could not run.");
      }
    };
    run();
    const timer = window.setInterval(run, 60000);
    return () => window.clearInterval(timer);
  }, [ready, actor.id]);
  return (
    <Ctx.Provider value={{ state, ready, error, actor, users, transact, reload }}>
      {children}
    </Ctx.Provider>
  );
}
export function useHub() {
  const c = useContext(Ctx);
  if (!c) throw new Error("HubProvider missing");
  return c;
}
export function useRecords() {
  const { state, actor } = useHub();
  return state.records.filter((r) => visible(actor, r));
}
