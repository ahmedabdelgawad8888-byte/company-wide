"""Read-only comparison of the attached PMO workbook with the application seeds.

Run: python scripts/audit-pmo-workbook.py [workbook.xlsx]
Requires openpyxl and Node with TypeScript stripping support.
Writes evidence only under artifacts/pmo-audit; never changes app/user data.
"""
import csv
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / ".dr-claw/chat-attachments/1789291215264/TryGC_PMO_Dashboard.xlsx"
OUT = ROOT / "artifacts/pmo-audit"
OUT.mkdir(parents=True, exist_ok=True)
result = subprocess.run(
    ["node", "--experimental-strip-types", "--input-type=module", "-e",
     "import * as p from './src/lib/data/pmo-seed.ts';"
     "import {ensurePmoWorkspace} from './src/features/workspaces/pmo-seed.ts';"
     "import {emptyState} from './src/features/workspaces/service.ts';"
     "const s=emptyState();ensurePmoWorkspace(s,[]);"
     "console.log(JSON.stringify({...p,hubRecords:s.records}));"],
    cwd=ROOT, capture_output=True, text=True, encoding="utf-8", check=True,
)
app = json.loads(result.stdout)
wb = openpyxl.load_workbook(SOURCE, data_only=False)
start = wb["Plan Config"]["B6"].value


def clean(value):
    if isinstance(value, (dt.datetime, dt.date)):
        return value.strftime("%Y-%m-%d")
    return "" if value is None else value


def refs(value):
    # Padding is presentation, but dropped references are substantive.
    return re.sub(r"\b([A-Z]+)-(\d+)\b", lambda m: f"{m[1]}-{int(m[2]):02}", str(value))


def rows(sheet, fields, end):
    return [
        {key: clean(value) for key, value in zip(fields, row) if key}
        for row in wb[sheet].iter_rows(min_row=6, max_row=end, values_only=True)
    ]


requirements = rows("Master Register", [
    "id", "module", "moduleAr", "docNumber", "title", "titleAr", "description",
    "docStatus", "pmoStatus", "priority", "size", "effortDays", "wave", "waveName",
    "ownerRole", "e2eStage", "startDate", "etaDate", "etaWeek", "durationDays",
    "dependencies", "acceptanceCriteria", "clarificationNeeded", "percentDone", None, "notes",
], 102)
for index, row in enumerate(requirements, 6):
    # Evaluate only the two exact formula shapes present in this workbook.
    a = re.fullmatch(r"='Plan Config'!\$B\$6\+(\d+)", row["startDate"])
    b = re.fullmatch(rf"=\$Q{index}\+(\d+)", row["etaDate"])
    if not a or not b:
        raise ValueError(f"Unsupported date formula in Master Register row {index}")
    begin = start + dt.timedelta(days=int(a[1]))
    row["startDate"] = clean(begin)
    row["etaDate"] = clean(begin + dt.timedelta(days=int(b[1])))
    row["dependencies"] = [] if row["dependencies"] in ("", "-") else [
        refs(x.strip()) for x in row["dependencies"].split(",")
    ]

milestones = rows("Milestones", [
    "id", "name", "wave", "forecastDate", "gateCriteria", "owner", "status", "daysFromKickoff",
], 14)
for row in milestones:
    if row["id"] in ("M0", "M1"):
        date = start + dt.timedelta(days=0 if row["id"] == "M0" else 14)
    else:
        candidates = [r["etaDate"] for r in requirements if r["wave"] == row["wave"] or row["id"] == "M8"]
        date = dt.datetime.fromisoformat(max(candidates))
        if row["id"] == "M8":
            date += dt.timedelta(days=14)
    row["forecastDate"] = clean(date)
    row["daysFromKickoff"] = (date - start).days

stages = rows("E2E View", [
    "id", "name", "description", "modulesInvolved", "reqCount", "effortDays",
    "startDate", "finishDate", "weeks", "primaryOwner", "entryCriteria", "exitCriteria",
], 14)
for row in stages:
    related = [r for r in requirements if r["e2eStage"] == row["name"]]
    row["reqCount"] = len(related)
    row["effortDays"] = sum(r["effortDays"] for r in related)
    # Workbook's E2E "Start" formula uses ETA column R, not start column Q.
    row["startDate"] = min(r["etaDate"] for r in related)
    row["finishDate"] = max(r["etaDate"] for r in related)

expected = {
    "pmoRequirements": requirements,
    "pmoMilestones": milestones,
    "pmoE2EStages": stages,
    "pmoActions": rows("Actions Log", ["id", "relatedReq", "action", "type", "owner", "raisedDate", "dueDate", "priority", "status", "notes"], 23),
    "pmoQuestions": rows("Open Questions", ["id", "relatedReq", "kind", "question", "questionAr", "whyItMatters", "owner", "dueDate", "status", "impactIfUnresolved"], 17),
    "pmoRaidItems": rows("RAID Log", ["id", "type", "description", "impact", "likelihood", "severity", "mitigation", "owner", "status", "relatedReqs"], 20),
}
for row in expected["pmoRaidItems"]:
    row["relatedReqs"] = [refs(x.strip()) for x in row["relatedReqs"].split(",")]

diffs = []
summary = []
for collection, baseline in expected.items():
    actual = {str(r["id"]): r for r in app[collection]}
    source_ids = {str(r["id"]) for r in baseline}
    missing = [r["id"] for r in baseline if str(r["id"]) not in actual]
    extra = [r["id"] for r in app[collection] if str(r["id"]) not in source_ids]
    summary.append({"collection": collection, "excel": len(baseline), "app": len(actual), "missing": missing, "extra": extra})
    for row in baseline:
        current = actual.get(str(row["id"]))
        if current is None:
            diffs.append([collection, row["id"], "(record)", "missing", row, ""])
            continue
        for field, wanted in row.items():
            got = current.get(field, "")
            if field == "relatedReq":
                wanted, got = refs(wanted), refs(got)
            if wanted != got:
                diffs.append([collection, row["id"], field, "different", wanted, got])
    for key in extra:
        diffs.append([collection, key, "(record)", "extra", "", actual[str(key)]])

config = {
    "planStartDate": clean(start),
    "workingDaysPerWeek": wb["Plan Config"]["B7"].value,
    "programDurationWeeks": wb["Plan Config"]["B8"].value,
    "effortSizes": {wb["Plan Config"][f"A{r}"].value: wb["Plan Config"][f"B{r}"].value for r in range(25, 29)},
}
assert config == app["pmoPlanConfig"], "Plan configuration differs"
assert len(requirements) == wb["Plan Config"]["B9"].value == 97
assert sum(r["effortDays"] for r in requirements) == 255

with (OUT / "differences.csv").open("w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow(["collection", "id", "field", "difference", "excel", "app"])
    for diff in diffs:
        writer.writerow([json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v for v in diff])
evidence = {
    "source": str(SOURCE), "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    "summary": summary, "expected": expected, "actual": app,
    "configMatches": True, "differenceCount": len(diffs),
}
(OUT / "evidence.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"summary": summary, "differences": len(diffs),
                  "effortExcel": 255, "effortApp": sum(r["effortDays"] for r in app["pmoRequirements"])}, indent=2))
