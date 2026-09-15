import test from "node:test";
import assert from "node:assert/strict";
import { canEditPmo, validatePmoRecord } from "../src/lib/pmo-management.ts";
import { workbookRecords } from "../src/features/workspaces/pmo-seed.ts";
import * as baseline from "../src/lib/data/pmo-seed.ts";
test("PMO editing is limited to active global administrators and PMO members", () => {
  const actor = { role: "Business Analyst", workspaceId: "pmo", status: "active" };
  assert.equal(canEditPmo(actor), true);
  assert.equal(canEditPmo({ ...actor, status: "suspended" }), false);
  assert.equal(canEditPmo({ ...actor, role: "Viewer" }), false);
  assert.equal(canEditPmo({ ...actor, workspaceId: "hr" }), false);
});
test("PMO rejects invalid progress, effort and inverted requirement dates", () => {
  assert.throws(() => validatePmoRecord({ id: "R", percentDone: 101 }), /Progress/);
  assert.throws(() => validatePmoRecord({ id: "R", effortDays: -1 }), /non-negative/);
  assert.throws(
    () => validatePmoRecord({ id: "R", startDate: "2026-09-20", etaDate: "2026-09-19" }),
    /Finish date/,
  );
  assert.doesNotThrow(() => validatePmoRecord({ id: "R", percentDone: 65, effortDays: 4 }));
});
test("PMO operational records follow edited requirements and exclude removed ones", () => {
  const original = baseline.pmoRequirements[0];
  const records = workbookRecords({
    ...baseline,
    pmoRequirements: [{ ...original, title: "Updated requirement", percentDone: 73 }],
  });
  const requirements = records.filter((r) => r.details.sourceSheet === "Master Register");
  assert.equal(requirements.length, 1);
  assert.match(requirements[0].title, /Updated requirement/);
  assert.equal(requirements[0].progress, 73);
});
