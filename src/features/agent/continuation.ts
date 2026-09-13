/**
 * Resuming an agent reply that stopped at the token ceiling.
 *
 * The chat endpoint reports `finishReason === "length"` when the model ran out of
 * output budget mid-answer. The client then asks it to carry on and stitches the
 * pieces together with the helpers here.
 */

/** How many times a single answer may be resumed before the user is asked to continue. */
export const MAX_CONTINUATIONS = 4;

/**
 * Whether a space belongs at the seam cannot be recovered from the text: "the
 * deliver" + "ables" must not gain one, while "items are" + "still" must. Only the
 * model knows which case it is, so it is told to supply the leading whitespace
 * itself and the halves are then concatenated exactly as given.
 */
export const CONTINUE_PROMPT =
  "Continue your previous response from exactly where it stopped. " +
  "Do not repeat anything you already wrote and do not add a preamble. " +
  "If it stopped in the middle of a word, begin with the remaining letters of that word and nothing else. " +
  "Otherwise begin with the whitespace that belongs at the join — a space, or a line break if a new line or block starts there.";

/**
 * Appends a resumed chunk to the partial answer.
 *
 * The join is a plain concatenation so the model's own spacing decision is kept
 * intact. The only cleanup is a leading "..." or "…" resume marker, which some
 * models emit out of habit and which would otherwise land mid-sentence; because
 * that marker replaces the real whitespace, a single space takes its place.
 */
export function joinContinuation(head: string, tail: string): string {
  if (!tail.trim()) return head;
  if (!head) return tail.trimStart();

  const marker = /^[ \t]*(?:\.{3}|…)[ \t]*/;
  if (marker.test(tail)) {
    const addition = tail.replace(marker, "");
    if (!addition.trim()) return head;
    return /\s$/.test(head) || /^\s/.test(addition) ? head + addition : `${head} ${addition}`;
  }

  return head + tail;
}
