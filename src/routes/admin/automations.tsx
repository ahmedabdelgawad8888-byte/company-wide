import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Panel, Pill, Section, Stat } from "@/components/kit";
import { ChartRow, BarChartCard, ShareChartCard, countBy, sumBy } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { num, shortDate } from "@/lib/format";

function Automations() {
  const { db, can, actions } = useApp();
  const { t } = useLang();
  const isAdmin = can("admin");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Automations", "الأتمتة")}
        subtitle={t(
          "Rules that create bill follow-ups, convert meeting outcomes into actions, escalate overdue work and send employee briefs. Every run is logged.",
          "قواعد تنشئ متابعات الفواتير، وتحول نتائج الاجتماعات إلى إجراءات، وتصعّد المتأخرات، وترسل ملخصات الموظفين. كل تشغيل مسجل.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Rules", "القواعد")}
          value={String(db.automationRules.length)}
          tone="brand"
        />
        <Stat
          label={t("Enabled", "مفعلة")}
          value={String(db.automationRules.filter((r) => r.enabled).length)}
          tone="success"
        />
        <Stat
          label={t("Total runs", "مرات التشغيل")}
          value={num(db.automationRules.reduce((s, r) => s + r.runs, 0))}
        />
        <Stat
          label={t("Failures", "إخفاقات")}
          value={num(db.automationRules.reduce((s, r) => s + r.failures, 0))}
          tone="danger"
        />
      </div>
      <ChartRow>
        <BarChartCard
          title={t("Runs per rule", "مرات التشغيل لكل قاعدة")}
          data={db.automationRules.map((r) => ({ name: r.name, value: r.runs }))}
          horizontal
          colorful
        />
        <BarChartCard
          title={t("Failures per rule", "الإخفاقات لكل قاعدة")}
          data={db.automationRules.map((r) => ({ name: r.name, value: r.failures }))}
          horizontal
        />
        <ShareChartCard
          title={t("Rule state", "حالة القواعد")}
          data={countBy(db.automationRules, (r) => (r.enabled ? "Enabled" : "Paused"))}
        />
      </ChartRow>
      <Section title={t("Rule library", "مكتبة القواعد")}>
        <div className="grid gap-3 xl:grid-cols-2">
          {db.automationRules.map((r) => (
            <Panel key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{r.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("Last run", "آخر تشغيل")} {shortDate(r.lastRun)} · {num(r.runs)}{" "}
                    {t("runs", "تشغيل")} · {num(r.failures)} {t("failures", "إخفاق")}
                  </p>
                </div>
                <Switch
                  checked={r.enabled}
                  disabled={!isAdmin}
                  onCheckedChange={() => {
                    actions.toggleAutomation(r.id);
                    toast.success(
                      r.enabled
                        ? t("Rule paused", "تم إيقاف القاعدة")
                        : t("Rule enabled", "تم تفعيل القاعدة"),
                      { description: r.name },
                    );
                  }}
                />
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <p>
                  <Pill tone="brand">{t("When", "عند")}</Pill>{" "}
                  <span className="text-muted-foreground">{r.when}</span>
                </p>
                <p>
                  <Pill tone="warning">{t("If", "إذا")}</Pill>{" "}
                  <span className="text-muted-foreground">{r.ifCriteria}</span>
                </p>
                <p>
                  <Pill tone="success">{t("Then", "عندها")}</Pill>{" "}
                  <span className="text-muted-foreground">{r.then}</span>
                </p>
              </div>
            </Panel>
          ))}
        </div>
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/admin/automations")({
  head: () => ({
    meta: [
      { title: "Automations | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "When/if/then automation rules for bill reminders, meeting actions, Sales follow-ups, overdue escalation and daily performance briefs.",
      },
      { property: "og:title", content: "Automations | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Rules that watch records and act, with run and failure history.",
      },
    ],
  }),
  component: Automations,
});
