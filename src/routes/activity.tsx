import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Pill, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { BarChartCard, countBy } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { getWorkspace, workspaceOwnsDepartment } from "@/lib/workspace-hub";
import type { ActivityEvent } from "@/lib/types";

function ActivityFeed() {
  const { db, inScope, userName, entityName, activeWorkspace } = useApp();
  const { t } = useLang();
  const workspace = getWorkspace(activeWorkspace);
  const workspaceUserIds = new Set(
    db.users.filter((u) => workspaceOwnsDepartment(activeWorkspace, u.department)).map((u) => u.id),
  );
  const moduleMatches = (module: string) => {
    const value = module.toLowerCase();
    if (activeWorkspace === "management")
      return [
        "core",
        "automation",
        "technology",
        "operations",
        "system",
        "it",
        "development",
        "business",
        "data",
        "analysis",
        "report",
        "insight",
        "bi",
      ].some((x) => value.includes(x));
    return false;
  };
  const rows = inScope(db.activities).filter(
    (a) => workspaceUserIds.has(a.actorId) || moduleMatches(a.module),
  );
  const changed = rows.filter((r) => r.from || r.to);
  const actors = new Set(rows.map((r) => r.actorId)).size;

  const columns: Column<ActivityEvent>[] = [
    {
      key: "at",
      header: t("When", "الوقت"),
      render: (r) => <span className="num text-xs">{r.at}</span>,
      sortValue: (r) => r.at,
    },
    {
      key: "actor",
      header: t("Who", "من"),
      render: (r) => userName(r.actorId),
      sortValue: (r) => userName(r.actorId),
    },
    {
      key: "action",
      header: t("What happened", "ما الذي حدث"),
      render: (r) => (
        <div>
          <div className="font-medium">{r.action}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{r.recordLabel}</div>
        </div>
      ),
      sortValue: (r) => r.action,
    },
    {
      key: "module",
      header: t("Area", "المجال"),
      render: (r) => <Pill tone="brand">{r.module}</Pill>,
      sortValue: (r) => r.module,
    },
    {
      key: "change",
      header: t("Before → after", "قبل ← بعد"),
      render: (r) =>
        r.from || r.to ? (
          <span className="text-xs text-muted-foreground">
            {r.from ?? "—"} → {r.to ?? "—"}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{t("New action", "إجراء جديد")}</span>
        ),
    },
    {
      key: "entity",
      header: t("Entity", "الكيان"),
      render: (r) => entityName(r.entityId),
      sortValue: (r) => entityName(r.entityId),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(`${workspace.title} Activity & Changes`, `نشاط وتغييرات ${workspace.titleAr}`)}
        subtitle={t(
          "Use this timeline to understand what changed across technology, automation, operations, analysis and cross-team priorities before the next decision.",
          "استخدم هذا الخط الزمني لفهم ما تغير في التكنولوجيا والأتمتة والعمليات والتحليل والأولويات المشتركة قبل القرار التالي.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("Relevant events", "الأحداث المرتبطة")} value={String(rows.length)} />
        <Stat
          label={t("State changes", "تغييرات الحالة")}
          value={String(changed.length)}
          tone="brand"
        />
        <Stat label={t("People involved", "الأشخاص المشاركون")} value={String(actors)} />
      </div>
      {rows.length > 2 ? (
        <div className="max-w-3xl">
          <BarChartCard
            title={t(
              `Changes by ${workspace.shortTitle} area`,
              `التغييرات حسب مجال ${workspace.titleAr}`,
            )}
            data={countBy(rows, (a) => a.module)}
            horizontal
          />
        </div>
      ) : null}
      <Section
        title={t("Change timeline", "الخط الزمني للتغييرات")}
        description={t(
          "Who acted, what changed and what record was affected.",
          "من قام بالإجراء وما الذي تغير وما السجل المتأثر.",
        )}
      >
        <DataTable
          rows={[...rows].sort((a, b) => b.at.localeCompare(a.at))}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.action} ${r.recordLabel} ${r.module} ${userName(r.actorId)}`}
          exportName={`trygc-${activeWorkspace}-activity`}
          pageSize={20}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Workspace Activity | TryGC Workspace Hub" },
      {
        name: "description",
        content: "Workspace-specific activity history for the Management workspace.",
      },
    ],
  }),
  component: ActivityFeed,
});
