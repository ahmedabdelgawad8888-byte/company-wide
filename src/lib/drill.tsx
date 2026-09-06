import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "@tanstack/react-router";

export interface Drill {
  /** the clicked chart segment label, e.g. "Riyadh" or "Overdue" */
  label: string;
  /** the chart the click came from, used for the filter chip */
  source: string;
}

export interface DrillPanelData {
  title: string;
  headers: string[];
  rows: string[][];
  total: number;
}

interface Ctx {
  drill: Drill | null;
  /** breadcrumb trail of segments visited on this page */
  trail: Drill[];
  setDrill: (d: Drill | null) => void;
  goTo: (index: number) => void;
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  panel: DrillPanelData | null;
  registerPanel: (d: DrillPanelData | null) => void;
}

const fallback: Ctx = {
  drill: null,
  trail: [],
  setDrill: () => {},
  goTo: () => {},
  panelOpen: false,
  setPanelOpen: () => {},
  panel: null,
  registerPanel: () => {},
};

const DrillContext = createContext<Ctx | null>(null);

export function DrillProvider({ children }: { children: ReactNode }) {
  const [trail, setTrail] = useState<Drill[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panel, setPanel] = useState<DrillPanelData | null>(null);
  const { pathname } = useLocation();
  const lastPanel = useRef<string>("");

  // A drill-down filter only belongs to the page it was started on.
  useEffect(() => {
    setTrail([]);
    setPanelOpen(false);
    setPanel(null);
    lastPanel.current = "";
  }, [pathname]);

  const drill = trail.length ? (trail[trail.length - 1] as Drill) : null;

  const setDrill = useCallback((d: Drill | null) => {
    if (!d) {
      setTrail([]);
      setPanelOpen(false);
      return;
    }
    setTrail((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.label === d.label && last.source === d.source) return prev.slice(0, -1);
      const sameSource = prev.filter((p) => p.source !== d.source);
      return [...sameSource, d];
    });
    setPanelOpen(true);
  }, []);

  const registerPanel = useCallback((d: DrillPanelData | null) => {
    const sig = d ? `${d.title}|${d.total}|${d.rows.length}|${d.headers.join(",")}` : "";
    if (sig === lastPanel.current) return;
    lastPanel.current = sig;
    setPanel(d);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      drill,
      trail,
      setDrill,
      goTo: (index) => {
        setTrail((prev) => prev.slice(0, index + 1));
        if (index < 0) setPanelOpen(false);
      },
      panelOpen: panelOpen && trail.length > 0,
      setPanelOpen,
      panel,
      registerPanel,
    }),
    [drill, trail, setDrill, panelOpen, panel, registerPanel],
  );

  return <DrillContext.Provider value={value}>{children}</DrillContext.Provider>;
}

export function useDrill(): Ctx {
  return useContext(DrillContext) ?? fallback;
}
