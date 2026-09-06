import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Download,
  FileText,
  Lock,
  PanelRightOpen,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { useDrill } from "@/lib/drill";
import { useExportPrefs } from "@/lib/export-prefs";
import { useExportQueue } from "@/lib/export-queue";
import { ExportPreferencesPanel } from "@/components/export-preferences";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  defaultHidden?: boolean;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchable?: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  bulkActions?: (selected: string[], clear: () => void) => ReactNode;
  toolbar?: ReactNode;
  pageSize?: number;
  emptyMessage?: string;
  exportName?: string;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchable,
  onRowClick,
  selectable,
  bulkActions,
  toolbar,
  pageSize = 12,
  emptyMessage = "No records match the current filters.",
  exportName = "export",
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [hidden, setHidden] = useState<string[]>(
    columns.filter((c) => c.defaultHidden).map((c) => c.key),
  );
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const { can, log, currentUser } = useApp();
  const canExport = can("export");
  const { drill, trail, setDrill, registerPanel, setPanelOpen } = useDrill();
  const { prefs, bounds } = useExportPrefs();
  const { enqueue } = useExportQueue();

  const visible = columns.filter((c) => !hidden.includes(c.key));

  // Column used for the shared export date range, when the table has one.
  const dateCol = columns.find(
    (c) => /date|due|deadline|at$|issued|paid/i.test(c.key) && c.sortValue,
  );

  const rowText = (r: T) =>
    `${searchable ? searchable(r) : ""} ${columns.map((c) => (c.sortValue ? c.sortValue(r) : "")).join(" ")}`.toLowerCase();

  const inRange = useMemo(() => {
    if (!bounds || !dateCol?.sortValue) return (_r: T) => true;
    return (r: T) => {
      const v = String(dateCol.sortValue!(r)).slice(0, 10);
      return v >= bounds.from && v <= bounds.to;
    };
  }, [bounds, dateCol]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const d = drill?.label.toLowerCase();
    return rows.filter((r) => {
      if (!inRange(r)) return false;
      if (q && searchable && !searchable(r).toLowerCase().includes(q)) return false;
      if (d && !rowText(r).includes(d)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, searchable, drill, inRange, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(current * pageSize, current * pageSize + pageSize);

  // Feed the right-side drill-down panel with the currently filtered records.
  useEffect(() => {
    if (!drill) {
      registerPanel(null);
      return;
    }
    registerPanel({
      title: exportName
        .replace(/^trygc-?/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase()),
      headers: visible.slice(0, 4).map((c) => c.header),
      rows: sorted
        .slice(0, 50)
        .map((r) => visible.slice(0, 4).map((c) => String(c.sortValue ? c.sortValue(r) : ""))),
      total: sorted.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill, sorted]);

  const brandTitle =
    exportName
      .replace(/^trygc-?/, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase()) || "Export";
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const fileBase = `trygc-finance-sales-hub-${exportName.replace(/^trygc-?/, "")}`;

  const exportCols = prefs.columns === "all" ? columns : visible;
  const exportRows = prefs.applyFilters ? sorted : rows.filter(inRange);

  const filterSummary = [
    bounds ? `${bounds.from} → ${bounds.to}` : "all time",
    prefs.applyFilters
      ? drill
        ? `${drill.source}: ${drill.label}`
        : query.trim()
          ? `search “${query.trim()}”`
          : "page filters applied"
      : "filters ignored",
    `${exportCols.length} columns`,
  ].join(" · ");

  // Every download is written to the immutable audit trail with its filter context.
  const auditExport = (kind: "CSV" | "PDF") =>
    log({
      action: `Export ${kind}`,
      module: "Exports",
      recordId: exportName,
      recordLabel: `${brandTitle} — ${exportRows.length} rows`,
      entityId: currentUser.entityId,
      from: filterSummary,
      to: exportCols.map((c) => c.header).join(", "),
    });

  const buildCsv = () => {
    const head = exportCols.map((c) => `"${c.header}"`).join(",");
    const body = exportRows
      .map((r) =>
        exportCols
          .map((c) => {
            const v = c.sortValue ? c.sortValue(r) : "";
            return `"${String(v).replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");
    const rangeLine = bounds
      ? `"Date range ${bounds.from} to ${bounds.to}"`
      : `"Date range: all time"`;
    const filterLine = `"Filters ${prefs.applyFilters ? "applied" : "ignored"}${prefs.applyFilters && drill ? ` — ${drill.source}: ${drill.label}` : ""}"`;
    const banner = prefs.branding
      ? [
          `"TryGC Workspace Hub"`,
          `"${brandTitle}"`,
          `"Generated ${stamp} UTC"`,
          rangeLine,
          filterLine,
          `""`,
        ].join("\n")
      : "";
    return `${banner ? `${banner}\n` : ""}${head}\n${body}`;
  };

  const buildPdf = () => {
    const esc = (s: unknown) =>
      String(s ?? "").replace(
        /[&<>]/g,
        (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m] as string,
      );
    const head = exportCols.map((c) => `<th>${esc(c.header)}</th>`).join("");
    const body = exportRows
      .map(
        (r) =>
          `<tr>${exportCols.map((c) => `<td>${esc(c.sortValue ? c.sortValue(r) : "")}</td>`).join("")}</tr>`,
      )
      .join("");
    return `<!doctype html><html><head><title>TryGC Workspace Hub — ${esc(brandTitle)}</title><style>
      *{font-family:ui-sans-serif,system-ui,Segoe UI,Arial,sans-serif}
      body{margin:32px;color:#141824}
      header{display:flex;align-items:center;gap:12px;border-bottom:3px solid #FF7A18;padding-bottom:12px;margin-bottom:20px}
      header img{height:36px}
      .brand{font-size:18px;font-weight:700;letter-spacing:-0.01em}
      .sub{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#7B3FF2;font-weight:600}
      h1{font-size:15px;margin:0 0 4px}
      .meta{font-size:11px;color:#666;margin-bottom:14px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{text-align:left;background:#f4f4f7;padding:6px 8px;border-bottom:1px solid #ddd}
      td{padding:5px 8px;border-bottom:1px solid #eee}
      footer{margin-top:18px;font-size:10px;color:#888}
      @media print{body{margin:14mm}}
    </style></head><body>
      ${prefs.branding ? `<header><img src="${window.location.origin}/favicon.png" alt="Trygc" /><div><div class="brand">Trygc</div><div class="sub">Workspace Hub</div></div></header>` : ""}
      <h1>${esc(brandTitle)}</h1>
      <div class="meta">Generated ${esc(stamp)} UTC · ${exportRows.length} records · ${esc(filterSummary)}</div>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <footer>TryGC Workspace Hub — confidential internal report.</footer>
    </body></html>`;
  };

  const queueExport = (kind: "csv" | "pdf") => {
    auditExport(kind === "csv" ? "CSV" : "PDF");
    enqueue({
      title: brandTitle,
      kind,
      rows: exportRows.length,
      columns: exportCols.length,
      filters: filterSummary,
      filename: `${fileBase}.${kind === "csv" ? "csv" : "html"}`,
      build: kind === "csv" ? buildCsv : buildPdf,
    });
  };

  const toggleSort = (key: string) =>
    setSort((prev) =>
      prev?.key !== key ? { key, dir: "asc" } : prev.dir === "asc" ? { key, dir: "desc" } : null,
    );

  const allChecked = pageRows.length > 0 && pageRows.every((r) => selected.includes(rowKey(r)));

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {searchable ? (
          <div className="relative min-w-56 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search records…"
              className="pl-8"
            />
          </div>
        ) : null}
        {toolbar}
        <div className="ms-auto flex items-center gap-2">
          {selectable && selected.length > 0 ? (
            <div className="flex items-center gap-2 rounded-md bg-brand-soft px-2 py-1 text-xs font-medium text-brand">
              {selected.length} selected
              {bulkActions?.(selected, () => setSelected([]))}
            </div>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="size-4" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              {columns.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={!hidden.includes(c.key)}
                  onCheckedChange={(v) =>
                    setHidden((prev) => (v ? prev.filter((k) => k !== c.key) : [...prev, c.key]))
                  }
                >
                  {c.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {canExport ? (
            <>
              <ExportPreferencesPanel compact />
              <Button variant="outline" size="sm" onClick={() => queueExport("csv")}>
                <Download className="size-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => queueExport("pdf")}>
                <FileText className="size-4" /> PDF
              </Button>
            </>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground"
              title="Your role cannot download records"
            >
              <Lock className="size-3.5" /> Export restricted
            </span>
          )}
        </div>
      </div>

      {drill ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-brand-soft px-3 py-1.5 text-xs text-brand">
          {trail.map((d, i) => (
            <span key={`${d.source}-${d.label}`} className="flex items-center gap-1">
              {i > 0 ? <span className="opacity-50">/</span> : null}
              <span className="font-medium">{d.source}:</span>
              <span>{d.label}</span>
            </span>
          ))}
          <button
            onClick={() => setPanelOpen(true)}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-background/60"
          >
            <PanelRightOpen className="size-3" /> Open panel
          </button>
          <button
            onClick={() => setDrill(null)}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-background/60"
            aria-label="Clear chart filter"
          >
            <X className="size-3" /> Clear
          </button>
        </div>
      ) : null}

      <div className="w-full overflow-x-auto rounded-xl border bg-card shadow-[var(--shadow-panel)]">
        <table className="w-full min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            <tr className="border-b">
              {selectable ? (
                <th className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(v) =>
                      setSelected((prev) =>
                        v
                          ? Array.from(new Set([...prev, ...pageRows.map(rowKey)]))
                          : prev.filter((id) => !pageRows.map(rowKey).includes(id)),
                      )
                    }
                    aria-label="Select page"
                  />
                </th>
              ) : null}
              {visible.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-3 py-2.5 text-start text-xs font-semibold tracking-wide text-muted-foreground uppercase",
                    c.className,
                  )}
                >
                  {c.sortValue ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort(c.key)}
                    >
                      {c.header}
                      {sort?.key === c.key ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={visible.length + (selectable ? 1 : 0)}
                  className="px-3 py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((r) => {
                const id = rowKey(r);
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    className={cn(
                      "border-b last:border-0 transition-colors hover:bg-muted/40",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {selectable ? (
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.includes(id)}
                          onCheckedChange={(v) =>
                            setSelected((prev) =>
                              v ? [...prev, id] : prev.filter((s) => s !== id),
                            )
                          }
                          aria-label="Select row"
                        />
                      </td>
                    ) : null}
                    {visible.map((c) => (
                      <td key={c.key} className={cn("px-3 py-2.5 align-middle", c.className)}>
                        {c.render(r)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {sorted.length} record{sorted.length === 1 ? "" : "s"} · page {current + 1} of {pageCount}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
