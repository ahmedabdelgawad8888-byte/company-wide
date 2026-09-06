import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, Section, Stat, StatusPill } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { BarChartCard, countBy } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { shortDate } from "@/lib/format";
import { approvalVisibleToRole } from "@/lib/record-scope";
import { getRoleExperience } from "@/lib/role-ux";
import type { Approval } from "@/lib/types";

function Approvals() {
  const { db, inScope, userName, entityName, actions, currentUser } = useApp();
  const { t } = useLang();
  const ux = getRoleExperience(currentUser.role);
  const rows = inScope(db.approvals).filter((a) =>
    approvalVisibleToRole(a, currentUser, currentUser.role),
  );
  const pending = rows.filter((r) => r.status === "Pending");
  const returned = rows.filter((r) => r.status === "Returned");
  const decided = rows.filter((r) => ["Approved", "Rejected"].includes(r.status));
  const canDecide = (r: Approval) =>
    currentUser.role === "Group Admin" ||
    ux.mode === "finance-manager" ||
    r.approverId === currentUser.id;

  const decide = (id: string, decision: Approval["status"], title: string) => {
    actions.decideApproval(id, decision);
    toast.success(`${decision}`, { description: title });
  };

  const columns: Column<Approval>[] = [
    {
      key: "title",
      header: t("Decision needed", "القرار المطلوب"),
      render: (r) => (
        <div>
          <div className="font-medium">{r.title}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{r.type}</div>
        </div>
      ),
      sortValue: (r) => r.title,
    },
    {
      key: "requester",
      header: t("Requested by", "مقدم الطلب"),
      render: (r) => userName(r.requesterId),
      sortValue: (r) => userName(r.requesterId),
    },
    {
      key: "entity",
      header: t("Entity", "الكيان"),
      render: (r) => entityName(r.entityId),
      sortValue: (r) => entityName(r.entityId),
    },
    {
      key: "submitted",
      header: t("Waiting since", "في الانتظار منذ"),
      render: (r) => shortDate(r.submittedAt),
      sortValue: (r) => r.submittedAt,
    },
    {
      key: "status",
      header: t("Status", "الحالة"),
      render: (r) => <StatusPill status={r.status} />,
      sortValue: (r) => r.status,
    },
    {
      key: "actions",
      header: t("Decision", "القرار"),
      render: (r) =>
        r.status === "Pending" && canDecide(r) ? (
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" onClick={() => decide(r.id, "Approved", r.title)}>
              {t("Approve", "اعتماد")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide(r.id, "Returned", r.title)}>
              {t("Return", "إرجاع")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => decide(r.id, "Rejected", r.title)}>
              {t("Reject", "رفض")}
            </Button>
          </div>
        ) : r.status === "Pending" ? (
          <span className="text-xs text-muted-foreground">
            {t(`Waiting for ${userName(r.approverId)}`, `بانتظار ${userName(r.approverId)}`)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {t("Decision recorded", "تم تسجيل القرار")}
          </span>
        ),
    },
  ];

  const title =
    ux.mode === "finance-manager"
      ? t("Finance Decision Queue", "قائمة قرارات المالية")
      : ux.mode === "executive"
        ? t("My Decision Queue", "قائمة قراراتي")
        : t("Approval Governance", "حوكمة الموافقات");

  const subtitle =
    ux.mode === "finance-manager"
      ? t(
          "Resolve the Finance decisions currently blocking billing, payment or collection work. Operational noise is intentionally hidden.",
          "احسم قرارات المالية التي تعطل الفوترة أو الدفع أو التحصيل. تم إخفاء التفاصيل التشغيلية غير الضرورية.",
        )
      : ux.mode === "executive"
        ? t(
            "Only decisions that need your management judgment appear here. Review the oldest pending item first.",
            "تظهر هنا فقط القرارات التي تحتاج تدخلك الإداري. ابدأ بأقدم قرار معلق.",
          )
        : t(
            "A controlled decision trail for Finance, Sales proposals and access. Legacy campaign approvals are excluded from this Hub.",
            "مسار قرارات منضبط للمالية وعروض المبيعات والوصول. موافقات الحملات القديمة مستبعدة من هذا المركز.",
          );

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Needs a decision", "تحتاج قرارًا")}
          value={String(pending.length)}
          tone={pending.length ? "warning" : "success"}
          hint={t("Work these first", "ابدأ بها")}
        />
        <Stat
          label={t("Returned for rework", "مُعادة للتعديل")}
          value={String(returned.length)}
          tone={returned.length ? "danger" : "default"}
          hint={t("Requester action needed", "تحتاج إجراء من مقدم الطلب")}
        />
        <Stat
          label={t("Decisions recorded", "قرارات مسجلة")}
          value={String(decided.length)}
          tone="success"
          hint={t("Approved or rejected", "معتمدة أو مرفوضة")}
        />
        <Stat
          label={t("Decision types", "أنواع القرارات")}
          value={String(new Set(rows.map((r) => r.type)).size)}
          hint={t("Relevant to your role", "مرتبطة بدورك")}
        />
      </div>

      {pending.length > 1 ? (
        <div className="max-w-3xl">
          <BarChartCard
            title={t("Where decisions are waiting", "أين تنتظر القرارات")}
            data={countBy(pending, (r) => r.type)}
            horizontal
          />
        </div>
      ) : null}

      <Section
        title={t("Decision inbox", "صندوق القرارات")}
        description={
          pending.length
            ? t(
                "Pending items stay at the top so the next action is obvious.",
                "تظل العناصر المعلقة في الأعلى حتى يكون الإجراء التالي واضحًا.",
              )
            : t("No decision is waiting on you right now.", "لا يوجد قرار ينتظر تدخلك حاليًا.")
        }
      >
        <DataTable
          rows={[...rows].sort(
            (a, b) =>
              Number(a.status !== "Pending") - Number(b.status !== "Pending") ||
              a.submittedAt.localeCompare(b.submittedAt),
          )}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.title} ${r.type} ${userName(r.requesterId)}`}
          exportName="trygc-approvals"
          pageSize={12}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals | TryGC Workspace Hub" },
      {
        name: "description",
        content: "Role-focused approval inbox for Finance, Sales proposals and access decisions.",
      },
      { property: "og:title", content: "Approvals | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "See only the decisions that require action from your role.",
      },
    ],
  }),
  component: Approvals,
});
