import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTINUE_PROMPT,
  MAX_CONTINUATIONS,
  joinContinuation,
} from "../src/features/agent/continuation.ts";

// The model is instructed to supply the whitespace that belongs at the seam, so the
// join keeps its spacing verbatim instead of guessing where a space is wanted.

test("a reply cut mid-word is rejoined without inserting a space", () => {
  assert.equal(joinContinuation("the deliver", "ables are late"), "the deliverables are late");
});

test("a reply cut between words keeps the space the model supplied", () => {
  assert.equal(
    joinContinuation("three items are", " still overdue"),
    "three items are still overdue",
  );
});

test("a continuation that starts a new block keeps its line breaks", () => {
  assert.equal(
    joinContinuation("Section one.", "\n\nSection two."),
    "Section one.\n\nSection two.",
  );
  assert.equal(
    joinContinuation("Section one.\n\n", "Section two."),
    "Section one.\n\nSection two.",
  );
});

test("a leading ellipsis marker is replaced by a single space", () => {
  assert.equal(joinContinuation("the plan is", "... to escalate"), "the plan is to escalate");
  assert.equal(joinContinuation("the plan is", "…to escalate"), "the plan is to escalate");
});

test("an ellipsis marker does not double an existing space", () => {
  assert.equal(joinContinuation("the plan is ", "... to escalate"), "the plan is to escalate");
});

test("an empty or whitespace-only continuation leaves the answer untouched", () => {
  assert.equal(joinContinuation("complete answer", ""), "complete answer");
  assert.equal(joinContinuation("complete answer", "   "), "complete answer");
  assert.equal(joinContinuation("complete answer", "..."), "complete answer");
});

test("an empty head returns the continuation without leading space", () => {
  assert.equal(joinContinuation("", "  opening line"), "opening line");
});

test("markdown table rows survive being split across a continuation", () => {
  const head = "| Record | Owner |\n| --- | --- |\n| R-1 | Sara |\n| R-2 | Ah";
  assert.equal(joinContinuation(head, "med |"), `${head}med |`);
});

test("a fenced json block split across a continuation stays parseable", () => {
  const head = '```json:metrics\n{\n  "tiles": [\n    { "label": "Open", "val';
  const joined = joinContinuation(head, 'ue": "12" }\n  ]\n}\n```');
  assert.match(joined, /"value": "12"/);
  assert.equal(joined.match(/```/g).length, 2);
});

test("the continue prompt tells the model to own the spacing decision", () => {
  assert.ok(MAX_CONTINUATIONS >= 1);
  assert.match(CONTINUE_PROMPT, /Do not repeat/i);
  assert.match(CONTINUE_PROMPT, /middle of a word/i);
});
