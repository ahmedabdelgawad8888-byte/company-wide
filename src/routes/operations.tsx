import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Pill, Section, Stat, StatusPill } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { daysBetween, shortDate } from "@/lib/format";
import type { QueueItem } from "@/lib/types";
import {
  BarChartCard,
  ChartRow,
  ShareChartCard,
  TrendChartCard,
  countBy,
  sumBy,
} from "@/components/charts";

const QUEUES: QueueItem["queue"][] = [
  "Onboarding",
  "Coordination",
  "WhatsApp",
  "Visits",
  "Posting Coverage",
  "QA",
];

function Operations() {
  const { db, inScope, userName, entityName, campaignName, clientName, actions, can } = useApp();
  const { t } = useLang();
  const [assignee, setAssignee] = useState(db.users[0]!.id);
  const rows = inScope(db.queueItems);
  const breached = (q: QueueItem) => q.status !== "Done" && daysBetween(q.slaDeadline) > 0;

  const columns: Column<QueueItem>[] = [
    {
      key: "title",
      header: t("Item", "البند"),
      render: (r) => (
        <div>
          <div className="font-medium">{r.title}</div>
          <div className="text-xs text-muted-foreground">
            {r.campaignId ? campaignName(r.campaignId) : r.clientId ? clientName(r.clientId) : "—"}
          </div>
        </div>
      ),
      sortValue: (r) => r.title,
    },
    {
      key: "queue",
      header: t("Queue", "الطابور"),
      render: (r) => <Pill tone="brand">{r.queue}</Pill>,
      sortValue: (r) => r.queue,
    },
    {
      key: "owner",
      header: t("Owner", "المسؤول"),
      render: (r) => userName(r.ownerId),
      sortValue: (r) => userName(r.ownerId),
    },
    {
      key: "entity",
      header: t("Entity", "الكيان"),
      render: (r) => entityName(r.entityId),
      sortValue: (r) => entityName(r.entityId),
    },
    {
      key: "priority",
      header: t("Priority", "الأولوية"),
      render: (r) => (
        <Pill
          tone={
            r.priority === "Critical" ? "danger" : r.priority === "High" ? "warning" : "neutral"
          }
        >
          {r.priority}
        </Pill>
      ),
      sortValue: (r) => ({ Critical: 0, High: 1, Medium: 2, Low: 3 })[r.priority],
    },
    {
      key: "sla",
      header: t("SLA deadline", "موعد المهلة"),
      render: (r) => (
        <span className={breached(r) ? "font-medium text-danger" : ""}>
          {shortDate(r.slaDeadline)}
        </span>
      ),
      sortValue: (r) => r.slaDeadline,
    },
    {
      key: "status",
      header: t("Status", "الحالة"),
      render: (r) => <StatusPill status={r.status} />,
      sortValue: (r) => r.status,
    },
    { key: "next", header: t("Next action", "الإجراء التالي"), render: (r) => r.nextAction },
    {
      key: "act",
      header: "",
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            actions.setQueueStatus(r.id, r.status === "Open" ? "In Progress" : "Done");
            toast.success(t("Queue item updated", "تم تحديث البند"), { description: r.title });
          }}
        >
          {r.status === "Open" ? t("Start", "بدء") : t("Complete", "إنهاء")}
        </Button>
      ),
    },
  ];

  const bulk = (selected: string[], clear: () => void) => (
    <div className="flex items-center gap-2">
      <Select value={assignee} onValueChange={setAssignee}>
        <SelectTrigger className="h-8 w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {db.users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={!can("assign")}
        onClick={() => {
          actions.assignQueueItem(selected, assignee);
          toast.success(t("Reassigned", "تمت إعادة الإسناد"), {
            description: `${selected.length} ${t("items", "بند")} → ${userName(assignee)}`,
          });
          clear();
        }}
      >
        {t("Assign selected", "إسناد المحدد")}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Operations Queues", "طوابير العمليات")}
        subtitle={t(
          "Onboarding, coordination, WhatsApp, visits, coverage and QA work with SLA deadlines and clear ownership.",
          "أعمال التسجيل والتنسيق وواتساب والزيارات والتغطية والجودة بمواعيد مهلة ومسؤوليات واضحة.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Open items", "بنود مفتوحة")}
          value={String(rows.filter((r) => r.status !== "Done").length)}
          tone="brand"
        />
        <Stat
          label={t("SLA breached", "تجاوز المهلة")}
          value={String(rows.filter(breached).length)}
          tone="danger"
        />
        <Stat
          label={t("Escalated", "مُصعّدة")}
          value={String(rows.filter((r) => r.status === "Escalated").length)}
          tone="warning"
        />
        <Stat
          label={t("Completed", "مكتملة")}
          value={String(rows.filter((r) => r.status === "Done").length)}
          tone="success"
        />
      </div>
      <ChartRow>
        <ShareChartCard
          title={t("Items by queue", "البنود حسب الطابور")}
          data={countBy(rows, (r) => r.queue)}
        />
        <BarChartCard
          title={t("Items by status", "حسب الحالة")}
          colorful
          data={countBy(rows, (r) => r.status)}
        />
        <BarChartCard
          title={t("Workload by owner", "العبء حسب المسؤول")}
          horizontal
          data={countBy(rows, (r) => userName(r.ownerId))}
        />
      </ChartRow>
      <Tabs defaultValue="all">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">{t("All queues", "كل الطوابير")}</TabsTrigger>
          {QUEUES.map((q) => (
            <TabsTrigger key={q} value={q}>
              {q}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <Section>
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(r) => r.id}
              selectable
              bulkActions={bulk}
              searchable={(r) => `${r.title} ${r.queue} ${r.nextAction}`}
              exportName="trygc-queues"
              pageSize={12}
            />
          </Section>
        </TabsContent>
        {QUEUES.map((q) => (
          <TabsContent key={q} value={q} className="mt-4">
            <Section title={q}>
              <DataTable
                rows={rows.filter((r) => r.queue === q)}
                columns={columns}
                rowKey={(r) => r.id}
                selectable
                bulkActions={bulk}
                searchable={(r) => `${r.title} ${r.nextAction}`}
                exportName={`trygc-${q.toLowerCase()}`}
                pageSize={12}
              />
            </Section>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/operations")({
  head: () => ({
    meta: [
      { title: "Operations Queues | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Onboarding, coordination, WhatsApp, visits, Posting Coverage and QA queues with SLA deadlines and bulk assignment.",
      },
      { property: "og:title", content: "Operations Queues | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Queue-based operations with SLA deadlines and bulk assignment.",
      },
    ],
  }),
  component: Operations,
});
