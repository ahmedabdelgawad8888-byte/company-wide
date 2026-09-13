import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as seed from "./data/seed";
import * as collab from "./data/collab-seed";
import * as pmo from "./data/pmo-seed";
import { addDays, dueReminders, nextRun } from "./calendar";
import type { WorkspaceId } from "./workspace-hub";
import { getWorkspaceIdsForUser } from "./workspace-hub";
import type {
  Account,
  ActivityEvent,
  AppSettings,
  Approval,
  AutomationRule,
  CalendarEvent,
  Campaign,
  CampaignInfluencer,
  ChatChannel,
  ChatMessage,
  Client,
  CoaRequest,
  Contact,
  CorporateFile,
  Currency,
  Deal,
  Entity,
  Expense,
  Influencer,
  InfluencerStage,
  Integration,
  Invoice,
  LeadStage,
  MailMessage,
  Notification,
  Payment,
  ReminderSchedule,
  QueueItem,
  RoleDef,
  SaasSeat,
  SalesActivity,
  Task,
  TaskStatus,
  User,
  PmoRequirement,
  PmoE2EStage,
  PmoMilestone,
  PmoRaidItem,
  PmoAction,
  PmoQuestion,
  PmoPlanConfig,
} from "./types";

export type Scope = "group" | string;

interface DB {
  entities: Entity[];
  users: User[];
  roles: RoleDef[];
  clients: Client[];
  contacts: Contact[];
  deals: Deal[];
  salesActivities: SalesActivity[];
  campaigns: Campaign[];
  influencers: Influencer[];
  campaignInfluencers: CampaignInfluencer[];
  tasks: Task[];
  queueItems: QueueItem[];
  accounts: Account[];
  coaRequests: CoaRequest[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  approvals: Approval[];
  activities: ActivityEvent[];
  notifications: Notification[];
  files: CorporateFile[];
  integrations: Integration[];
  saasSeats: SaasSeat[];
  automationRules: AutomationRule[];
  calendarEvents: CalendarEvent[];
  reminderSchedules: ReminderSchedule[];
  mail: MailMessage[];
  chatChannels: ChatChannel[];
  chatMessages: ChatMessage[];
  settings: AppSettings;
  // PMO workspace data
  pmoRequirements: PmoRequirement[];
  pmoE2EStages: PmoE2EStage[];
  pmoMilestones: PmoMilestone[];
  pmoRaidItems: PmoRaidItem[];
  pmoActions: PmoAction[];
  pmoQuestions: PmoQuestion[];
  pmoPlanConfig: PmoPlanConfig;
}

const initialDb: DB = {
  entities: seed.entities,
  users: seed.users.filter((u) => u.workspaceId !== "pmo"),
  roles: seed.roles,
  clients: seed.clients,
  contacts: seed.contacts,
  deals: seed.deals,
  salesActivities: seed.salesActivities,
  campaigns: seed.campaigns,
  influencers: seed.influencers,
  campaignInfluencers: seed.campaignInfluencers,
  tasks: seed.tasks,
  queueItems: seed.queueItems,
  accounts: seed.accounts,
  coaRequests: seed.coaRequests,
  invoices: seed.invoices,
  payments: seed.payments,
  expenses: seed.expenses,
  approvals: seed.approvals,
  activities: seed.activities,
  notifications: seed.notifications,
  files: seed.files,
  integrations: seed.integrations,
  saasSeats: seed.saasSeats,
  automationRules: seed.automationRules,
  calendarEvents: collab.calendarEvents,
  reminderSchedules: collab.reminderSchedules,
  mail: collab.mailMessages,
  chatChannels: collab.chatChannels,
  chatMessages: collab.chatMessages,
  settings: collab.defaultSettings,
  // PMO workspace data
  pmoRequirements: pmo.pmoRequirements,
  pmoE2EStages: pmo.pmoE2EStages,
  pmoMilestones: pmo.pmoMilestones,
  pmoRaidItems: pmo.pmoRaidItems,
  pmoActions: pmo.pmoActions,
  pmoQuestions: pmo.pmoQuestions,
  pmoPlanConfig: pmo.pmoPlanConfig,
};

function nowStamp() {
  return `${seed.TODAY} ${new Date().toTimeString().slice(0, 5)}`;
}

interface Ctx {
  db: DB;
  scope: Scope;
  setScope: (s: Scope) => void;
  currentUser: User;
  setCurrentUserId: (id: string) => void;
  activeWorkspace: WorkspaceId;
  setActiveWorkspace: (id: WorkspaceId) => void;
  can: (
    perm: "coa.write" | "finance.approve" | "admin" | "assign" | "export" | "reports.confidential",
  ) => boolean;
  inScope: <T extends { entityId: string }>(rows: T[]) => T[];
  userName: (id?: string) => string;
  entityName: (id: string) => string;
  entityCurrency: (id: string) => Currency;
  clientName: (id?: string) => string;
  campaignName: (id?: string) => string;
  influencerName: (id?: string) => string;
  log: (e: Omit<ActivityEvent, "id" | "at" | "actorId">) => void;
  actions: {
    addDeal: (d: Omit<Deal, "id" | "createdAt" | "lastActivity">) => Deal;
    addSalesActivity: (a: Omit<SalesActivity, "id" | "createdAt">) => SalesActivity;
    moveDeal: (id: string, stage: LeadStage) => void;
    touchDeal: (id: string) => void;
    convertDeal: (id: string) => void;
    addClient: (c: Omit<Client, "id">) => Client;
    addCampaign: (c: Omit<Campaign, "id">) => Campaign;
    addCampaignInfluencer: (
      campaignId: string,
      influencerId: string,
      fee: number,
      currency: Currency,
    ) => void;
    moveInfluencer: (id: string, stage: InfluencerStage, note?: string) => void;
    addTask: (t: Omit<Task, "id">) => Task;
    updateTask: (id: string, patch: Partial<Task>) => void;
    setTaskStatus: (id: string, status: TaskStatus) => void;
    assignQueueItem: (ids: string[], ownerId: string) => void;
    setQueueStatus: (id: string, status: QueueItem["status"]) => void;
    addInvoice: (i: Omit<Invoice, "id">) => Invoice;
    updateInvoice: (id: string, patch: Partial<Invoice>) => void;
    setInvoiceStatus: (id: string, status: Invoice["status"]) => void;
    addPayment: (p: Omit<Payment, "id">) => void;
    requestAccount: (r: Omit<CoaRequest, "id" | "status" | "requestedAt" | "requestedBy">) => void;
    decideCoaRequest: (id: string, decision: "Approved" | "Rejected") => void;
    decideApproval: (id: string, decision: Approval["status"]) => void;
    markNotification: (id: string, read: boolean) => void;
    markAllNotificationsRead: () => void;
    addExpense: (e: Omit<Expense, "id">) => void;
    addFile: (f: Omit<CorporateFile, "id">) => void;
    addEntity: (e: Omit<Entity, "id">) => void;
    addUser: (u: Omit<User, "id" | "lastLogin">) => void;
    setUserStatus: (id: string, status: User["status"]) => void;
    toggleAutomation: (id: string) => void;
    setSeatStatus: (id: string, status: SaasSeat["status"]) => void;

    /* Calendar */
    addEvent: (e: Omit<CalendarEvent, "id" | "createdBy">) => CalendarEvent;
    updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
    setEventStatus: (id: string, status: CalendarEvent["status"]) => void;
    recordMeetingOutcome: (
      id: string,
      outcome: string,
      nextAction?: string,
      ownerId?: string,
      dueDate?: string,
    ) => void;
    deleteEvent: (id: string) => void;

    /* Reminder schedules */
    addReminder: (r: Omit<ReminderSchedule, "id" | "ownerId">) => ReminderSchedule;
    updateReminder: (id: string, patch: Partial<ReminderSchedule>) => void;
    toggleReminder: (id: string) => void;
    deleteReminder: (id: string) => void;
    /** Fire a schedule now: notifies every recipient and stamps lastRunAt. */
    runReminder: (id: string) => void;

    /* Mail */
    sendMail: (
      m: Omit<MailMessage, "id" | "threadId" | "at" | "read" | "folder"> & { threadId?: string },
    ) => void;
    setMailRead: (id: string, read: boolean) => void;
    toggleMailStar: (id: string) => void;
    moveMail: (id: string, folder: MailMessage["folder"]) => void;

    /* Chat */
    sendChat: (channelId: string, body: string) => void;
    toggleReaction: (messageId: string, emoji: string) => void;
    addChannel: (c: Omit<ChatChannel, "id">) => ChatChannel;

    /* Settings */
    updateSettings: <K extends keyof AppSettings>(
      section: K,
      patch: Partial<AppSettings[K]>,
    ) => void;
    resetSettings: () => void;
  };
}

const AppContext = createContext<Ctx | null>(null);

let counter = 1000;
const uid = (p: string) => `${p}${++counter}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(initialDb);
  const [scope, setScope] = useState<Scope>("group");
  const [currentUserId, setCurrentUserId] = useState("core-essmat");
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceId>("management");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("trygc-workspace-hub-db-v1");
      if (raw) {
        const saved = JSON.parse(raw) as Partial<DB>;
        // Preserve the previous baseline and any local changes before reconciliation.
        if (!window.localStorage.getItem("trygc-pmo-before-excel-v1"))
          window.localStorage.setItem("trygc-pmo-before-excel-v1", raw);
        setDb((prev) => ({
          ...prev,
          ...saved,
          users: (saved.users ?? prev.users).filter(
            (u) => u.workspaceId !== "pmo" || !seed.users.some((s) => s.id === u.id),
          ),
          pmoRequirements: pmo.pmoRequirements,
          pmoE2EStages: pmo.pmoE2EStages,
          pmoMilestones: pmo.pmoMilestones,
          pmoRaidItems: pmo.pmoRaidItems,
          pmoActions: pmo.pmoActions,
          pmoQuestions: pmo.pmoQuestions,
          pmoPlanConfig: pmo.pmoPlanConfig,
          settings: { ...prev.settings, ...(saved.settings ?? {}) },
        }));
      }
    } catch {
      // Ignore malformed local state and keep the bundled seed data.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem("trygc-workspace-hub-db-v1", JSON.stringify(db));
    } catch {
      // Storage can be unavailable in private/sandboxed browsers.
    }
  }, [db, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    const runDueSchedules = () => {
      setDb((prev) => {
        const due = dueReminders(prev.reminderSchedules, seed.TODAY);
        if (!due.length) return prev;

        let notifications = [...prev.notifications];
        let mail = [...prev.mail];
        const dueIds = new Set(due.map(({ schedule }) => schedule.id));

        for (const { schedule, at } of due) {
          if (
            schedule.channels.includes("in-app") &&
            prev.settings.notifications.channels.inApp &&
            prev.settings.notifications.categories[schedule.category]
          ) {
            const generated: Notification[] = schedule.recipientIds.map((recipientId) => ({
              id: uid("n"),
              category: schedule.category,
              title: schedule.title,
              detail: `${schedule.description ?? "Scheduled reminder"} — for ${prev.users.find((u) => u.id === recipientId)?.name ?? "you"}`,
              at: `${at} ${schedule.sendTime}`,
              priority:
                schedule.category === "Finance" && schedule.title.toLowerCase().includes("due")
                  ? "High"
                  : "Medium",
              read: false,
              link:
                schedule.category === "Finance"
                  ? "/finance/invoices"
                  : schedule.category === "Sales"
                    ? "/sales"
                    : schedule.category === "Meeting"
                      ? "/meetings"
                      : "/tasks",
            }));
            notifications = [...generated, ...notifications];
          }

          if (schedule.channels.includes("email") && prev.settings.notifications.channels.email) {
            const recipients = schedule.recipientIds
              .map((id) => prev.users.find((u) => u.id === id)?.email)
              .filter((email): email is string => Boolean(email));
            if (recipients.length) {
              mail = [
                {
                  id: uid("m"),
                  threadId: uid("t"),
                  folder: "sent",
                  fromName: "TryGC Automation",
                  fromEmail: prev.settings.organisation.supportEmail,
                  to: recipients,
                  subject: `[Reminder] ${schedule.title}`,
                  preview: schedule.description ?? "Scheduled TryGC execution reminder",
                  body: `${schedule.description ?? "Scheduled TryGC execution reminder"}\n\nScheduled: ${at} ${schedule.sendTime}\nOwner: ${prev.users.find((u) => u.id === schedule.ownerId)?.name ?? "TryGC"}`,
                  at: `${at} ${schedule.sendTime}`,
                  read: true,
                  starred: false,
                  attachments: [],
                  labels: ["Automation", schedule.category],
                  entityId: schedule.entityId,
                },
                ...mail,
              ];
            }
          }
        }

        return {
          ...prev,
          notifications,
          mail,
          reminderSchedules: prev.reminderSchedules.map((r) =>
            dueIds.has(r.id) ? { ...r, lastRunAt: seed.TODAY } : r,
          ),
        };
      });
    };

    runDueSchedules();
    const timer = window.setInterval(runDueSchedules, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [hydrated]);

  const currentUser = (db.users.find((u) => u.id === currentUserId) ?? db.users[0]) as User;

  useEffect(() => {
    const allowed = getWorkspaceIdsForUser(currentUser);
    if (!allowed.includes(activeWorkspace)) setActiveWorkspaceState(allowed[0] ?? "management");
  }, [currentUser.id, currentUser.department, currentUser.role, activeWorkspace]);

  const setActiveWorkspace = useCallback(
    (id: WorkspaceId) => {
      if (getWorkspaceIdsForUser(currentUser).includes(id)) setActiveWorkspaceState(id);
    },
    [currentUser],
  );

  const log = useCallback(
    (e: Omit<ActivityEvent, "id" | "at" | "actorId">) => {
      setDb((prev) => ({
        ...prev,
        activities: [
          { ...e, id: uid("a"), at: nowStamp(), actorId: currentUserId },
          ...prev.activities,
        ],
      }));
    },
    [currentUserId],
  );

  const value = useMemo<Ctx>(() => {
    const userName = (id?: string) => db.users.find((u) => u.id === id)?.name ?? "Unassigned";
    const entityName = (id: string) => db.entities.find((e) => e.id === id)?.name ?? id;
    const entityCurrency = (id: string) => db.entities.find((e) => e.id === id)?.currency ?? "SAR";
    const clientName = (id?: string) => db.clients.find((c) => c.id === id)?.name ?? "—";
    const campaignName = (id?: string) => db.campaigns.find((c) => c.id === id)?.name ?? "—";
    const influencerName = (id?: string) => db.influencers.find((c) => c.id === id)?.name ?? "—";

    const pushActivity = (prev: DB, e: Omit<ActivityEvent, "id" | "at" | "actorId">): DB => ({
      ...prev,
      activities: [
        { ...e, id: uid("a"), at: nowStamp(), actorId: currentUserId },
        ...prev.activities,
      ],
    });

    const can: Ctx["can"] = (perm) => {
      const r = currentUser.role;
      if (r === "Group Admin") return true;
      if (perm === "coa.write") return r === "Group Finance";
      if (perm === "finance.approve") return r === "Group Finance" || r === "Executive Management";
      if (perm === "admin") return r === "IT Admin";
      if (perm === "assign")
        return [
          "Operations Manager",
          "Queue Manager",
          "Community Manager",
          "Sales Manager",
        ].includes(r);
      if (perm === "export")
        return !["Viewer", "Community Specialist", "Operations Specialist", "Quality"].includes(r);
      if (perm === "reports.confidential")
        return ["Executive Management", "Group Finance", "Branch Accountant"].includes(r);
      return false;
    };

    return {
      db,
      scope,
      setScope,
      currentUser,
      setCurrentUserId,
      activeWorkspace,
      setActiveWorkspace,
      can,
      inScope: (rows) => {
        const effectiveScope = currentUser.scope === "entity" ? currentUser.entityId : scope;
        return effectiveScope === "group"
          ? rows
          : rows.filter((r) => r.entityId === effectiveScope);
      },
      userName,
      entityName,
      entityCurrency,
      clientName,
      campaignName,
      influencerName,
      log,
      actions: {
        addDeal: (d) => {
          const deal: Deal = {
            ...d,
            id: uid("d"),
            createdAt: seed.TODAY,
            lastActivity: seed.TODAY,
          };
          setDb((prev) =>
            pushActivity(
              { ...prev, deals: [deal, ...prev.deals] },
              {
                action: "Created deal",
                module: "CRM",
                recordId: deal.id,
                recordLabel: deal.name,
                entityId: deal.entityId,
                to: deal.stage,
              },
            ),
          );
          return deal;
        },
        addSalesActivity: (a) => {
          const activity: SalesActivity = { ...a, id: uid("sa"), createdAt: nowStamp() };
          setDb((prev) => {
            let next = { ...prev, salesActivities: [activity, ...prev.salesActivities] };
            if (activity.nextAction && activity.nextActionDate) {
              const exists = next.tasks.some(
                (t) => t.source === "Sales Activity" && t.sourceRef === activity.id,
              );
              if (!exists) {
                const task: Task = {
                  id: `T-${++counter}`,
                  title: activity.nextAction,
                  description: `Auto-created from ${activity.type.toLowerCase()} outcome: ${activity.outcome}.`,
                  department: "Sales",
                  ownerId: activity.ownerId,
                  requestedById: currentUserId,
                  entityId: activity.entityId,
                  ...(activity.clientId ? { clientId: activity.clientId } : {}),
                  priority:
                    activity.outcome === "Follow-up Required" ||
                    activity.outcome === "Contract Pending"
                      ? "High"
                      : "Medium",
                  status: "To Do",
                  startDate: seed.TODAY,
                  dueDate: activity.nextActionDate,
                  percent: 0,
                  slaHours: 48,
                  rag: activity.nextActionDate < seed.TODAY ? "red" : "green",
                  deliverable: "Next action completed and logged",
                  source: "Sales Activity",
                  sourceRef: activity.id,
                };
                next = { ...next, tasks: [task, ...next.tasks] };
              }
            }
            return pushActivity(next, {
              action: "Logged sales activity",
              module: "Sales",
              recordId: activity.id,
              recordLabel: activity.type,
              entityId: activity.entityId,
              to: activity.outcome,
            });
          });
          return activity;
        },
        moveDeal: (id, stage) =>
          setDb((prev) => {
            const deal = prev.deals.find((d) => d.id === id);
            if (!deal) return prev;
            return pushActivity(
              {
                ...prev,
                deals: prev.deals.map((d) =>
                  d.id === id
                    ? {
                        ...d,
                        stage,
                        lastActivity: seed.TODAY,
                        probability: stage === "Won" ? 100 : stage === "Lost" ? 0 : d.probability,
                      }
                    : d,
                ),
              },
              {
                action: "Moved deal stage",
                module: "CRM",
                recordId: id,
                recordLabel: deal.name,
                entityId: deal.entityId,
                from: deal.stage,
                to: stage,
              },
            );
          }),
        touchDeal: (id) =>
          setDb((prev) => ({
            ...prev,
            deals: prev.deals.map((d) => (d.id === id ? { ...d, lastActivity: seed.TODAY } : d)),
          })),
        convertDeal: (id) =>
          setDb((prev) => {
            const deal = prev.deals.find((d) => d.id === id);
            if (!deal) return prev;
            const client = prev.clients.find((c) => c.id === deal.clientId);
            const campaign: Campaign = {
              id: uid("cmp"),
              name: `${client?.name ?? "Client"} — ${deal.name.split("—").pop()?.trim() ?? "New Campaign"}`,
              clientId: deal.clientId,
              entityId: deal.entityId,
              city: "—",
              dealId: deal.id,
              ownerId: deal.ownerId,
              opsOwnerId: "u9",
              backupOwnerId: "u11",
              targetInfluencers: 10,
              startDate: seed.TODAY,
              endDate: deal.expectedClose,
              budget: deal.value,
              currency: deal.currency,
              brief: "Converted from won deal — brief pending from client.",
              postingRequirements: "To be defined with client.",
              status: "Planning",
              clientApproval: "Pending",
              nextAction: "Collect brief and creator criteria",
              slaHours: 48,
            };
            return pushActivity(
              {
                ...prev,
                deals: prev.deals.map((d) =>
                  d.id === id
                    ? { ...d, stage: "Won", probability: 100, lastActivity: seed.TODAY }
                    : d,
                ),
                clients: prev.clients.map((c) =>
                  c.id === deal.clientId
                    ? { ...c, status: c.status === "Prospect" ? "Active" : c.status }
                    : c,
                ),
                campaigns: [campaign, ...prev.campaigns],
              },
              {
                action: "Converted won deal into campaign",
                module: "CRM",
                recordId: campaign.id,
                recordLabel: campaign.name,
                entityId: deal.entityId,
                from: deal.stage,
                to: "Won",
              },
            );
          }),
        addClient: (c) => {
          const client: Client = { ...c, id: uid("c") };
          setDb((prev) =>
            pushActivity(
              { ...prev, clients: [client, ...prev.clients] },
              {
                action: "Created client",
                module: "CRM",
                recordId: client.id,
                recordLabel: client.name,
                entityId: client.entityId,
              },
            ),
          );
          return client;
        },
        addCampaign: (c) => {
          const campaign: Campaign = { ...c, id: uid("cmp") };
          setDb((prev) =>
            pushActivity(
              { ...prev, campaigns: [campaign, ...prev.campaigns] },
              {
                action: "Created campaign",
                module: "Campaigns",
                recordId: campaign.id,
                recordLabel: campaign.name,
                entityId: campaign.entityId,
              },
            ),
          );
          return campaign;
        },
        addCampaignInfluencer: (campaignId, influencerId, fee, currency) =>
          setDb((prev) => {
            const row: CampaignInfluencer = {
              id: uid("ci"),
              campaignId,
              influencerId,
              stage: "Target",
              fee,
              currency,
              history: [{ at: nowStamp(), stage: "Target", by: currentUserId }],
            };
            const camp = prev.campaigns.find((c) => c.id === campaignId);
            return pushActivity(
              { ...prev, campaignInfluencers: [...prev.campaignInfluencers, row] },
              {
                action: "Added influencer to campaign",
                module: "Campaigns",
                recordId: campaignId,
                recordLabel: `${prev.influencers.find((i) => i.id === influencerId)?.name} — ${camp?.name ?? ""}`,
                entityId: camp?.entityId ?? "sa",
                to: "Target",
              },
            );
          }),
        moveInfluencer: (id, stage, note) =>
          setDb((prev) => {
            const row = prev.campaignInfluencers.find((r) => r.id === id);
            if (!row) return prev;
            const camp = prev.campaigns.find((c) => c.id === row.campaignId);
            return pushActivity(
              {
                ...prev,
                campaignInfluencers: prev.campaignInfluencers.map((r) =>
                  r.id === id
                    ? {
                        ...r,
                        stage,
                        ...(note !== undefined ? { note } : {}),
                        history: [...r.history, { at: nowStamp(), stage, by: currentUserId }],
                      }
                    : r,
                ),
              },
              {
                action: "Moved influencer stage",
                module: "Campaigns",
                recordId: row.campaignId,
                recordLabel: `${prev.influencers.find((i) => i.id === row.influencerId)?.name} — ${camp?.name ?? ""}`,
                entityId: camp?.entityId ?? "sa",
                from: row.stage,
                to: stage,
              },
            );
          }),
        addTask: (t) => {
          const task: Task = { ...t, id: `T-${++counter}` };
          setDb((prev) =>
            pushActivity(
              { ...prev, tasks: [task, ...prev.tasks] },
              {
                action: "Created task",
                module: "Tasks",
                recordId: task.id,
                recordLabel: task.title,
                entityId: task.entityId,
              },
            ),
          );
          return task;
        },
        updateTask: (id, patch) =>
          setDb((prev) => {
            const t = prev.tasks.find((x) => x.id === id);
            if (!t) return prev;
            const nextTask = { ...t, ...patch };
            return pushActivity(
              { ...prev, tasks: prev.tasks.map((x) => (x.id === id ? nextTask : x)) },
              {
                action: "Updated task",
                module: "Tasks",
                recordId: id,
                recordLabel: t.title,
                entityId: t.entityId,
                to: patch.status ?? patch.notes ?? patch.dueDate ?? "Updated",
              },
            );
          }),
        setTaskStatus: (id, status) =>
          setDb((prev) => {
            const t = prev.tasks.find((x) => x.id === id);
            if (!t) return prev;
            const tasks = prev.tasks.map((x) => {
              if (x.id !== id) return x;
              if (status === "Done") return { ...x, status, percent: 100, completedAt: seed.TODAY };
              const { completedAt: _completedAt, ...rest } = x;
              return { ...rest, status, percent: x.percent };
            });
            return pushActivity(
              { ...prev, tasks },
              {
                action: "Changed task status",
                module: "Tasks",
                recordId: id,
                recordLabel: t.title,
                entityId: t.entityId,
                from: t.status,
                to: status,
              },
            );
          }),
        assignQueueItem: (ids, ownerId) =>
          setDb((prev) =>
            pushActivity(
              {
                ...prev,
                queueItems: prev.queueItems.map((q) =>
                  ids.includes(q.id) ? { ...q, ownerId } : q,
                ),
              },
              {
                action: `Assigned ${ids.length} queue item(s)`,
                module: "Operations",
                recordId: ids.join(","),
                recordLabel: userName(ownerId),
                entityId: prev.queueItems.find((q) => q.id === ids[0])?.entityId ?? "sa",
                to: userName(ownerId),
              },
            ),
          ),
        setQueueStatus: (id, status) =>
          setDb((prev) => {
            const q = prev.queueItems.find((x) => x.id === id);
            if (!q) return prev;
            return pushActivity(
              {
                ...prev,
                queueItems: prev.queueItems.map((x) => (x.id === id ? { ...x, status } : x)),
              },
              {
                action: "Changed queue status",
                module: "Operations",
                recordId: id,
                recordLabel: q.title,
                entityId: q.entityId,
                from: q.status,
                to: status,
              },
            );
          }),
        addInvoice: (i) => {
          const inv: Invoice = {
            ...i,
            id: uid("inv"),
            ownerId: i.ownerId ?? currentUserId,
            reminderDays: i.reminderDays ?? [7, 3, 1],
          };
          setDb((prev) => {
            const ownerId = inv.ownerId ?? currentUserId;
            const reminderDays = [...new Set([...(inv.reminderDays ?? [7, 3, 1]), 0])].sort(
              (a, b) => b - a,
            );
            const tasks: Task[] = reminderDays.map((days) => {
              const planned = addDays(inv.dueDate, -days);
              const dueDate = planned < seed.TODAY ? seed.TODAY : planned;
              const title =
                days === 0
                  ? `Payment due today — ${inv.number}`
                  : `${days}-day bill follow-up — ${inv.number}`;
              return {
                id: `T-${++counter}`,
                title,
                description:
                  days === 0
                    ? "Automatically created for the invoice due date. Confirm payment or log the collection status."
                    : `Automatically created ${days} day(s) before the invoice due date. Confirm receipt, payment plan and next collection action.`,
                department: "Finance",
                ownerId,
                requestedById: currentUserId,
                entityId: inv.entityId,
                clientId: inv.clientId,
                priority: days <= 1 ? "High" : "Medium",
                status: "Backlog",
                startDate: seed.TODAY,
                dueDate,
                percent: 0,
                slaHours: days === 0 ? 8 : 24,
                rag: dueDate <= seed.TODAY ? "amber" : "green",
                deliverable:
                  days === 0 ? "Payment status confirmed" : "Collection follow-up logged",
                source: "Bill",
                sourceRef: `${inv.id}:D${days}`,
              };
            });
            const reminders: ReminderSchedule[] = reminderDays.map((days) => {
              const planned = addDays(inv.dueDate, -days);
              const startDate = planned < seed.TODAY ? seed.TODAY : planned;
              return {
                id: uid("rs"),
                title:
                  days === 0 ? `Due today: ${inv.number}` : `${days}-day reminder: ${inv.number}`,
                description: `${prev.clients.find((c) => c.id === inv.clientId)?.name ?? "Client"} · ${inv.currency} ${(inv.amount - inv.paid).toLocaleString()} outstanding`,
                recipientIds: [ownerId],
                cadence: "none",
                leadDays: 0,
                sendTime: days === 0 ? "08:00" : "09:00",
                channels: ["in-app", "email"],
                startDate,
                active: true,
                entityId: inv.entityId,
                ownerId,
                category: "Finance",
                sourceType: "Bill",
                sourceRef: inv.id,
              };
            });
            return pushActivity(
              {
                ...prev,
                invoices: [inv, ...prev.invoices],
                tasks: [...tasks, ...prev.tasks],
                reminderSchedules: [...reminders, ...prev.reminderSchedules],
              },
              {
                action: "Created bill with pre-due tasks and reminders",
                module: "Finance",
                recordId: inv.id,
                recordLabel: inv.number,
                entityId: inv.entityId,
                to: `${reminderDays.length} reminders scheduled`,
              },
            );
          });
          return inv;
        },
        updateInvoice: (id, patch) =>
          setDb((prev) => {
            const inv = prev.invoices.find((x) => x.id === id);
            if (!inv) return prev;
            const updated = { ...inv, ...patch };
            const ownerId = updated.ownerId ?? currentUserId;
            const clientLabel =
              prev.clients.find((c) => c.id === updated.clientId)?.name ?? "Client";

            // Keep every source-linked pre-due task aligned when the bill owner or due date changes.
            const tasks = prev.tasks.map((task) => {
              if (task.source !== "Bill" || !task.sourceRef) return task;
              if (task.sourceRef === id) {
                return {
                  ...task,
                  ownerId,
                  dueDate:
                    updated.dueDate < seed.TODAY && updated.paid < updated.amount
                      ? seed.TODAY
                      : updated.dueDate,
                };
              }
              const match = task.sourceRef.match(new RegExp(`^${id}:D(\\d+)$`));
              if (!match) return task;
              const days = Number(match[1]);
              const planned = addDays(updated.dueDate, -days);
              const dueDate = planned < seed.TODAY ? seed.TODAY : planned;
              return {
                ...task,
                ownerId,
                dueDate,
                rag:
                  dueDate <= seed.TODAY && updated.status !== "Paid"
                    ? ("amber" as const)
                    : ("green" as const),
              };
            });

            const reminderSchedules = prev.reminderSchedules.map((schedule) => {
              if (schedule.sourceType !== "Bill" || schedule.sourceRef !== id) return schedule;
              const match = schedule.title.match(/^(\d+)-day reminder:/);
              const days = match ? Number(match[1]) : 0;
              const planned = addDays(updated.dueDate, -days);
              const startDate = planned < seed.TODAY ? seed.TODAY : planned;
              return {
                ...schedule,
                recipientIds: [ownerId],
                ownerId,
                entityId: updated.entityId,
                startDate,
                description: `${clientLabel} · ${updated.currency} ${(updated.amount - updated.paid).toLocaleString()} outstanding`,
              };
            });

            return pushActivity(
              {
                ...prev,
                invoices: prev.invoices.map((x) => (x.id === id ? updated : x)),
                tasks,
                reminderSchedules,
              },
              {
                action: "Updated bill / collection action",
                module: "Finance",
                recordId: id,
                recordLabel: inv.number,
                entityId: inv.entityId,
                to: patch.nextAction ?? patch.status ?? "Updated",
              },
            );
          }),
        setInvoiceStatus: (id, status) =>
          setDb((prev) => {
            const inv = prev.invoices.find((x) => x.id === id);
            if (!inv) return prev;
            return pushActivity(
              { ...prev, invoices: prev.invoices.map((x) => (x.id === id ? { ...x, status } : x)) },
              {
                action: "Changed invoice status",
                module: "Finance",
                recordId: id,
                recordLabel: inv.number,
                entityId: inv.entityId,
                from: inv.status,
                to: status,
              },
            );
          }),
        addPayment: (p) =>
          setDb((prev) => {
            const payment: Payment = { ...p, id: uid("p") };
            const invoices = prev.invoices.map((inv) => {
              if (inv.id !== p.invoiceId) return inv;
              const paid = inv.paid + p.amount;
              const status: Invoice["status"] = paid >= inv.amount ? "Paid" : "Partially Paid";
              return { ...inv, paid, status };
            });
            const inv = prev.invoices.find((x) => x.id === p.invoiceId);
            return pushActivity(
              { ...prev, payments: [payment, ...prev.payments], invoices },
              {
                action: "Recorded payment",
                module: "Finance",
                recordId: p.invoiceId,
                recordLabel: inv?.number ?? p.invoiceId,
                entityId: p.entityId,
                to: `${p.currency} ${p.amount}`,
              },
            );
          }),
        requestAccount: (r) =>
          setDb((prev) => {
            const req: CoaRequest = {
              ...r,
              id: `COA-${++counter}`,
              status: "Pending Review",
              requestedAt: seed.TODAY,
              requestedBy: currentUserId,
            };
            const approval: Approval = {
              id: `AP-${counter}`,
              type: "COA Creation",
              title: `New account ${req.code} — ${req.name}`,
              requesterId: currentUserId,
              approverId: "u3",
              entityId: req.entityId,
              submittedAt: seed.TODAY,
              status: "Pending",
              linkTo: "/finance/coa",
            };
            return pushActivity(
              {
                ...prev,
                coaRequests: [req, ...prev.coaRequests],
                approvals: [approval, ...prev.approvals],
              },
              {
                action: "Requested new COA account",
                module: "Finance",
                recordId: req.id,
                recordLabel: `${req.code} ${req.name}`,
                entityId: req.entityId,
              },
            );
          }),
        decideCoaRequest: (id, decision) =>
          setDb((prev) => {
            const req = prev.coaRequests.find((r) => r.id === id);
            if (!req) return prev;
            const accounts =
              decision === "Approved"
                ? [
                    ...prev.accounts,
                    {
                      code: req.code,
                      name: req.name,
                      type: req.type,
                      category: "Requested",
                      entities: [req.entityId],
                      currencyBehaviour: "Local",
                      active: true,
                      createdBy: req.requestedBy,
                      approvedBy: currentUserId,
                      effectiveDate: seed.TODAY,
                    } satisfies Account,
                  ].sort((a, b) => a.code.localeCompare(b.code))
                : prev.accounts;
            return pushActivity(
              {
                ...prev,
                accounts,
                coaRequests: prev.coaRequests.map((r) =>
                  r.id === id ? { ...r, status: decision, decidedBy: currentUserId } : r,
                ),
                approvals: prev.approvals.map((a) =>
                  a.title.includes(req.code) && a.type === "COA Creation"
                    ? { ...a, status: decision }
                    : a,
                ),
              },
              {
                action: `COA request ${decision.toLowerCase()}`,
                module: "Finance",
                recordId: id,
                recordLabel: `${req.code} ${req.name}`,
                entityId: req.entityId,
                from: "Pending Review",
                to: decision,
              },
            );
          }),
        decideApproval: (id, decision) =>
          setDb((prev) => {
            const ap = prev.approvals.find((a) => a.id === id);
            if (!ap) return prev;
            return pushActivity(
              {
                ...prev,
                approvals: prev.approvals.map((a) =>
                  a.id === id ? { ...a, status: decision } : a,
                ),
              },
              {
                action: `Approval ${decision.toLowerCase()}`,
                module: "Approvals",
                recordId: id,
                recordLabel: ap.title,
                entityId: ap.entityId,
                from: ap.status,
                to: decision,
              },
            );
          }),
        markNotification: (id, read) =>
          setDb((prev) => ({
            ...prev,
            notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read } : n)),
          })),
        markAllNotificationsRead: () =>
          setDb((prev) => ({
            ...prev,
            notifications: prev.notifications.map((n) => ({ ...n, read: true })),
          })),
        addExpense: (e) =>
          setDb((prev) =>
            pushActivity(
              { ...prev, expenses: [{ ...e, id: uid("e") }, ...prev.expenses] },
              {
                action: "Created expense",
                module: "Finance",
                recordId: e.description,
                recordLabel: e.description,
                entityId: e.entityId,
              },
            ),
          ),
        addFile: (f) =>
          setDb((prev) => ({ ...prev, files: [{ ...f, id: uid("f") }, ...prev.files] })),
        addEntity: (e) =>
          setDb((prev) =>
            pushActivity(
              {
                ...prev,
                entities: [
                  ...prev.entities,
                  { ...e, id: e.country.toLowerCase() + (prev.entities.length + 1) },
                ],
              },
              {
                action: "Created entity",
                module: "Admin",
                recordId: e.name,
                recordLabel: e.legalName,
                entityId: "sa",
              },
            ),
          ),
        addUser: (u) =>
          setDb((prev) =>
            pushActivity(
              { ...prev, users: [...prev.users, { ...u, id: uid("u"), lastLogin: "—" }] },
              {
                action: "Created user",
                module: "Admin",
                recordId: u.email,
                recordLabel: u.name,
                entityId: u.entityId,
              },
            ),
          ),
        setUserStatus: (id, status) =>
          setDb((prev) => {
            const u = prev.users.find((x) => x.id === id);
            if (!u) return prev;
            return pushActivity(
              { ...prev, users: prev.users.map((x) => (x.id === id ? { ...x, status } : x)) },
              {
                action: "Changed user status",
                module: "Admin",
                recordId: id,
                recordLabel: u.name,
                entityId: u.entityId,
                from: u.status,
                to: status,
              },
            );
          }),
        toggleAutomation: (id) =>
          setDb((prev) => ({
            ...prev,
            automationRules: prev.automationRules.map((r) =>
              r.id === id ? { ...r, enabled: !r.enabled } : r,
            ),
          })),
        /* ── Calendar ─────────────────────────────────────────────── */
        addEvent: (e) => {
          const event: CalendarEvent = { ...e, id: uid("ev"), createdBy: currentUserId };
          setDb((prev) =>
            pushActivity(
              { ...prev, calendarEvents: [...prev.calendarEvents, event] },
              {
                action: "Created calendar event",
                module: "Calendar",
                recordId: event.id,
                recordLabel: event.title,
                entityId: event.entityId,
                to: event.date,
              },
            ),
          );
          return event;
        },
        updateEvent: (id, patch) =>
          setDb((prev) => {
            const ev = prev.calendarEvents.find((x) => x.id === id);
            if (!ev) return prev;
            return pushActivity(
              {
                ...prev,
                calendarEvents: prev.calendarEvents.map((x) =>
                  x.id === id ? { ...x, ...patch } : x,
                ),
              },
              {
                action: "Updated calendar event",
                module: "Calendar",
                recordId: id,
                recordLabel: ev.title,
                entityId: ev.entityId,
              },
            );
          }),
        setEventStatus: (id, status) =>
          setDb((prev) => {
            const ev = prev.calendarEvents.find((x) => x.id === id);
            if (!ev) return prev;
            return pushActivity(
              {
                ...prev,
                calendarEvents: prev.calendarEvents.map((x) =>
                  x.id === id ? { ...x, status } : x,
                ),
              },
              {
                action: "Changed event status",
                module: "Calendar",
                recordId: id,
                recordLabel: ev.title,
                entityId: ev.entityId,
                from: ev.status,
                to: status,
              },
            );
          }),
        recordMeetingOutcome: (id, outcome, nextAction, ownerId, dueDate) =>
          setDb((prev) => {
            const ev = prev.calendarEvents.find((x) => x.id === id);
            if (!ev) return prev;
            const patched = {
              ...ev,
              status: "Completed" as const,
              outcome,
              ...(nextAction ? { nextAction } : {}),
              ...(ownerId ? { actionOwnerId: ownerId } : {}),
              ...(dueDate ? { actionDueDate: dueDate } : {}),
            };
            let next: DB = {
              ...prev,
              calendarEvents: prev.calendarEvents.map((x) => (x.id === id ? patched : x)),
            };
            const linked = next.tasks.find((t) => t.source === "Meeting" && t.sourceRef === id);

            if (nextAction && ownerId && dueDate) {
              if (linked) {
                const department = prev.users.find((u) => u.id === ownerId)?.department ?? "Sales";
                next = {
                  ...next,
                  tasks: next.tasks.map((task) =>
                    task.id === linked.id
                      ? {
                          ...task,
                          title: nextAction,
                          description: `Auto-created from meeting outcome: ${ev.title}.`,
                          department,
                          ownerId,
                          dueDate,
                          rag: dueDate < seed.TODAY ? ("red" as const) : ("green" as const),
                          ...(task.status === "Cancelled" ? { status: "To Do" as const } : {}),
                        }
                      : task,
                  ),
                };
              } else {
                const task: Task = {
                  id: `T-${++counter}`,
                  title: nextAction,
                  description: `Auto-created from meeting outcome: ${ev.title}.`,
                  department: prev.users.find((u) => u.id === ownerId)?.department ?? "Sales",
                  ownerId,
                  requestedById: currentUserId,
                  entityId: ev.entityId,
                  ...(ev.linkedType === "client" && ev.linkedId ? { clientId: ev.linkedId } : {}),
                  priority: "High",
                  status: "To Do",
                  startDate: seed.TODAY,
                  dueDate,
                  percent: 0,
                  slaHours: 48,
                  rag: dueDate < seed.TODAY ? "red" : "green",
                  deliverable: "Meeting commitment completed",
                  source: "Meeting",
                  sourceRef: id,
                };
                next = { ...next, tasks: [task, ...next.tasks] };
              }
            } else if (linked && !["Done", "Cancelled"].includes(linked.status)) {
              next = {
                ...next,
                tasks: next.tasks.map((task) =>
                  task.id === linked.id
                    ? {
                        ...task,
                        status: "Cancelled" as const,
                        notes: "Meeting outcome updated with no follow-up action.",
                      }
                    : task,
                ),
              };
            }
            return pushActivity(next, {
              action: "Recorded meeting outcome",
              module: "Meetings",
              recordId: id,
              recordLabel: ev.title,
              entityId: ev.entityId,
              to: outcome,
            });
          }),
        deleteEvent: (id) =>
          setDb((prev) => {
            const ev = prev.calendarEvents.find((x) => x.id === id);
            if (!ev) return prev;
            return pushActivity(
              {
                ...prev,
                calendarEvents: prev.calendarEvents.filter((x) => x.id !== id),
                // Reminders hang off events; unlink rather than orphan them.
                reminderSchedules: prev.reminderSchedules.map((r) => {
                  if (r.eventId !== id) return r;
                  const { eventId: _unlinked, ...rest } = r;
                  return rest;
                }),
              },
              {
                action: "Deleted calendar event",
                module: "Calendar",
                recordId: id,
                recordLabel: ev.title,
                entityId: ev.entityId,
              },
            );
          }),

        /* ── Reminder schedules ───────────────────────────────────── */
        addReminder: (r) => {
          const reminder: ReminderSchedule = { ...r, id: uid("rs"), ownerId: currentUserId };
          setDb((prev) =>
            pushActivity(
              { ...prev, reminderSchedules: [...prev.reminderSchedules, reminder] },
              {
                action: "Created reminder schedule",
                module: "Calendar",
                recordId: reminder.id,
                recordLabel: reminder.title,
                entityId: reminder.entityId,
                to: reminder.cadence,
              },
            ),
          );
          return reminder;
        },
        updateReminder: (id, patch) =>
          setDb((prev) => ({
            ...prev,
            reminderSchedules: prev.reminderSchedules.map((r) =>
              r.id === id ? { ...r, ...patch } : r,
            ),
          })),
        toggleReminder: (id) =>
          setDb((prev) => {
            const r = prev.reminderSchedules.find((x) => x.id === id);
            if (!r) return prev;
            return pushActivity(
              {
                ...prev,
                reminderSchedules: prev.reminderSchedules.map((x) =>
                  x.id === id ? { ...x, active: !x.active } : x,
                ),
              },
              {
                action: r.active ? "Paused reminder schedule" : "Activated reminder schedule",
                module: "Calendar",
                recordId: id,
                recordLabel: r.title,
                entityId: r.entityId,
              },
            );
          }),
        deleteReminder: (id) =>
          setDb((prev) => {
            const r = prev.reminderSchedules.find((x) => x.id === id);
            if (!r) return prev;
            return pushActivity(
              { ...prev, reminderSchedules: prev.reminderSchedules.filter((x) => x.id !== id) },
              {
                action: "Deleted reminder schedule",
                module: "Calendar",
                recordId: id,
                recordLabel: r.title,
                entityId: r.entityId,
              },
            );
          }),
        runReminder: (id) =>
          setDb((prev) => {
            const r = prev.reminderSchedules.find((x) => x.id === id);
            if (!r) return prev;
            const link =
              r.category === "Finance"
                ? "/finance/invoices"
                : r.category === "Sales"
                  ? "/sales"
                  : r.category === "Meeting"
                    ? "/meetings"
                    : r.category === "Task"
                      ? "/tasks"
                      : "/calendar";
            const notes: Notification[] = r.channels.includes("in-app")
              ? r.recipientIds.map((recipientId) => ({
                  id: uid("n"),
                  category: r.category,
                  title: r.title,
                  detail: `${r.description ?? "Scheduled reminder"} — for ${prev.users.find((u) => u.id === recipientId)?.name ?? "you"}`,
                  at: nowStamp(),
                  priority: "Medium",
                  read: false,
                  link,
                }))
              : [];
            const recipients = r.recipientIds
              .map((recipientId) => prev.users.find((u) => u.id === recipientId)?.email)
              .filter((email): email is string => Boolean(email));
            const emailLog: MailMessage[] =
              r.channels.includes("email") && recipients.length
                ? [
                    {
                      id: uid("m"),
                      threadId: uid("t"),
                      folder: "sent",
                      fromName: "TryGC Automation",
                      fromEmail: prev.settings.organisation.supportEmail,
                      to: recipients,
                      subject: `[Reminder] ${r.title}`,
                      preview: r.description ?? "Scheduled TryGC execution reminder",
                      body: `${r.description ?? "Scheduled TryGC execution reminder"}\n\nTriggered manually from the TryGC Workspace Hub.`,
                      at: nowStamp(),
                      read: true,
                      starred: false,
                      attachments: [],
                      labels: ["Automation", r.category],
                      entityId: r.entityId,
                    },
                  ]
                : [];
            return pushActivity(
              {
                ...prev,
                notifications: [...notes, ...prev.notifications],
                mail: [...emailLog, ...prev.mail],
                reminderSchedules: prev.reminderSchedules.map((x) =>
                  x.id === id ? { ...x, lastRunAt: seed.TODAY } : x,
                ),
              },
              {
                action: "Sent scheduled reminder",
                module: "Calendar",
                recordId: id,
                recordLabel: r.title,
                entityId: r.entityId,
                to: `${r.recipientIds.length} recipients`,
              },
            );
          }),

        /* ── Mail ─────────────────────────────────────────────────── */
        sendMail: (m) =>
          setDb((prev) => {
            const msg: MailMessage = {
              ...m,
              id: uid("m"),
              threadId: m.threadId ?? uid("t"),
              at: nowStamp(),
              read: true,
              folder: "sent",
            };
            return pushActivity(
              { ...prev, mail: [msg, ...prev.mail] },
              {
                action: "Sent email",
                module: "Email",
                recordId: msg.id,
                recordLabel: msg.subject,
                entityId: msg.entityId,
                to: msg.to.join(", "),
              },
            );
          }),
        setMailRead: (id, read) =>
          setDb((prev) => ({
            ...prev,
            mail: prev.mail.map((m) => (m.id === id ? { ...m, read } : m)),
          })),
        toggleMailStar: (id) =>
          setDb((prev) => ({
            ...prev,
            mail: prev.mail.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)),
          })),
        moveMail: (id, folder) =>
          setDb((prev) => {
            const m = prev.mail.find((x) => x.id === id);
            if (!m) return prev;
            return pushActivity(
              { ...prev, mail: prev.mail.map((x) => (x.id === id ? { ...x, folder } : x)) },
              {
                action: "Moved email",
                module: "Email",
                recordId: id,
                recordLabel: m.subject,
                entityId: m.entityId,
                from: m.folder,
                to: folder,
              },
            );
          }),

        /* ── Chat ─────────────────────────────────────────────────── */
        sendChat: (channelId, body) =>
          setDb((prev) => {
            // "@firstname" mentions resolve to real user ids so they can drive notifications.
            const mentions = prev.users
              .filter((u) =>
                body.toLowerCase().includes(`@${(u.name.split(" ")[0] ?? "").toLowerCase()}`),
              )
              .map((u) => u.id);
            const msg: ChatMessage = {
              id: uid("cx"),
              channelId,
              authorId: currentUserId,
              at: nowStamp(),
              body,
              mentions,
              reactions: [],
            };
            const channel = prev.chatChannels.find((c) => c.id === channelId);
            const author = prev.users.find((u) => u.id === currentUserId)?.name ?? "Someone";
            const where = channel?.kind === "direct" ? "Direct message" : `#${channel?.name ?? ""}`;
            const mentionNotes: Notification[] = mentions
              .filter((mid) => mid !== currentUserId)
              .map((mid) => ({
                id: uid("n"),
                category: "Messaging" as const,
                title: `${author} mentioned ${prev.users.find((u) => u.id === mid)?.name ?? "you"}`,
                detail: `${where} — ${body.slice(0, 90)}`,
                at: nowStamp(),
                priority: "Medium" as const,
                read: false,
                link: "/chat",
              }));
            return {
              ...prev,
              chatMessages: [...prev.chatMessages, msg],
              notifications: [...mentionNotes, ...prev.notifications],
            };
          }),
        toggleReaction: (messageId, emoji) =>
          setDb((prev) => ({
            ...prev,
            chatMessages: prev.chatMessages.map((m) => {
              if (m.id !== messageId) return m;
              const existing = m.reactions.find((r) => r.emoji === emoji);
              if (!existing)
                return { ...m, reactions: [...m.reactions, { emoji, userIds: [currentUserId] }] };
              const mine = existing.userIds.includes(currentUserId);
              const userIds = mine
                ? existing.userIds.filter((u) => u !== currentUserId)
                : [...existing.userIds, currentUserId];
              return {
                ...m,
                reactions: userIds.length
                  ? m.reactions.map((r) => (r.emoji === emoji ? { ...r, userIds } : r))
                  : m.reactions.filter((r) => r.emoji !== emoji),
              };
            }),
          })),
        addChannel: (c) => {
          const channel: ChatChannel = { ...c, id: uid("ch") };
          setDb((prev) => ({ ...prev, chatChannels: [...prev.chatChannels, channel] }));
          return channel;
        },

        /* ── Settings ─────────────────────────────────────────────── */
        updateSettings: (section, patch) =>
          setDb((prev) => ({
            ...prev,
            settings: { ...prev.settings, [section]: { ...prev.settings[section], ...patch } },
          })),
        resetSettings: () => setDb((prev) => ({ ...prev, settings: collab.defaultSettings })),

        setSeatStatus: (id, status) =>
          setDb((prev) => {
            const s = prev.saasSeats.find((x) => x.id === id);
            if (!s) return prev;
            return pushActivity(
              {
                ...prev,
                saasSeats: prev.saasSeats.map((x) => (x.id === id ? { ...x, status } : x)),
              },
              {
                action: "Changed SaaS seat status",
                module: "Admin",
                recordId: id,
                recordLabel: `${s.app} — ${userName(s.userId)}`,
                entityId: prev.users.find((u) => u.id === s.userId)?.entityId ?? "sa",
                from: s.status,
                to: status,
              },
            );
          }),
      },
    };
  }, [db, scope, currentUser, currentUserId, activeWorkspace, setActiveWorkspace, log]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
