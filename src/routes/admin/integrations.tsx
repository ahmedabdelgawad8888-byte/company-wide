import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { PageHeader, Panel, Pill, Section, Stat, Field } from "@/components/kit";
import { ChartRow, BarChartCard, ShareChartCard, countBy, sumBy } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { shortDate } from "@/lib/format";
import type { Integration } from "@/lib/types";

const tone = (s: Integration["status"]) =>
  s === "Connected"
    ? "success"
    : s === "Error"
      ? "danger"
      : s === "Disabled"
        ? "neutral"
        : "warning";

function Integrations() {
  const { db } = useApp();
  const { t } = useLang();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Integrations", "التكاملات")}
        subtitle={t(
          "Connection state is shown honestly: what is live, what needs configuration, and what is broken right now.",
          "حالة الاتصال معروضة بصدق: ما يعمل، وما يحتاج إعداداً، وما هو معطل الآن.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Integrations", "التكاملات")}
          value={String(db.integrations.length)}
          tone="brand"
        />
        <Stat
          label={t("Connected", "متصلة")}
          value={String(db.integrations.filter((i) => i.status === "Connected").length)}
          tone="success"
        />
        <Stat
          label={t("Need attention", "تحتاج انتباهاً")}
          value={String(
            db.integrations.filter(
              (i) => i.status === "Needs Configuration" || i.status === "Pending Support",
            ).length,
          )}
          tone="warning"
        />
        <Stat
          label={t("Failing", "معطلة")}
          value={String(
            db.integrations.filter(
              (i) => i.status === "Error" || i.webhook === "Failing" || i.auth === "Expired",
            ).length,
          )}
          tone="danger"
        />
      </div>
      <ChartRow>
        <ShareChartCard
          title={t("Connection status", "حالة الاتصال")}
          data={countBy(db.integrations, (i) => i.status)}
        />
        <ShareChartCard
          title={t("Webhook health", "صحة الويب هوك")}
          data={countBy(db.integrations, (i) => i.webhook)}
        />
        <ShareChartCard
          title={t("Credential state", "حالة الاعتماد")}
          data={countBy(db.integrations, (i) => i.auth)}
        />
      </ChartRow>
      <Section title={t("Connections", "الاتصالات")}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {db.integrations.map((i) => (
            <Panel key={i.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{i.name}</p>
                  <p className="text-xs text-muted-foreground">{i.category}</p>
                </div>
                <Pill tone={tone(i.status)}>{i.status}</Pill>
              </div>
              <div className="mt-3 grid gap-2">
                <Field label={t("Owner", "المسؤول")} value={i.owner} />
                <Field label={t("Webhook", "الويب هوك")} value={i.webhook} />
                <Field label={t("Credentials", "بيانات الاعتماد")} value={i.auth} />
                <Field
                  label={t("Last sync", "آخر مزامنة")}
                  value={i.lastSync ? shortDate(i.lastSync) : t("Never", "أبداً")}
                />
              </div>
              {i.lastError && (
                <p className="mt-3 flex items-start gap-1.5 rounded-md bg-danger/10 p-2 text-xs text-danger">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {i.lastError}
                </p>
              )}
            </Panel>
          ))}
        </div>
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/admin/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Honest connection status for every Trygc integration including webhook health and credential validity.",
      },
      { property: "og:title", content: "Integrations | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Live, misconfigured and failing integrations at a glance.",
      },
    ],
  }),
  component: Integrations,
});
