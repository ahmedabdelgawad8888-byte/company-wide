import { ChevronRight, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useDrill } from "@/lib/drill";
import { useLang } from "@/lib/i18n";

export function DrillPanel() {
  const { trail, panelOpen, setPanelOpen, panel, goTo, setDrill } = useDrill();
  const { t } = useLang();

  return (
    <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="text-base">{panel?.title ?? t("Drill-down", "تفصيل")}</SheetTitle>
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <button className="hover:text-foreground" onClick={() => setDrill(null)}>
              {t("All records", "كل السجلات")}
            </button>
            {trail.map((d, i) => (
              <span key={`${d.source}-${d.label}`} className="flex items-center gap-1">
                <ChevronRight className="size-3" />
                <button
                  className={
                    i === trail.length - 1 ? "font-medium text-brand" : "hover:text-foreground"
                  }
                  onClick={() => goTo(i)}
                >
                  {d.source}: {d.label}
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">
              {panel
                ? `${panel.total} ${t("matching records", "سجل مطابق")}`
                : t("No table on this page", "لا يوجد جدول في هذه الصفحة")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ms-auto h-7 text-xs"
              onClick={() => setDrill(null)}
            >
              <X className="size-3" /> {t("Clear filters", "مسح الفلاتر")}
            </Button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {panel && panel.rows.length ? (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b">
                  {panel.headers.map((h) => (
                    <th
                      key={h}
                      className="px-2 py-2 text-start font-semibold tracking-wide text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {panel.rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {r.map((c, j) => (
                      <td key={j} className="px-2 py-2 align-top">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("No records match this segment.", "لا توجد سجلات مطابقة لهذا الجزء.")}
            </p>
          )}
          {panel && panel.total > panel.rows.length ? (
            <p className="pt-3 text-center text-xs text-muted-foreground">
              {t("Showing first", "عرض أول")} {panel.rows.length} {t("of", "من")} {panel.total}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
