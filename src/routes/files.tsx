import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, FileText, Folder, Image as ImageIcon, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Pill, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { shortDate } from "@/lib/format";
import type { CorporateFile } from "@/lib/types";

const icon = (kind: CorporateFile["kind"]) => {
  if (kind === "folder") return <Folder className="size-4 text-brand" />;
  if (kind === "sheet") return <FileSpreadsheet className="size-4 text-success" />;
  if (kind === "image") return <ImageIcon className="size-4 text-orange" />;
  return <FileText className="size-4 text-muted-foreground" />;
};

function Files() {
  const { db, inScope, entityName } = useApp();
  const { t } = useLang();
  const all = inScope(db.files).filter((f) => f.path.startsWith("/Data Analysis"));
  const [path, setPath] = useState("/");
  const folders = useMemo(() => [...new Set(all.map((f) => f.path))].sort(), [all]);
  const rows = path === "/" ? all : all.filter((f) => f.path.startsWith(path));

  const columns: Column<CorporateFile>[] = [
    {
      key: "name",
      header: t("File", "الملف"),
      render: (r) => (
        <div className="flex items-center gap-2">
          {icon(r.kind)}
          <span className="font-medium">{r.name}</span>
        </div>
      ),
      sortValue: (r) => r.name,
    },
    {
      key: "path",
      header: t("Data area", "مسار البيانات"),
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.path.replace("/Data Analysis/", "")}
        </span>
      ),
      sortValue: (r) => r.path,
    },
    {
      key: "entity",
      header: t("Entity", "الكيان"),
      render: (r) => entityName(r.entityId),
      sortValue: (r) => entityName(r.entityId),
    },
    {
      key: "owner",
      header: t("Owner", "المسؤول"),
      render: (r) => r.owner,
      sortValue: (r) => r.owner,
    },
    {
      key: "size",
      header: t("Size", "الحجم"),
      render: (r) => <span className="num text-xs">{r.size}</span>,
    },
    {
      key: "updated",
      header: t("Updated", "آخر تحديث"),
      render: (r) => shortDate(r.updatedAt),
      sortValue: (r) => r.updatedAt,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Data Files", "ملفات البيانات")}
        subtitle={t(
          "Working datasets, definitions, reconciliations and published insight packs used by the Data Analysis workspace. No campaign or Finance document clutter.",
          "ملفات العمل الخاصة بالبيانات والتعريفات والمطابقات والتقارير المنشورة لمساحة تحليل البيانات فقط، بدون تشتيت من ملفات الحملات أو الحسابات.",
        )}
        meta={[
          <Pill key="a" tone="brand">
            {t("Data workspace only", "خاص بمساحة البيانات")}
          </Pill>,
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("Working files", "ملفات العمل")} value={String(all.length)} tone="brand" />
        <Stat label={t("Data areas", "مسارات البيانات")} value={String(folders.length)} />
        <Stat
          label={t("Updated today", "تم تحديثها اليوم")}
          value={String(all.filter((f) => f.updatedAt === "2026-09-06").length)}
          tone="success"
        />
      </div>
      <Section
        title={t("Analysis library", "مكتبة التحليل")}
        description={t(
          "Choose a data area, then search by file or owner.",
          "اختر مسار البيانات ثم ابحث بالملف أو المسؤول.",
        )}
      >
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={path === "/" ? "default" : "outline"}
            onClick={() => setPath("/")}
          >
            {t("All data files", "كل ملفات البيانات")}
          </Button>
          {folders.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={path === f ? "default" : "outline"}
              onClick={() => setPath(f)}
              className="gap-1"
            >
              <ChevronRight className="size-3" />
              {f.replace("/Data Analysis/", "")}
            </Button>
          ))}
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.name} ${r.path} ${r.owner}`}
          exportName="trygc-data-files"
          pageSize={12}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/files")({
  head: () => ({
    meta: [
      { title: "Data Files | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "Data Analysis workspace library for datasets, definitions, reconciliations and published reports.",
      },
    ],
  }),
  component: Files,
});
