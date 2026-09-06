import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useExportPrefs, type DateRangeKey } from "@/lib/export-prefs";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ExportPreferencesPanel({ compact = false }: { compact?: boolean }) {
  const { prefs, setPrefs, reset } = useExportPrefs();
  const { t } = useLang();

  const ranges: { key: DateRangeKey; label: string }[] = [
    { key: "all", label: t("All time", "كل الفترات") },
    { key: "30d", label: t("Last 30 days", "آخر 30 يوم") },
    { key: "90d", label: t("Last 90 days", "آخر 90 يوم") },
    { key: "ytd", label: t("Year to date", "منذ بداية العام") },
    { key: "custom", label: t("Custom", "مخصص") },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title={t("Export preferences", "تفضيلات التصدير")}>
          <SlidersHorizontal className="size-4" />
          {compact ? null : t("Export settings", "إعدادات التصدير")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Export preferences", "تفضيلات التصدير")}</DialogTitle>
          <DialogDescription>
            {t(
              "These settings apply to every CSV and PDF download across TryGC Workspace Hub.",
              "تُطبق هذه الإعدادات على كل ملفات CSV و PDF في جميع الصفحات.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>{t("Date range", "النطاق الزمني")}</Label>
            <div className="flex flex-wrap gap-2">
              {ranges.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setPrefs({ range: r.key })}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    prefs.range === r.key
                      ? "border-primary bg-brand-soft text-brand"
                      : "hover:bg-muted",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {prefs.range === "custom" ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Input
                  type="date"
                  value={prefs.from}
                  onChange={(e) => setPrefs({ from: e.target.value })}
                />
                <Input
                  type="date"
                  value={prefs.to}
                  onChange={(e) => setPrefs({ to: e.target.value })}
                />
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {t(
                "Applied to the date column of each table when one exists.",
                "يُطبق على عمود التاريخ في كل جدول إن وُجد.",
              )}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>{t("Apply page filters", "تطبيق فلاتر الصفحة")}</Label>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Search and chart drill-downs carry into the file.",
                  "يشمل الملف البحث والتصفية من الرسوم.",
                )}
              </p>
            </div>
            <Switch
              checked={prefs.applyFilters}
              onCheckedChange={(v) => setPrefs({ applyFilters: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>{t("Only selected columns", "الأعمدة المختارة فقط")}</Label>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Off exports every column, including hidden ones.",
                  "عند الإيقاف تُصدّر كل الأعمدة بما فيها المخفية.",
                )}
              </p>
            </div>
            <Switch
              checked={prefs.columns === "visible"}
              onCheckedChange={(v) => setPrefs({ columns: v ? "visible" : "all" })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>{t("TryGC Workspace Hub branding", "هوية TryGC Workspace Hub")}</Label>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Logo, title and generated timestamp on every file.",
                  "الشعار والعنوان ووقت الإصدار في كل ملف.",
                )}
              </p>
            </div>
            <Switch checked={prefs.branding} onCheckedChange={(v) => setPrefs({ branding: v })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={reset}>
            {t("Reset to defaults", "إعادة الضبط")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
