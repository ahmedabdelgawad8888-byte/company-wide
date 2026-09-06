import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type DateRangeKey = "all" | "30d" | "90d" | "ytd" | "custom";
export type ColumnsMode = "visible" | "all";

export interface ExportPrefs {
  range: DateRangeKey;
  from: string;
  to: string;
  applyFilters: boolean;
  columns: ColumnsMode;
  branding: boolean;
}

const DEFAULTS: ExportPrefs = {
  range: "all",
  from: "",
  to: "",
  applyFilters: true,
  columns: "visible",
  branding: true,
};

const KEY = "trygc.export.prefs";

interface Ctx {
  prefs: ExportPrefs;
  setPrefs: (p: Partial<ExportPrefs>) => void;
  reset: () => void;
  /** inclusive [from, to] ISO bounds derived from the chosen range, or null when unbounded */
  bounds: { from: string; to: string } | null;
}

const ExportPrefsContext = createContext<Ctx | null>(null);

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ExportPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<ExportPrefs>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<ExportPrefs>) });
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<Ctx>(() => {
    const today = new Date();
    let bounds: Ctx["bounds"] = null;
    if (prefs.range === "30d" || prefs.range === "90d") {
      const days = prefs.range === "30d" ? 30 : 90;
      const start = new Date(today.getTime() - days * 86400000);
      bounds = { from: iso(start), to: iso(today) };
    } else if (prefs.range === "ytd") {
      bounds = { from: `${today.getFullYear()}-01-01`, to: iso(today) };
    } else if (prefs.range === "custom" && (prefs.from || prefs.to)) {
      bounds = { from: prefs.from || "0000-01-01", to: prefs.to || "9999-12-31" };
    }

    return {
      prefs,
      bounds,
      setPrefs: (p) =>
        setState((prev) => {
          const next = { ...prev, ...p };
          try {
            localStorage.setItem(KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        }),
      reset: () => {
        setState(DEFAULTS);
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
      },
    };
  }, [prefs]);

  return <ExportPrefsContext.Provider value={value}>{children}</ExportPrefsContext.Provider>;
}

export function useExportPrefs() {
  const ctx = useContext(ExportPrefsContext);
  if (!ctx) throw new Error("useExportPrefs must be used inside ExportPrefsProvider");
  return ctx;
}
