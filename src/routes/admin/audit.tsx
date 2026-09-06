import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Pill, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { ChartRow, BarChartCard, ShareChartCard, countBy, sumBy } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import type { ActivityEvent } from "@/lib/types";

function Audit() {
  const { db, userName, entityName } = useApp();
  const { t } = useLang();

  const columns: Column<ActivityEvent>[] = [
    {
      key: "at",
      header: t("Timestamp", "الوقت"),
      render: (r) => <span className="num text-xs">{r.at}</span>,
      sortValue: (r) => r.at,
    },
    {
      key: "actor",
      header: t("Actor", "المنفذ"),
      render: (r) => userName(r.actorId),
      sortValue: (r) => userName(r.actorId),
    },
    {
      key: "action",
      header: t("Action", "الإجراء"),
      render: (r) => <Pill tone="brand">{r.action}</Pill>,
      sortValue: (r) => r.action,
    },
    {
      key: "module",
      header: t("Module", "الوحدة"),
      render: (r) => r.module,
      sortValue: (r) => r.module,
    },
    {
      key: "record",
      header: t("Record", "السجل"),
      render: (r) => (
        <div>
          <div>{r.recordLabel}</div>
          <div className="num text-xs text-muted-foreground">{r.recordId}</div>
        </div>
      ),
      sortValue: (r) => r.recordLabel,
    },
    {
      key: "change",
      header: t("Change", "التغيير"),
      render: (r) =>
        r.from || r.to ? (
          <span className="text-xs text-muted-foreground">
            {r.from ?? "—"} → {r.to ?? "—"}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "entity",
      header: t("Entity", "الكيان"),
      render: (r) => (r.entityId ? entityName(r.entityId) : "—"),
      defaultHidden: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Audit Trail", "سجل التدقيق")}
        subtitle={t(
          "Append-only. Entries cannot be edited or deleted by anyone, including group administrators.",
          "سجل إضافي فقط. لا يمكن لأحد تعديله أو حذفه، بمن فيهم مسؤولو المجموعة.",
        )}
        meta={[
          <Pill key="i" tone="success">
            {t("Immutable", "غير قابل للتعديل")}
          </Pill>,
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label={t("Recorded events", "أحداث مسجلة")}
          value={String(db.activities.length)}
          tone="brand"
        />
        <Stat
          label={t("Distinct actors", "منفذون")}
          value={String(new Set(db.activities.map((a) => a.actorId)).size)}
        />
        <Stat
          label={t("Action types", "أنواع الإجراءات")}
          value={String(new Set(db.activities.map((a) => a.action)).size)}
          tone="orange"
        />
      </div>
      <ChartRow>
        <BarChartCard
          title={t("Events by module", "الأحداث حسب الوحدة")}
          data={countBy(db.activities, (a) => a.module)}
          horizontal
          colorful
        />
        <ShareChartCard
          title={t("Events by action", "الأحداث حسب الإجراء")}
          data={countBy(db.activities, (a) => a.action)}
        />
        <BarChartCard
          title={t("Events by actor", "الأحداث حسب المنفذ")}
          data={countBy(db.activities, (a) => userName(a.actorId))}
          horizontal
        />
      </ChartRow>
      <Section title={t("Event log", "سجل الأحداث")}>
        <DataTable
          rows={db.activities}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.recordLabel} ${r.action} ${r.module} ${userName(r.actorId)}`}
          exportName="trygc-audit"
          pageSize={20}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Immutable append-only audit log of every action taken across the Trygc operating environment.",
      },
      { property: "og:title", content: "Audit Trail | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Append-only record of who did what, when and to which record.",
      },
    ],
  }),
  component: Audit,
});
