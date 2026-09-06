import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { PageHeader, Panel, Pill, Section, Stat } from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { isFinanceSalesHubRole } from "@/lib/role-ux";

function Roles() {
  const { db } = useApp();
  const { t } = useLang();
  const roles = db.roles.filter((r) => isFinanceSalesHubRole(r.name));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Finance & Sales roles", "أدوار المالية والمبيعات")}
        subtitle={t(
          "Each role has a different home, navigation, data scope and working flow. Permission answers what a user may do; scope answers which records they may see.",
          "لكل دور صفحة بداية وتنقل ونطاق بيانات ومسار عمل مختلف. الصلاحية تحدد ما يمكن فعله، والنطاق يحدد السجلات التي يمكن رؤيتها.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("Hub roles", "أدوار النظام")} value={String(roles.length)} tone="brand" />
        <Stat
          label={t("Group-scoped", "على مستوى المجموعة")}
          value={String(roles.filter((r) => r.scope === "Group").length)}
          tone="orange"
        />
        <Stat
          label={t("Entity / team scoped", "على مستوى الكيان أو الفريق")}
          value={String(roles.filter((r) => r.scope !== "Group").length)}
          tone="success"
        />
      </div>
      <Section title={t("Role catalogue", "دليل الأدوار")}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => (
            <Panel key={r.name}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{r.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                </div>
                <Pill tone={r.scope === "Group" ? "orange" : "neutral"}>{r.scope}</Pill>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                {r.canEditCOA ? (
                  <Check className="size-3.5 text-success" />
                ) : (
                  <X className="size-3.5 text-muted-foreground" />
                )}
                <span className={r.canEditCOA ? "text-success" : "text-muted-foreground"}>
                  {r.canEditCOA
                    ? t("Finance master-data edit allowed", "يسمح بتعديل بيانات المالية الرئيسية")
                    : t("No Finance master-data edit", "لا تعديل على بيانات المالية الرئيسية")}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {r.permissions.slice(0, 6).map((p) => (
                  <Pill key={p} tone="brand">
                    {p}
                  </Pill>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {r.members} {t("people configured for this role", "شخص مهيأ لهذا الدور")}
              </p>
            </Panel>
          ))}
        </div>
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions | TryGC Workspace Hub" },
      {
        name: "description",
        content: "Role catalogue for the Workspace Hub, separating permissions from data scope.",
      },
    ],
  }),
  component: Roles,
});
