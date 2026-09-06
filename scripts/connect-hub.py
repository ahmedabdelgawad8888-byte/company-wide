from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
p=root/'src/components/layout/app-shell.tsx'
s=p.read_text(encoding='utf-8')
s=s.replace('>{k}</DropdownMenuItem>', '>{t(...titles[k])}</DropdownMenuItem>')
s=s.replace('actions.markNotification(n.id, true)', 'readNotice(n.id)')
s=s.replace('onClick={() => readNotice(n.id)}', 'onClick={() => { readNotice(n.id); const r=hub.state.records.find(r=>r.id===n.recordId); if(r)void navigate({to:href(r)} as never); }}')
s=s.replace('<ExportQueueButton />', '<Button variant="ghost" size="sm" asChild><Link to={modulePath(activeWorkspace, "my-work") as never}>{t("My work", "عملي")}</Link></Button><Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild><Link to={modulePath(activeWorkspace, "approval") as never}>{t("Approvals", "الموافقات")}</Link></Button>')
s=s.replace('onClick={() => setCurrentUserId(u.id)}', 'onClick={() => { setCurrentUserId(u.id); void navigate({to:"/workspace"}); }}')
s=s.replace('<Button variant="ghost" size="icon" onClick={toggle}>','<Button variant="ghost" size="icon" aria-label={t("Switch theme", "تغيير المظهر")} onClick={toggle}>')
s=s.replace('<Button variant="ghost" size="icon" className="relative">','<Button variant="ghost" size="icon" aria-label={t("Notifications", "الإشعارات")} className="relative">')
s=s.replace('{currentUser.department}</span></span>','{hub.actor.role}</span></span>')
p.write_text(s,encoding='utf-8')
p=root/'src/components/layout/nav-config.ts'
s=p.read_text(encoding='utf-8').replace('import type { LucideIcon }', 'import { hubNav } from "@/features/workspaces/navigation";\nimport type { LucideIcon }').replace('return getWorkspaceNav(workspaceId).map','return hubNav(workspaceId).map')
p.write_text(s,encoding='utf-8')
p=root/'src/routes/workspace.tsx'
p.write_text('''import { createFileRoute } from "@tanstack/react-router";
import { HubPage } from "../features/workspaces/hub-page";
import { useApp } from "../lib/store";
function Home(){const {activeWorkspace}=useApp();return <HubPage workspaceId={activeWorkspace}/>;}
export const Route=createFileRoute("/workspace")({component:Home});
''',encoding='utf-8')
p=root/'src/lib/workspace-hub.ts'
s=p.read_text(encoding='utf-8').replace('?? WORKSPACES[0];','?? WORKSPACES[0]!;')
p.write_text(s,encoding='utf-8')
p=root/'src/components/layout/quick-create.tsx'
s=p.read_text(encoding='utf-8').replace(': kinds[0]', ': (kinds[0] ?? "Task")').replace(': taskDepartments[0];', ': (taskDepartments[0] ?? "Technology");')
p.write_text(s,encoding='utf-8')
p=root/'src/routes/admin/users.tsx'
s=p.read_text(encoding='utf-8').replace('u.status === "invited"','u.status === "offboarding"')
p.write_text(s,encoding='utf-8')
p=root/'package.json'
a=json.loads(p.read_text())
a['scripts']['typecheck']='tsc --noEmit'
a['scripts']['test']='node --test tests/*.test.mjs'
p.write_text(json.dumps(a,indent=2)+'\n',encoding='utf-8')
