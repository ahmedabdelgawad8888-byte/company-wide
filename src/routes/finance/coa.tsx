import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader, Pill, Section, Stat, StatusPill } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { ChartRow, BarChartCard, ShareChartCard, countBy, sumBy } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { shortDate } from "@/lib/format";
import type { Account, CoaRequest } from "@/lib/types";

function Coa() {
  const { db, currentUser, can, userName, entityName, actions } = useApp();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", justification: "" });
  const canEdit = can("coa.write");

  const accountCols: Column<Account>[] = [
    {
      key: "code",
      header: t("Code", "الرمز"),
      render: (r) => <span className="num font-medium">{r.code}</span>,
      sortValue: (r) => r.code,
    },
    {
      key: "name",
      header: t("Account", "الحساب"),
      render: (r) => (
        <span className={r.category === "Header" ? "font-semibold" : ""}>{r.name}</span>
      ),
      sortValue: (r) => r.name,
    },
    {
      key: "type",
      header: t("Type", "النوع"),
      render: (r) => <Pill tone="brand">{r.type}</Pill>,
      sortValue: (r) => r.type,
    },
    {
      key: "category",
      header: t("Category", "التصنيف"),
      render: (r) => r.category,
      sortValue: (r) => r.category,
    },
    {
      key: "entities",
      header: t("Applies to", "ينطبق على"),
      render: (r) =>
        r.entities === "all"
          ? t("All entities", "كل الكيانات")
          : r.entities.map(entityName).join(", "),
    },
    {
      key: "cur",
      header: t("Currency behaviour", "سلوك العملة"),
      render: (r) => r.currencyBehaviour,
      defaultHidden: true,
    },
    {
      key: "active",
      header: t("Status", "الحالة"),
      render: (r) => (
        <Pill tone={r.active ? "success" : "neutral"}>
          {r.active ? t("Active", "نشط") : t("Inactive", "غير نشط")}
        </Pill>
      ),
      sortValue: (r) => (r.active ? 0 : 1),
    },
    {
      key: "approved",
      header: t("Approved by", "اعتمده"),
      render: (r) => r.approvedBy,
      defaultHidden: true,
    },
    {
      key: "eff",
      header: t("Effective", "سريان"),
      render: (r) => shortDate(r.effectiveDate),
      sortValue: (r) => r.effectiveDate,
    },
  ];

  const requestCols: Column<CoaRequest>[] = [
    {
      key: "code",
      header: t("Proposed code", "الرمز المقترح"),
      render: (r) => <span className="num font-medium">{r.code}</span>,
      sortValue: (r) => r.code,
    },
    {
      key: "name",
      header: t("Account name", "اسم الحساب"),
      render: (r) => r.name,
      sortValue: (r) => r.name,
    },
    { key: "type", header: t("Type", "النوع"), render: (r) => r.type, sortValue: (r) => r.type },
    {
      key: "entity",
      header: t("Entity", "الكيان"),
      render: (r) => entityName(r.entityId),
      sortValue: (r) => entityName(r.entityId),
    },
    {
      key: "by",
      header: t("Requested by", "مقدم الطلب"),
      render: (r) => userName(r.requestedBy),
      sortValue: (r) => userName(r.requestedBy),
    },
    {
      key: "just",
      header: t("Justification", "المبرر"),
      render: (r) => <span className="text-muted-foreground">{r.justification}</span>,
    },
    {
      key: "status",
      header: t("Status", "الحالة"),
      render: (r) => <StatusPill status={r.status} />,
      sortValue: (r) => r.status,
    },
    {
      key: "act",
      header: "",
      render: (r) =>
        r.status === "Pending Review" && canEdit ? (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              onClick={() => {
                actions.decideCoaRequest(r.id, "Approved");
                toast.success(t("Account approved and created", "تم اعتماد الحساب وإنشاؤه"), {
                  description: `${r.code} ${r.name}`,
                });
              }}
            >
              {t("Approve", "اعتماد")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                actions.decideCoaRequest(r.id, "Rejected");
                toast.message(t("Request rejected", "تم رفض الطلب"));
              }}
            >
              {t("Reject", "رفض")}
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {r.status === "Pending Review"
              ? t("Group Finance decides", "تقرره المالية المركزية")
              : t("Decided", "تم البت")}
          </span>
        ),
    },
  ];

  const submit = () => {
    if (!form.code || !form.name) return;
    actions.requestAccount({
      code: form.code,
      name: form.name,
      type: "Expense",
      entityId: currentUser.entityId,
      justification: form.justification || "Requested from branch finance",
    });
    toast.success(t("Account request submitted", "تم إرسال طلب الحساب"), {
      description: t(
        "Group Finance must approve before it can be used.",
        "يجب اعتماده من المالية المركزية قبل الاستخدام.",
      ),
    });
    setForm({ code: "", name: "", justification: "" });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Chart of Accounts", "شجرة الحسابات")}
        subtitle={t(
          "One controlled group chart. Branches request accounts; only Group Finance can create or edit them.",
          "شجرة حسابات موحدة ومضبوطة. الفروع تطلب الحسابات، والمالية المركزية وحدها تنشئها أو تعدّلها.",
        )}
        meta={[
          <Pill key="p" tone={canEdit ? "success" : "warning"}>
            {canEdit
              ? t("You can edit the master chart", "يمكنك تعديل الشجرة")
              : t("Read-only — you can request new accounts", "قراءة فقط — يمكنك طلب حسابات")}
          </Pill>,
        ]}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>{t("Request new account", "طلب حساب جديد")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("Request a new account", "طلب حساب جديد")}</DialogTitle>
                <DialogDescription>
                  {t(
                    "Branch accountants cannot create accounts directly. Group Finance reviews every request.",
                    "لا يستطيع محاسبو الفروع إنشاء الحسابات مباشرة. المالية المركزية تراجع كل طلب.",
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t("Proposed code", "الرمز المقترح")}</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="5410"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Account name", "اسم الحساب")}</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Creator travel costs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Justification", "المبرر")}</Label>
                  <Textarea
                    value={form.justification}
                    onChange={(e) => setForm({ ...form, justification: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit}>{t("Submit request", "إرسال الطلب")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("Accounts", "الحسابات")} value={String(db.accounts.length)} tone="brand" />
        <Stat
          label={t("Active", "نشطة")}
          value={String(db.accounts.filter((a) => a.active).length)}
          tone="success"
        />
        <Stat
          label={t("Pending requests", "طلبات معلقة")}
          value={String(db.coaRequests.filter((r) => r.status === "Pending Review").length)}
          tone="warning"
        />
        <Stat
          label={t("Rejected requests", "طلبات مرفوضة")}
          value={String(db.coaRequests.filter((r) => r.status === "Rejected").length)}
          tone="danger"
        />
      </div>
      <ChartRow>
        <ShareChartCard
          title={t("Accounts by type", "الحسابات حسب النوع")}
          data={countBy(db.accounts, (a) => a.type)}
        />
        <BarChartCard
          title={t("Accounts by category", "الحسابات حسب الفئة")}
          data={countBy(db.accounts, (a) => a.category)}
          horizontal
          colorful
        />
        <ShareChartCard
          title={t("Request status", "حالة الطلبات")}
          data={countBy(db.coaRequests, (r) => r.status)}
        />
      </ChartRow>
      <Section title={t("Account requests", "طلبات الحسابات")}>
        <DataTable
          rows={db.coaRequests}
          columns={requestCols}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.code} ${r.name}`}
          exportName="trygc-coa-requests"
          pageSize={8}
        />
      </Section>
      <Section title={t("Group chart of accounts", "شجرة حسابات المجموعة")}>
        <DataTable
          rows={db.accounts}
          columns={accountCols}
          rowKey={(r) => r.code}
          searchable={(r) => `${r.code} ${r.name} ${r.type}`}
          exportName="trygc-coa"
          pageSize={15}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/finance/coa")({
  head: () => ({
    meta: [
      { title: "Chart of Accounts | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Controlled group chart of accounts with branch request workflow and Group Finance approval.",
      },
      { property: "og:title", content: "Chart of Accounts | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Controlled group chart with request-and-approve governance.",
      },
    ],
  }),
  component: Coa,
});
