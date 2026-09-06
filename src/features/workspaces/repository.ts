import { recordSchema, type HubState } from "./model";
export const STORAGE_KEY = "trygc-workspace-hub-operating-v2";
export interface Repository {
  load(): HubState | null;
  save(state: HubState, expectedRevision: number): void;
}
export class LocalRepository implements Repository {
  constructor(private storage: Storage) {}
  load(): HubState | null {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as HubState;
    if (
      value.version !== 2 ||
      !Number.isInteger(value.revision) ||
      ![
        "records",
        "comments",
        "audit",
        "notifications",
        "rules",
        "runs",
        "views",
        "attachments",
        "executions",
      ].every((k) => Array.isArray(value[k as keyof HubState]))
    )
      throw new Error(
        "Saved workspace data could not be read. Export a recovery copy before resetting storage.",
      );
    value.records.forEach((r) => recordSchema.parse(r));
    return value;
  }
  save(state: HubState, expectedRevision: number) {
    const current = this.load();
    if (current && current.revision !== expectedRevision)
      throw new Error("This workspace changed in another tab. Reload and try again.");
    this.storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
