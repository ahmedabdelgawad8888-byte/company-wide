import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { PageHeader, Pill, Section, Stat, StatusPill } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import {
  BarChartCard,
  ChartRow,
  SeriesBarChartCard,
  TrendChartCard,
  sumBy,
} from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { invoiceOutstanding, isOverdue } from "@/lib/derive";
import { compactMoney, daysBetween, money, shortDate, toSAR } from "@/lib/format";
import type { Invoice } from "@/lib/types";
import { TODAY } from "@/lib/data/seed";
import { getRoleExperience } from "@/lib/role-ux";

function Bills() {
  const { db, inScope, currentUser, clientName, userName, actions } = useApp();
  const { t } = useLang();
  const ux = getRoleExperience(currentUser.role);
  const individual = ux.mode === "finance-individual";
  const rows = inScope(db.invoices).filter((i) =>
    individual ? i.ownerId === currentUser.id : true,
  );
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [edit, setEdit] = useState({
    ownerId: "",
    nextAction: "",
    promiseToPayDate: "",
    notes: "",
  });
  const outstanding = rows.filter((r) => invoiceOutstanding(r) > 0 && r.status !== "Cancelled");
  const overdue = outstanding.filter(isOverdue);
  const dueSoon = outstanding.filter((r) => {
    const d = -daysBetween(r.dueDate);
    return d >= 0 && d <= 7;
  });
  const outstandingSAR = outstanding.reduce(
    (s, i) => s + toSAR(invoiceOutstanding(i), i.currency),
    0,
  );
  const overdueSAR = overdue.reduce((s, i) => s + toSAR(invoiceOutstanding(i), i.currency), 0);
  const collectedSAR = rows.reduce((s, i) => s + toSAR(i.paid, i.currency), 0);
  const agingBuckets = [
    {
      name: t("Not due", "غير مستحق"),
      value: outstanding
        .filter((i) => !isOverdue(i))
        .reduce((sum, i) => sum + toSAR(invoiceOutstanding(i), i.currency), 0),
    },
    {
      name: t("1–7d", "1–7 أيام"),
      value: overdue
        .filter((i) => daysBetween(i.dueDate) <= 7)
        .reduce((sum, i) => sum + toSAR(invoiceOutstanding(i), i.currency), 0),
    },
    {
      name: t("8–30d", "8–30 يوم"),
      value: overdue
        .filter((i) => daysBetween(i.dueDate) > 7 && daysBetween(i.dueDate) <= 30)
        .reduce((sum, i) => sum + toSAR(invoiceOutstanding(i), i.currency), 0),
    },
    {
      name: t("31+d", "31+ يوم"),
      value: overdue
        .filter((i) => daysBetween(i.dueDate) > 30)
        .reduce((sum, i) => sum + toSAR(invoiceOutstanding(i), i.currency), 0),
    },
  ];
  const dueTimeline = sumBy(
    outstanding,
    (i) => i.dueDate,
    (i) => toSAR(invoiceOutstanding(i), i.currency),
  )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 14);
  const financeOwners = db.users.filter((u) => u.department === "Finance" && u.status === "active");
  const ownerOptions = db.users.filter((u) => {
    if (u.status !== "active") return false;
    if (individual) return u.id === currentUser.id;
    if (ux.mode === "finance-manager") return u.department === "Finance";
    return ["Finance", "Sales"].includes(u.department);
  });
  const ownerExposure = financeOwners
    .map((u) => ({
      name: u.name,
      outstanding: outstanding
        .filter((i) => i.ownerId === u.id)
        .reduce((sum, i) => sum + toSAR(invoiceOutstanding(i), i.currency), 0),
      overdue: overdue
        .filter((i) => i.ownerId === u.id)
        .reduce((sum, i) => sum + toSAR(invoiceOutstanding(i), i.currency), 0),
    }))
    .filter((r) => r.outstanding > 0 || r.overdue > 0);

  const openEdit = (inv: Invoice) => {
    setSelected(inv);
    setEdit({
      ownerId: inv.ownerId ?? db.users.find((u) => u.department === "Finance")?.id ?? "",
      nextAction: inv.nextAction ?? "",
      promiseToPayDate: inv.promiseToPayDate ?? "",
      notes: inv.notes ?? "",
    });
  };

  const save = () => {
    if (!selected) return;
    actions.updateInvoice(selected.id, {
      ...(edit.ownerId ? { ownerId: edit.ownerId } : {}),
      nextAction: edit.nextAction,
      ...(edit.promiseToPayDate ? { promiseToPayDate: edit.promiseToPayDate } : {}),
      notes: edit.notes,
      lastFollowUp: TODAY,
    });
    toast.success(t("Collection action updated", "تم تحديث إجراء التحصيل"), {
      description: selected.number,
    });
    setSelected(null);
  };

  const createFollowup = (inv: Invoice) => {
    const exists = db.tasks.some(
      (x) =>
        x.source === "Bill" && x.sourceRef === inv.id && !["Done", "Cancelled"].includes(x.status),
    );
    if (exists) {
      toast.info(t("An open follow-up task already exists", "توجد مهمة متابعة مفتوحة بالفعل"));
      return;
    }
    actions.addTask({
      title: `Collection follow-up — ${inv.number}`,
      description: inv.nextAction ?? "Confirm payment status with the client and log the outcome.",
      department: "Finance",
      ownerId: inv.ownerId ?? db.users.find((u) => u.department === "Finance")?.id ?? "u3",
      requestedById: "u3",
      entityId: inv.entityId,
      clientId: inv.clientId,
      priority: isOverdue(inv) ? "Critical" : "High",
      status: "To Do",
      startDate: TODAY,
      dueDate: isOverdue(inv) ? TODAY : inv.dueDate,
      percent: 0,
      slaHours: 24,
      rag: isOverdue(inv) ? "red" : "amber",
      deliverable: "Collection outcome logged",
      ...(inv.notes ? { notes: inv.notes } : {}),
      source: "Bill",
      sourceRef: inv.id,
    });
    toast.success(t("Finance follow-up task created", "تم إنشاء مهمة متابعة مالية"));
  };

  const columns: Column<Invoice>[] = [
    {
      key: "invoice",
      header: t("Bill / Invoice", "الفاتورة"),
      render: (r) => (
        <div>
          <div className="num font-medium">{r.number}</div>
          <div className="text-xs text-muted-foreground">{clientName(r.clientId)}</div>
        </div>
      ),
      sortValue: (r) => r.number,
    },
    {
      key: "amount",
      header: t("Amount", "المبلغ"),
      render: (r) => <span className="num">{money(r.amount, r.currency)}</span>,
      sortValue: (r) => toSAR(r.amount, r.currency),
    },
    {
      key: "outstanding",
      header: t("Outstanding", "القائم"),
      render: (r) => (
        <span className={invoiceOutstanding(r) ? "num font-semibold" : "num text-muted-foreground"}>
          {money(invoiceOutstanding(r), r.currency)}
        </span>
      ),
      sortValue: (r) => toSAR(invoiceOutstanding(r), r.currency),
    },
    {
      key: "due",
      header: t("Due date", "تاريخ الاستحقاق"),
      render: (r) => (
        <div>
          <div className={isOverdue(r) ? "font-semibold text-danger" : ""}>
            {shortDate(r.dueDate)}
          </div>
          <div className="text-xs text-muted-foreground">
            {isOverdue(r)
              ? `${daysBetween(r.dueDate)}d overdue`
              : `${Math.max(0, -daysBetween(r.dueDate))}d remaining`}
          </div>
        </div>
      ),
      sortValue: (r) => r.dueDate,
    },
    {
      key: "status",
      header: t("Status", "الحالة"),
      render: (r) => <StatusPill status={isOverdue(r) ? "Overdue" : r.status} />,
      sortValue: (r) => r.status,
    },
    {
      key: "owner",
      header: t("Responsible", "المسؤول"),
      render: (r) => (r.ownerId ? userName(r.ownerId) : "Finance"),
      sortValue: (r) => (r.ownerId ? userName(r.ownerId) : ""),
    },
    {
      key: "next",
      header: t("Next collection action", "إجراء التحصيل التالي"),
      className: "min-w-[260px]",
      render: (r) => (
        <div>
          <div className="text-sm font-medium">{r.nextAction ?? "—"}</div>
          {r.promiseToPayDate ? (
            <div className="text-xs text-muted-foreground">
              Promise-to-pay {shortDate(r.promiseToPayDate)}
            </div>
          ) : null}
        </div>
      ),
      sortValue: (r) => r.nextAction ?? "",
    },
    {
      key: "reminder",
      header: t("Reminder plan", "خطة التذكير"),
      render: (r) => (
        <div className="flex gap-1">
          {(r.reminderDays ?? [7, 3, 1]).map((d) => (
            <Pill key={d} tone="neutral">
              -{d}d
            </Pill>
          ))}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
            {t("Update", "تحديث")}
          </Button>
          {invoiceOutstanding(r) > 0 ? (
            <Button size="sm" onClick={() => createFollowup(r)}>
              {t("Create follow-up", "إنشاء متابعة")}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(
          individual ? "My Bills & Collections" : "Due Bills & Collections",
          individual ? "فواتيري وتحصيلاتي" : "الفواتير والتحصيلات",
        )}
        subtitle={t(
          individual
            ? "This is your working queue. Start with overdue bills, update the client outcome, and always leave a next action or promise-to-pay date."
            : "Control collection risk by aging, due date and owner. Every open bill should have a clear next action before it becomes overdue.",
          individual
            ? "هذه قائمة عملك. ابدأ بالفواتير المتأخرة وحدّث نتيجة العميل واترك دائماً إجراءً تالياً أو تاريخ وعد بالدفع."
            : "تحكم في مخاطر التحصيل حسب عمر الدين والاستحقاق والمسؤول. كل فاتورة مفتوحة يجب أن يكون لها إجراء تالٍ واضح قبل التأخير.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label={t("Open bills", "فواتير مفتوحة")}
          value={String(outstanding.length)}
          tone="brand"
        />
        <Stat
          label={t("Due in 7 days", "مستحق خلال 7 أيام")}
          value={String(dueSoon.length)}
          tone="warning"
        />
        <Stat
          label={t("Overdue bills", "فواتير متأخرة")}
          value={String(overdue.length)}
          tone={overdue.length ? "danger" : "success"}
        />
        <Stat
          label={t("Outstanding (SAR)", "القائم بالريال")}
          value={compactMoney(outstandingSAR, "SAR")}
        />
        <Stat
          label={t("Overdue value (SAR)", "المتأخر بالريال")}
          value={compactMoney(overdueSAR, "SAR")}
          tone="danger"
        />
      </div>
      {individual ? (
        <ChartRow cols={2}>
          <BarChartCard
            title={t("My aging exposure", "توزيع المتأخر عندي")}
            description={t("Outstanding value by aging bucket", "القيمة القائمة حسب عمر الدين")}
            data={agingBuckets}
            colorful
            format={(v) => compactMoney(v, "SAR")}
          />
          <TrendChartCard
            title={t("What becomes due next", "ما يستحق تالياً")}
            description={t("Outstanding value by due date", "القيمة القائمة حسب تاريخ الاستحقاق")}
            data={dueTimeline}
            format={(v) => compactMoney(v, "SAR")}
          />
        </ChartRow>
      ) : (
        <ChartRow>
          <BarChartCard
            title={t("Aging exposure", "توزيع عمر الديون")}
            description={t("Outstanding value by aging bucket", "القيمة القائمة حسب عمر الدين")}
            data={agingBuckets}
            colorful
            format={(v) => compactMoney(v, "SAR")}
          />
          <TrendChartCard
            title={t("Upcoming due-value timeline", "خط الاستحقاقات القادمة")}
            description={t("Outstanding value by due date", "القيمة القائمة حسب تاريخ الاستحقاق")}
            data={dueTimeline}
            format={(v) => compactMoney(v, "SAR")}
          />
          <SeriesBarChartCard
            title={t("Owner exposure", "التعرض حسب المسؤول")}
            data={ownerExposure}
            series={[
              { key: "outstanding", label: t("Outstanding", "قائم") },
              { key: "overdue", label: t("Overdue", "متأخر") },
            ]}
            format={(v) => compactMoney(v, "SAR")}
          />
        </ChartRow>
      )}
      <Section title={t("Collection control register", "سجل متابعة التحصيل")}>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) =>
            `${r.number} ${clientName(r.clientId)} ${r.nextAction ?? ""} ${r.notes ?? ""} ${r.ownerId ? userName(r.ownerId) : ""}`
          }
          exportName="trygc-due-bills-collections"
          pageSize={12}
        />
      </Section>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.number}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${clientName(selected.clientId)} · ${money(invoiceOutstanding(selected), selected.currency)} outstanding`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Responsible owner</Label>
              <Select
                value={edit.ownerId}
                onValueChange={(v) => setEdit((p) => ({ ...p, ownerId: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ownerOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {u.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Promise-to-pay date</Label>
              <Input
                type="date"
                value={edit.promiseToPayDate}
                onChange={(e) => setEdit((p) => ({ ...p, promiseToPayDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Next action</Label>
              <Input
                value={edit.nextAction}
                onChange={(e) => setEdit((p) => ({ ...p, nextAction: e.target.value }))}
                placeholder="Call client, confirm invoice receipt, escalate…"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Collection notes</Label>
              <Textarea
                value={edit.notes}
                onChange={(e) => setEdit((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button onClick={save}>{t("Save update", "حفظ التحديث")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/finance/invoices")({
  head: () => ({
    meta: [
      { title: "Due Bills & Collections | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Due bill control with reminders, owners, collection notes, promise-to-pay dates and follow-up actions.",
      },
    ],
  }),
  component: Bills,
});
