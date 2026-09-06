import { createFileRoute, useParams } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EmptyState,
  Field,
  PageHeader,
  Panel,
  Pill,
  Section,
  Stat,
  StatusPill,
} from "@/components/kit";
import { useApp } from "@/lib/store";
import { clientVisibleToRole } from "@/lib/record-scope";
import { getRoleExperience } from "@/lib/role-ux";
import { useLang } from "@/lib/i18n";
import { invoiceOutstanding, isOverdue, taskIsOverdue } from "@/lib/derive";
import { compactMoney, money, shortDate, toSAR } from "@/lib/format";

function ClientActionCenter() {
  const { clientId } = useParams({ from: "/crm/clients/$clientId" });
  const { db, currentUser, userName, entityName } = useApp();
  const { t } = useLang();
  const client = db.clients.find((c) => c.id === clientId);
  if (!client)
    return (
      <EmptyState
        title={t("Client not found", "العميل غير موجود")}
        description={t("This record may have been removed.", "قد يكون هذا السجل قد تم حذفه.")}
      />
    );
  if (!clientVisibleToRole(client, currentUser, currentUser.role))
    return (
      <EmptyState
        title={t("Outside your client portfolio", "خارج محفظة عملائك")}
        description={t(
          "This client is assigned to another Sales owner. Open My Clients to continue with the accounts you are responsible for.",
          "هذا العميل مخصص لمسؤول مبيعات آخر. افتح عملائي للمتابعة مع الحسابات التي تقع ضمن مسؤوليتك.",
        )}
      />
    );
  const ux = getRoleExperience(currentUser.role);
  const individual = ux.mode === "sales-individual";

  const tasks = db.tasks.filter(
    (x) => x.clientId === client.id && (!individual || x.department === "Sales"),
  );
  const openTasks = tasks.filter((x) => !["Done", "Cancelled"].includes(x.status));
  const sales = db.salesActivities.filter((x) => x.clientId === client.id);
  const meetings = db.calendarEvents.filter(
    (x) => x.linkedType === "client" && x.linkedId === client.id,
  );
  const invoices = db.invoices.filter((x) => x.clientId === client.id);
  const payments = db.payments.filter((p) => invoices.some((i) => i.id === p.invoiceId));
  const contacts = db.contacts.filter((c) => c.clientId === client.id);
  const overdue = invoices.filter((i) => isOverdue(i) && invoiceOutstanding(i) > 0);
  const outstandingSAR = invoices.reduce((s, i) => s + toSAR(invoiceOutstanding(i), i.currency), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        subtitle={`${client.industry} · ${entityName(client.entityId)} · ${t("client since", "عميل منذ")} ${shortDate(client.since)}`}
        meta={[
          <StatusPill key="s" status={client.status} />,
          <Pill key="am" tone="brand">
            {t("Sales owner", "مسؤول المبيعات")}: {userName(client.accountManagerId)}
          </Pill>,
          <Pill
            key="sat"
            tone={
              client.satisfaction >= 80
                ? "success"
                : client.satisfaction >= 65
                  ? "warning"
                  : "danger"
            }
          >
            {t("Satisfaction", "الرضا")} {client.satisfaction}%
          </Pill>,
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label={t("Open actions", "إجراءات مفتوحة")}
          value={String(openTasks.length)}
          hint={`${openTasks.filter(taskIsOverdue).length} ${t("overdue", "متأخرة")}`}
          tone={openTasks.some(taskIsOverdue) ? "danger" : "brand"}
        />
        <Stat
          label={t("Sales activities", "أنشطة المبيعات")}
          value={String(sales.length)}
          tone="orange"
        />
        <Stat label={t("Meetings", "اجتماعات")} value={String(meetings.length)} />
        <Stat
          label={t("Outstanding (SAR)", "القائم بالريال")}
          value={compactMoney(outstandingSAR, "SAR")}
          tone={overdue.length ? "danger" : "warning"}
        />
        <Stat
          label={t("Overdue bills", "فواتير متأخرة")}
          value={String(overdue.length)}
          tone={overdue.length ? "danger" : "success"}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">{t("Overview", "نظرة عامة")}</TabsTrigger>
          <TabsTrigger value="actions">{t("Actions", "الإجراءات")}</TabsTrigger>
          <TabsTrigger value="meetings">{t("Meetings", "الاجتماعات")}</TabsTrigger>
          <TabsTrigger value="sales">{t("Sales activity", "نشاط المبيعات")}</TabsTrigger>
          <TabsTrigger value="finance">{t("Collections", "التحصيلات")}</TabsTrigger>
          <TabsTrigger value="contacts">{t("Contacts", "جهات الاتصال")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4 grid gap-4 xl:grid-cols-2">
          <Panel>
            <Section title={t("Client action summary", "ملخص إجراءات العميل")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={t("Status", "الحالة")}
                  value={<StatusPill status={client.status} />}
                />
                <Field label={t("Entity", "الكيان")} value={entityName(client.entityId)} />
                <Field
                  label={t("Last interaction", "آخر تفاعل")}
                  value={shortDate(client.lastInteraction)}
                />
                <Field
                  label={t("Next client action", "إجراء العميل التالي")}
                  value={client.nextAction}
                />
                <Field
                  label={t("Sales owner", "مسؤول المبيعات")}
                  value={userName(client.accountManagerId)}
                />
                <Field
                  label={t("Escalation owner", "مسؤول التصعيد")}
                  value={userName(client.escalationOwnerId)}
                />
              </div>
            </Section>
          </Panel>
          <Panel>
            <Section title={t("Immediate attention", "يتطلب انتباهاً فورياً")}>
              <div className="space-y-2">
                {openTasks.filter(taskIsOverdue).map((x) => (
                  <div key={x.id} className="rounded-lg border border-danger/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{x.title}</p>
                      <Pill tone="danger">Overdue</Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {userName(x.ownerId)} · due {shortDate(x.dueDate)}
                    </p>
                  </div>
                ))}
                {overdue.map((i) => (
                  <div key={i.id} className="rounded-lg border border-danger/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="num text-sm font-medium">{i.number}</p>
                      <Pill tone="danger">{money(invoiceOutstanding(i), i.currency)}</Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Due {shortDate(i.dueDate)} · {i.nextAction ?? "Collection follow-up"}
                    </p>
                  </div>
                ))}
                {!openTasks.some(taskIsOverdue) && !overdue.length ? (
                  <p className="text-sm text-muted-foreground">
                    {t("Nothing critical right now.", "لا يوجد شيء حرج حالياً.")}
                  </p>
                ) : null}
              </div>
            </Section>
          </Panel>
        </TabsContent>
        <TabsContent value="actions" className="mt-4">
          <Panel>
            <div className="space-y-2">
              {tasks
                .sort((a, b) => b.startDate.localeCompare(a.startDate))
                .map((x) => (
                  <div key={x.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{x.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {x.department} · {userName(x.ownerId)} · due {shortDate(x.dueDate)}
                        </p>
                      </div>
                      <StatusPill status={x.status} />
                    </div>
                    {x.notes ? <p className="mt-2 text-xs">{x.notes}</p> : null}
                  </div>
                ))}
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="meetings" className="mt-4">
          <Panel>
            <div className="space-y-2">
              {meetings
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((m) => (
                  <div key={m.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{m.title}</p>
                      <StatusPill status={m.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {shortDate(m.date)} · {m.startTime} · {userName(m.organizerId)}
                    </p>
                    {m.outcome ? (
                      <p className="mt-2 text-xs">
                        <strong>Outcome:</strong> {m.outcome}
                      </p>
                    ) : null}
                    {m.nextAction ? (
                      <p className="mt-1 text-xs font-medium text-primary">
                        Next: {m.nextAction} · {m.actionDueDate ? shortDate(m.actionDueDate) : "—"}
                      </p>
                    ) : null}
                  </div>
                ))}
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="sales" className="mt-4">
          <Panel>
            <div className="space-y-2">
              {sales
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((a) => (
                  <div key={a.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Pill tone="brand">{a.type}</Pill>
                      <StatusPill status={a.outcome} />
                      <span className="ms-auto text-xs text-muted-foreground">
                        {shortDate(a.date)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{a.notes}</p>
                    {a.nextAction ? (
                      <p className="mt-1 text-xs font-medium text-primary">
                        Next: {a.nextAction} ·{" "}
                        {a.nextActionDate ? shortDate(a.nextActionDate) : "—"}
                      </p>
                    ) : null}
                  </div>
                ))}
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="finance" className="mt-4">
          <Panel>
            <div className="space-y-2">
              {invoices.map((i) => (
                <div key={i.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="num text-sm font-medium">{i.number}</p>
                      <p className="text-xs text-muted-foreground">
                        Issued {shortDate(i.issueDate)} · due {shortDate(i.dueDate)}
                      </p>
                    </div>
                    <div className="text-end">
                      <div className="num text-sm font-semibold">
                        {money(invoiceOutstanding(i), i.currency)}
                      </div>
                      <StatusPill status={isOverdue(i) ? "Overdue" : i.status} />
                    </div>
                  </div>
                  {i.nextAction ? <p className="mt-2 text-xs">{i.nextAction}</p> : null}
                </div>
              ))}
              <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                {payments.length} payment record(s) linked to this client.
              </div>
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="contacts" className="mt-4">
          <Panel>
            <div className="grid gap-3 md:grid-cols-2">
              {contacts.map((c) => (
                <div key={c.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.primary ? <Pill tone="brand">Primary</Pill> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.title}</p>
                  <p className="num mt-1 text-xs">
                    {c.email} · {c.phone}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/crm/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client Action Center | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "One client view for Sales actions, meetings, Finance collections and execution history.",
      },
    ],
  }),
  component: ClientActionCenter,
});
