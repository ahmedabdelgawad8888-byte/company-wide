import test from "node:test";
import assert from "node:assert/strict";
import * as seed from "../src/lib/data/pmo-seed.ts";
import {
  buildOverview,
  moduleSummaries,
  ownerSummaries,
  waveSummaries,
  weeklyLoad,
  weekLabel,
  scheduleHealth,
  raidRanking,
} from "../src/features/pmo/analytics.ts";

const input = {
  requirements: seed.pmoRequirements,
  stages: seed.pmoE2EStages,
  milestones: seed.pmoMilestones,
  raid: seed.pmoRaidItems,
  questions: seed.pmoQuestions,
  actions: seed.pmoActions,
  planStart: seed.pmoPlanConfig.planStartDate,
  today: "2026-09-06",
};

test("overview totals reconcile to the workbook baseline", () => {
  const o = buildOverview(input);
  assert.equal(o.requirements, 97);
  assert.equal(o.effort, 255);
  assert.equal(o.delivered, 17);
  assert.equal(o.blocked, 3);
  assert.equal(o.p0, 19);
  // Sum of wave effort must equal the register effort, not a separate constant.
  assert.equal(
    o.waves.reduce((n, w) => n + w.effort, 0),
    255,
  );
  assert.equal(
    o.waves.reduce((n, w) => n + w.count, 0),
    97,
  );
  assert.equal(
    o.owners.reduce((n, x) => n + x.effort, 0),
    255,
  );
  assert.equal(
    o.modules.reduce((n, x) => n + x.effort, 0),
    255,
  );
});

test("every requirement lands in exactly one wave, owner and module bucket", () => {
  const waves = waveSummaries(seed.pmoRequirements);
  const owners = ownerSummaries(seed.pmoRequirements);
  const modules = moduleSummaries(seed.pmoRequirements);
  assert.equal(
    waves.reduce((n, w) => n + w.count, 0),
    seed.pmoRequirements.length,
  );
  assert.equal(
    owners.reduce((n, x) => n + x.count, 0),
    seed.pmoRequirements.length,
  );
  assert.equal(
    modules.reduce((n, x) => n + x.count, 0),
    seed.pmoRequirements.length,
  );
});

test("weekly load groups by ETA ISO week and never invents dates", () => {
  const load = weeklyLoad(seed.pmoRequirements);
  assert.ok(load.length > 0);
  assert.equal(
    load.reduce((n, w) => n + w.count, 0),
    seed.pmoRequirements.length,
  );
  for (const w of load) assert.match(w.week, /^\d{4}-W\d{2}$/);
  // Reference weeks are Monday-based and stable for known dates.
  assert.equal(weekLabel("2026-09-21"), "2026-W39");
});

test("nothing is flagged overdue before the plan starts", () => {
  const before = scheduleHealth(seed.pmoRequirements, "2026-09-01");
  assert.equal(before.overdue.length, 0);
  const after = scheduleHealth(seed.pmoRequirements, "2027-01-01");
  assert.ok(after.overdue.length > 0);
});

test("RAID ranking orders High×High above Low×Low", () => {
  const ranked = raidRanking(seed.pmoRaidItems);
  assert.equal(ranked.length, seed.pmoRaidItems.length);
  assert.ok(ranked[0].score >= ranked.at(-1).score);
});
