import { CheckCircle2, Download, FileText, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExportQueue } from "@/lib/export-queue";
import { useLang } from "@/lib/i18n";

export function ExportQueueButton() {
  const { jobs, active, open, clearFinished } = useExportQueue();
  const { t } = useLang();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("Export queue", "قائمة التصدير")}
        >
          {active > 0 ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {jobs.length > 0 ? (
            <Badge
              variant="secondary"
              className="absolute -end-0.5 -top-0.5 h-4 min-w-4 justify-center px-1 text-[10px]"
            >
              {active > 0 ? active : jobs.length}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-84 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">{t("Export queue", "قائمة التصدير")}</span>
          {jobs.length ? (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={clearFinished}
            >
              {t("Clear finished", "مسح المكتمل")}
            </button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-auto">
          {jobs.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              {t(
                "No export jobs yet. CSV and PDF downloads appear here with progress.",
                "لا توجد مهام تصدير بعد. ستظهر ملفات CSV و PDF هنا مع التقدم.",
              )}
            </p>
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="border-b px-3 py-2.5 last:border-0">
                <div className="flex items-center gap-2">
                  {j.kind === "csv" ? (
                    <Download className="size-3.5 text-muted-foreground" />
                  ) : (
                    <FileText className="size-3.5 text-muted-foreground" />
                  )}
                  <span className="truncate text-xs font-medium">{j.title}</span>
                  <span className="ms-auto text-[10px] text-muted-foreground uppercase">
                    {j.kind}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {j.rows} {t("records", "سجل")} · {j.filters}
                </div>
                {j.status === "ready" ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span className="text-[11px] text-muted-foreground">
                      {t("Ready", "جاهز")} {j.finishedAt}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ms-auto h-6 px-2 text-[11px]"
                      onClick={() => open(j)}
                    >
                      {j.kind === "pdf" ? t("Open", "فتح") : t("Download", "تنزيل")}
                    </Button>
                  </div>
                ) : j.status === "failed" ? (
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-destructive">
                    <TriangleAlert className="size-3.5" /> {t("Failed", "فشل")}
                  </div>
                ) : (
                  <Progress value={j.progress} className="mt-2 h-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
