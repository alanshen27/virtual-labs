import type { ChartSpec, ControlMap, ExportSpec } from "@/lib/spec";
import type { ChartPoint, Readout } from "@/lib/sandbox/sample";

export type ExportSnapshot = {
  readouts: Readout[];
  points: ChartPoint[];
  series: ChartPoint[] | null;
  controls: ControlMap;
  time: number;
  pngDataUrl?: string | null;
};

export type ExportFile = {
  filename: string;
  mime: string;
  body: string;
  dataUrl?: string;
};

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function table(rows: string[][]): string {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function filenameFor(item: ExportSpec): string {
  if (item.filename) return item.filename;
  const ext = item.format === "png" ? "png" : item.format === "json" ? "json" : "csv";
  return `${item.id}.${ext}`;
}

export function renderExport(
  item: ExportSpec,
  chart: ChartSpec | undefined,
  snapshot: ExportSnapshot,
): ExportFile {
  const filename = filenameFor(item);
  if (item.format === "png" || item.source === "canvas") {
    if (!snapshot.pngDataUrl?.startsWith("data:image/png")) {
      throw new Error("The canvas image is not ready yet.");
    }
    return { filename, mime: "image/png", body: "", dataUrl: snapshot.pngDataUrl };
  }

  if (item.format === "json" || item.source === "state") {
    const body = JSON.stringify(
      {
        time: snapshot.time,
        controls: snapshot.controls,
        readouts: snapshot.readouts,
        points: snapshot.points,
        series: snapshot.series,
      },
      null,
      2,
    );
    return { filename: filename.endsWith(".json") ? filename : `${item.id}.json`, mime: "application/json", body };
  }

  const xLabel = chart?.xLabel ?? "x";
  const yLabel = chart?.yLabel ?? "y";
  if (item.source === "readouts") {
    return {
      filename,
      mime: "text/csv",
      body: table([
        ["label", "value", "unit"],
        ...snapshot.readouts.map((readout) => [readout.label, String(readout.value), readout.unit]),
      ]),
    };
  }

  const curve =
    item.source === "series"
      ? (snapshot.series ?? [])
      : snapshot.points.length
        ? snapshot.points
        : (snapshot.series ?? []);
  return {
    filename,
    mime: "text/csv",
    body: table([[xLabel, yLabel], ...curve.map((point) => [String(point.x), String(point.y)])]),
  };
}

export function downloadExport(file: ExportFile): void {
  if (file.dataUrl) {
    const link = document.createElement("a");
    link.href = file.dataUrl;
    link.download = file.filename;
    link.click();
    return;
  }
  const blob = new Blob([file.body], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  link.click();
  URL.revokeObjectURL(url);
}
