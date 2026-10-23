"use client";

import { useEffect, useState } from "react";
import type { ChartPoint, LabSample, Readout } from "@/lib/sandbox/sample";
import type { ChartSpec } from "@/lib/spec";
import { formatNumber } from "@/lib/spec";

export type Subscribe = (listener: (sample: LabSample) => void) => () => void;

export function StatCards({ subscribe }: { subscribe: Subscribe }) {
  const [readouts, setReadouts] = useState<Readout[] | null>(null);
  useEffect(() => subscribe((sample) => setReadouts(sample.readouts)), [subscribe]);

  if (!readouts || readouts.length === 0) {
    return <div data-tour="readouts" className="h-24 rounded-lg bg-white" />;
  }

  return (
    <div data-tour="readouts" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {readouts.map((readout) => (
        <div key={readout.label} className="rounded-lg bg-white px-5 py-4">
          <p className="text-sm text-neutral-500">{readout.label}</p>
          <p className="mt-2 text-3xl font-medium tracking-tight text-neutral-900 tabular-nums">
            {formatNumber(readout.value, readout.digits ?? 2)}
            {readout.unit ? <span className="ml-2 text-base font-normal text-neutral-500">{readout.unit}</span> : null}
          </p>
        </div>
      ))}
    </div>
  );
}

export function TimeReadout({ subscribe }: { subscribe: Subscribe }) {
  const [time, setTime] = useState(0);
  useEffect(() => subscribe((sample) => setTime(sample.time)), [subscribe]);
  return (
    <span className="ml-auto font-mono text-xs text-[var(--gray-11)] tabular-nums">{time.toFixed(1)} s</span>
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
    <section data-tour="chart" className="rounded-lg bg-white px-5 py-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-base font-medium text-neutral-900">{chart.title}</h3>
        <div className="flex gap-4 text-sm text-neutral-500">
          {chart.seriesLabel ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-5 border-t border-dashed border-neutral-700" />
              {chart.seriesLabel}
            </span>
          ) : null}
          {chart.pointsLabel ? (
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--accent-9)]" />
              {chart.pointsLabel}
            </span>
          ) : null}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={chart.title} className="h-56 w-full">
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="var(--gray-6)" />
        <line
          x1={pad.left}
          y1={height - pad.bottom}
          x2={width - pad.right}
          y2={height - pad.bottom}
          stroke="var(--gray-6)"
        />
        {empty ? (
          <text x={width / 2} y={height / 2} textAnchor="middle" fill="var(--gray-9)" fontSize="14">
            {chart.emptyHint ?? "Run the simulation to plot data."}
          </text>
        ) : (
          <>
            {series && series.length > 1 ? (
              <path d={path(series)} fill="none" stroke="var(--gray-11)" strokeWidth="1.5" strokeDasharray="5 4" />
            ) : null}
            {sortedPoints.length > 1 ? (
              <path d={path(sortedPoints)} fill="none" stroke="var(--accent-9)" strokeWidth="2" />
            ) : null}
            {sortedPoints.map((point) => (
              <circle key={`${point.x}-${point.y}`} cx={sx(point.x)} cy={sy(point.y)} r="3.5" fill="var(--accent-9)" />
            ))}
            <text x={pad.left} y={14} fill="var(--gray-9)" fontSize="12">
              {formatNumber(yDomain.max, 1)}
              {chart.yUnit ? ` ${chart.yUnit}` : ""}
            </text>
            <text x={width - pad.right} y={height - 8} textAnchor="end" fill="var(--gray-9)" fontSize="12">
              {chart.xLabel}
              {chart.xUnit ? ` (${chart.xUnit})` : ""}
            </text>
          </>
        )}
      </svg>
    </section>
  );
}
