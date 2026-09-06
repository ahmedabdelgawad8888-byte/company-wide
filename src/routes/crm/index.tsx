import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar as RBar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Pill, Section, Stat } from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { dealIsStuck } from "@/lib/derive";
import { ageLabel, compactMoney, money, toSAR } from "@/lib/format";

const STAGES = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Discovery",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
] as const;

function CrmDashboard() {
  const { db, inScope, clientName, userName } = useApp();
  const { t } = useLang();
  const deals = inScope(db.deals);
  const clients = inScope(db.clients);

  const open = deals.filter((d) => !["Won", "Lost"].includes(d.stage));
  const won = deals.filter((d) => d.stage === "Won");
  const lost = deals.filter((d) => d.stage === "Lost");
  const winRate =
    won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  const stuck = deals.filter(dealIsStuck);
  const pipelineSAR = open.reduce((s, d) => s + toSAR(d.value, d.currency), 0);
  const weighted = open.reduce((s, d) => s + (toSAR(d.value, d.currency) * d.probability) / 100, 0);

  const funnel = STAGES.filter((s) => s !== "Lost").map((stage) => ({
    stage: stage.replace(" Lead", ""),
    count: deals.filter((d) => d.stage === stage).length,
    value: Math.round(
      deals.filter((d) => d.stage === stage).reduce((s, d) => s + toSAR(d.value, d.currency), 0),
    ),
  }));

  const bySource = Object.entries(
    deals.reduce<Record<string, number>>(
      (acc, d) => ({ ...acc, [d.source]: (acc[d.source] ?? 0) + 1 }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("CRM Dashboard", "لوحة إدارة العملاء")}
        subtitle={t(
          "Pipeline value, conversion and account health for the selected scope.",
          "قيمة خط الفرص ومعدل التحويل وصحة الحسابات ضمن النطاق المختار.",
        )}
        actions={
          <Button asChild>
            <Link to="/crm/deals">{t("Open pipeline", "فتح خط الفرص")}</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Open pipeline (SAR)", "خط الفرص")}
          value={compactMoney(pipelineSAR, "SAR")}
          hint={`${open.length} ${t("deals", "صفقة")}`}
          tone="brand"
        />
        <Stat
          label={t("Weighted forecast (SAR)", "التوقع المرجح")}
          value={compactMoney(weighted, "SAR")}
          hint={t("Value × probability", "القيمة × الاحتمالية")}
          tone="orange"
        />
        <Stat
          label={t("Win rate", "معدل الفوز")}
          value={`${winRate}%`}
          hint={`${won.length} ${t("won", "مكسوبة")} · ${lost.length} ${t("lost", "خاسرة")}`}
          tone="success"
        />
        <Stat
          label={t("Stuck deals", "صفقات متوقفة")}
          value={String(stuck.length)}
          hint={t("No activity for 7+ days", "بدون نشاط 7 أيام فأكثر")}
          tone={stuck.length ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <Section title={t("Pipeline funnel", "قمع المبيعات")}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    className="stroke-border"
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => compactMoney(v, "SAR")}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={92}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v: number) => money(v, "SAR")}
                    contentStyle={{ borderRadius: 10, fontSize: 12 }}
                  />
                  <RBar
                    dataKey="value"
                    name={t("Value", "القيمة")}
                    fill="var(--color-chart-1)"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </Panel>
        <Panel>
          <Section title={t("Lead sources", "مصادر العملاء")}>
            <div className="space-y-2">
              {bySource.map(([src, n]) => (
                <div
                  key={src}
                  className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                >
                  <span>{src}</span>
                  <span className="num font-semibold">{n}</span>
                </div>
              ))}
            </div>
          </Section>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <Section
            title={t("Deals with no recent activity", "صفقات بدون نشاط حديث")}
            description={t(
              "Escalate or close these before they age further.",
              "صعّدها أو أغلقها قبل أن تتقادم أكثر.",
            )}
          >
            <div className="space-y-2">
              {stuck.map((d) => (
                <Link
                  key={d.id}
                  to="/crm/deals"
                  className="block rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{d.name}</span>
                    <Pill tone="danger">{ageLabel(d.lastActivity)}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {clientName(d.clientId)} · {userName(d.ownerId)} ·{" "}
                    <span className="num">{money(d.value, d.currency)}</span>
                  </p>
                </Link>
              ))}
              {stuck.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("Every deal has recent activity.", "كل الصفقات عليها نشاط حديث.")}
                </p>
              )}
            </div>
          </Section>
        </Panel>
        <Panel>
          <Section
            title={t("Accounts at risk", "حسابات في خطر")}
            actions={
              <Button size="sm" variant="outline" asChild>
                <Link to="/crm/clients">{t("All clients", "كل العملاء")}</Link>
              </Button>
            }
          >
            <div className="space-y-2">
              {clients
                .filter((c) => c.status === "At Risk" || c.satisfaction < 3.5)
                .map((c) => (
                  <Link
                    key={c.id}
                    to="/crm/clients/$clientId"
                    params={{ clientId: c.id }}
                    className="block rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      <Pill tone={c.status === "At Risk" ? "danger" : "warning"}>{c.status}</Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("Satisfaction", "الرضا")} {c.satisfaction}/5 · {t("next", "التالي")}:{" "}
                      {c.nextAction}
                    </p>
                  </Link>
                ))}
            </div>
          </Section>
        </Panel>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/crm/")({
  head: () => ({
    meta: [
      { title: "CRM Dashboard | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Pipeline value, weighted forecast, win rate, stuck deals and at-risk accounts for Trygc sales teams.",
      },
      { property: "og:title", content: "CRM Dashboard | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Pipeline, forecast, win rate and account health in one view.",
      },
    ],
  }),
  component: CrmDashboard,
});
