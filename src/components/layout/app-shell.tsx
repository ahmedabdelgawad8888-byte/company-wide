import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Languages,
  Layers3,
  Moon,
  Bot,
  PanelLeft,
  Plus,
  Search,
  Settings2,
  Sun,
} from "lucide-react";
import { TrygcLogo } from "@/components/brand";
import { getWorkspaceNavGroups } from "@/components/layout/nav-config";
import { notificationVisibleToRole } from "@/lib/record-scope";
import { CommandPalette } from "@/features/workspaces/command-palette";
import { QuickCreate, type QuickCreateKind } from "@/features/workspaces/record-form";
import { useHub } from "@/features/workspaces/provider";
import { permission, executive } from "@/features/workspaces/service";
import { modulePath } from "@/features/workspaces/navigation";
import { titles, href } from "@/features/workspaces/model";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { shortDate } from "@/lib/format";
import { ExportQueueButton } from "@/components/export-queue-panel";
import { useTheme } from "@/lib/theme";
import {
  WORKSPACES,
  getWorkspace,
  getWorkspaceIdsForUser,
  workspaceAllowsPath,
  workspaceOwnsDepartment,
  type WorkspaceId,
} from "@/lib/workspace-hub";

const QUICK_CREATE_BY_WORKSPACE: Record<WorkspaceId, QuickCreateKind[]> = {
  management: ["project", "task", "meeting", "decision", "blocker", "request", "data-issue"],
  sales: ["action", "client", "meeting", "task"],
  finance: ["bill", "payment", "task", "meeting"],
  hr: ["hr-task", "file"],
  it: ["routine", "task", "project", "process", "sop", "blocker", "data-issue", "meeting"],
  pmo: ["project", "task", "decision", "blocker", "request", "data-issue", "meeting"],
};

function workspaceSearchText(workspaceId: WorkspaceId, t: (en: string, ar: string) => string) {
  if (workspaceId === "sales")
    return t(
      "Search clients, follow-ups, meetings and actions…",
      "ابحث عن العملاء والمتابعات والاجتماعات والإجراءات…",
    );
  if (workspaceId === "finance")
    return t(
      "Search bills, payments, collections and actions…",
      "ابحث عن الفواتير والمدفوعات والتحصيلات والإجراءات…",
    );
  if (workspaceId === "hr")
    return t(
      "Search people, onboarding, meetings and HR actions…",
      "ابحث عن الموظفين والتعيين والاجتماعات وإجراءات الموارد البشرية…",
    );
  if (workspaceId === "it")
    return t(
      "Search routines, incidents, infrastructure, SOPs and IT work…",
      "ابحث في الإجراءات الدورية والحوادث والبنية التحتية وإجراءات التشغيل وأعمال تقنية المعلومات…",
    );
  if (workspaceId === "pmo")
    return t(
      "Search waves, requirements, milestones, RAID, actions and questions…",
      "ابحث في الموجات والمتطلبات والمراحل والمخاطر والإجراءات والأسئلة…",
    );
  return t(
    "Search priorities, blockers, decisions, analysis requests and people…",
    "ابحث عن الأولويات والمعوقات والقرارات وطلبات التحليل والأشخاص…",
  );
}

function notificationMatchesWorkspace(
  workspaceId: WorkspaceId,
  notification: { category: string; title: string; detail: string },
) {
  const text = `${notification.title} ${notification.detail}`.toLowerCase();
  if (workspaceId === "finance")
    return (
      notification.category === "Finance" ||
      notification.category === "Approval" ||
      /bill|invoice|payment|collection|finance|cash/.test(text)
    );
  if (workspaceId === "sales")
    return (
      ["Sales", "CRM", "Client"].includes(notification.category) ||
      /sales|client|follow-up|proposal|quotation|contract/.test(text)
    );
  if (workspaceId === "hr")
    return /hr|people|employee|onboarding|interview|attendance|payroll|hiring/.test(text);
  if (workspaceId === "it")
    return /it|infrastructure|backup|router|network|device|access|incident|veeam|firewall|server|monitoring/.test(
      text,
    );
  return (
    notification.category === "System" ||
    /core|technology|automation|operations|blocker|development|ui\/ux|business analysis|webhook|api|db|data|analysis|report|insight|dataset|dashboard/.test(
      text,
    )
  );
}

function WorkspacePicker({ collapsed, onPicked }: { collapsed?: boolean; onPicked?: () => void }) {
  const navigate = useNavigate();
  const { currentUser, activeWorkspace, setActiveWorkspace } = useApp();
  const { t, lang } = useLang();
  const available = getWorkspaceIdsForUser(currentUser);
  const active = getWorkspace(activeWorkspace);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-start shadow-sm transition-colors hover:bg-muted",
            collapsed && "mx-auto size-10 w-10 justify-center px-0",
          )}
          title={collapsed ? t(active.title, active.titleAr) : undefined}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers3 className="size-4" />
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("Workspace", "مساحة العمل")}
                </p>
                <p className="truncate text-sm font-semibold">
                  {lang === "ar" ? active.titleAr : active.title}
                </p>
              </div>
              <ChevronDown className="size-4 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{t("Switch workspace", "تغيير مساحة العمل")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {WORKSPACES.filter((workspace) => available.includes(workspace.id)).map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => {
              setActiveWorkspace(workspace.id);
              void navigate({ to: modulePath(workspace.id, "home") } as never);
              onPicked?.();
            }}
            className="items-start gap-3 py-2.5"
          >
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers3 className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {lang === "ar" ? workspace.titleAr : workspace.title}
                </span>
                {workspace.id === activeWorkspace && (
                  <Check className="ms-auto size-4 text-primary" />
                )}
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {lang === "ar" ? workspace.purposeAr : workspace.purpose}
              </p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavLinks({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { actor } = useHub();
  const { pathname } = useRouterState({ select: (s) => s.location });
  const { db, currentUser, activeWorkspace } = useApp();
  const { t, lang } = useLang();
  const visibleGroups = useMemo(() => getWorkspaceNavGroups(activeWorkspace), [activeWorkspace]);

  const counts = useMemo(
    () => ({
      approvals: db.approvals.filter((a) => a.status === "Pending").length,
      alerts: db.notifications.filter(
        (n) => !n.read && notificationVisibleToRole(n, currentUser.role),
      ).length,
      tasks: db.tasks.filter(
        (x) =>
          !["Done", "Cancelled"].includes(x.status) &&
          workspaceOwnsDepartment(activeWorkspace, x.department) &&
          (currentUser.scope === "group" || x.entityId === currentUser.entityId),
      ).length,
    }),
    [
      db.approvals,
      db.notifications,
      db.tasks,
      currentUser.role,
      currentUser.entityId,
      currentUser.scope,
      activeWorkspace,
    ],
  );

  return (
    <nav className="space-y-5 px-2 pb-8">
      {visibleGroups.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {lang === "ar" ? group.labelAr : group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items
              .filter((item) => !item.to.endsWith("/management") || executive(actor))
              .map((item) => {
                const active =
                  pathname === item.to ||
                  (item.to !== "/workspace" && pathname.startsWith(item.to + "/"));
                const badge = item.badge ? counts[item.badge] : 0;
                return (
                  <Link
                    key={item.to}
                    to={item.to as never}
                    onClick={onNavigate}
                    title={collapsed ? t(item.label, item.labelAr) : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{t(item.label, item.labelAr)}</span>}
                    {!collapsed && badge > 0 && (
                      <Badge
                        variant="secondary"
                        className="ms-auto h-5 min-w-5 justify-center px-1 text-[11px]"
                      >
                        {badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const hub = useHub();
  const navigate = useNavigate();
  const {
    db,
    scope,
    setScope,
    currentUser,
    setCurrentUserId,
    entityName,
    actions,
    activeWorkspace,
  } = useApp();
  const { t, lang, toggleLang, dir } = useLang();
  const { dark, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quick, setQuick] = useState<{ open: boolean; kind: QuickCreateKind }>({
    open: false,
    kind: "task",
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const quickKinds = permission(hub.actor, activeWorkspace, "create")
    ? QUICK_CREATE_BY_WORKSPACE[activeWorkspace]
    : [];
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const entityLocked = currentUser.scope === "entity";
  const activeWorkspaceDef = getWorkspace(activeWorkspace);

  useEffect(() => {
    if (currentUser.scope === "entity" && scope !== currentUser.entityId)
      setScope(currentUser.entityId);
  }, [currentUser.id, currentUser.scope, currentUser.entityId, scope, setScope]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const visibleNotifications = hub.state.notifications
    .filter((n) => n.workspaceId === activeWorkspace && n.userId === currentUser.id)
    .map((n) => ({ ...n, detail: new Date(n.at).toLocaleString() }));
  const readNotice = (id: string) =>
    hub.transact((s) => {
      const n = s.notifications.find((n) => n.id === id);
      if (n) n.read = true;
    });
  const unread = visibleNotifications.filter((n) => !n.read);
  const Collapse = dir === "rtl" ? ChevronRight : ChevronLeft;
  const pageAllowed =
    pathname === "/" ||
    pathname === "/workspace" ||
    pathname.startsWith("/agent") ||
    pathname === "/settings" ||
    pathname.startsWith("/workspaces/") ||
    workspaceAllowsPath(activeWorkspace, pathname);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-[268px]",
        )}
      >
        <div
          className={cn("flex h-16 items-center border-b px-4", collapsed && "justify-center px-0")}
        >
          <Link to="/workspace" className="flex items-center">
            <TrygcLogo collapsed={collapsed} />
          </Link>
        </div>
        <div className="border-b py-3">
          <WorkspacePicker collapsed={collapsed} />
        </div>
        <ScrollArea className="flex-1 py-3">
          <NavLinks collapsed={collapsed} />
        </ScrollArea>
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="mb-1 w-full justify-center" asChild>
            <Link to="/settings" title={collapsed ? t("Settings", "الإعدادات") : undefined}>
              <Settings2 className="size-4" />
              {!collapsed && <span className="ms-1">{t("Settings", "الإعدادات")}</span>}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setCollapsed((c) => !c)}
          >
            <Collapse className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
            {!collapsed && <span className="ms-1">{t("Collapse", "طي القائمة")}</span>}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-2 border-b bg-card/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/70 py-2 sm:h-16 sm:flex-nowrap sm:px-5 sm:py-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label={t("Open navigation", "فتح القائمة")}
              >
                <PanelLeft className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-[292px] p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-16 items-center border-b px-4">
                <TrygcLogo />
              </div>
              <div className="border-b py-3">
                <WorkspacePicker onPicked={() => setMobileOpen(false)} />
              </div>
              <ScrollArea className="h-[calc(100vh-8rem)] py-3">
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div className="hidden sm:block lg:hidden">
            <WorkspacePicker collapsed />
          </div>

          <button
            onClick={() => setPaletteOpen(true)}
            // No aria-label: the visible text already names this button per workspace
            // ("Search priorities…"), and a generic label would replace it.
            // min-w-0 lets this flex child shrink below its text width; without it the
            // header could not fit a narrow phone viewport and the page scrolled sideways.
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:max-w-md"
          >
            <Search className="size-4" />
            <span className="truncate">{workspaceSearchText(activeWorkspace, t)}</span>
            <kbd className="ms-auto hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:block">
              ⌘K
            </kbd>
          </button>

          <div className="ms-auto flex shrink-0 items-center gap-1.5">
            <Button variant="ghost" size="sm" asChild>
              {/* The label is hidden on phones, so name the control for assistive tech. */}
              <Link to="/agent" aria-label={t("AI Agent", "الوكيل الذكي")}>
                <Bot className="size-4" />
                <span className="hidden sm:inline">{t("AI Agent", "الوكيل الذكي")}</span>
              </Link>
            </Button>
            {entityLocked ? (
              <Button variant="outline" size="sm" className="hidden gap-2 md:flex" disabled>
                <Building2 className="size-4" />
                <span className="max-w-[150px] truncate">{entityName(currentUser.entityId)}</span>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden gap-2 md:flex">
                    <Globe className="size-4" />
                    <span className="max-w-[140px] truncate">
                      {scope === "group" ? t("Group", "المجموعة") : entityName(scope)}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>{t("Scope", "النطاق")}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setScope("group")}>
                    <Globe className="size-4" />{" "}
                    {t("Group — all entities", "المجموعة — كل الكيانات")}
                    {scope === "group" && <Check className="ms-auto size-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {db.entities.map((e) => (
                    <DropdownMenuItem key={e.id} onClick={() => setScope(e.id)}>
                      <Building2 className="size-4" /> {e.name} · {e.currency}
                      {scope === e.id && <Check className="ms-auto size-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5" aria-label={t("Create", "إنشاء")}>
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">{t("Create", "إنشاء")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {quickKinds.map((k) => (
                  <DropdownMenuItem key={k} onClick={() => setQuick({ open: true, kind: k })}>
                    {t(...titles[k])}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden on phones like Approvals below: both stay reachable from the
                sidebar nav, and keeping them here overflowed the header. */}
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link to={modulePath(activeWorkspace, "my-work") as never}>
                {t("My work", "عملي")}
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link to={modulePath(activeWorkspace, "approval") as never}>
                {t("Approvals", "الموافقات")}
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("Notifications", "الإشعارات")}
                  className="relative"
                >
                  <Bell className="size-4" />
                  {unread.length > 0 && (
                    <span className="absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                      {unread.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  {t("Notifications", "الإشعارات")}
                  <button
                    className="text-xs font-normal text-primary"
                    onClick={() =>
                      visibleNotifications.filter((n) => !n.read).forEach((n) => readNotice(n.id))
                    }
                  >
                    {t("Mark all read", "تعليم الكل كمقروء")}
                  </button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-80 overflow-y-auto">
                  {visibleNotifications.slice(0, 12).map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      onClick={() => {
                        readNotice(n.id);
                        const r = hub.state.records.find((r) => r.id === n.recordId);
                        if (r) void navigate({ to: href(r) } as never);
                      }}
                      className="flex-col items-start gap-0.5"
                    >
                      <div className="flex w-full items-center gap-2">
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            n.read ? "bg-muted-foreground/40" : "bg-primary",
                          )}
                        />
                        <span className="truncate text-sm font-medium">{n.title}</span>
                      </div>
                      <span className="ps-3.5 text-xs text-muted-foreground">{n.detail}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLang}
              title={t("Switch to Arabic", "التبديل إلى الإنجليزية")}
            >
              <Languages className="size-4" />
              <span className="sr-only">{lang}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("Switch theme", "تغيير المظهر")}
              onClick={toggle}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {currentUser.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-start leading-tight xl:block">
                    <span className="block text-sm font-medium">{currentUser.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {hub.actor.role}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>
                  <div className="text-sm font-semibold">{currentUser.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {currentUser.department} · {entityName(currentUser.entityId)} ·{" "}
                    {t("Last login", "آخر دخول")} {shortDate(currentUser.lastLogin)}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {t("Switch demo user", "تبديل المستخدم التجريبي")}
                </DropdownMenuLabel>
                <div className="max-h-80 overflow-y-auto">
                  {db.users
                    .filter((u) => u.status === "active")
                    .map((u) => (
                      <DropdownMenuItem
                        key={u.id}
                        onClick={() => {
                          setCurrentUserId(u.id);
                          void navigate({ to: "/workspace" });
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">{u.name}</span>
                        <span className="ms-2 text-[11px] text-muted-foreground">
                          {u.department}
                        </span>
                        {u.id === currentUser.id && <Check className="ms-1 size-3.5" />}
                      </DropdownMenuItem>
                    ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-3 sm:p-5 lg:p-6">
          {!pageAllowed ? (
            <div className="mx-auto max-w-2xl rounded-xl border bg-card p-6 shadow-[var(--shadow-panel)]">
              <p className="text-lg font-semibold">
                {t("This page belongs to another workspace", "هذه الصفحة تخص مساحة عمل أخرى")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  `You are currently working inside ${activeWorkspaceDef.title}. Switch workspace if you need a different team flow.`,
                  `أنت تعمل حالياً داخل مساحة ${activeWorkspaceDef.titleAr}. غيّر مساحة العمل إذا كنت تحتاج مسار فريق آخر.`,
                )}
              </p>
              <Button className="mt-4" asChild>
                <Link to="/workspace">{t("Back to workspace home", "العودة إلى الرئيسية")}</Link>
              </Button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onQuickCreate={(k) => setQuick({ open: true, kind: k as QuickCreateKind })}
        allowedQuickCreate={quickKinds}
        role={currentUser.role}
      />
      <QuickCreate
        open={quick.open}
        kind={quick.kind}
        allowedKinds={quickKinds}
        onOpenChange={(v) => setQuick((q) => ({ ...q, open: v }))}
      />
    </div>
  );
}
