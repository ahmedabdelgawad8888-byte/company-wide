import { recordSchema, type HubState } from "./model.ts";
export const STORAGE_KEY = "trygc-workspace-hub-operating-v2";
export interface Repository {
  load(): HubState | null;
  save(state: HubState, expectedRevision: number): void;
  /** Raw stored text, readable even when load() rejects it as corrupt. */
  exportRaw(): string | null;
  /** Drops the stored copy so the next load() reseeds from scratch. */
  clear(): void;
  /** Validates then writes a backup, replacing whatever is stored. */
  restore(raw: string): HubState;
}
const COLLECTIONS = [
  "records",
  "comments",
  "audit",
  "notifications",
  "rules",
  "runs",
  "views",
  "attachments",
  "executions",
] as const;

/**
 * Parses and fully validates stored workspace data. Exported so a restore can be
 * checked before it is written — otherwise importing a bad file would destroy the
 * good copy it was meant to replace.
 */
export function parseState(raw: string): HubState {
  const value = JSON.parse(raw) as HubState;
  if (
    value.version !== 2 ||
    !Number.isInteger(value.revision) ||
    !COLLECTIONS.every((k) => Array.isArray(value[k as keyof HubState]))
  )
    throw new Error(
      "Saved workspace data could not be read. Export a recovery copy before resetting storage.",
    );
  value.records.forEach((r) => recordSchema.parse(r));
  return value;
}

export class LocalRepository implements Repository {
  // Declared as a field rather than a constructor parameter property: Node's
  // strip-only TypeScript support cannot compile the latter, which would put this
  // module out of reach of the test suite.
  private storage: Storage;
  constructor(storage: Storage) {
    this.storage = storage;
  }
  load(): HubState | null {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseState(raw);
  }
  save(state: HubState, expectedRevision: number) {
    const current = this.load();
    if (current && current.revision !== expectedRevision)
      throw new Error("This workspace changed in another tab. Reload and try again.");
    this.storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  exportRaw() {
    return this.storage.getItem(STORAGE_KEY);
  }
  clear() {
    this.storage.removeItem(STORAGE_KEY);
  }
  restore(raw: string) {
    // Validate before writing so a malformed file cannot destroy the stored copy.
    const value = parseState(raw);
    this.storage.setItem(STORAGE_KEY, JSON.stringify(value));
    return value;
  }
}
