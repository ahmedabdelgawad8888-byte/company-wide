import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "@/components/kit";
import { useDrill } from "@/lib/drill";
import { cn } from "@/lib/utils";

export type ChartPoint = { name: string; value: number };

/** Single source of truth for chart colours + styling (reference palette). */
export const CHART_PALETTE = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];
const PALETTE = CHART_PALETTE;

export const CHART_AXIS = {
  tickLine: false,
  axisLine: false,
  fontSize: 11,
  stroke: "var(--color-chart-axis)",
} as const;
export const CHART_GRID = { strokeDasharray: "3 3", stroke: "var(--color-chart-grid)" } as const;
export const CHART_TOOLTIP = {
  borderRadius: 10,
  fontSize: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-popover)",
  color: "var(--color-popover-foreground)",
  boxShadow: "var(--shadow-panel)",
} as const;
export const CHART_TOOLTIP_LABEL = {
  color: "var(--color-muted-foreground)",
  fontSize: 11,
} as const;
export const CHART_CURSOR = {
  fill: "color-mix(in oklab, var(--color-muted) 60%, transparent)",
} as const;
export const CHART_LEGEND = { fontSize: 11, color: "var(--color-muted-foreground)" } as const;
const AXIS = CHART_AXIS;
const TOOLTIP = CHART_TOOLTIP;

/** Click-through: selecting a segment filters the records table on the same page. */
function useChartDrill(title: string) {
  const { drill, setDrill } = useDrill();
  const active = drill && drill.source === title ? drill.label : null;
  const pick = (name?: string | number) => {
    const label = String(name ?? "").trim();
    if (!label) return;
    setDrill(active === label ? null : { label, source: title });
  };
  const dim = (name: string) => (active && active !== name ? 0.28 : 1);
  return { active, pick, dim };
}

function Frame({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <Panel className={cn("min-w-0", className)}>
      <div className="mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="h-56 w-full">{children}</div>
    </Panel>
  );
}

export function BarChartCard({
  title,
  description,
  data,
  format,
  horizontal = false,
  colorful = false,
  className,
}: {
  title: string;
  description?: string | undefined;
  data: ChartPoint[];
  format?: ((v: number) => string) | undefined;
  horizontal?: boolean;
  colorful?: boolean;
  className?: string | undefined;
}) {
  const fmt = format ?? ((v: number) => String(v));
  const { pick, dim } = useChartDrill(title);
  return (
    <Frame title={title} description={description} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ left: 4, right: 12, top: 6, bottom: 4 }}
          barCategoryGap={horizontal ? 8 : 14}
        >
          <CartesianGrid {...CHART_GRID} vertical={horizontal} horizontal={!horizontal} />
          <XAxis
            type={horizontal ? "number" : "category"}
            {...(horizontal
              ? { tickFormatter: fmt, tickCount: 4, interval: "preserveStartEnd" as const }
              : { dataKey: "name" as const, interval: 0 as const })}
            {...AXIS}
          />
          <YAxis
            type={horizontal ? "category" : "number"}
            {...(horizontal ? { dataKey: "name" as const } : { tickFormatter: fmt })}
            width={horizontal ? 104 : 64}
            {...AXIS}
          />
          <Tooltip
            cursor={CHART_CURSOR}
            formatter={(v: number) => fmt(v)}
            contentStyle={TOOLTIP}
            labelStyle={CHART_TOOLTIP_LABEL}
          />
          <Bar
            dataKey="value"
            name={title}
            fill={PALETTE[0]}
            radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            maxBarSize={horizontal ? 20 : 44}
            className="cursor-pointer"
            onClick={(d: { name?: string | number }) => pick(d?.name)}
          >
            {data.map((d, i) => (
              <Cell
                key={d.name}
                fill={colorful ? PALETTE[i % PALETTE.length] : PALETTE[0]}
                fillOpacity={dim(d.name)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

/** Categorical breakdown as a ranked horizontal bar — easier to compare than a donut. */
export function ShareChartCard({
  title,
  description,
  data,
  format,
  limit = 8,
  className,
}: {
  title: string;
  description?: string | undefined;
  data: ChartPoint[];
  format?: ((v: number) => string) | undefined;
  limit?: number;
  className?: string | undefined;
}) {
  const fmt = format ?? ((v: number) => String(v));
  const { pick, dim } = useChartDrill(title);

  const ranked = data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const rows =
    ranked.length > limit
      ? [
          ...ranked.slice(0, limit - 1),
          { name: "Other", value: ranked.slice(limit - 1).reduce((n, d) => n + d.value, 0) },
        ]
      : ranked;

  const total = rows.reduce((n, d) => n + d.value, 0);
  const max = rows.reduce((n, d) => Math.max(n, d.value), 0);
  const label = (v: number) =>
    total > 0 ? `${fmt(v)}  ·  ${Math.round((v / total) * 100)}%` : fmt(v);

  if (!rows.length) {
    return (
      <Frame title={title} description={description} className={className}>
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          No data
        </div>
      </Frame>
    );
  }

  return (
    <Frame title={title} description={description} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
          barCategoryGap={7}
        >
          {/* Headroom on the axis so the value label never clips off the panel. */}
          <XAxis type="number" domain={[0, max * 1.35]} hide />
          <YAxis type="category" dataKey="name" width={112} interval={0} {...AXIS} />
          <Tooltip
            cursor={CHART_CURSOR}
            formatter={(v: number) => label(v)}
            contentStyle={TOOLTIP}
            labelStyle={CHART_TOOLTIP_LABEL}
          />
          <Bar
            dataKey="value"
            name={title}
            radius={[0, 6, 6, 0]}
            maxBarSize={18}
            className="cursor-pointer"
            onClick={(d: { name?: string | number }) => pick(d?.name)}
          >
            {rows.map((d, i) => (
              <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} fillOpacity={dim(d.name)} />
            ))}
            {/* Custom label node: recharts' built-in label wraps to the bar width, which breaks on short bars. */}
            <LabelList
              dataKey="value"
              content={(props: unknown) => {
                const { x, y, width, height, value } = props as {
                  x: number;
                  y: number;
                  width: number;
                  height: number;
                  value: number;
                };
                return (
                  <text
                    x={x + width + 6}
                    y={y + height / 2}
                    dominantBaseline="central"
                    fill="var(--color-muted-foreground)"
                    fontSize={11}
                  >
                    {label(value)}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function TrendChartCard({
  title,
  description,
  data,
  format,
  trendLine = false,
  className,
}: {
  title: string;
  description?: string | undefined;
  data: ChartPoint[];
  format?: ((v: number) => string) | undefined;
  /** Overlay the least-squares fit so the direction is readable through the noise. */
  trendLine?: boolean;
  className?: string | undefined;
}) {
  const fmt = format ?? ((v: number) => String(v));
  const id = `grad-${title.replace(/\W/g, "")}`;
  const { pick } = useChartDrill(title);

  // Least-squares fit over the series index, evaluated at each point.
  const rows = (() => {
    if (!trendLine || data.length < 2) return data;
    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((t, d) => t + d.value, 0);
    const sumXY = data.reduce((t, d, i) => t + i * d.value, 0);
    const sumXX = data.reduce((t, _d, i) => t + i * i, 0);
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return data;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return data.map((d, i) => ({ ...d, trend: Math.max(0, intercept + slope * i) }));
  })();
  return (
    <Frame title={title} description={description} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={rows}
          margin={{ left: 4, right: 12, top: 6, bottom: 4 }}
          className="cursor-pointer"
          onClick={(e: { activeLabel?: string | number }) => pick(e?.activeLabel)}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PALETTE[0]} stopOpacity={0.45} />
              <stop offset="100%" stopColor={PALETTE[0]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...CHART_GRID} vertical={false} />
          <XAxis dataKey="name" {...AXIS} />
          <YAxis tickFormatter={fmt} width={64} {...AXIS} />
          <Tooltip
            formatter={(v: number) => fmt(v)}
            contentStyle={TOOLTIP}
            labelStyle={CHART_TOOLTIP_LABEL}
          />
          <Area
            type="linear"
            dataKey="value"
            name={title}
            stroke={PALETTE[0]}
            strokeWidth={2}
            fill={`url(#${id})`}
            dot={{ r: 2 }}
          />
          {trendLine ? (
            <Line
              type="linear"
              dataKey="trend"
              name="Trend"
              stroke={PALETTE[2]}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              legendType="none"
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function ChartRow({ children, cols = 3 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <div
      className={cn(
        "grid items-start gap-4",
        cols === 2 ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}

export function countBy<T>(rows: T[], key: (r: T) => string): ChartPoint[] {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const k = key(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  });
  return [...m.entries()].map(([name, value]) => ({ name, value }));
}

export function sumBy<T>(rows: T[], key: (r: T) => string, amount: (r: T) => number): ChartPoint[] {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const k = key(r);
    m.set(k, (m.get(k) ?? 0) + amount(r));
  });
  return [...m.entries()].map(([name, value]) => ({ name, value: Math.round(value) }));
}

/** Grouped multi-series bar chart (e.g. collected vs invoiced) sharing the reference styling. */
export function SeriesBarChartCard({
  title,
  description,
  data,
  series,
  format,
  className,
  onSelect,
  active,
}: {
  title: string;
  description?: string | undefined;
  data: Array<Record<string, string | number>>;
  series: { key: string; label: string; color?: string }[];
  format?: ((v: number) => string) | undefined;
  className?: string | undefined;
  onSelect?: ((name: string) => void) | undefined;
  active?: string | null | undefined;
}) {
  const fmt = format ?? ((v: number) => String(v));
  return (
    <Frame title={title} description={description} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ left: 4, right: 12, top: 6, bottom: 4 }}
          barCategoryGap={16}
          className={onSelect ? "cursor-pointer" : ""}
          onClick={(e: { activeLabel?: string | number }) =>
            onSelect?.(String(e?.activeLabel ?? ""))
          }
        >
          <CartesianGrid {...CHART_GRID} vertical={false} />
          <XAxis dataKey="name" {...CHART_AXIS} />
          <YAxis tickFormatter={fmt} width={68} {...CHART_AXIS} />
          <Tooltip
            cursor={CHART_CURSOR}
            formatter={(v: number) => fmt(v)}
            contentStyle={CHART_TOOLTIP}
            labelStyle={CHART_TOOLTIP_LABEL}
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="circle"
            wrapperStyle={CHART_LEGEND}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color ?? PALETTE[i % PALETTE.length]}
              radius={[6, 6, 0, 0]}
              maxBarSize={26}
            >
              {data.map((d) => (
                <Cell
                  key={`${s.key}-${d["name"]}`}
                  fillOpacity={active && active !== d["name"] ? 0.28 : 1}
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}
