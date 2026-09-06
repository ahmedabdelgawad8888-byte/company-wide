import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useApp } from "@/lib/store";
import { getWorkspaceNavGroups } from "./nav-config";
import type { QuickCreateKind } from "./quick-create";
import { getWorkspace, workspaceOwnsDepartment } from "@/lib/workspace-hub";
import type { RoleName } from "@/lib/types";

export function CommandPalette({
  open,
  onOpenChange,
  onQuickCreate,
  allowedQuickCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onQuickCreate: (kind: string) => void;
  allowedQuickCreate: QuickCreateKind[];
  role: RoleName;
}) {
  const { db, currentUser, activeWorkspace } = useApp();
  const navigate = useNavigate();
  const workspace = getWorkspace(activeWorkspace);
  const visibleNav = getWorkspaceNavGroups(activeWorkspace);
  const workspaceUsers = db.users.filter(
    (u) => u.status === "active" && workspaceOwnsDepartment(activeWorkspace, u.department),
  );
  const workspaceUserIds = new Set(workspaceUsers.map((u) => u.id));
  const visibleTasks = db.tasks
    .filter((task) => workspaceOwnsDepartment(activeWorkspace, task.department))
    .slice(0, 20);
  const visibleMeetings = db.calendarEvents.filter(
    (e) =>
      ["Meeting", "Sales Meeting", "Client Review", "Internal", "Finance Close"].includes(e.type) &&
      (workspaceUserIds.has(e.organizerId) || e.attendeeIds.some((id) => workspaceUserIds.has(id))),
  );
  const visibleBills =
    activeWorkspace === "finance"
      ? db.invoices.filter(
          (i) => currentUser.scope === "group" || i.entityId === currentUser.entityId,
        )
      : [];
  const visibleClients =
    activeWorkspace === "sales"
      ? db.clients.filter(
          (c) => currentUser.scope === "group" || c.entityId === currentUser.entityId,
        )
      : [];
  const placeholder =
    activeWorkspace === "core"
      ? "Search core priorities, blockers, meetings or people…"
      : activeWorkspace === "sales"
        ? "Search sales actions, clients, follow-ups or meetings…"
        : activeWorkspace === "finance"
          ? "Search bills, collections, payments or finance actions…"
          : activeWorkspace === "hr"
            ? "Search people actions, meetings or team members…"
            : "Search analysis requests, reports, files or delivery dates…";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);
  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to } as never);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={placeholder} />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No matches in {workspace.title}.</CommandEmpty>
        {allowedQuickCreate.length ? (
          <>
            <CommandGroup heading={`Create in ${workspace.shortTitle}`}>
              {allowedQuickCreate.map((k) => (
                <CommandItem
                  key={k}
                  value={`create ${k}`}
                  onSelect={() => {
                    onOpenChange(false);
                    onQuickCreate(k);
                  }}
                >
                  Create {k}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        ) : null}
        {visibleClients.length ? (
          <CommandGroup heading="Clients & follow-ups">
            {visibleClients.map((c) => (
              <CommandItem
                key={c.id}
                value={`client ${c.name}`}
                onSelect={() => go(`/crm/clients/${c.id}`)}
              >
                {c.name}
                <span className="ms-auto text-xs text-muted-foreground">{c.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {visibleTasks.length ? (
          <CommandGroup heading={`${workspace.shortTitle} actions`}>
            {visibleTasks.map((t) => (
              <CommandItem
                key={t.id}
                value={`task ${t.id} ${t.title}`}
                onSelect={() => go("/tasks")}
              >
                {t.id} — {t.title}
                <span className="ms-auto text-xs text-muted-foreground">{t.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {visibleBills.length ? (
          <CommandGroup heading="Bills & collections">
            {visibleBills.slice(0, 15).map((i) => (
              <CommandItem
                key={i.id}
                value={`bill invoice ${i.number}`}
                onSelect={() => go("/finance/invoices")}
              >
                {i.number}
                <span className="ms-auto text-xs text-muted-foreground">{i.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {visibleMeetings.length ? (
          <CommandGroup heading={`${workspace.shortTitle} meetings`}>
            {visibleMeetings.slice(0, 12).map((e) => (
              <CommandItem key={e.id} value={`meeting ${e.title}`} onSelect={() => go("/meetings")}>
                {e.title}
                <span className="ms-auto text-xs text-muted-foreground">{e.date}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {workspaceUsers.length ? (
          <CommandGroup heading={`${workspace.shortTitle} people`}>
            {workspaceUsers.map((u) => (
              <CommandItem
                key={u.id}
                value={`user ${u.name} ${u.department}`}
                onSelect={() => go(activeWorkspace === "hr" ? "/admin/users" : "/workspace")}
              >
                {u.name}
                <span className="ms-auto text-xs text-muted-foreground">{u.department}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        <CommandSeparator />
        <CommandGroup heading={`Navigate · ${workspace.title}`}>
          {visibleNav.flatMap((g) =>
            g.items.map((i) => (
              <CommandItem key={i.to} value={`go ${g.label} ${i.label}`} onSelect={() => go(i.to)}>
                {g.label} · {i.label}
              </CommandItem>
            )),
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
