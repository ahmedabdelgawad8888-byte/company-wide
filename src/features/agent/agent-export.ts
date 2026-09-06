import { toast } from "sonner";

import type { RenderPayload, ToolRunResult } from "./agent-runtime";
import { summarizeToolCall } from "./agent-tools";

/** Minimal CSV writer: quotes every cell, so separators and newlines survive. */
function exportRows(name: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    columns.map(cell).join(","),
    ...rows.map((row) => columns.map((column) => cell(row[column])).join(",")),
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Conversation exports. HTML is self-contained so it opens anywhere, PDF reuses
 * it through the print pipeline, and CSV flattens the transcript for a sheet.
 */

export interface ExportMessage {
  id: string;
  role: string;
  parts: unknown[];
}

export interface ExportMeta {
  provider: string;
  model: string;
  scope: string;
  currency: string;
}

interface FlatPart {
  kind: "text" | "tool";
  text?: string;
  toolName?: string;
  summary?: string;
  result?: ToolRunResult;
}

function toolStatus(result?: ToolRunResult) {
  if (!result) return "pending";
  return result.ok ? "ok" : "refused";
}

function flatten(message: ExportMessage): FlatPart[] {
  const parts: FlatPart[] = [];
  for (const raw of message.parts) {
    const part = raw as {
      type?: string;
      text?: string;
      output?: unknown;
      input?: unknown;
      state?: string;
    };
    if (part.type === "text" && part.text?.trim()) {
      parts.push({ kind: "text", text: part.text });
      continue;
    }
    if (typeof part.type === "string" && part.type.startsWith("tool-")) {
      const toolName = part.type.slice("tool-".length);
      const result = part.output as ToolRunResult | undefined;
      parts.push({
        kind: "tool",
        toolName,
        summary: summarizeToolCall(toolName, part.input),
        ...(result ? { result } : {}),
      });
    }
  }
  return parts;
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const EXPORT_CHART_PALETTE = [
  "#7c3aed",
  "#6366f1",
  "#0284c7",
  "#0d9488",
  "#16a34a",
  "#d97706",
  "#dc2626",
];

function renderPayloadHtml(payload: RenderPayload): string {
  switch (payload.kind) {
    case "metrics":
      return `<div class="tiles">${payload.tiles
        .map(
          (tile) =>
            `<div class="tile"><span class="label">${escapeHtml(tile.label)}</span><strong>${escapeHtml(tile.value)}</strong>${
              tile.hint ? `<span class="hint">${escapeHtml(tile.hint)}</span>` : ""
            }</div>`,
        )
        .join("")}</div>`;

    case "chart": {
      const data = payload.data || [];
      const maxVal = Math.max(...data.map((d) => Number(d.value) || 0), 1);
      const totalVal = data.reduce((acc, d) => acc + (Number(d.value) || 0), 0);

      if (payload.variant === "donut") {
        const segments = data
          .map((d, i) => {
            const val = Number(d.value) || 0;
            const pct = totalVal > 0 ? Math.round((val / totalVal) * 100) : 0;
            const color = EXPORT_CHART_PALETTE[i % EXPORT_CHART_PALETTE.length];
            return `<div style="width:${pct}%;background:${color};height:16px;" title="${escapeHtml(d.label)}: ${val} (${pct}%)"></div>`;
          })
          .join("");

        const legend = data
          .map((d, i) => {
            const val = Number(d.value) || 0;
            const pct = totalVal > 0 ? Math.round((val / totalVal) * 100) : 0;
            const color = EXPORT_CHART_PALETTE[i % EXPORT_CHART_PALETTE.length];
            return `<span class="legend-item"><span class="legend-dot" style="background:${color};"></span><strong>${escapeHtml(d.label)}</strong>: ${val.toLocaleString("en")} <span class="hint">(${pct}%)</span></span>`;
          })
          .join("");

        return `
          <div class="visual-chart">
            <div class="chart-header">
              <span class="chart-title">${escapeHtml(payload.title)}</span>
              <span class="chart-unit">${escapeHtml(payload.unit)}</span>
            </div>
            <div class="donut-stack">${segments}</div>
            <div class="legend-wrap">${legend}</div>
          </div>
        `;
      }

      const rows = data
        .map((d, i) => {
          const val = Number(d.value) || 0;
          const pct = Math.max(Math.round((val / maxVal) * 100), 4);
          const color = EXPORT_CHART_PALETTE[i % EXPORT_CHART_PALETTE.length];
          return `
            <div class="bar-row">
              <div class="bar-label">${escapeHtml(d.label)}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${pct}%;background:${color};">
                  <span class="bar-val">${val.toLocaleString("en")}</span>
                </div>
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="visual-chart">
          <div class="chart-header">
            <span class="chart-title">${escapeHtml(payload.title)}</span>
            <span class="chart-unit">${escapeHtml(payload.unit)}</span>
          </div>
          <div class="bar-grid">${rows}</div>
        </div>
      `;
    }

    case "table":
      return `
        <div class="table-wrap">
          <table>
            <thead><tr>${payload.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
            <tbody>${payload.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
        </div>
      `;

    case "record":
      return `<div class="record"><p class="record-title">${escapeHtml(payload.title)}</p>${
        payload.subtitle ? `<p class="hint">${escapeHtml(payload.subtitle)}</p>` : ""
      }<dl>${payload.fields
        .map(
          (field) =>
            `<div><dt>${escapeHtml(field.label)}</dt><dd>${escapeHtml(field.value)}</dd></div>`,
        )
        .join("")}</dl></div>`;

    case "exceptions":
      return `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Detail</th><th>Severity</th></tr></thead>
            <tbody>${payload.items
              .map(
                (item) =>
                  `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.detail)}</td><td><span class="badge ${item.severity === "Due soon" ? "badge-warning" : "badge-danger"}">${escapeHtml(item.severity)}</span></td></tr>`,
              )
              .join("")}</tbody>
          </table>
        </div>
      `;

    default:
      return "";
  }
}

function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  // 1. Extract fenced blocks (```json:chart ... ```, etc.)
  const fenceRegex = /```(?:([a-zA-Z0-9_\-:]+)\n)?([\s\S]*?)```/g;
  let text = markdown;
  const blockReplacements: string[] = [];

  text = text.replace(fenceRegex, (_, langTag, code) => {
    const lang = (langTag || "").toLowerCase().trim();
    const rawCode = (code || "").trim();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(rawCode);
    } catch {
      parsed = null;
    }

    if (parsed && typeof parsed === "object") {
      const obj = parsed as {
        kind?: unknown;
        variant?: unknown;
        title?: unknown;
        unit?: unknown;
        data?: unknown;
        tiles?: unknown;
        columns?: unknown;
        rows?: unknown;
      };

      const dataArray = Array.isArray(obj.data)
        ? (obj.data as Array<{ label?: unknown; name?: unknown; value?: unknown; count?: unknown }>)
        : null;

      if (
        lang === "json:chart" ||
        lang === "chart" ||
        (Boolean(obj.variant) && Boolean(dataArray)) ||
        (obj.kind === "chart" && Boolean(dataArray))
      ) {
        const placeholder = `___BLOCK_REPLACEMENT_${blockReplacements.length}___`;
        blockReplacements.push(
          renderPayloadHtml({
            kind: "chart",
            variant: obj.variant === "donut" ? "donut" : "bar",
            title: typeof obj.title === "string" ? obj.title : "Distribution Overview",
            unit: typeof obj.unit === "string" ? obj.unit : "records",
            data: (dataArray ?? []).map((d) => ({
              label: String(d.label ?? d.name ?? "Item"),
              value: Number(d.value ?? d.count ?? 0),
            })),
          }),
        );
        return `\n\n${placeholder}\n\n`;
      }

      const tilesArray = Array.isArray(obj.tiles)
        ? (obj.tiles as Array<{
            label?: unknown;
            title?: unknown;
            value?: unknown;
            amount?: unknown;
            hint?: unknown;
          }>)
        : null;

      if (
        lang === "json:metrics" ||
        lang === "metrics" ||
        Boolean(tilesArray) ||
        obj.kind === "metrics"
      ) {
        const placeholder = `___BLOCK_REPLACEMENT_${blockReplacements.length}___`;
        blockReplacements.push(
          renderPayloadHtml({
            kind: "metrics",
            tiles: (tilesArray ?? []).map((t) => ({
              label: String(t.label ?? t.title ?? "Metric"),
              value: String(t.value ?? t.amount ?? "0"),
              ...(typeof t.hint === "string" && t.hint ? { hint: t.hint } : {}),
            })),
          }),
        );
        return `\n\n${placeholder}\n\n`;
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
        const placeholder = `___BLOCK_REPLACEMENT_${blockReplacements.length}___`;
        blockReplacements.push(
          renderPayloadHtml({
            kind: "table",
            columns: (colsArray ?? []).map(String),
            rows,
            ids: rows.map((_, i) => String(i)),
          }),
        );
        return `\n\n${placeholder}\n\n`;
      }
    }

    const placeholder = `___BLOCK_REPLACEMENT_${blockReplacements.length}___`;
    blockReplacements.push(`<pre><code>${escapeHtml(rawCode)}</code></pre>`);
    return `\n\n${placeholder}\n\n`;
  });

  const formatInline = (str: string): string => {
    return escapeHtml(str)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, '<code class="code-inline">$1</code>');
  };

  const chunks = text.split(/\n{2,}/);
  const htmlChunks = chunks.map((chunk) => {
    const trimmed = chunk.trim();
    if (!trimmed) return "";

    const placeholderMatch = trimmed.match(/^___BLOCK_REPLACEMENT_(\d+)___$/);
    if (placeholderMatch) {
      const idx = Number(placeholderMatch[1]);
      return blockReplacements[idx] ?? "";
    }

    const lines = trimmed.split("\n").map((l) => l.trim());

    // Markdown table detection
    if (
      lines.length >= 2 &&
      lines[0]?.startsWith("|") &&
      lines[0]?.endsWith("|") &&
      /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(lines[1] ?? "")
    ) {
      const parseRow = (l: string) =>
        l
          .split("|")
          .map((s) => s.trim())
          .filter((s, idx, arr) => (idx === 0 || idx === arr.length - 1 ? s !== "" : true));
      const cols = parseRow(lines[0] ?? "");
      const rows = lines
        .slice(2)
        .map(parseRow)
        .filter((r) => r.length > 0);
      if (cols.length > 0 && rows.length > 0) {
        return `
          <div class="table-wrap">
            <table>
              <thead><tr>${cols.map((c) => `<th>${formatInline(c)}</th>`).join("")}</tr></thead>
              <tbody>${rows.map((r) => `<tr>${r.map((cell) => `<td>${formatInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
            </table>
          </div>
        `;
      }
    }

    const firstLine = lines[0] ?? "";
    if (firstLine.startsWith("### ")) {
      const h = `<h3>${formatInline(firstLine.replace(/^###\s+/, ""))}</h3>`;
      const rest = lines.slice(1).join("\n").trim();
      return rest ? `${h}\n<p>${formatInline(rest).replaceAll("\n", "<br />")}</p>` : h;
    }
    if (firstLine.startsWith("## ")) {
      const h = `<h2>${formatInline(firstLine.replace(/^##\s+/, ""))}</h2>`;
      const rest = lines.slice(1).join("\n").trim();
      return rest ? `${h}\n<p>${formatInline(rest).replaceAll("\n", "<br />")}</p>` : h;
    }
    if (firstLine.startsWith("# ")) {
      const h = `<h1>${formatInline(firstLine.replace(/^#\s+/, ""))}</h1>`;
      const rest = lines.slice(1).join("\n").trim();
      return rest ? `${h}\n<p>${formatInline(rest).replaceAll("\n", "<br />")}</p>` : h;
    }

    if (firstLine.startsWith("> ")) {
      const bqText = lines.map((l) => l.replace(/^>\s?/, "")).join(" ");
      return `<blockquote>${formatInline(bqText)}</blockquote>`;
    }

    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      return `<ul>${lines.map((l) => `<li>${formatInline(l.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
    }

    if (lines.every((l) => /^\d+\.\s+/.test(l))) {
      return `<ol>${lines.map((l) => `<li>${formatInline(l.replace(/^\d+\.\s+/, ""))}</li>`).join("")}</ol>`;
    }

    return `<p>${formatInline(trimmed).replaceAll("\n", "<br />")}</p>`;
  });

  return htmlChunks.filter(Boolean).join("\n");
}

export function conversationToHtml(messages: ExportMessage[], meta: ExportMeta): string {
  const body = messages
    .map((message) => {
      const parts = flatten(message);
      if (!parts.length) return "";
      const who = message.role === "user" ? "You" : "TryGC Operating Agent";
      const content = parts
        .map((part) => {
          if (part.kind === "text") return renderMarkdownToHtml(part.text ?? "");
          const result = part.result;
          let status = " · no result";
          if (result) status = result.ok ? "" : " · not applied";
          const rendered = result?.render ? renderPayloadHtml(result.render) : "";
          const message_ =
            !rendered && result?.message ? `<p class="hint">${escapeHtml(result.message)}</p>` : "";
          return `<div class="tool"><p class="tool-name">${escapeHtml(part.summary)}${escapeHtml(status)}</p>${rendered}${message_}</div>`;
        })
        .join("");
      return `<article class="${message.role === "user" ? "user" : "agent"}"><h2 class="role-label">${who}</h2>${content}</article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>TryGC Operating Intelligence Briefing — ${escapeHtml(meta.scope)}</title>
<style>
  :root {
    color-scheme: light;
    --primary: #7c3aed;
    --primary-light: #f5f3ff;
    --border: #e4e4e7;
    --muted: #71717a;
    --bg-muted: #f4f4f5;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 32px 20px;
    font: 14px/1.65 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #09090b;
    background: #f8fafc;
  }
  main {
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 36px 40px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.03);
  }
  header.doc-header {
    border-bottom: 2px solid var(--primary);
    padding-bottom: 18px;
    margin-bottom: 28px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
  }
  .brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--primary);
    background: var(--primary-light);
    padding: 3px 10px;
    border-radius: 9999px;
    margin-bottom: 6px;
  }
  h1.doc-title {
    margin: 0 0 6px;
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #09090b;
  }
  .meta-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  .meta-pill {
    background: var(--bg-muted);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 3px 9px;
    font-size: 12px;
    color: var(--muted);
    font-weight: 500;
  }
  article {
    margin-bottom: 24px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  article.user {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 16px 20px;
    margin-left: auto;
    max-width: 85%;
  }
  article.user h2.role-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--primary);
    margin: 0 0 6px;
  }
  article.agent {
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px 28px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  }
  article.agent h2.role-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--primary);
    margin: 0 0 16px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  h1 { font-size: 20px; font-weight: 700; margin: 20px 0 10px; color: #09090b; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
  h2 { font-size: 17px; font-weight: 700; margin: 18px 0 8px; color: #09090b; border-bottom: 1px solid var(--border); padding-bottom: 4px; }
  h3 { font-size: 14px; font-weight: 600; margin: 14px 0 6px; color: #18181b; }
  h4 { font-size: 13px; font-weight: 600; margin: 12px 0 4px; color: #27272a; }
  p { margin: 0 0 12px; color: #27272a; line-height: 1.65; }
  blockquote {
    border-left: 4px solid var(--primary);
    background: var(--primary-light);
    margin: 12px 0;
    padding: 10px 16px;
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: #3f3f46;
  }
  ul, ol { margin: 10px 0 14px; padding-left: 20px; }
  li { margin-bottom: 6px; color: #27272a; }
  strong { font-weight: 600; color: #09090b; }
  code.code-inline {
    background: var(--bg-muted);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 5px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    color: #09090b;
  }
  pre {
    background: #18181b;
    color: #f4f4f5;
    border-radius: 8px;
    padding: 14px;
    overflow-x: auto;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, monospace;
    margin: 12px 0;
  }
  /* METRICS TILES */
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin: 16px 0;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .tile {
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 16px;
    border-left: 4px solid var(--primary);
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  }
  .tile .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    font-weight: 600;
  }
  .tile strong {
    font-size: 22px;
    font-weight: 700;
    color: #09090b;
    margin: 4px 0 2px;
  }
  .tile .hint {
    font-size: 11px;
    color: var(--muted);
  }
  /* VISUAL CHARTS */
  .visual-chart {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 20px;
    margin: 16px 0;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 14px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
  }
  .chart-title {
    font-weight: 700;
    font-size: 13px;
    color: #09090b;
  }
  .chart-unit {
    font-size: 11px;
    color: var(--muted);
    font-weight: 500;
  }
  .bar-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bar-row {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
  }
  .bar-label {
    width: 180px;
    flex-shrink: 0;
    font-weight: 500;
    color: #27272a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bar-track {
    flex: 1;
    background: #f4f4f5;
    border-radius: 6px;
    height: 24px;
    overflow: hidden;
    display: flex;
    align-items: center;
  }
  .bar-fill {
    height: 100%;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 8px;
    min-width: 28px;
  }
  .bar-val {
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
  }
  .donut-stack {
    display: flex;
    border-radius: 8px;
    overflow: hidden;
    height: 18px;
    margin-bottom: 14px;
    background: #f4f4f5;
  }
  .legend-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 12px;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
  }
  /* TABLES */
  .table-wrap {
    margin: 16px 0;
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th, td {
    text-align: left;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
  }
  th {
    background: #fafafa;
    color: #52525b;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 11px;
  }
  tr:last-child td {
    border-bottom: 0;
  }
  tr:nth-child(even) td {
    background: #fafafa;
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .badge-danger { background: #fee2e2; color: #dc2626; }
  .badge-warning { background: #fef3c7; color: #d97706; }
  .record {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px;
    background: #fafafa;
    margin: 12px 0;
  }
  .record-title { font-weight: 600; margin-bottom: 2px; }
  .record dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin: 10px 0 0; }
  .record dt { font-size: 11px; color: var(--muted); }
  .record dd { margin: 0; font-size: 13px; font-weight: 500; }
  footer.doc-footer {
    border-top: 1px solid var(--border);
    margin-top: 32px;
    padding-top: 14px;
    color: var(--muted);
    font-size: 11px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  @media print {
    body { padding: 0; background: #fff; }
    main { max-width: 100%; width: 100%; border: 0; box-shadow: none; padding: 0; }
    @page { margin: 12mm; size: A4 portrait; }
    article, .visual-chart, .tiles, .table-wrap, .record { break-inside: avoid; page-break-inside: avoid; }
  }
</style></head>
<body><main>
<header class="doc-header">
  <div>
    <div class="brand-badge">TryGC Operating Intelligence</div>
    <h1 class="doc-title">Executive Briefing & Analysis</h1>
    <div class="meta-pills">
      <span class="meta-pill">Workspace: ${escapeHtml(meta.scope)}</span>
      <span class="meta-pill">Provider: ${escapeHtml(meta.provider)}</span>
      <span class="meta-pill">Model: ${escapeHtml(meta.model)}</span>
    </div>
  </div>
  <div style="text-align:right;">
    <span class="meta-pill">Exported: ${escapeHtml(new Date().toLocaleString("en-GB"))}</span>
  </div>
</header>
${body}
<footer class="doc-footer">
  <span>TryGC Workspace Hub · Figures reflect live workspace state at export time.</span>
  <span>Confidential · Internal Operations</span>
</footer>
</main></body></html>`;
}

function timestamp() {
  return new Date().toISOString().slice(0, 16).replace("T", "-").replaceAll(":", "");
}

export function downloadHtml(messages: ExportMessage[], meta: ExportMeta) {
  if (!messages.length) {
    toast.info("There is nothing to export yet.");
    return;
  }
  const html = conversationToHtml(messages, meta);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `trygc-agent-${timestamp()}.html`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success("Conversation exported as HTML.");
}

/**
 * Printing a hidden iframe avoids popup blockers, and the browser's own
 * "Save as PDF" destination produces the file without shipping a PDF library.
 */
export function printConversation(messages: ExportMessage[], meta: ExportMeta) {
  if (!messages.length) {
    toast.info("There is nothing to export yet.");
    return;
  }
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    toast.error("The browser blocked the print view.");
    return;
  }
  doc.open();
  doc.write(conversationToHtml(messages, meta));
  doc.close();

  const run = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  };
  if (doc.readyState === "complete") setTimeout(run, 120);
  else frame.onload = () => setTimeout(run, 120);

  toast.info("Choose “Save as PDF” in the print dialog.");
}

export function exportConversationCsv(messages: ExportMessage[]) {
  const rows: Record<string, string | number>[] = [];
  messages.forEach((message, index) => {
    for (const part of flatten(message)) {
      if (part.kind === "text") {
        rows.push({
          turn: index + 1,
          role: message.role,
          type: "message",
          detail: part.text ?? "",
          status: "",
        });
      } else {
        rows.push({
          turn: index + 1,
          role: "tool",
          type: part.toolName ?? "",
          detail: part.summary ?? "",
          status: toolStatus(part.result),
        });
      }
    }
  });
  if (!rows.length) {
    toast.info("There is nothing to export yet.");
    return;
  }
  exportRows(`trygc-agent-${timestamp()}`, rows);
  toast.success("Conversation exported as CSV.");
}

/** Exports a single table a tool produced, which is usually the thing worth keeping. */
export function exportTableCsv(payload: Extract<RenderPayload, { kind: "table" }>) {
  const rows = payload.rows.map((row) =>
    Object.fromEntries(payload.columns.map((column, index) => [column, row[index] ?? ""])),
  );
  exportRows(`trygc-agent-table-${timestamp()}`, rows);
}
