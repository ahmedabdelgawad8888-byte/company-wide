import { useMemo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  CircleAlert,
  Clock,
  Download,
  Info,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "../../components/ui/button";
import { Pill } from "../../components/kit";
import {
  CHART_AXIS,
  CHART_CURSOR,
  CHART_GRID,
  CHART_PALETTE,
  CHART_TOOLTIP,
  CHART_TOOLTIP_LABEL,
} from "../../components/charts";
import { exportTableCsv } from "./agent-export";
import type { RenderPayload } from "./agent-runtime";

const compact = (value: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);

const severityIcon: Record<string, typeof Clock> = {
  Escalate: TriangleAlert,
  Overdue: CircleAlert,
  "Due soon": Clock,
};

/** Renders a tool result as real interface rather than a wall of JSON. */
export function AgentBlock({ payload }: { payload: RenderPayload }) {
  switch (payload.kind) {
    case "metrics":
      return (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
          {payload.tiles.map((tile) => (
            <div key={tile.label} className="bg-card p-3">
              <p className="text-xs text-muted-foreground">{tile.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{tile.value}</p>
              {tile.hint ? <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p> : null}
            </div>
          ))}
        </div>
      );

    case "chart": {
      if (!payload.data.some((point) => point.value > 0)) {
        return (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No values to chart.
          </p>
        );
      }
      return (
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium">{payload.title}</p>
          <p className="text-xs text-muted-foreground">Measured in {payload.unit}.</p>
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {payload.variant === "donut" ? (
                <PieChart>
                  <Pie
                    data={payload.data}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="52%"
                    outerRadius="78%"
                  >
                    {payload.data.map((point, index) => (
                      <Cell key={point.label} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP} labelStyle={CHART_TOOLTIP_LABEL} />
                </PieChart>
              ) : (
                <BarChart
                  data={payload.data}
                  layout="vertical"
                  margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
                  barCategoryGap={8}
                >
                  <CartesianGrid {...CHART_GRID} horizontal={false} />
                  <XAxis type="number" tickFormatter={compact} {...CHART_AXIS} />
                  <YAxis type="category" dataKey="label" width={112} {...CHART_AXIS} />
                  <Tooltip
                    cursor={CHART_CURSOR}
                    contentStyle={CHART_TOOLTIP}
                    labelStyle={CHART_TOOLTIP_LABEL}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={20}>
                    {payload.data.map((point, index) => (
                      <Cell key={point.label} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    case "table": {
      if (!payload.rows.length) {
        return (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No matching records.
          </p>
        );
      }
      return (
        <div className="rounded-lg border">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
            <p className="text-xs text-muted-foreground">
              {payload.rows.length} {payload.rows.length === 1 ? "record" : "records"}
            </p>
            <Button variant="ghost" size="sm" onClick={() => exportTableCsv(payload)}>
              <Download className="size-3.5" aria-hidden="true" /> CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  {payload.columns.map((column) => (
                    <th key={column} className="p-3 text-start font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payload.rows.map((row, rowIndex) => (
                  <tr key={payload.ids[rowIndex] ?? rowIndex} className="border-t">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${payload.columns[cellIndex]}-${cellIndex}`}
                        className="p-3 whitespace-nowrap"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    case "record":
      return (
        <div className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{payload.title}</p>
              {payload.subtitle ? (
                <p className="text-xs text-muted-foreground">{payload.subtitle}</p>
              ) : null}
            </div>
            {payload.href ? (
              <Link
                to={payload.href as never}
                className="inline-flex shrink-0 items-center gap-1 text-xs underline-offset-4 hover:underline"
              >
                Open <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {payload.fields.map((field) => (
              <div key={field.label}>
                <dt className="text-xs text-muted-foreground">{field.label}</dt>
                <dd className="text-sm font-medium tabular-nums">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      );

    case "exceptions":
      if (!payload.items.length) {
        return (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Nothing is breaching right now.
          </p>
        );
      }
      return (
        <div className="divide-y overflow-hidden rounded-lg border">
          {payload.items.map((item) => {
            const Icon = severityIcon[item.severity] ?? Clock;
            return (
              <Link
                key={`${item.title}-${item.href}-${item.detail}`}
                to={item.href as never}
                className="flex items-center justify-between gap-3 p-3 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex min-w-0 items-start gap-2">
                  <Icon
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.detail}
                    </span>
                  </span>
                </span>
                <Pill tone={item.severity === "Due soon" ? "warning" : "danger"}>
                  {item.severity}
                </Pill>
              </Link>
            );
          })}
        </div>
      );

    case "navigate":
      return (
        <p className="text-sm text-muted-foreground">
          Opened <span className="font-medium text-foreground">{payload.path}</span>.
        </p>
      );

    default:
      return null;
  }
}

export type AgentMessageSegment =
  | { type: "block"; payload: RenderPayload }
  | { type: "code"; lang?: string; code: string }
  | { type: "markdown"; content: string };

interface RawChartPoint {
  label?: unknown;
  name?: unknown;
  value?: unknown;
  count?: unknown;
}

interface RawMetricTile {
  label?: unknown;
  title?: unknown;
  value?: unknown;
  amount?: unknown;
  hint?: unknown;
}

interface RawBlockData {
  kind?: unknown;
  variant?: unknown;
  title?: unknown;
  unit?: unknown;
  data?: unknown;
  tiles?: unknown;
  columns?: unknown;
  rows?: unknown;
  ids?: unknown;
  items?: unknown;
}

export function parseAgentMessage(text: string): AgentMessageSegment[] {
  if (!text) return [];
  const segments: AgentMessageSegment[] = [];
  const fenceRegex = /```(?:([a-zA-Z0-9_\-:]+)\n)?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(text)) !== null) {
    const preText = text.slice(lastIndex, match.index).trim();
    if (preText) segments.push({ type: "markdown", content: preText });
    const matchText = match[0] ?? "";
    lastIndex = match.index + matchText.length;

    const lang = (match[1] ?? "").toLowerCase().trim();
    const rawCode = (match[2] ?? "").trim();

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(rawCode);
    } catch {
      parsed = null;
    }

    if (parsed && typeof parsed === "object") {
      const obj = parsed as RawBlockData;
      const dataArray = Array.isArray(obj.data) ? (obj.data as RawChartPoint[]) : null;
      if (
        lang === "json:chart" ||
        lang === "chart" ||
        (Boolean(obj.variant) && Boolean(dataArray)) ||
        (obj.kind === "chart" && Boolean(dataArray))
      ) {
        segments.push({
          type: "block",
          payload: {
            kind: "chart",
            variant: obj.variant === "donut" ? "donut" : "bar",
            title: typeof obj.title === "string" ? obj.title : "Distribution Overview",
            unit: typeof obj.unit === "string" ? obj.unit : "records",
            data: (dataArray ?? []).map((d) => ({
              label: String(d.label ?? d.name ?? "Item"),
              value: Number(d.value ?? d.count ?? 0),
            })),
          },
        });
        continue;
      }

      const tilesArray = Array.isArray(obj.tiles) ? (obj.tiles as RawMetricTile[]) : null;
      if (
        lang === "json:metrics" ||
        lang === "metrics" ||
        Boolean(tilesArray) ||
        obj.kind === "metrics"
      ) {
        segments.push({
          type: "block",
          payload: {
            kind: "metrics",
            tiles: (tilesArray ?? []).map((t) => ({
              label: String(t.label ?? t.title ?? "Metric"),
              value: String(t.value ?? t.amount ?? "0"),
              ...(typeof t.hint === "string" && t.hint ? { hint: t.hint } : {}),
            })),
          },
        });
        continue;
      }

      const colsArray = Array.isArray(obj.columns) ? obj.columns : null;
      const rowsArray = Array.isArray(obj.rows) ? obj.rows : null;
      if (
        lang === "json:table" ||
        lang === "table" ||
        (Boolean(colsArray) && Boolean(rowsArray)) ||
        obj.kind === "table"
      ) {
        const rows = (rowsArray ?? []).map((row) =>
          Array.isArray(row)
            ? row.map(String)
            : typeof row === "object" && row
              ? Object.values(row as Record<string, unknown>).map(String)
              : [],
        );
        segments.push({
          type: "block",
          payload: {
            kind: "table",
            columns: (colsArray ?? []).map(String),
            rows,
            ids: Array.isArray(obj.ids)
              ? (obj.ids as unknown[]).map(String)
              : rows.map((_, i) => String(i)),
          },
        });
        continue;
      }

      if (lang === "json:exceptions" || lang === "exceptions" || obj.kind === "exceptions") {
        segments.push({
          type: "block",
          payload: {
            kind: "exceptions",
            items: Array.isArray(obj.items)
              ? (obj.items as Array<{
                  title: string;
                  detail: string;
                  severity: string;
                  href: string;
                }>)
              : [],
          },
        });
        continue;
      }
    }

    segments.push({ type: "code", lang, code: rawCode });
  }

  const postText = text.slice(lastIndex).trim();
  if (postText) segments.push({ type: "markdown", content: postText });
  return segments;
}

function formatInlineText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `tok-${lastIndex}-${match.index}`;
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={key} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={key} className="italic text-foreground/90">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={key}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function MarkdownBlock({ content }: { content: string }) {
  const chunks = content.split(/\n{2,}/);

  return (
    <div className="space-y-3">
      {chunks.map((chunk, chunkIndex) => {
        const trimmed = chunk.trim();
        if (!trimmed) return null;

        // Markdown Table detection
        const lines = trimmed.split("\n").map((l) => l.trim());
        if (
          lines.length >= 2 &&
          lines[0]?.startsWith("|") &&
          lines[0]?.endsWith("|") &&
          /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(lines[1] ?? "")
        ) {
          const parseRow = (line: string) =>
            line
              .split("|")
              .map((s) => s.trim())
              .filter((s, idx, arr) => (idx === 0 || idx === arr.length - 1 ? s !== "" : true));
          const columns = parseRow(lines[0] ?? "");
          const rows = lines
            .slice(2)
            .map(parseRow)
            .filter((r) => r.length > 0);
          if (columns.length > 0 && rows.length > 0) {
            return (
              <div
                key={chunkIndex}
                className="my-3 overflow-hidden rounded-xl border bg-card p-1 shadow-xs"
              >
                <AgentBlock
                  payload={{
                    kind: "table",
                    columns,
                    rows,
                    ids: rows.map((_, i) => String(i)),
                  }}
                />
              </div>
            );
          }
        }

        // Headings
        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={chunkIndex}
              className="mt-4 mb-1 flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
            >
              <Info className="size-3.5 text-primary" aria-hidden="true" />
              {formatInlineText(trimmed.replace(/^###\s+/, ""))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={chunkIndex}
              className="mt-5 mb-2 flex items-center gap-2 border-b border-border/60 pb-1 text-base font-semibold tracking-tight text-foreground"
            >
              <TrendingUp className="size-4 text-primary" aria-hidden="true" />
              {formatInlineText(trimmed.replace(/^##\s+/, ""))}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2
              key={chunkIndex}
              className="mt-6 mb-3 flex items-center gap-2 text-lg font-bold tracking-tight text-foreground"
            >
              <Sparkles className="size-4.5 text-primary" aria-hidden="true" />
              {formatInlineText(trimmed.replace(/^#\s+/, ""))}
            </h2>
          );
        }

        // Blockquote
        if (trimmed.startsWith("> ")) {
          const text = trimmed.replace(/^>\s?/gm, "");
          return (
            <blockquote
              key={chunkIndex}
              className="my-2.5 rounded-e-lg border-s-4 border-primary bg-muted/30 px-3.5 py-2.5 text-sm italic text-foreground/90"
            >
              {formatInlineText(text)}
            </blockquote>
          );
        }

        // Bullet Lists
        if (lines.every((l) => /^[-*]\s+/.test(l))) {
          return (
            <ul key={chunkIndex} className="my-2 space-y-1.5 ps-1">
              {lines.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90"
                >
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  <span>{formatInlineText(item.replace(/^[-*]\s+/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }

        // Numbered Lists
        if (lines.every((l) => /^\d+\.\s+/.test(l))) {
          return (
            <ol key={chunkIndex} className="my-2 space-y-2 ps-1">
              {lines.map((item, idx) => {
                const numMatch = item.match(/^(\d+)\.\s+/);
                const num =
                  numMatch && typeof numMatch[1] === "string" ? numMatch[1] : String(idx + 1);
                return (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90"
                  >
                    <span className="inline-grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {num}
                    </span>
                    <span className="pt-0.5">
                      {formatInlineText(item.replace(/^\d+\.\s+/, ""))}
                    </span>
                  </li>
                );
              })}
            </ol>
          );
        }

        // Default paragraph
        return (
          <p key={chunkIndex} className="leading-relaxed text-foreground/90">
            {formatInlineText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export function AgentMessageRenderer({ content }: { content: string }) {
  const segments = useMemo(() => parseAgentMessage(content), [content]);

  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {segments.map((segment, index) => {
        if (segment.type === "block") {
          return (
            <div
              key={index}
              className="my-3 overflow-hidden rounded-xl border bg-card p-1 shadow-xs"
            >
              <AgentBlock payload={segment.payload} />
            </div>
          );
        }
        if (segment.type === "code") {
          return (
            <pre
              key={index}
              className="my-2 overflow-x-auto rounded-lg border bg-muted/60 p-3 font-mono text-xs"
            >
              <code>{segment.code}</code>
            </pre>
          );
        }
        return <MarkdownBlock key={index} content={segment.content} />;
      })}
    </div>
  );
}
