"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChartPoint, LabSample, Readout } from "@/lib/sandbox/sample";
import type { ChartSpec } from "@/lib/spec";
import { formatNumber } from "@/lib/spec";

export type Subscribe = (listener: (sample: LabSample) => void) => () => void;

export function StatCards({ subscribe }: { subscribe: Subscribe }) {
  const [readouts, setReadouts] = useState<Readout[] | null>(null);
  useEffect(() => subscribe((sample) => setReadouts(sample.readouts)), [subscribe]);

  if (!readouts || readouts.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <Skeleton className="h-[4.5rem] rounded-xl" />
        <Skeleton className="h-[4.5rem] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {readouts.map((readout) => (
        <Card key={readout.label} size="sm" className="gap-0 py-3">
          <CardContent className="px-3">
            <p className="text-xs text-muted-foreground">{readout.label}</p>
            <p className="mt-1 text-2xl font-medium tracking-tight tabular-nums">
              {formatNumber(readout.value, readout.digits ?? 2)}
              {readout.unit ? (
                <span className="ml-1 text-sm font-normal text-muted-foreground">{readout.unit}</span>
              ) : null}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TimeReadout({ subscribe }: { subscribe: Subscribe }) {
  const [time, setTime] = useState(0);
  useEffect(() => subscribe((sample) => setTime(sample.time)), [subscribe]);
  return (
    <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">{time.toFixed(1)} s</span>
  );
}

function bounds(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.08;
  return { min: min - pad, max: max + pad };
}

export function LiveChart({
  chart,
  subscribe,
}: {
  chart?: ChartSpec;
  subscribe: Subscribe;
}) {
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [series, setSeries] = useState<ChartPoint[] | null>(null);

  useEffect(
    () =>
      subscribe((sample) => {
        setSeries((previous) => (sample.series ? sample.series : sample.clearChart ? null : previous));
        setPoints((previous) => {
          const base = sample.clearChart ? [] : previous;
          if (!sample.point) return base;
          const x = Math.round(sample.point.x * 1000) / 1000;
          const next = base.filter((point) => Math.abs(point.x - x) > 0.0005);
          next.push({ x, y: sample.point.y });
          return next.length > 80 ? next.slice(next.length - 80) : next;
        });
      }),
    [subscribe],
  );

  if (!chart) return null;

  const width = 640;
  const height = 200;
  const pad = { left: 44, right: 12, top: 12, bottom: 28 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const plotted = [...(series ?? []), ...points];
  const empty = plotted.length === 0;
  const xDomain = bounds(plotted.map((point) => point.x));
  const yDomain = bounds(plotted.map((point) => point.y));
  const sx = (x: number) => pad.left + ((x - xDomain.min) / (xDomain.max - xDomain.min)) * innerW;
  const sy = (y: number) => pad.top + (1 - (y - yDomain.min) / (yDomain.max - yDomain.min)) * innerH;
  const path = (data: ChartPoint[]) =>
    data.map((point, index) => `${index === 0 ? "M" : "L"} ${sx(point.x).toFixed(1)} ${sy(point.y).toFixed(1)}`).join(" ");
  const sortedPoints = [...points].sort((a, b) => a.x - b.x);

  return (
    <Card size="sm">
      <CardContent className="px-3 py-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium">{chart.title}</h3>
          <div className="flex gap-3 text-xs text-muted-foreground">
            {chart.seriesLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 border-t border-dashed border-foreground" />
                {chart.seriesLabel}
              </span>
            ) : null}
            {chart.pointsLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                {chart.pointsLabel}
              </span>
            ) : null}
          </div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={chart.title} className="h-44 w-full">
          <line
            x1={pad.left}
            y1={pad.top}
            x2={pad.left}
            y2={height - pad.bottom}
            stroke="var(--border)"
          />
          <line
            x1={pad.left}
            y1={height - pad.bottom}
            x2={width - pad.right}
            y2={height - pad.bottom}
            stroke="var(--border)"
          />
          {empty ? (
            <text
              x={width / 2}
              y={height / 2}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize="13"
            >
              {chart.emptyHint ?? "Run the simulation to plot data."}
            </text>
          ) : (
            <>
              {series && series.length > 1 ? (
                <path d={path(series)} fill="none" stroke="var(--foreground)" strokeWidth="1.5" strokeDasharray="5 4" />
              ) : null}
              {sortedPoints.length > 1 ? (
                <path d={path(sortedPoints)} fill="none" stroke="var(--primary)" strokeWidth="2" />
              ) : null}
              {sortedPoints.map((point) => (
                <circle key={`${point.x}-${point.y}`} cx={sx(point.x)} cy={sy(point.y)} r="3" fill="var(--primary)" />
              ))}
              <text x={pad.left} y={14} fill="var(--muted-foreground)" fontSize="11">
                {formatNumber(yDomain.max, 1)}
                {chart.yUnit ? ` ${chart.yUnit}` : ""}
              </text>
              <text x={width - pad.right} y={height - 8} textAnchor="end" fill="var(--muted-foreground)" fontSize="11">
                {chart.xLabel}
                {chart.xUnit ? ` (${chart.xUnit})` : ""}
              </text>
            </>
          )}
        </svg>
      </CardContent>
    </Card>
  );
}
