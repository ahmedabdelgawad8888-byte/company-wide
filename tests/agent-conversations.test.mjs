import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CONVERSATIONS,
  deriveTitle,
  pushConversation,
  storageKey,
} from "../src/features/agent/use-conversations.ts";

const thread = (id, title = id) => ({
  id,
  title,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  messages: [{ role: "user", content: title }],
});

test("history keeps ten conversations per user", () => {
  assert.equal(MAX_CONVERSATIONS, 10);
  let list = [];
  for (let index = 1; index <= 14; index += 1) list = pushConversation(list, thread(`c${index}`));
  assert.equal(list.length, 10);
  // Newest first, and the four oldest have dropped off.
  assert.equal(list[0].id, "c14");
  assert.equal(list.at(-1).id, "c5");
  assert.ok(!list.some((item) => item.id === "c4"));
});

test("re-saving a thread moves it to the top instead of adding a copy", () => {
  const list = pushConversation([thread("a"), thread("b"), thread("c")], {
    ...thread("c"),
    title: "Updated",
  });
  assert.equal(list.length, 3);
  assert.equal(list[0].id, "c");
  assert.equal(list[0].title, "Updated");
  assert.deepEqual(
    list.map((item) => item.id),
    ["c", "a", "b"],
  );
});

test("each user gets their own storage bucket", () => {
  assert.notEqual(storageKey("core-essmat"), storageKey("sales-lead"));
  assert.ok(storageKey("core-essmat").endsWith(":core-essmat"));
});

test("titles come from the first user message", () => {
  assert.equal(deriveTitle([]), "New conversation");
  assert.equal(
    deriveTitle([
      { role: "assistant", content: "Hello" },
      { role: "user", content: "Full prompt with context", displayContent: "What is overdue?" },
    ]),
    "What is overdue?",
  );
  const long = "x".repeat(80);
  assert.equal(deriveTitle([{ role: "user", content: long }]), `${"x".repeat(60)}…`);
});
