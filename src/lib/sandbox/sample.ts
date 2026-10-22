export type Readout = {
  label: string;
  value: number;
  unit: string;
  digits?: number;
};

export type ChartPoint = { x: number; y: number };

export type LabSample = {
  time: number;
  readouts: Readout[];
  point: ChartPoint | null;
  series: ChartPoint[] | null;
  clearChart: boolean;
};

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function point(value: unknown): ChartPoint | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { x?: unknown; y?: unknown };
  const x = finite(record.x);
  const y = finite(record.y);
  if (x == null || y == null) return null;
  return { x, y };
}

export function sanitizeSample(data: unknown): LabSample | null {
  if (!data || typeof data !== "object") return null;
  const record = data as {
    type?: unknown;
    time?: unknown;
    readouts?: unknown;
    point?: unknown;
    series?: unknown;
    clearChart?: unknown;
  };
  if (record.type !== "sample") return null;
  const readouts: Readout[] = [];
  if (Array.isArray(record.readouts)) {
    for (const item of record.readouts.slice(0, 6)) {
      if (!item || typeof item !== "object") continue;
      const entry = item as { label?: unknown; value?: unknown; unit?: unknown; digits?: unknown };
      const value = finite(entry.value);
      if (typeof entry.label !== "string" || value == null) continue;
      const digits = finite(entry.digits);
      readouts.push({
        label: entry.label.slice(0, 40),
        value,
        unit: typeof entry.unit === "string" ? entry.unit.slice(0, 16) : "",
        digits: digits == null ? undefined : Math.max(0, Math.min(6, Math.round(digits))),
      });
    }
  }
  let series: ChartPoint[] | null = null;
  if (Array.isArray(record.series)) {
    series = [];
    for (const item of record.series.slice(0, 240)) {
      const next = point(item);
      if (next) series.push(next);
    }
  }
  return {
    time: finite(record.time) ?? 0,
    readouts,
    point: point(record.point),
    series,
    clearChart: record.clearChart === true,
  };
}
