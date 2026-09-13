import test from "node:test";
import assert from "node:assert/strict";
import { LocalRepository, STORAGE_KEY, parseState } from "../src/features/workspaces/repository.ts";
import { emptyState } from "../src/features/workspaces/service.ts";

/** Minimal in-memory stand-in for window.localStorage. */
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    get size() {
      return map.size;
    },
  };
}

const validRaw = () => JSON.stringify(emptyState());

test("parseState accepts a well-formed state", () => {
  const state = parseState(validRaw());
  assert.equal(state.version, 2);
  assert.deepEqual(state.records, []);
});

test("parseState rejects a state from a different schema version", () => {
  const stale = { ...emptyState(), version: 1 };
  assert.throws(() => parseState(JSON.stringify(stale)), /could not be read/);
});

test("parseState rejects a state with a missing collection", () => {
  const broken = { ...emptyState() };
  delete broken.attachments;
  assert.throws(() => parseState(JSON.stringify(broken)), /could not be read/);
});

test("parseState rejects a state whose records fail the record schema", () => {
  const broken = { ...emptyState(), records: [{ id: "nope" }] };
  assert.throws(() => parseState(JSON.stringify(broken)));
});

test("load returns null when nothing has been stored yet", () => {
  const repo = new LocalRepository(fakeStorage());
  assert.equal(repo.load(), null);
});

test("exportRaw returns the stored text even when it is corrupt", () => {
  const storage = fakeStorage({ [STORAGE_KEY]: "{not json" });
  const repo = new LocalRepository(storage);

  // The whole point of the recovery copy: load() fails, export still works.
  assert.throws(() => repo.load());
  assert.equal(repo.exportRaw(), "{not json");
});

test("clear drops the stored copy so the next load reseeds", () => {
  const storage = fakeStorage({ [STORAGE_KEY]: validRaw() });
  const repo = new LocalRepository(storage);

  repo.clear();
  assert.equal(repo.exportRaw(), null);
  assert.equal(repo.load(), null);
});

test("restore validates before writing, so a bad file cannot destroy good data", () => {
  const storage = fakeStorage({ [STORAGE_KEY]: validRaw() });
  const repo = new LocalRepository(storage);

  assert.throws(() => repo.restore("{not json"));
  assert.throws(() => repo.restore(JSON.stringify({ ...emptyState(), version: 1 })));

  // The original copy is untouched.
  assert.equal(repo.exportRaw(), validRaw());
});

test("restore replaces the stored copy with a valid backup", () => {
  const storage = fakeStorage({ [STORAGE_KEY]: validRaw() });
  const repo = new LocalRepository(storage);

  const backup = { ...emptyState(), revision: 7 };
  const restored = repo.restore(JSON.stringify(backup));

  assert.equal(restored.revision, 7);
  assert.equal(repo.load().revision, 7);
});

test("save rejects a write built on a stale revision", () => {
  const storage = fakeStorage();
  const repo = new LocalRepository(storage);

  repo.save({ ...emptyState(), revision: 1 }, 0);

  // Another tab already moved storage to revision 1; a write expecting 0 must fail.
  assert.throws(() => repo.save({ ...emptyState(), revision: 2 }, 0), /changed in another tab/);
  assert.equal(repo.load().revision, 1);
});

test("save accepts a write built on the current revision", () => {
  const repo = new LocalRepository(fakeStorage());

  repo.save({ ...emptyState(), revision: 1 }, 0);
  repo.save({ ...emptyState(), revision: 2 }, 1);

  assert.equal(repo.load().revision, 2);
});
