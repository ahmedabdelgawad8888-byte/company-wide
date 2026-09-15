"""Verify names and task rows against the supplied IT operating manual."""
import json,re,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=(root/'trygc_it_manual.html').read_text(encoding='utf-8')
profiles=re.findall(r'class="profile-name">([^<]+)</span>',s)
names=[n.strip() for group in profiles if group!='Tier-1 Support' for n in group.split(',')]
people=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {IT_PEOPLE} from './src/lib/it-directory.ts';process.stdout.write(JSON.stringify(IT_PEOPLE))"],cwd=root))
differences=[]
if names!=[p['name'] for p in people]:differences.append('Directory names differ')
expected=[]
for m in re.finditer(r'\{ref:"([^"]+)",\s*task:"([^"]+)",\s*owner:"([^"]+)",\s*priority:"([^"]+)",\s*status:"([^"]+)",\s*progress:(\d+)\}',s):
 r=dict(zip(['ref','task','owner','priority','status','progress'],m.groups()));r['progress']=int(r['progress']);expected.append(r)
actual=json.loads((root/'src/features/workspaces/it-manual-tasks.json').read_text(encoding='utf-8'))
if actual!=expected:differences.append('Task rows differ')
result={'source':'trygc_it_manual.html','namedPeople':len(names),'names':names,'taskRows':len(expected),'taskFieldsCompared':len(expected)*6,'differences':differences,'passed':not differences}
out=root/'artifacts/it-audit';out.mkdir(exist_ok=True,parents=True)
(out/'evidence.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(result,indent=2));raise SystemExit(bool(differences))
