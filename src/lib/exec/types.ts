import type { Currency } from "../types";

export type ExecDept = "Sales" | "Finance";

export type ExecStatus = "New" | "Assigned" | "In Progress" | "Waiting" | "In Review" | "Completed";

export type ExecPriority = "Low" | "Medium" | "High" | "Critical";

export type ExecBucket =
  | "Due Today"
  | "Due Tomorrow"
  | "Upcoming"
  | "Overdue"
  | "Critical Overdue"
  | "Blocked"
  | "Completed";

export type ExecCategory =
  | "Call"
  | "Follow-up"
  | "Meeting Action"
  | "Proposal"
  | "Contract"
  | "Invoice"
  | "Collection"
  | "Payment Confirmation"
  | "Internal Request"
  | "Approval";

export interface ExecComment {
  id: string;
  authorId: string;
  at: string;
  body: string;
}

export interface ExecTask {
  id: string;
  name: string;
  department: ExecDept;
  ownerId: string;
  requestedById: string;
  clientId?: string;
  brand?: string;
  category: ExecCategory;
  priority: ExecPriority;
  status: ExecStatus;
  createdDate: string;
  startDate: string;
  dueDate: string;
  dueTime: string;
  completedDate?: string;
  slaHours: number;
  notes: string;
  attachments: string[];
  comments: ExecComment[];
  meetingId?: string;
  billId?: string;
  nextAction: string;
  escalation: "None" | "Notified" | "Manager Escalated" | "Executive Escalated";
  blocked?: boolean;
  auto?: boolean;
}

export interface MeetingCommitment {
  id: string;
  text: string;
  ownerId: string;
  dueDate: string;
  converted: boolean;
}

export interface ExecMeeting {
  id: string;
  clientId: string;
  title: string;
  purpose: string;
  ownerId: string;
  attendees: string[];
  date: string;
  time: string;
  notes: string;
  outcome: string;
  clientRequests: string[];
  commitments: MeetingCommitment[];
  nextAction: string;
  followUpDate?: string;
  attachments: string[];
  status: "Scheduled" | "Completed" | "Pending Follow-up";
}

export type BillStatus =
  | "Preparing"
  | "Pending Approval"
  | "Invoice Sent"
  | "Upcoming"
  | "Due Soon"
  | "Due Today"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Escalated";

export interface DueBill {
  id: string;
  clientId: string;
  invoiceNumber: string;
  amount: number;
  paid: number;
  currency: Currency;
  entityId: string;
  responsibleId: string;
  issueDate: string;
  dueDate: string;
  status: BillStatus;
  lastFollowUp: string;
  nextAction: string;
}

export type CallOutcome = "Answered" | "No Answer" | "Follow-up Required";

export interface SalesActivity {
  id: string;
  ownerId: string;
  clientId: string;
  date: string;
  type:
    | "Call"
    | "Meeting Scheduled"
    | "Meeting Completed"
    | "Quotation Requested"
    | "Quotation Sent"
    | "Contract Pending";
  outcome?: CallOutcome;
  note: string;
}

export interface ExecReminderRule {
  id: string;
  name: string;
  offset: string;
  channels: ("In-app" | "Email" | "Dashboard")[];
  repeatWhileOverdue: boolean;
  notifyManager: boolean;
  enabled: boolean;
}

export interface ExecAutomation {
  id: string;
  name: string;
  when: string;
  ifCriteria: string;
  then: string;
  enabled: boolean;
  runs: number;
  lastRun: string;
}

export interface ExecAudit {
  id: string;
  at: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
}
