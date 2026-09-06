import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Pill, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { BarChartCard } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { useExceptions } from "@/lib/use-exceptions";
import { shortDate } from "@/lib/format";
import { getRoleExperience, isIndividualContributor } from "@/lib/role-ux";
import type { Exception } from "@/lib/derive";

function Alerts() {
  const { currentUser, userName, entityName } = useApp();
  const { t } = useLang();
  const rows = useExceptions();
  const ux = getRoleExperience(currentUser.role);
  const individual = isIndividualContributor(currentUser.role);
  const title = individual
    ? t("My Exceptions", "استثناءاتي")
    : ux.mode.endsWith("manager")
      ? t("Team Exceptions", "استثناءات الفريق")
      : t("Alerts & Exceptions", "التنبيهات والاستثناءات");
  const subtitle = individual
    ? t(
        "Only the overdue or blocked items you own, with the next action made explicit.",
        "العناصر المتأخرة أو المعطلة التي تملكها فقط مع توضيح الإجراء التالي.",
      )
    : ux.mode.endsWith("manager")
      ? t(
          "Team blockers that need coaching, reassignment or escalation — not every system notification.",
          "عوائق الفريق التي تحتاج توجيهاً أو إعادة توزيع أو تصعيداً، وليس كل إشعارات النظام.",
        )
      : t(
          "Cross-functional exceptions that need intervention, with an owner and required action on every line.",
          "استثناءات متعددة الوظائف تحتاج تدخلاً مع مسؤول وإجراء مطلوب لكل بند.",
        );

  const columns: Column<Exception>[] = [
    {
      key: "severity",
      header: t("Severity", "الخطورة"),
      render: (r) => (
        <Pill
          tone={
            r.severity === "Critical" ? "danger" : r.severity === "High" ? "warning" : "neutral"
          }
        >
          {r.severity}
        </Pill>
      ),
      sortValue: (r) => ({ Critical: 0, High: 1, Medium: 2 })[r.severity],
    },
    {
      key: "issue",
      header: t("What needs attention", "ما يحتاج الانتباه"),
      render: (r) => (
        <div>
          <span className="font-medium">{r.issue}</span>
          <div className="mt-0.5 text-xs text-muted-foreground">{r.category}</div>
        </div>
      ),
      sortValue: (r) => r.issue,
    },
    ...(!individual
      ? ([
          {
            key: "owner",
            header: t("Owner", "المسؤول"),
            render: (r: Exception) => userName(r.ownerId),
            sortValue: (r: Exception) => userName(r.ownerId),
          },
        ] as Column<Exception>[])
      : []),
    {
      key: "entity",
      header: t("Entity", "الكيان"),
      render: (r) => entityName(r.entityId),
      sortValue: (r) => entityName(r.entityId),
    },
    {
      key: "age",
      header: t("Age", "العمر"),
      render: (r) => r.age,
      sortValue: (r) => parseInt(r.age) || 0,
    },
    {
      key: "impact",
      header: t("Why it matters", "لماذا يهم"),
      render: (r) => <span className="text-muted-foreground">{r.impact}</span>,
    },
    {
      key: "action",
      header: t("Do this next", "افعل هذا تالياً"),
      className: "min-w-[230px]",
      render: (r) => <span className="font-medium">{r.action}</span>,
    },
    {
      key: "deadline",
      header: t("Deadline", "الموعد"),
      render: (r) => shortDate(r.deadline),
      sortValue: (r) => r.deadline,
    },
    {
      key: "link",
      header: "",
      render: (r) => (
        <Link to={r.link as never} className="text-xs font-medium text-primary">
          {t("Work item", "فتح الإجراء")}
        </Link>
      ),
    },
  ];

  const bySeverity = (s: string) => rows.filter((r) => r.severity === s).length;
  const categories = [...new Set(rows.map((r) => r.category))].map((name) => ({
    name,
    value: rows.filter((r) => r.category === name).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={
            individual ? t("My exceptions", "استثناءاتي") : t("Open exceptions", "استثناءات مفتوحة")
          }
          value={String(rows.length)}
          tone="brand"
        />
        <Stat
          label={t("Critical", "حرجة")}
          value={String(bySeverity("Critical"))}
          tone={bySeverity("Critical") ? "danger" : "success"}
        />
        <Stat
          label={t("High", "عالية")}
          value={String(bySeverity("High"))}
          tone={bySeverity("High") ? "warning" : "success"}
        />
        <Stat label={t("Medium", "متوسطة")} value={String(bySeverity("Medium"))} />
      </div>
      {rows.length ? (
        <div className="max-w-3xl">
          <BarChartCard
            title={t("What is creating the exceptions?", "ما مصدر الاستثناءات؟")}
            description={t(
              "A single diagnostic view to show where attention is concentrated.",
              "عرض تشخيصي واحد يوضح أين يتركز الانتباه.",
            )}
            data={categories}
            horizontal
          />
        </div>
      ) : null}
      <Section
        title={
          individual
            ? t("My intervention queue", "قائمة تدخلي")
            : t("Intervention queue", "قائمة التدخل")
        }
      >
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.issue} ${r.category} ${r.action}`}
          exportName="trygc-role-exceptions"
          pageSize={15}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Exceptions | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Role-aware overdue actions, collection risks and missing outcomes in one accountable intervention queue.",
      },
    ],
  }),
  component: Alerts,
});
