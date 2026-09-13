import test from "node:test";
import assert from "node:assert/strict";
import { emptyState } from "../src/features/workspaces/service.ts";
import {
  ensurePmoWorkspace,
  workbookRecords,
  pmoOwners,
} from "../src/features/workspaces/pmo-seed.ts";
import { recordSchema, overdue } from "../src/features/workspaces/model.ts";
import * as p from "../src/lib/data/pmo-seed.ts";

test("complete workbook register and effort are preserved", () => {
  assert.equal(p.pmoRequirements.length, 97);
  assert.equal(
    p.pmoRequirements.reduce((n, r) => n + r.effortDays, 0),
    255,
  );
  assert.equal(p.pmoActions.length, 18);
  assert.equal(p.pmoQuestions.length, 12);
  for (const requirement of p.pmoRequirements) {
    const record = workbookRecords().find(
      (r) => r.details.sourceSheet === "Master Register" && r.details.sourceKey === requirement.id,
    );
    assert.ok(record);
    assert.equal(record.startDate, requirement.startDate);
    assert.equal(record.dueDate, requirement.etaDate);
    assert.equal(pmoOwners.find((u) => u.id === record.ownerId).name, requirement.ownerRole);
    assert.equal(record.details.effortDays, String(requirement.effortDays));
  }
});

test("migration archives old generated records preserving edits and is idempotent", () => {
  const s = emptyState();
  s.records.push({
    ...workbookRecords()[0],
    id: "PMO-WAVE-W0",
    sourceId: "PMO delivery plan baseline",
    title: "Local edit",
  });
  ensurePmoWorkspace(s, []);
  assert.equal(s.records[0].title, "Local edit");
  assert.equal(s.records[0].archived, true);
  const imported = s.records.find((r) => r.id !== "PMO-WAVE-W0");
  imported.title = "My execution update";
  const before = JSON.stringify(s);
  assert.equal(ensurePmoWorkspace(s, []), false);
  assert.equal(JSON.stringify(s), before);
});

test("all imported records validate; undated RAID records are not invented overdue work", () => {
  for (const r of workbookRecords()) {
    recordSchema.parse(r);
    assert.equal(pmoOwners.find((u) => u.id === r.ownerId).name, r.details.sourceOwner);
    if (r.details.sourceSheet === "RAID Log") {
      assert.equal(r.dueDate, "");
      assert.equal(overdue(r), false);
    }
  }
});
