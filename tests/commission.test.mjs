import test from "node:test";
import assert from "node:assert/strict";
import {
  acceleratorUplift,
  calculateCommission,
  calculatePerson,
  commissionCsv,
  creditShares,
  defaultPlans,
  normalizeTiers,
  rawCommission,
  tierRateAt,
} from "../src/features/workspaces/commission.ts";

const plan = (overrides = {}) => ({
  ...defaultPlans.sales,
  method: "flat",
  flatRate: 3,
  target: 1000000,
  floorPct: 0,
  acceleratorMultiplier: 1,
  acceleratorFromPct: 100,
  targetBonus: 0,
  capAmount: 0,
  clawbackRate: 0,
  splitOwnerShare: 100,
  roundTo: 1,
  ...overrides,
});

const source = (overrides = {}) => ({
  id: "s1",
  kind: "deal",
  title: "Deal",
  clientName: "Client",
  ownerId: "u1",
  collaborators: [],
  entityId: "sa",
  date: "2026-09-05",
  amount: 100000,
  currency: "SAR",
  baseAmount: 100000,
  status: "Won",
  atRisk: false,
  href: "",
  ...overrides,
});

const person = (id = "u1") => ({ id, name: `Person ${id}`, role: "Account Manager" });
const period = { from: "2026-09-01", to: "2026-09-30", label: "September" };
const tiers = [
  { from: 0, rate: 2 },
  { from: 500000, rate: 3 },
  { from: 1500000, rate: 4.5 },
];

test("normalizeTiers sorts, anchors at zero and drops repeated boundaries", () => {
  assert.deepEqual(normalizeTiers([{ from: 100, rate: 5 }]), [
    { from: 0, rate: 5 },
    { from: 100, rate: 5 },
  ]);
  assert.deepEqual(
    normalizeTiers([
      { from: 500, rate: 3 },
      { from: 0, rate: 1 },
    ]),
    [
      { from: 0, rate: 1 },
      { from: 500, rate: 3 },
    ],
  );
  assert.deepEqual(
    normalizeTiers([
      { from: 0, rate: 1 },
      { from: 500, rate: 3 },
      { from: 500, rate: 4 },
    ]),
    [
      { from: 0, rate: 1 },
      { from: 500, rate: 4 },
    ],
  );
  assert.deepEqual(normalizeTiers([]), [{ from: 0, rate: 0 }]);
});

test("flat method pays one rate on the whole volume", () => {
  assert.equal(rawCommission(plan(), 600000), 18000);
  assert.equal(rawCommission(plan(), 0), 0);
  assert.equal(tierRateAt(plan(), 600000), 3);
});

test("tiered method applies the reached tier rate to the whole volume", () => {
  const p = plan({ method: "tiered", tiers });
  assert.equal(tierRateAt(p, 600000), 3);
  assert.equal(rawCommission(p, 600000), 18000);
  assert.equal(rawCommission(p, 400000), 8000);
  assert.equal(rawCommission(p, 1600000), 72000);
});

test("progressive method pays each slice at its own tier rate", () => {
  const p = plan({ method: "progressive", tiers });
  // 500k @ 2% + 100k @ 3%
  assert.equal(rawCommission(p, 600000), 13000);
  // 500k @ 2% + 1m @ 3% + 100k @ 4.5%
  assert.equal(rawCommission(p, 1600000), 44500);
});

test("the floor blocks any payout below the required attainment", () => {
  const p = plan({ floorPct: 60 });
  const below = calculatePerson(p, person(), [
    { credited: 500000, atRisk: false, sourceId: "a", currency: "SAR", amount: 500000 },
  ]);
  assert.equal(below.belowFloor, true);
  assert.equal(below.net, 0);
  const above = calculatePerson(p, person(), [
    { credited: 700000, atRisk: false, sourceId: "a", currency: "SAR", amount: 700000 },
  ]);
  assert.equal(above.belowFloor, false);
  assert.equal(above.net, 21000);
});

test("the accelerator only uplifts commission earned above its threshold", () => {
  const p = plan({ acceleratorMultiplier: 1.25 });
  assert.equal(acceleratorUplift(p, 900000), 0);
  // 200k above target @ 3% = 6000, uplifted by 0.25
  assert.equal(acceleratorUplift(p, 1200000), 1500);
  assert.equal(acceleratorUplift(plan(), 1200000), 0);
});

test("target bonus is added once attainment reaches 100%", () => {
  const p = plan({ targetBonus: 5000 });
  assert.equal(calculatePerson(p, person(), [{ credited: 999999, atRisk: false }]).bonus, 0);
  assert.equal(calculatePerson(p, person(), [{ credited: 1000000, atRisk: false }]).bonus, 5000);
});

test("clawback scales with the at-risk share of volume", () => {
  const p = plan({ acceleratorMultiplier: 1.25, targetBonus: 5000, clawbackRate: 50 });
  const result = calculatePerson(p, person(), [
    { credited: 900000, atRisk: false },
    { credited: 300000, atRisk: true },
  ]);
  assert.equal(result.volume, 1200000);
  assert.equal(result.atRiskVolume, 300000);
  assert.equal(result.gross, 42500); // 36000 + 1500 accelerator + 5000 bonus
  assert.equal(result.clawback, 5312.5); // 42500 * 0.25 * 50%
  assert.equal(result.net, 37188); // rounded to the nearest SAR
});

test("the cap trims the payout and records the adjustment", () => {
  const p = plan({ capAmount: 20000 });
  const result = calculatePerson(p, person(), [{ credited: 1200000, atRisk: false }]);
  assert.equal(result.gross, 36000);
  assert.equal(result.net, 20000);
  assert.equal(result.capAdjustment, -16000);
});

test("shared work splits credit between the owner and collaborators", () => {
  const p = plan({ splitOwnerShare: 70 });
  const shared = source({ collaborators: ["u2", "u3"] });
  assert.deepEqual(creditShares(shared, p), [
    { personId: "u1", share: 0.7 },
    { personId: "u2", share: 0.15 },
    { personId: "u3", share: 0.15 },
  ]);
  // A 100% owner share leaves nothing to split.
  assert.deepEqual(creditShares(shared, plan()), [{ personId: "u1", share: 1 }]);
  // The owner is never double-credited as their own collaborator.
  assert.deepEqual(creditShares(source({ collaborators: ["u1"] }), p), [
    { personId: "u1", share: 1 },
  ]);
});

test("a run credits each person their own share and only inside the period", () => {
  const p = plan({ splitOwnerShare: 70, target: 0 });
  const run = calculateCommission(
    p,
    [
      source({ id: "in", baseAmount: 200000, collaborators: ["u2"] }),
      source({ id: "before", date: "2026-08-31", baseAmount: 500000 }),
      source({ id: "after", date: "2026-10-01", baseAmount: 500000 }),
    ],
    [person("u1"), person("u2")],
    period,
  );
  const owner = run.people.find((x) => x.personId === "u1");
  const collaborator = run.people.find((x) => x.personId === "u2");
  assert.equal(owner.volume, 140000);
  assert.equal(collaborator.volume, 60000);
  assert.equal(owner.net, 4200);
  assert.equal(collaborator.net, 1800);
  assert.equal(run.totals.volume, 200000);
  assert.equal(run.totals.net, 6000);
  assert.equal(run.totals.payees, 2);
});

test("volume owned by people outside the viewer's scope is not credited", () => {
  const run = calculateCommission(
    plan({ target: 0 }),
    [source({ ownerId: "hidden", baseAmount: 900000 }), source({ id: "s2", baseAmount: 100000 })],
    [person("u1")],
    period,
  );
  assert.equal(run.people.length, 1);
  assert.equal(run.totals.volume, 100000);
});

test("line commission allocation adds up to the person's net payout", () => {
  const run = calculateCommission(
    plan({ target: 0 }),
    [source({ id: "a", baseAmount: 300000 }), source({ id: "b", baseAmount: 700000 })],
    [person("u1")],
    period,
  );
  const owner = run.people[0];
  const allocated = owner.lines.reduce((n, line) => n + line.commission, 0);
  assert.equal(owner.net, 30000);
  assert.equal(Math.round(allocated), owner.net);
  assert.equal(owner.lines[0].sourceId, "b"); // largest credited line first
});

test("the statement export carries a row per line plus a person total", () => {
  const run = calculateCommission(
    plan({ target: 0 }),
    [source({ id: "a", baseAmount: 300000, title: 'Deal "A", phase 2' })],
    [person("u1")],
    period,
  );
  const csv = commissionCsv(run, "SAR").split("\n");
  assert.equal(csv.length, 3);
  assert.match(csv[0], /^Person,Role,Record/);
  assert.match(csv[1], /"Deal ""A"", phase 2"/);
  assert.match(csv[2], /TOTAL/);
});
