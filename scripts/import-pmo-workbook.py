"""Regenerate the PMO baseline from the formula-aware workbook audit."""
import json
import runpy
from pathlib import Path

root = Path(__file__).resolve().parents[1]
audit = runpy.run_path(str(root / "scripts/audit-pmo-workbook.py"))
expected = audit["expected"]
types = {"pmoRequirements": "PmoRequirement[]", "pmoMilestones": "PmoMilestone[]",
         "pmoE2EStages": "PmoE2EStage[]", "pmoActions": "PmoAction[]",
         "pmoQuestions": "PmoQuestion[]", "pmoRaidItems": "PmoRaidItem[]",
         "pmoPlanConfig": "PmoPlanConfig"}
expected["pmoPlanConfig"] = audit["config"]
for question in expected["pmoQuestions"]:
    question["impact"] = question["impactIfUnresolved"]
    question["raisedDate"] = ""
text = '// Generated from TryGC_PMO_Dashboard.xlsx; run scripts/import-pmo-workbook.py.\n'
text += 'import type { ' + ', '.join(t.replace('[]', '') for t in types.values()) + ' } from "../types";\n'
for key, value in expected.items():
    text += f'export const {key}: {types[key]} = ' + json.dumps(value, ensure_ascii=False, indent=2) + ';\n'
(root / "src/lib/data/pmo-seed.ts").write_text(text, encoding="utf-8")
