import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/store";
import { TODAY } from "@/lib/data/seed";
import type { Currency, SalesActivity } from "@/lib/types";
import { getWorkspace, workspaceOwnsDepartment } from "@/lib/workspace-hub";

export const QUICK_CREATE_KINDS = [
  "Task",
  "Meeting",
  "Sales Activity",
  "Bill",
  "Payment",
  "Client",
] as const;
export type QuickCreateKind = (typeof QUICK_CREATE_KINDS)[number];

type FormKey =
  | "entityId"
  | "name"
  | "clientId"
  | "ownerId"
  | "amount"
  | "dueDate"
  | "department"
  | "priority"
  | "deliverable"
  | "notes"
  | "type"
  | "outcome"
  | "nextAction"
  | "invoiceId"
  | "reference"
  | "date"
  | "startTime"
  | "endTime"
  | "location"
  | "industry";
type FormState = Partial<Record<FormKey, string>>;

const usableDepartments = (
  workspaceId: ReturnType<typeof useApp>["activeWorkspace"],
  currentDepartment: string,
) => {
  const configured = getWorkspace(workspaceId).departments.filter(
    (d) => !["Core Team", "People", "Data", "Business Intelligence", "BI"].includes(d),
  );
  if (
    workspaceOwnsDepartment(workspaceId, currentDepartment) &&
    !configured.includes(currentDepartment)
  )
    configured.unshift(currentDepartment);
  return configured.length ? configured : [currentDepartment];
};

export function QuickCreate({
  open,
  kind,
  allowedKinds = [...QUICK_CREATE_KINDS],
  onOpenChange,
}: {
  open: boolean;
  kind: QuickCreateKind;
  allowedKinds?: QuickCreateKind[];
  onOpenChange: (v: boolean) => void;
}) {
  const { db, scope, currentUser, actions, entityCurrency, activeWorkspace } = useApp();
  const navigate = useNavigate();
  const workspace = getWorkspace(activeWorkspace);
  const kinds = allowedKinds.length ? allowedKinds : (["Task"] as QuickCreateKind[]);
  const [type, setType] = useState<QuickCreateKind>(
    allowedKinds.includes(kind) ? kind : (kinds[0] ?? "Task"),
  );
  const defaultEntity = scope === "group" ? currentUser.entityId : scope;
  const taskDepartments = useMemo(
    () => usableDepartments(activeWorkspace, currentUser.department),
    [activeWorkspace, currentUser.department],
  );
  const defaultDepartment = workspaceOwnsDepartment(activeWorkspace, currentUser.department)
    ? currentUser.department
    : (taskDepartments[0] ?? "Technology");
  const [form, setForm] = useState<FormState>({});

  useEffect(() => {
    setType(allowedKinds.includes(kind) ? kind : (kinds[0] ?? "Task"));
    setForm({
      entityId: defaultEntity,
      ownerId: currentUser.id,
      date: TODAY,
      dueDate: TODAY,
      startTime: "10:00",
      endTime: "11:00",
      priority: "Medium",
      department: defaultDepartment,
      type: "Call",
      outcome: "Answered",
    });
  }, [kind, open, defaultEntity, currentUser.id, defaultDepartment, allowedKinds.join("|")]);

  const set = (k: FormKey, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const entityId = form.entityId ?? defaultEntity;
  const currency = entityCurrency(entityId) as Currency;
  const go = (to: string, params?: Record<string, string>) =>
    void navigate(params ? ({ to, params } as never) : ({ to } as never));
  const ownerOptions = db.users.filter(
    (u) => u.status === "active" && workspaceOwnsDepartment(activeWorkspace, u.department),
  );
  const safeOwnerOptions = ownerOptions.length ? ownerOptions : [currentUser];
  const clientOptions =
    activeWorkspace === "sales" || activeWorkspace === "finance"
      ? db.clients.filter(
          (c) => currentUser.scope === "group" || c.entityId === currentUser.entityId,
        )
      : [];
  const paymentInvoices =
    activeWorkspace === "finance"
      ? db.invoices.filter(
          (i) =>
            i.paid < i.amount &&
            i.status !== "Cancelled" &&
            (currentUser.scope === "group" || i.entityId === currentUser.entityId),
        )
      : [];

  const submit = () => {
    const amount = Number(form.amount ?? 0);
    if (type === "Task") {
      if (!form.name) return void toast.error("Task title is required");
      actions.addTask({
        title: form.name,
        description: form.notes ?? "",
        department: form.department ?? defaultDepartment,
        ownerId: form.ownerId ?? currentUser.id,
        requestedById: currentUser.id,
        entityId,
        ...(form.clientId ? { clientId: form.clientId } : {}),
        priority: (form.priority as "Low" | "Medium" | "High" | "Critical") ?? "Medium",
        status: "To Do",
        startDate: TODAY,
        dueDate: form.dueDate ?? TODAY,
        percent: 0,
        slaHours: 48,
        rag: "green",
        deliverable: form.deliverable ?? "Action completed and logged",
        ...(form.notes ? { notes: form.notes } : {}),
        source: "Manual",
      });
      toast.success(`${workspace.shortTitle} action created`);
      go("/tasks");
    } else if (type === "Meeting") {
      if (!form.name) return void toast.error("Meeting title is required");
      const eventType =
        activeWorkspace === "sales"
          ? "Sales Meeting"
          : activeWorkspace === "finance"
            ? "Finance Close"
            : "Internal";
      actions.addEvent({
        title: form.name,
        ...(form.notes ? { description: form.notes } : {}),
        type: eventType,
        entityId,
        date: form.date ?? TODAY,
        startTime: form.startTime ?? "10:00",
        endTime: form.endTime ?? "11:00",
        allDay: false,
        location: form.location ?? "Google Meet",
        organizerId: form.ownerId ?? currentUser.id,
        attendeeIds: [form.ownerId ?? currentUser.id],
        status: "Scheduled",
        recurrence: "none",
        ...(form.clientId ? { linkedType: "client" as const, linkedId: form.clientId } : {}),
      });
      toast.success(`${workspace.shortTitle} meeting scheduled`);
      go("/meetings");
    } else if (type === "Sales Activity") {
      if (activeWorkspace !== "sales")
        return void toast.error("Switch to Sales workspace to log a sales activity");
      if (!form.notes) return void toast.error("Activity notes are required");
      actions.addSalesActivity({
        entityId,
        ownerId: form.ownerId ?? currentUser.id,
        ...(form.clientId ? { clientId: form.clientId } : {}),
        type: (form.type as SalesActivity["type"]) ?? "Call",
        date: form.date ?? TODAY,
        outcome: (form.outcome as SalesActivity["outcome"]) ?? "Answered",
        notes: form.notes,
        ...(form.nextAction
          ? { nextAction: form.nextAction, nextActionDate: form.dueDate ?? TODAY }
          : {}),
      });
      toast.success("Sales activity logged", {
        description: form.nextAction ? "Follow-up action created automatically" : undefined,
      });
      go("/sales");
    } else if (type === "Bill") {
      if (activeWorkspace !== "finance")
        return void toast.error("Switch to Finance workspace to create a bill");
      if (!form.clientId || !amount) return void toast.error("Client and amount are required");
      const prefix = entityId.toUpperCase().slice(0, 2);
      actions.addInvoice({
        number: `INV-${prefix}-2026-${Math.floor(1000 + Math.random() * 8999)}`,
        clientId: form.clientId,
        entityId,
        ownerId: form.ownerId ?? currentUser.id,
        issueDate: TODAY,
        dueDate: form.dueDate ?? TODAY,
        amount,
        paid: 0,
        currency,
        status: "Draft",
        lines: [{ description: form.notes ?? "Client services", qty: 1, unitPrice: amount }],
        nextAction: "Issue bill and confirm client receipt",
        reminderDays: [7, 3, 1],
        ...(form.notes ? { notes: form.notes } : {}),
      });
      toast.success("Bill created", {
        description: "Pre-due and due-date actions scheduled automatically",
      });
      go("/finance/invoices");
    } else if (type === "Payment") {
      if (activeWorkspace !== "finance")
        return void toast.error("Switch to Finance workspace to record a payment");
      if (!form.invoiceId || !amount) return void toast.error("Bill and amount are required");
      const inv = db.invoices.find((i) => i.id === form.invoiceId);
      if (!inv) return;
      actions.addPayment({
        invoiceId: inv.id,
        entityId: inv.entityId,
        date: TODAY,
        amount,
        currency: inv.currency,
        method: "Bank Transfer",
        reference: form.reference ?? "—",
      });
      toast.success("Payment recorded");
      go("/finance/payments");
    } else if (type === "Client") {
      if (activeWorkspace !== "sales")
        return void toast.error("Switch to Sales workspace to create a client");
      if (!form.name) return void toast.error("Client name is required");
      const c = actions.addClient({
        name: form.name,
        entityId,
        industry: form.industry ?? "Other",
        accountManagerId: form.ownerId ?? currentUser.id,
        escalationOwnerId: "u2",
        status: "Prospect",
        since: TODAY,
        lifetimeRevenue: 0,
        currency,
        satisfaction: 0,
        lastInteraction: TODAY,
        nextAction: form.nextAction ?? "Schedule introduction meeting",
      });
      toast.success("Client created");
      go("/crm/clients/$clientId", { clientId: c.id });
    }
    onOpenChange(false);
  };

  const entitySelect =
    currentUser.scope === "group" ? (
      <div className="space-y-1.5">
        <Label>Entity</Label>
        <Select value={entityId} onValueChange={(v) => set("entityId", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {db.entities
              .filter((e) => e.status !== "planned")
              .map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name} · {e.currency}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    ) : null;
  const ownerSelect = (
    <div className="space-y-1.5">
      <Label>Owner</Label>
      <Select
        value={form.ownerId ?? safeOwnerOptions[0]?.id ?? currentUser.id}
        onValueChange={(v) => set("ownerId", v)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {safeOwnerOptions.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name} · {u.department}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  const clientSelect = clientOptions.length ? (
    <div className="space-y-1.5">
      <Label>Client</Label>
      <Select
        value={form.clientId || "none"}
        onValueChange={(v) => set("clientId", v === "none" ? "" : v)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No client</SelectItem>
          {clientOptions.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create in {workspace.title}</DialogTitle>
          <DialogDescription>
            {workspace.purpose} This form only shows records and owners that belong to the current
            workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Record type</Label>
          <Select value={type} onValueChange={(v) => setType(v as QuickCreateKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kinds.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid max-h-[54vh] gap-4 overflow-y-auto pe-1 sm:grid-cols-2">
          {type !== "Payment" ? entitySelect : null}
          {["Task", "Meeting", "Sales Activity", "Bill", "Client"].includes(type)
            ? ownerSelect
            : null}
          {["Task", "Meeting", "Sales Activity", "Bill"].includes(type) ? clientSelect : null}
          {["Task", "Meeting", "Client"].includes(type) ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>
                {type === "Task"
                  ? "Action title"
                  : type === "Meeting"
                    ? "Meeting title"
                    : "Client name"}
              </Label>
              <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
            </div>
          ) : null}

          {type === "Task" ? (
            <>
              <div className="space-y-1.5">
                <Label>Function</Label>
                <Select
                  value={form.department ?? defaultDepartment}
                  onValueChange={(v) => set("department", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskDepartments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority ?? "Medium"} onValueChange={(v) => set("priority", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Low", "Medium", "High", "Critical"].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.dueDate ?? TODAY}
                  onChange={(e) => set("dueDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expected output</Label>
                <Input
                  value={form.deliverable ?? ""}
                  onChange={(e) => set("deliverable", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Context / notes</Label>
                <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </>
          ) : null}

          {type === "Meeting" ? (
            <>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date ?? TODAY}
                  onChange={(e) => set("date", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Input
                    type="time"
                    value={form.startTime ?? "10:00"}
                    onChange={(e) => set("startTime", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Input
                    type="time"
                    value={form.endTime ?? "11:00"}
                    onChange={(e) => set("endTime", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Location / link</Label>
                <Input
                  value={form.location ?? "Google Meet"}
                  onChange={(e) => set("location", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Purpose / context</Label>
                <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </>
          ) : null}

          {type === "Sales Activity" ? (
            <>
              <div className="space-y-1.5">
                <Label>Activity type</Label>
                <Select value={form.type ?? "Call"} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Call",
                      "Follow-up",
                      "Meeting",
                      "Proposal",
                      "Quotation",
                      "Contract",
                      "Other",
                    ].map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Outcome</Label>
                <Select value={form.outcome ?? "Answered"} onValueChange={(v) => set("outcome", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Answered",
                      "No Answer",
                      "Follow-up Required",
                      "Meeting Booked",
                      "Proposal Requested",
                      "Quotation Sent",
                      "Contract Pending",
                      "Completed",
                      "Rejected",
                    ].map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes / outcome details</Label>
                <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Next action</Label>
                <Input
                  value={form.nextAction ?? ""}
                  onChange={(e) => set("nextAction", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Action due date</Label>
                <Input
                  type="date"
                  value={form.dueDate ?? TODAY}
                  onChange={(e) => set("dueDate", e.target.value)}
                />
              </div>
            </>
          ) : null}

          {type === "Bill" ? (
            <>
              <div className="space-y-1.5">
                <Label>Amount ({currency})</Label>
                <Input
                  type="number"
                  value={form.amount ?? ""}
                  onChange={(e) => set("amount", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.dueDate ?? TODAY}
                  onChange={(e) => set("dueDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description / collection context</Label>
                <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </>
          ) : null}

          {type === "Payment" ? (
            <>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Bill / invoice</Label>
                <Select value={form.invoiceId ?? ""} onValueChange={(v) => set("invoiceId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select open bill" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentInvoices.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.number} · {i.currency} {(i.amount - i.paid).toLocaleString()} outstanding
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={form.amount ?? ""}
                  onChange={(e) => set("amount", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bank reference</Label>
                <Input
                  value={form.reference ?? ""}
                  onChange={(e) => set("reference", e.target.value)}
                />
              </div>
            </>
          ) : null}

          {type === "Client" ? (
            <>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Input
                  value={form.industry ?? ""}
                  onChange={(e) => set("industry", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>First next action</Label>
                <Input
                  value={form.nextAction ?? ""}
                  onChange={(e) => set("nextAction", e.target.value)}
                />
              </div>
            </>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Create {type}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
