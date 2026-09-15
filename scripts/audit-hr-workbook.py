"""Read-only comparison of all guide fields and instructions against the source workbook."""
import json
from pathlib import Path
import openpyxl
root=Path(__file__).resolve().parents[1]
w=openpyxl.load_workbook(root/'HR_Task_Management_Guide.xlsx',data_only=False)
a=json.loads((root/'src/features/workspaces/hr-guide.json').read_text(encoding='utf-8'))
keys=['category','task','frequency','priority','owner','deadline','sla','evidence','approver','sourceStatus']
expected=[dict(zip(keys,row)) for row in list(w['HR Task Tracker'].values)[4:] if row[0]]
diffs=[]
if len(expected)!=len(a['tasks']): diffs.append('Task count differs')
for i,(row,actual) in enumerate(zip(expected,a['tasks']),5):
 for key in keys:
  if row[key]!=actual[key]:diffs.append({'row':i,'field':key,'expected':row[key],'actual':actual[key]})
for k,v in w['Instructions'].values:
 if a['instructions'].get(k)!=v:diffs.append({'instruction':k})
result={'source':a['source'],'tasks':len(expected),'categories':len(set(r['category'] for r in expected)),'taskFieldsCompared':len(expected)*10,'instructionsCompared':w['Instructions'].max_row,'differences':diffs,'passed':not diffs}
out=root/'artifacts/hr-audit';out.mkdir(parents=True,exist_ok=True)
(out/'evidence.json').write_text(json.dumps(result,indent=2),encoding='utf-8',newline='\n')
print(json.dumps(result,indent=2))
raise SystemExit(bool(diffs))
