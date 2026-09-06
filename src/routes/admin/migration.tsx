import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader, Panel, Pill, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { ChartRow, BarChartCard, ShareChartCard, countBy, sumBy } from "@/components/charts";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { num } from "@/lib/format";

type Batch = {
  id: string;
  source: string;
  target: string;
  records: number;
  imported: number;
  errors: number;
  status: "Mapped" | "Validated" | "Imported" | "Blocked";
  note: string;
};

function Migration() {
  const { db, can } = useApp();
  const { t } = useLang();
  const isAdmin = can("admin");

  const initial = useMemo<Batch[]>(
    () => [
      {
        id: "mg-1",
        source: "Legacy CRM export (clients.xlsx)",
        target: t("Clients", "العملاء"),
        records: db.clients.length,
        imported: db.clients.length,
        errors: 0,
        status: "Imported",
        note: t(
          "All rows matched an entity and account manager.",
          "كل الصفوف طابقت كياناً ومسؤول حساب.",
        ),
      },
      {
        id: "mg-2",
        source: "Sales pipeline sheet (deals_2025.csv)",
        target: t("Deals", "الصفقات"),
        records: db.deals.length + 12,
        imported: db.deals.length,
        errors: 12,
        status: "Blocked",
        note: t(
          "12 rows have a currency that does not match their entity.",
          "12 صفاً بعملة لا تطابق كيانها.",
        ),
      },
      {
        id: "mg-3",
        source: "Influencer master list (creators.xlsx)",
        target: t("Influencers", "صناع المحتوى"),
        records: db.influencers.length,
        imported: db.influencers.length,
        errors: 0,
        status: "Imported",
        note: t(
          "Handles de-duplicated on platform + username.",
          "أُزيلت التكرارات حسب المنصة واسم المستخدم.",
        ),
      },
      {
        id: "mg-4",
        source: "Finance ledger (invoices_q1_q3.csv)",
        target: t("Invoices", "الفواتير"),
        records: db.invoices.length + 4,
        imported: 0,
        errors: 4,
        status: "Validated",
        note: t(
          "4 invoices reference accounts that do not exist in the group chart.",
          "4 فواتير تشير إلى حسابات غير موجودة في شجرة المجموعة.",
        ),
      },
      {
        id: "mg-5",
        source: "Task tracker (asana_export.json)",
        target: t("Tasks", "المهام"),
        records: db.tasks.length,
        imported: 0,
        errors: 0,
        status: "Mapped",
        note: t(
          "Field mapping confirmed; awaiting validation run.",
          "تم تأكيد مطابقة الحقول؛ بانتظار التحقق.",
        ),
      },
    ],
    [db, t],
  );

  const [batches, setBatches] = useState<Batch[]>(initial);

  const columns: Column<Batch>[] = [
    {
      key: "source",
      header: t("Source file", "الملف المصدر"),
      render: (r) => (
        <div>
          <div className="font-medium">{r.source}</div>
          <div className="text-xs text-muted-foreground">{r.note}</div>
        </div>
      ),
      sortValue: (r) => r.source,
    },
    {
      key: "target",
      header: t("Target", "الوجهة"),
      render: (r) => <Pill tone="brand">{r.target}</Pill>,
      sortValue: (r) => r.target,
    },
    {
      key: "records",
      header: t("Rows", "الصفوف"),
      render: (r) => num(r.records),
      sortValue: (r) => r.records,
    },
    {
      key: "imported",
      header: t("Imported", "مستورد"),
      render: (r) => num(r.imported),
      sortValue: (r) => r.imported,
    },
    {
      key: "errors",
      header: t("Rejected", "مرفوض"),
      render: (r) => (
        <span className={r.errors ? "font-medium text-danger" : ""}>{num(r.errors)}</span>
      ),
      sortValue: (r) => r.errors,
    },
    {
      key: "progress",
      header: t("Progress", "التقدم"),
      render: (r) => (
        <div className="w-28">
          <Progress value={r.records ? (r.imported / r.records) * 100 : 0} />
        </div>
      ),
    },
    {
      key: "status",
      header: t("Status", "الحالة"),
      render: (r) => (
        <Pill
          tone={
            r.status === "Imported"
              ? "success"
              : r.status === "Blocked"
                ? "danger"
                : r.status === "Validated"
                  ? "warning"
                  : "neutral"
          }
        >
          {r.status}
        </Pill>
      ),
      sortValue: (r) => r.status,
    },
    {
      key: "act",
      header: "",
      render: (r) =>
        isAdmin && r.status !== "Imported" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setBatches((prev) =>
                prev.map((b) =>
                  b.id === r.id
                    ? b.status === "Mapped"
                      ? { ...b, status: "Validated" }
                      : b.errors > 0
                        ? { ...b, status: "Blocked" }
                        : { ...b, status: "Imported", imported: b.records }
                    : b,
                ),
              );
              toast[r.errors > 0 && r.status !== "Mapped" ? "error" : "success"](
                r.status === "Mapped"
                  ? t("Validation complete", "اكتمل التحقق")
                  : r.errors > 0
                    ? t("Import blocked", "الاستيراد متوقف")
                    : t("Import complete", "اكتمل الاستيراد"),
                {
                  description:
                    r.errors > 0 && r.status !== "Mapped"
                      ? t(
                          "Fix the rejected rows before importing.",
                          "صحّح الصفوف المرفوضة قبل الاستيراد.",
                        )
                      : r.source,
                },
              );
            }}
          >
            {r.status === "Mapped" ? t("Validate", "تحقق") : t("Run import", "تشغيل الاستيراد")}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  const totals = batches.reduce(
    (a, b) => ({
      rows: a.rows + b.records,
      imported: a.imported + b.imported,
      errors: a.errors + b.errors,
    }),
    { rows: 0, imported: 0, errors: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Data Migration", "ترحيل البيانات")}
        subtitle={t(
          "Bring legacy spreadsheets in safely: map fields, validate against the group rules, then import. Nothing loads until it passes validation.",
          "أدخل الجداول القديمة بأمان: طابق الحقول، تحقق من قواعد المجموعة، ثم استورد. لا شيء يُحمّل قبل اجتياز التحقق.",
        )}
        actions={
          <Button
            className="gap-1.5"
            onClick={() =>
              toast.message(t("Upload a source file", "ارفع ملف المصدر"), {
                description: t(
                  "CSV or Excel. You will map its columns before anything is imported.",
                  "CSV أو Excel. ستطابق الأعمدة قبل أي استيراد.",
                ),
              })
            }
          >
            <Upload className="size-4" />
            {t("New import", "استيراد جديد")}
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("Batches", "الدفعات")} value={String(batches.length)} tone="brand" />
        <Stat label={t("Rows in scope", "الصفوف")} value={num(totals.rows)} />
        <Stat label={t("Imported", "مستورد")} value={num(totals.imported)} tone="success" />
        <Stat
          label={t("Rejected rows", "صفوف مرفوضة")}
          value={num(totals.errors)}
          tone={totals.errors ? "danger" : "default"}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-1">
          <Section
            title={t("Validation rules", "قواعد التحقق")}
            description={t("Applied to every row before import.", "تُطبق على كل صف قبل الاستيراد.")}
          >
            <ul className="space-y-2 text-sm">
              {[
                t(
                  "Currency must match the receiving entity",
                  "يجب أن تطابق العملة الكيان المستقبل",
                ),
                t("Accounts must exist in the group chart", "يجب وجود الحسابات في شجرة المجموعة"),
                t("Every client needs an account manager", "كل عميل يحتاج مسؤول حساب"),
                t(
                  "Duplicate creators merged by platform handle",
                  "تُدمج التكرارات حسب معرّف المنصة",
                ),
                t("Dates normalised to ISO format", "توحيد التواريخ بصيغة ISO"),
              ].map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span className="text-muted-foreground">{r}</span>
                </li>
              ))}
            </ul>
          </Section>
        </Panel>
        <Panel className="min-w-0 xl:col-span-2">
          <ChartRow cols={2}>
            <BarChartCard
              title={t("Rows imported by batch", "الصفوف المستوردة لكل دفعة")}
              data={batches.map((b) => ({ name: b.target, value: b.imported }))}
              horizontal
              colorful
            />
            <BarChartCard
              title={t("Rejected rows by batch", "الصفوف المرفوضة لكل دفعة")}
              data={batches.map((b) => ({ name: b.target, value: b.errors }))}
              horizontal
            />
          </ChartRow>
          <Section title={t("Import batches", "دفعات الاستيراد")}>
            <DataTable
              rows={batches}
              columns={columns}
              rowKey={(r) => r.id}
              searchable={(r) => `${r.source} ${r.target}`}
              exportName="trygc-migration"
              pageSize={8}
            />
          </Section>
        </Panel>
      </div>
      {totals.errors > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {t(
            `${totals.errors} rows are held back because they break a group rule. They stay out of the system until corrected.`,
            `${totals.errors} صفاً محجوز لمخالفته قاعدة من قواعد المجموعة، ولن يدخل النظام حتى يُصحح.`,
          )}
        </p>
      )}
    </div>
  );
}

export const Route = createFileRoute("/admin/migration")({
  head: () => ({
    meta: [
      { title: "Data Migration | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Map, validate and import legacy spreadsheets into Trygc with group validation rules enforced before load.",
      },
      { property: "og:title", content: "Data Migration | TryGC Workspace Hub" },
      {
        property: "og:description",
        content: "Validated legacy data import with rejected-row reporting.",
      },
    ],
  }),
  component: Migration,
});
