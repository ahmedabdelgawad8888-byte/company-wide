import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

export type ExportKind = "csv" | "pdf";
export type JobStatus = "queued" | "running" | "ready" | "failed";

export interface ExportJob {
  id: string;
  title: string;
  kind: ExportKind;
  rows: number;
  columns: number;
  filters: string;
  status: JobStatus;
  progress: number;
  createdAt: string;
  finishedAt?: string;
  url?: string;
  filename?: string;
  error?: string;
}

export interface ExportRequest {
  title: string;
  kind: ExportKind;
  rows: number;
  columns: number;
  filters: string;
  filename: string;
  /** builds the file content; runs once the job reaches 100% */
  build: () => string;
}

interface Ctx {
  jobs: ExportJob[];
  active: number;
  enqueue: (req: ExportRequest) => string;
  open: (job: ExportJob) => void;
  clearFinished: () => void;
}

const ExportQueueContext = createContext<Ctx | null>(null);

let n = 0;
const jobId = () => `xq${++n}`;

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export function ExportQueueProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const patch = useCallback((id: string, p: Partial<ExportJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...p } : j)));
  }, []);

  const open = useCallback((job: ExportJob) => {
    if (!job.url || !job.filename) return;
    if (job.kind === "pdf") {
      const win = window.open(job.url, "_blank");
      if (win) setTimeout(() => win.print(), 600);
    } else {
      download(job.url, job.filename);
    }
  }, []);

  const enqueue = useCallback(
    (req: ExportRequest) => {
      const id = jobId();
      const job: ExportJob = {
        id,
        title: req.title,
        kind: req.kind,
        rows: req.rows,
        columns: req.columns,
        filters: req.filters,
        status: "queued",
        progress: 0,
        createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      };
      setJobs((prev) => [job, ...prev].slice(0, 25));

      // Large jobs take longer — progress reflects the row volume being written.
      const steps = Math.max(6, Math.min(30, Math.ceil(req.rows / 25) + 6));
      let step = 0;
      timers.current[id] = setInterval(() => {
        step += 1;
        const pct = Math.min(96, Math.round((step / steps) * 100));
        patch(id, { status: "running", progress: pct });
        if (step >= steps) {
          clearInterval(timers.current[id]!);
          delete timers.current[id];
          try {
            const content = req.build();
            const type = req.kind === "csv" ? "text/csv;charset=utf-8" : "text/html;charset=utf-8";
            const url = URL.createObjectURL(new Blob([content], { type }));
            const finished: ExportJob = {
              ...job,
              status: "ready",
              progress: 100,
              url,
              filename: req.filename,
              finishedAt: new Date().toISOString().slice(11, 19),
            };
            patch(id, finished);
            toast.success(`${req.title} — ${req.kind.toUpperCase()} ready`, {
              description: `${req.rows} records · ${req.filters}`,
              action: {
                label: req.kind === "pdf" ? "Open" : "Download",
                onClick: () => open(finished),
              },
              duration: 10000,
            });
          } catch (e) {
            patch(id, { status: "failed", progress: 100, error: (e as Error).message });
            toast.error(`${req.title} export failed`);
          }
        }
      }, 90);

      return id;
    },
    [patch, open],
  );

  const value = useMemo<Ctx>(
    () => ({
      jobs,
      active: jobs.filter((j) => j.status === "queued" || j.status === "running").length,
      enqueue,
      open,
      clearFinished: () =>
        setJobs((prev) => prev.filter((j) => j.status === "queued" || j.status === "running")),
    }),
    [jobs, enqueue, open],
  );

  return <ExportQueueContext.Provider value={value}>{children}</ExportQueueContext.Provider>;
}

export function useExportQueue(): Ctx {
  const ctx = useContext(ExportQueueContext);
  if (!ctx) throw new Error("useExportQueue must be used inside ExportQueueProvider");
  return ctx;
}
