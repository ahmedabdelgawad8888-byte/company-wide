import type { WorkspaceId, WorkspaceLevel } from "./workspace-hub.ts";

export type CountryCode = "SA" | "EG" | "AE" | "KW" | "QA" | "BH";
export type Currency = "SAR" | "EGP" | "AED" | "KWD" | "QAR" | "BHD";

export interface Entity {
  id: string;
  name: string;
  legalName: string;
  country: CountryCode;
  countryName: string;
  currency: Currency;
  fiscalYearStart: string;
  taxId: string;
  status: "active" | "onboarding" | "planned";
  openedAt: string;
}

export interface FxRate {
  currency: Currency;
  toSAR: number;
  effectiveDate: string;
  source: string;
  locked: boolean;
}

export type Health = "green" | "amber" | "red" | "critical";
export type RAG = "green" | "amber" | "red";

export interface User {
  source?: string;
  jobTitle?: string;
  id: string;
  name: string;
  email: string;
  role: RoleName;
  department: string;
  entityId: string;
  scope: "group" | "entity";
  status: "active" | "suspended" | "offboarding";
  lastLogin: string;
  /** The single workspace this person belongs to. Admins still see every workspace. */
  workspaceId: WorkspaceId;
  /** Position in that workspace's hierarchy: member, supervisor or lead. */
  workspaceLevel: WorkspaceLevel;
  /** Who this person reports to inside the workspace. Empty for a workspace lead. */
  managerId?: string;
}

export type RoleName =
  | "Group Admin"
  | "Executive Management"
  | "Group Finance"
  | "Branch Accountant"
  | "Sales Manager"
  | "Account Manager"
  | "Community Manager"
  | "Community Specialist"
  | "Operations Manager"
  | "Queue Manager"
  | "Operations Specialist"
  | "HR Manager"
  | "HR Specialist"
  | "Data Analyst"
  | "Quality"
  | "IT Admin"
  | "PMO Lead"
  | "Product Manager"
  | "Tech Lead"
  | "Business Analyst"
  | "Frontend Developer"
  | "Backend Developer"
  | "Full-stack Developer"
  | "UI/UX Designer"
  | "QA Engineer"
  | "DevOps Engineer"
  | "Viewer";

export interface RoleDef {
  name: RoleName;
  description: string;
  scope: "Group" | "Entity" | "Team";
  permissions: string[];
  canEditCOA: boolean;
  members: number;
}

export type LeadStage =
  | "New Lead"
  | "Contacted"
  | "Qualified"
  | "Discovery"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";

export interface Deal {
  id: string;
  name: string;
  clientId: string;
  entityId: string;
  industry: string;
  source: string;
  ownerId: string;
  value: number;
  currency: Currency;
  stage: LeadStage;
  probability: number;
  expectedClose: string;
  lastActivity: string;
  nextAction: string;
  nextActionDate: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  competitor?: string;
  lossReason?: string;
  createdAt: string;
}

export interface SalesActivity {
  id: string;
  entityId: string;
  ownerId: string;
  clientId?: string;
  type: "Call" | "Follow-up" | "Meeting" | "Proposal" | "Quotation" | "Contract" | "Other";
  date: string;
  outcome:
    | "Answered"
    | "No Answer"
    | "Follow-up Required"
    | "Meeting Booked"
    | "Proposal Requested"
    | "Quotation Sent"
    | "Contract Pending"
    | "Completed"
    | "Rejected";
  notes: string;
  nextAction?: string;
  nextActionDate?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  entityId: string;
  industry: string;
  accountManagerId: string;
  escalationOwnerId: string;
  status: "Prospect" | "Active" | "At Risk" | "Churned";
  since: string;
  lifetimeRevenue: number;
  currency: Currency;
  satisfaction: number;
  lastInteraction: string;
  nextAction: string;
}

export interface Contact {
  id: string;
  clientId: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  primary: boolean;
}

export type InfluencerStage =
  | "Target"
  | "Prospected"
  | "Contacted"
  | "Interested"
  | "Confirmation Requested"
  | "Confirmed"
  | "Submitted to Client"
  | "Approved"
  | "Rejected"
  | "Replacement Required"
  | "Scheduled"
  | "Visited"
  | "Posting Coverage Received"
  | "Posting Coverage Verified"
  | "Completed"
  | "No Response"
  | "Missed Visit"
  | "Missing Posting Coverage"
  | "Cancelled";

export interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: "Instagram" | "TikTok" | "Snapchat" | "YouTube" | "X";
  followers: number;
  country: CountryCode;
  tier: "Nano" | "Micro" | "Mid" | "Macro" | "Mega";
  category: string;
  rating: number;
  blacklisted: boolean;
}

export interface CampaignInfluencer {
  id: string;
  campaignId: string;
  influencerId: string;
  stage: InfluencerStage;
  visitDate?: string;
  coverageDue?: string;
  fee: number;
  currency: Currency;
  note?: string;
  history: { at: string; stage: InfluencerStage; by: string }[];
}

export interface Campaign {
  id: string;
  name: string;
  clientId: string;
  entityId: string;
  city: string;
  dealId?: string;
  ownerId: string;
  opsOwnerId: string;
  backupOwnerId: string;
  targetInfluencers: number;
  startDate: string;
  endDate: string;
  budget: number;
  currency: Currency;
  brief: string;
  postingRequirements: string;
  status: "Planning" | "Active" | "Delivery" | "Closing" | "Completed" | "On Hold";
  clientApproval: "Pending" | "Partial" | "Approved";
  nextAction: string;
  slaHours: number;
}

export type TaskStatus =
  | "Backlog"
  | "To Do"
  | "In Progress"
  | "Blocked"
  | "Pending Approval"
  | "Done"
  | "Cancelled"
  | "Postponed";

export interface Task {
  id: string;
  title: string;
  description: string;
  department: string;
  ownerId: string;
  backupId?: string;
  requestedById?: string;
  entityId: string;
  clientId?: string;
  campaignId?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  percent: number;
  slaHours: number;
  rag: RAG;
  deliverable: string;
  notes?: string;
  source?: "Manual" | "Meeting" | "Bill" | "Sales Activity" | "Automation";
  sourceRef?: string;
  completedAt?: string;
}

export interface QueueItem {
  id: string;
  queue: "Onboarding" | "Coordination" | "WhatsApp" | "Visits" | "Posting Coverage" | "QA";
  title: string;
  entityId: string;
  clientId?: string;
  campaignId?: string;
  influencerId?: string;
  ownerId: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  createdAt: string;
  slaDeadline: string;
  status: "Open" | "In Progress" | "Blocked" | "Escalated" | "Done";
  nextAction: string;
}

export interface Account {
  code: string;
  name: string;
  type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  parent?: string;
  category: string;
  entities: string[] | "all";
  currencyBehaviour: "Local" | "Multi" | "Group";
  active: boolean;
  createdBy: string;
  approvedBy: string;
  effectiveDate: string;
}

export interface CoaRequest {
  id: string;
  code: string;
  name: string;
  type: Account["type"];
  entityId: string;
  requestedBy: string;
  requestedAt: string;
  justification: string;
  status: "Pending Review" | "Approved" | "Rejected";
  decidedBy?: string;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  campaignId?: string;
  dealId?: string;
  entityId: string;
  ownerId?: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paid: number;
  currency: Currency;
  status:
    "Draft" | "Pending Approval" | "Issued" | "Partially Paid" | "Paid" | "Overdue" | "Cancelled";
  lines: { description: string; qty: number; unitPrice: number }[];
  lastFollowUp?: string;
  nextAction?: string;
  promiseToPayDate?: string;
  reminderDays?: number[];
  notes?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  entityId: string;
  date: string;
  amount: number;
  currency: Currency;
  method: "Bank Transfer" | "Cheque" | "Cash" | "Card";
  reference: string;
}

export interface Expense {
  id: string;
  description: string;
  entityId: string;
  campaignId?: string;
  accountCode: string;
  date: string;
  amount: number;
  currency: Currency;
  status: "Draft" | "Pending Approval" | "Approved" | "Paid" | "Rejected";
  vendor: string;
}

export interface Approval {
  id: string;
  type:
    | "COA Creation"
    | "Invoice Approval"
    | "Payment Approval"
    | "Expense Approval"
    | "Proposal Approval"
    | "Campaign Change"
    | "Influencer Approval"
    | "Access Request"
    | "Finance Adjustment";
  title: string;
  requesterId: string;
  approverId: string;
  entityId: string;
  value?: number;
  currency?: Currency;
  submittedAt: string;
  status: "Pending" | "Approved" | "Rejected" | "Returned";
  linkTo?: string;
}

export interface ActivityEvent {
  id: string;
  at: string;
  actorId: string;
  action: string;
  module: string;
  recordId: string;
  recordLabel: string;
  entityId: string;
  from?: string;
  to?: string;
}

export interface Notification {
  id: string;
  category:
    | "CRM"
    | "Sales"
    | "Campaign"
    | "Client"
    | "Finance"
    | "Task"
    | "Meeting"
    | "Approval"
    | "System"
    | "Calendar"
    | "Messaging";
  title: string;
  detail: string;
  at: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  read: boolean;
  link?: string;
}

export interface CorporateFile {
  id: string;
  name: string;
  kind: "folder" | "pdf" | "sheet" | "doc" | "image";
  path: string;
  entityId: string;
  clientId?: string;
  campaignId?: string;
  size: string;
  updatedAt: string;
  owner: string;
}

export interface Integration {
  id: string;
  name: string;
  category: string;
  status:
    | "Connected"
    | "Not Connected"
    | "Needs Configuration"
    | "Error"
    | "Pending Support"
    | "Disabled";
  owner: string;
  lastSync?: string;
  lastError?: string;
  webhook: "Active" | "Inactive" | "Failing";
  auth: "Valid" | "Expired" | "Missing";
}

export interface SaasSeat {
  id: string;
  app: string;
  userId: string;
  corporateEmail: string;
  license: string;
  status: "Active" | "Suspended" | "Revoked" | "Pending";
  assignedAt: string;
  lastReview: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  when: string;
  ifCriteria: string;
  then: string;
  enabled: boolean;
  runs: number;
  failures: number;
  lastRun: string;
}

/* ── Calendar, reminders, mail, chat and settings ─────────────────────── */

export type Cadence = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

export type EventType =
  | "Meeting"
  | "Sales Meeting"
  | "Client Review"
  | "Campaign Milestone"
  | "Creator Visit"
  | "Finance Close"
  | "Approval Deadline"
  | "Internal"
  | "Holiday";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  entityId: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" 24h; ignored when allDay */
  startTime: string;
  endTime: string;
  allDay: boolean;
  location?: string;
  organizerId: string;
  attendeeIds: string[];
  status: "Scheduled" | "Confirmed" | "Cancelled" | "Completed";
  /** Repeat rule for the event itself. */
  recurrence: Cadence;
  /** Last date a recurring event may generate an occurrence. */
  recurrenceUntil?: string;
  linkedType?: "client" | "campaign" | "deal" | "invoice" | "task";
  linkedId?: string;
  outcome?: string;
  nextAction?: string;
  actionOwnerId?: string;
  actionDueDate?: string;
  createdBy: string;
}

/** A standing notification: tells the concerned people about something on a cadence. */
export interface ReminderSchedule {
  id: string;
  title: string;
  description?: string;
  /** Optional event this reminder is attached to. */
  eventId?: string;
  /** Source linkage lets auto-created schedules move with their bill/task/meeting. */
  sourceType?: "Bill" | "Meeting" | "Task" | "Sales";
  sourceRef?: string;
  recipientIds: string[];
  cadence: Cadence;
  /** Notify this many days before each occurrence. */
  leadDays: number;
  /** "HH:MM" local send time. */
  sendTime: string;
  channels: ("in-app" | "email")[];
  /** "YYYY-MM-DD" the schedule starts producing occurrences. */
  startDate: string;
  endDate?: string;
  lastRunAt?: string;
  active: boolean;
  entityId: string;
  ownerId: string;
  category: Notification["category"];
}

export interface MailMessage {
  id: string;
  threadId: string;
  folder: "inbox" | "sent" | "drafts" | "archive" | "spam" | "trash";
  fromName: string;
  fromEmail: string;
  fromUserId?: string;
  to: string[];
  cc?: string[];
  subject: string;
  preview: string;
  body: string;
  at: string;
  read: boolean;
  starred: boolean;
  attachments: { name: string; size: string }[];
  labels: string[];
  entityId: string;
  linkedType?: "client" | "campaign" | "invoice" | "deal";
  linkedId?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  kind: "channel" | "direct";
  topic?: string;
  memberIds: string[];
  entityId: string;
  private: boolean;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  authorId: string;
  at: string;
  body: string;
  /** Ids of users explicitly mentioned with @. */
  mentions: string[];
  reactions: { emoji: string; userIds: string[] }[];
}

export interface AppSettings {
  organisation: {
    legalName: string;
    tradingName: string;
    supportEmail: string;
    phone: string;
    website: string;
    baseCurrency: Currency;
    defaultEntityId: string;
    fiscalYearStart: string;
    timezone: string;
  };
  localisation: {
    defaultLanguage: "en" | "ar";
    dateFormat: "dd MMM yyyy" | "yyyy-MM-dd" | "dd/MM/yyyy";
    numberFormat: "1,234.56" | "1.234,56";
    weekStart: "Saturday" | "Sunday" | "Monday";
    rtlMirrorCharts: boolean;
  };
  appearance: {
    theme: "light" | "dark" | "system";
    density: "comfortable" | "compact";
    accent: "brand" | "orange" | "violet";
    sidebarCollapsed: boolean;
    showChartGrid: boolean;
  };
  notifications: {
    channels: { inApp: boolean; email: boolean; digest: boolean };
    digestCadence: Cadence;
    digestTime: string;
    quietHoursStart: string;
    quietHoursEnd: string;
    categories: Record<Notification["category"], boolean>;
  };
  finance: {
    invoicePrefix: string;
    nextInvoiceNumber: number;
    defaultPaymentTermsDays: number;
    overdueGraceDays: number;
    lockFxOnIssue: boolean;
    requireApprovalAbove: number;
    taxRatePercent: number;
  };
  approvals: {
    twoStepAboveValue: number;
    autoEscalateAfterDays: number;
    allowSelfApproval: boolean;
    delegateWhenAway: boolean;
  };
  security: {
    enforceTwoFactor: boolean;
    sessionTimeoutMinutes: number;
    passwordMinLength: number;
    ipAllowlist: string;
    auditRetentionDays: number;
  };
  data: {
    exportBranding: boolean;
    csvDelimiter: "," | ";" | "\t";
    includeArchivedInExports: boolean;
    backupCadence: Cadence;
  };
}

/* ── PMO / Dev & Business Analysis types ─────────────────────────────────── */

export type PmoDocStatus = "DONE" | "NEW" | "TBC";
export type PmoStatus =
  "Verify & Close" | "Not Started" | "In Progress" | "Blocked - Clarification" | "Done";
export type PmoPriority = "P0" | "P1" | "P2";
export type PmoSize = "S" | "M" | "L" | "XL";
export type PmoWave = "W0" | "W1" | "W2" | "W3" | "W4" | "W5" | "W6";
export type PmoOwnerRole =
  | "Product/BA"
  | "UI/UX"
  | "Backend"
  | "Frontend"
  | "Full-stack"
  | "Data/BI"
  | "DevOps"
  | "QA"
  | "Ops"
  | "Management";

export interface PmoRequirement {
  id: string;
  module: string;
  moduleAr: string;
  docNumber: number;
  title: string;
  titleAr: string;
  description: string;
  docStatus: PmoDocStatus;
  pmoStatus: PmoStatus;
  priority: PmoPriority;
  size: PmoSize;
  effortDays: number;
  wave: PmoWave;
  waveName: string;
  ownerRole: PmoOwnerRole;
  e2eStage: string;
  startDate?: string;
  etaDate?: string;
  etaWeek?: string;
  durationDays: number;
  dependencies: string[];
  acceptanceCriteria: string;
  clarificationNeeded?: string;
  percentDone: number;
  rag?: "green" | "amber" | "red";
  notes?: string;
}

export interface PmoE2EStage {
  id: number;
  name: string;
  description: string;
  modulesInvolved: string;
  reqCount: number;
  effortDays: number;
  startDate?: string;
  finishDate?: string;
  weeks: number;
  primaryOwner: PmoOwnerRole;
  entryCriteria: string;
  exitCriteria: string;
  rag?: "green" | "amber" | "red";
}

export type PmoMilestoneStatus = "Not Started" | "In Progress" | "Completed" | "At Risk";

export interface PmoMilestone {
  id: string;
  name: string;
  wave: PmoWave;
  forecastDate?: string;
  gateCriteria: string;
  owner: string;
  status: PmoMilestoneStatus;
  daysFromKickoff?: number;
}

export type RaidType = "Risk" | "Assumption" | "Issue" | "Dependency";
export type RaidSeverity = "High" | "Medium" | "Low";
export type RaidStatus = "Open" | "Mitigated" | "Closed" | "Accepted";

export interface PmoRaidItem {
  id: string;
  type: RaidType;
  description: string;
  impact: RaidSeverity;
  likelihood: RaidSeverity;
  severity: RaidSeverity;
  mitigation: string;
  owner: string;
  status: RaidStatus;
  relatedReqs: string[];
}

export type PmoActionType = "Governance" | "Decision" | "Clarification" | "Dependency" | "Delivery";
export type PmoActionStatus = "Open" | "In Progress" | "Closed" | "Blocked";

export interface PmoAction {
  id: string;
  relatedReq?: string;
  action: string;
  type: PmoActionType;
  owner: string;
  raisedDate: string;
  dueDate: string;
  priority: PmoPriority;
  status: PmoActionStatus;
  notes?: string;
}

export interface PmoQuestion {
  kind?: string;
  questionAr?: string;
  whyItMatters?: string;
  impactIfUnresolved?: string;
  id: string;
  relatedReq?: string;
  question: string;
  impact: string;
  owner: string;
  raisedDate: string;
  dueDate?: string;
  status: "Open" | "Answered" | "Deferred";
  answer?: string;
}

export interface PmoCapacityByOwner {
  ownerRole: PmoOwnerRole;
  reqCount: number;
  effortDays: number;
  windowDays: number;
  loadPercent: number;
  firstStart?: string;
  lastEta?: string;
  avgPercentDone: number;
}

export interface PmoCapacityByWave {
  wave: PmoWave;
  window: string;
  reqCount: number;
  effortDays: number;
  doneCount: number;
  newCount: number;
  tbcCount: number;
  avgPercentDone: number;
}

export interface PmoPlanConfig {
  planStartDate: string;
  workingDaysPerWeek: number;
  programDurationWeeks: number;
  effortSizes: Record<PmoSize, number>;
}
