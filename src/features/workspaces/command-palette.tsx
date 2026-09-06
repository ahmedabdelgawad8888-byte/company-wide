import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../components/ui/command";
import { useApp } from "../../lib/store";
import { useTheme } from "../../lib/theme";
import { useLang } from "../../lib/i18n";
import { WORKSPACES, getWorkspaceIdsForUser } from "../../lib/workspace-hub";
import { useHub, useRecords } from "./provider";
import { href, titles, type Kind } from "./model";
import { modulePath, hubNav } from "./navigation";
import { executive, permission } from "./service";
export function CommandPalette({
  open,
  onOpenChange,
  onQuickCreate,
  allowedQuickCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onQuickCreate: (kind: string) => void;
  allowedQuickCreate: Kind[];
  role: string;
}) {
  const { activeWorkspace, setActiveWorkspace } = useApp();
  const { actor, users } = useHub();
  const records = useRecords().filter((r) => r.workspaceId === activeWorkspace);
  const { t } = useLang();
  const { toggle } = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const go = (to: string) => {
    setRecent((p) => [query, ...p.filter((q) => q !== query)].filter(Boolean).slice(0, 5));
    onOpenChange(false);
    void navigate({ to } as never);
  };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={t(
          "Search work, people, IDs or actions…",
          "ابحث عن العمل أو الأشخاص أو الأرقام أو الإجراءات…",
        )}
      />
      <CommandList className="max-h-[65vh]">
        <CommandEmpty>
          {t(
            "No matches in this workspace. Try a partial name or record ID.",
            "لا توجد نتائج في هذه المساحة. جرّب جزءاً من الاسم أو رقم السجل.",
          )}
        </CommandEmpty>
        {!query && recent.length > 0 && (
          <CommandGroup heading={t("Recent searches", "عمليات البحث الأخيرة")}>
            {recent.map((q) => (
              <CommandItem key={q} value={`recent ${q}`} onSelect={() => setQuery(q)}>
                {q}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading={t("Quick actions", "إجراءات سريعة")}>
          {allowedQuickCreate
            .filter(() => permission(actor, activeWorkspace, "create"))
            .map((k) => (
              <CommandItem
                key={k}
                value={`create ${titles[k].join(" ")}`}
                onSelect={() => {
                  onOpenChange(false);
                  onQuickCreate(k);
                }}
              >
                {t("Create", "إنشاء")} {t(...titles[k])}
              </CommandItem>
            ))}
          <CommandItem
            onSelect={() => {
              toggle();
              onOpenChange(false);
            }}
          >
            {t("Switch theme", "تغيير المظهر")}
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading={t("Records", "السجلات")}>
          {records.map((r) => (
            <CommandItem
              key={r.id}
              value={`${r.id} ${r.title} ${r.nextAction} ${Object.values(r.details).join(" ")} ${users.find((u) => u.id === r.ownerId)?.name}`}
              onSelect={() => go(href(r))}
            >
              <span className="min-w-0">
                <span className="block truncate">{r.title}</span>
                <span className="text-xs text-muted-foreground">
                  {t(...titles[r.kind])} · {r.workspaceId} ·{" "}
                  {users.find((u) => u.id === r.ownerId)?.name}
                </span>
              </span>
              <span className="ms-auto text-xs text-muted-foreground">{r.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading={t("Navigate", "انتقال")}>
          {hubNav(activeWorkspace)
            .flatMap((g) => g.items)
            .filter((i) => !i.to.endsWith("/management") || executive(actor))
            .map((item) => (
              <CommandItem
                key={item.to}
                value={`${item.label} ${item.labelAr}`}
                onSelect={() => go(item.to)}
              >
                {t(item.label, item.labelAr)}
              </CommandItem>
            ))}
        </CommandGroup>
        <CommandGroup heading={t("Switch workspace", "تغيير المساحة")}>
          {WORKSPACES.filter((w) => getWorkspaceIdsForUser(actor).includes(w.id)).map((w) => (
            <CommandItem
              key={w.id}
              value={`switch ${w.title} ${w.titleAr}`}
              onSelect={() => {
                setActiveWorkspace(w.id);
                go(modulePath(w.id, "home"));
              }}
            >
              {t(w.title, w.titleAr)}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
