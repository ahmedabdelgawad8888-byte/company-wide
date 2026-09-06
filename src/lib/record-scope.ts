import type { Notification, RoleName, User } from "./types.ts";
import { getRoleExperience } from "./role-ux.ts";

type UserLite = Pick<User, "id" | "department" | "entityId" | "scope">;
type EventLite = { organizerId: string; attendeeIds: string[] };
type ExceptionLite = { ownerId: string };
type ReminderLite = { ownerId: string; recipientIds: string[] };
type ClientLite = { accountManagerId: string };
type NotificationLite = Pick<Notification, "category">;
type ApprovalLite = { type: string; approverId: string };
type ActivityLite = { module: string };

function teamIds(users: UserLite[], department: string): Set<string> {
  return new Set(users.filter((u) => u.department === department).map((u) => u.id));
}

export function clientVisibleToRole(
  client: ClientLite,
  currentUser: UserLite,
  role: RoleName | string,
): boolean {
  const mode = getRoleExperience(role).mode;
  if (mode === "sales-individual") return client.accountManagerId === currentUser.id;
  return mode === "sales-manager" || mode === "executive" || mode === "admin";
}

export function eventVisibleToRole(
  event: EventLite,
  currentUser: UserLite,
  role: RoleName | string,
  users: UserLite[],
): boolean {
  const mode = getRoleExperience(role).mode;
  if (mode === "sales-individual" || mode === "finance-individual" || mode === "support") {
    return event.organizerId === currentUser.id || event.attendeeIds.includes(currentUser.id);
  }
  if (mode === "sales-manager") {
    const ids = teamIds(users, "Sales");
    return ids.has(event.organizerId) || event.attendeeIds.some((id) => ids.has(id));
  }
  if (mode === "finance-manager") {
    const ids = teamIds(users, "Finance");
    return ids.has(event.organizerId) || event.attendeeIds.some((id) => ids.has(id));
  }
  return mode === "executive" || mode === "admin";
}

export function exceptionVisibleToRole(
  exception: ExceptionLite,
  currentUser: UserLite,
  role: RoleName | string,
  users: UserLite[],
): boolean {
  const mode = getRoleExperience(role).mode;
  if (mode === "sales-individual" || mode === "finance-individual" || mode === "support")
    return exception.ownerId === currentUser.id;
  const owner = users.find((u) => u.id === exception.ownerId);
  if (mode === "sales-manager") return owner?.department === "Sales";
  if (mode === "finance-manager") return owner?.department === "Finance";
  return mode === "executive" || mode === "admin";
}

export function reminderVisibleToRole(
  reminder: ReminderLite,
  currentUser: UserLite,
  role: RoleName | string,
  users: UserLite[],
): boolean {
  const mode = getRoleExperience(role).mode;
  if (mode === "sales-individual" || mode === "finance-individual" || mode === "support") {
    return reminder.ownerId === currentUser.id || reminder.recipientIds.includes(currentUser.id);
  }
  if (mode === "sales-manager") {
    const ids = teamIds(users, "Sales");
    return ids.has(reminder.ownerId) || reminder.recipientIds.some((id) => ids.has(id));
  }
  if (mode === "finance-manager") {
    const ids = teamIds(users, "Finance");
    return ids.has(reminder.ownerId) || reminder.recipientIds.some((id) => ids.has(id));
  }
  return mode === "executive" || mode === "admin";
}

export function notificationVisibleToRole(
  notification: NotificationLite,
  role: RoleName | string,
): boolean {
  const mode = getRoleExperience(role).mode;
  const shared = new Set<Notification["category"]>(["Task", "Meeting", "Calendar", "System"]);
  if (mode === "sales-individual" || mode === "sales-manager")
    return (
      shared.has(notification.category) ||
      ["Sales", "CRM", "Client"].includes(notification.category)
    );
  if (mode === "finance-individual" || mode === "finance-manager")
    return (
      shared.has(notification.category) || ["Finance", "Approval"].includes(notification.category)
    );
  if (role === "IT Admin") return ["System", "Task", "Approval"].includes(notification.category);
  if (mode === "executive" || mode === "admin")
    return notification.category !== "Campaign" && notification.category !== "Messaging";
  return shared.has(notification.category);
}

export function approvalVisibleToRole(
  approval: ApprovalLite,
  currentUser: UserLite,
  role: RoleName | string,
): boolean {
  const mode = getRoleExperience(role).mode;
  const excluded = new Set(["Campaign Change", "Influencer Approval"]);
  if (excluded.has(approval.type)) return false;

  if (mode === "finance-manager") {
    return new Set([
      "COA Creation",
      "Invoice Approval",
      "Payment Approval",
      "Expense Approval",
      "Finance Adjustment",
    ]).has(approval.type);
  }
  if (mode === "executive") {
    return (
      approval.approverId === currentUser.id &&
      new Set([
        "Proposal Approval",
        "Invoice Approval",
        "Payment Approval",
        "Finance Adjustment",
      ]).has(approval.type)
    );
  }
  if (role === "Group Admin") return true;
  return false;
}

export function activityVisibleToRole(activity: ActivityLite, role: RoleName | string): boolean {
  const mode = getRoleExperience(role).mode;
  const business = new Set(["Sales", "Finance", "Tasks", "Meetings", "Calendar", "Approvals"]);
  if (mode === "executive") return business.has(activity.module);
  if (role === "IT Admin")
    return new Set(["Admin", "System", "Calendar", "Tasks", "Approvals", "Exports"]).has(
      activity.module,
    );
  if (role === "Group Admin")
    return (
      business.has(activity.module) ||
      new Set(["Admin", "System", "Email", "Exports"]).has(activity.module)
    );
  return false;
}
