import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { daysBetween } from "@/lib/format";
import { invoiceOutstanding, isOverdue, taskIsOverdue, type Exception } from "@/lib/derive";
import { TODAY } from "@/lib/data/seed";
import { exceptionVisibleToRole } from "@/lib/record-scope";

export function useExceptions(): Exception[] {
  const { db, inScope, currentUser } = useApp();
  return useMemo(() => {
    const rows: Exception[] = [];
    const clientName = (id?: string) => db.clients.find((c) => c.id === id)?.name ?? "Client";

    for (const inv of inScope(db.invoices).filter(isOverdue)) {
      const age = daysBetween(inv.dueDate);
      rows.push({
        id: `EXC-${inv.id}`,
        category: "Overdue bill",
        issue: `${inv.number} — ${clientName(inv.clientId)}`,
        ownerId: inv.ownerId ?? "u3",
        entityId: inv.entityId,
        age: `${age} days`,
        impact: `${inv.currency} ${invoiceOutstanding(inv).toLocaleString()} outstanding`,
        action: inv.nextAction ?? "Confirm payment status and log the next collection action",
        deadline: inv.promiseToPayDate ?? inv.dueDate,
        severity: age > 30 ? "Critical" : "High",
        link: "/finance/invoices",
      });
    }

    for (const task of inScope(db.tasks).filter(
      (t) => ["Sales", "Finance", "Management"].includes(t.department) && taskIsOverdue(t),
    )) {
      const age = daysBetween(task.dueDate);
      rows.push({
        id: `EXC-${task.id}`,
        category: `${task.department} overdue`,
        issue: `${task.id} — ${task.title}`,
        ownerId: task.ownerId,
        entityId: task.entityId,
        age: `${age} days`,
        impact: `${task.deliverable} is delayed`,
        action:
          task.notes ||
          "Update status, blocker and next action; escalate if ownership or SLA is at risk",
        deadline: task.dueDate,
        severity:
          task.priority === "Critical" || age >= 5
            ? "Critical"
            : task.priority === "High"
              ? "High"
              : "Medium",
        link: "/tasks",
      });
    }

    for (const meeting of inScope(db.calendarEvents).filter(
      (e) =>
        ["Meeting", "Sales Meeting", "Client Review"].includes(e.type) &&
        e.date < TODAY &&
        e.status !== "Cancelled" &&
        !e.outcome,
    )) {
      const age = daysBetween(meeting.date);
      rows.push({
        id: `EXC-MTG-${meeting.id}`,
        category: "Meeting outcome missing",
        issue: `${meeting.title} — outcome not recorded`,
        ownerId: meeting.organizerId,
        entityId: meeting.entityId,
        age: `${age} days`,
        impact: "Client commitments may not have an owner or due date",
        action: "Record outcome, next action, owner and deadline",
        deadline: TODAY,
        severity: age >= 2 ? "High" : "Medium",
        link: "/meetings",
      });
    }

    for (const activity of inScope(db.salesActivities).filter(
      (a) =>
        a.nextActionDate &&
        a.nextActionDate < TODAY &&
        a.nextAction &&
        ["No Answer", "Follow-up Required", "Contract Pending"].includes(a.outcome),
    )) {
      rows.push({
        id: `EXC-SA-${activity.id}`,
        category: "Sales follow-up overdue",
        issue: `${clientName(activity.clientId)} — ${activity.nextAction}`,
        ownerId: activity.ownerId,
        entityId: activity.entityId,
        age: `${daysBetween(activity.nextActionDate!)} days`,
        impact: "Client follow-up or commercial commitment is at risk",
        action: activity.nextAction!,
        deadline: activity.nextActionDate!,
        severity: daysBetween(activity.nextActionDate!) >= 3 ? "High" : "Medium",
        link: "/sales",
      });
    }

    const order = { Critical: 0, High: 1, Medium: 2 } as const;
    return rows
      .filter((row) => exceptionVisibleToRole(row, currentUser, currentUser.role, db.users))
      .sort(
        (a, b) => order[a.severity] - order[b.severity] || a.deadline.localeCompare(b.deadline),
      );
  }, [db, inScope, currentUser]);
}
