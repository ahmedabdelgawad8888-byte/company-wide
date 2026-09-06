import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, Pill, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { ChartRow, BarChartCard, ShareChartCard, countBy, sumBy } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { shortDate } from "@/lib/format";
import type { SaasSeat } from "@/lib/types";

function Saas() {
  const { db, userName, can, actions } = useApp();
  const { t } = useLang();
  const isAdmin = can("admin");
  const user = (id: string) => db.users.find((u) => u.id === id);

  const columns: Column<SaasSeat>[] = [
    {
      key: "app",
      header: t("Application", "التطبيق"),
      render: (r) => <span className="font-medium">{r.app}</span>,
      sortValue: (r) => r.app,
    },
    {
      key: "user",
      header: t("Assigned to", "مخصص لـ"),
      render: (r) => (
        <div>
          <div>{userName(r.userId)}</div>
          <div className="text-xs text-muted-foreground">{r.corporateEmail}</div>
        </div>
      ),
      sortValue: (r) => userName(r.userId),
    },
    {
      key: "license",
      header: t("Licence", "الترخيص"),
      render: (r) => <Pill tone="brand">{r.license}</Pill>,
      sortValue: (r) => r.license,
    },
    {
      key: "status",
      header: t("Seat status", "حالة المقعد"),
      render: (r) => (
        <Pill
          tone={r.status === "Active" ? "success" : r.status === "Pending" ? "warning" : "danger"}
        >
          {r.status}
        </Pill>
      ),
      sortValue: (r) => r.status,
    },
    {
      key: "hr",
      header: t("HR status", "حالة الموظف"),
      render: (r) => {
        const u = user(r.userId);
        return (
          <Pill tone={u?.status === "active" ? "success" : "danger"}>{u?.status ?? "unknown"}</Pill>
        );
      },
    },
    {
      key: "assigned",
      header: t("Assigned", "تاريخ التخصيص"),
      render: (r) => shortDate(r.assignedAt),
      sortValue: (r) => r.assignedAt,
    },
    {
      key: "review",
      header: t("Last review", "آخر مراجعة"),
      render: (r) => shortDate(r.lastReview),
      sortValue: (r) => r.lastReview,
    },
    {
      key: "act",
      header: "",
      render: (r) =>
        isAdmin && r.status !== "Revoked" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              actions.setSeatStatus(r.id, "Revoked");
              toast.success(t("Seat revoked", "تم سحب المقعد"), {
                description: `${r.app} — ${userName(r.userId)}`,
              });
            }}
          >
            {t("Revoke", "سحب")}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  const orphaned = db.saasSeats.filter(
    (s) => s.status === "Active" && user(s.userId)?.status !== "active",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("SaaS Governance", "حوكمة التطبيقات")}
        subtitle={t(
          "Corporate email is the identity. When someone leaves, their seats must be revoked — this page shows the ones that were not.",
          "البريد المؤسسي هو الهوية. عند مغادرة أي شخص يجب سحب مقاعده — هذه الصفحة تُظهر ما لم يُسحب.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("Seats", "المقاعد")} value={String(db.saasSeats.length)} tone="brand" />
        <Stat
          label={t("Active seats", "مقاعد نشطة")}
          value={String(db.saasSeats.filter((s) => s.status === "Active").length)}
          tone="success"
        />
        <Stat
          label={t("Applications", "التطبيقات")}
          value={String(new Set(db.saasSeats.map((s) => s.app)).size)}
        />
        <Stat
          label={t("Orphaned access", "وصول يتيم")}
          value={String(orphaned.length)}
          tone={orphaned.length ? "danger" : "default"}
          hint={t("Active seat, inactive employee", "مقعد نشط لموظف غير نشط")}
        />
      </div>
      <ChartRow>
        <BarChartCard
          title={t("Seats by application", "المقاعد حسب التطبيق")}
          data={countBy(db.saasSeats, (s) => s.app)}
          horizontal
          colorful
        />
        <ShareChartCard
          title={t("Seat status", "حالة المقاعد")}
          data={countBy(db.saasSeats, (s) => s.status)}
        />
        <ShareChartCard
          title={t("Licence mix", "مزيج التراخيص")}
          data={countBy(db.saasSeats, (s) => s.license)}
        />
      </ChartRow>
      <Section title={t("Seat register", "سجل المقاعد")}>
        <DataTable
          rows={db.saasSeats}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.app} ${r.corporateEmail} ${userName(r.userId)}`}
          exportName="trygc-saas-seats"
          pageSize={12}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/admin/saas")({
  head: () => ({
    meta: [
      { title: "SaaS Governance | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Corporate SaaS seat register with licence status, review dates and orphaned access detection.",
      },
      { property: "og:title", content: "SaaS Governance | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Seat register with orphaned-access detection for leavers.",
      },
    ],
  }),
  component: Saas,
});
