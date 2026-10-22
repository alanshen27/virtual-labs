import type { ControlMap, LabSpec } from "@/lib/spec";
import type { LabSample } from "@/lib/sandbox/sample";

type LabFns = {
  setup: (api: TestApi, controls: ControlMap) => void;
  step?: (dt: number, api: TestApi, controls: ControlMap) => void;
  draw?: (ctx: unknown, api: TestApi, controls: ControlMap) => void;
  sample?: (api: TestApi, controls: ControlMap) => {
    readouts?: { label: string; value: number; unit?: string; digits?: number }[];
    point?: { x: number; y: number } | null;
    series?: { x: number; y: number }[] | null;
    clearChart?: boolean;
  };
  controlsChanged?: (api: TestApi, controls: ControlMap, prev: ControlMap) => void;
};

export type TestApi = {
  state: Record<string, unknown>;
  time: number;
  width: number;
  height: number;
  clamp: (v: number, a: number, b: number) => number;
  lerp: (a: number, b: number, t: number) => number;
  map: (v: number, a: number, b: number, c: number, d: number) => number;
};

export function createApi(): TestApi {
  return {
    state: {},
    time: 0,
    width: 900,
    height: 560,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    map: (v, a, b, c, d) => (a === b ? c : c + ((v - a) / (b - a)) * (d - c)),
  };
}

export function createMockContext(): unknown {
  const gradient = { addColorStop() {} };
  return new Proxy(function mock() {}, {
    get(_target, prop) {
      if (prop === "canvas") return { width: 900, height: 560 };
      if (prop === "measureText") return () => ({ width: 32 });
      if (prop === "createLinearGradient" || prop === "createRadialGradient") return () => gradient;
      if (prop === "createImageData") {
        return (w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4),
        });
      }
      if (typeof prop === "symbol") return undefined;
      return () => {};
    },
    set() {
      return true;
    },
  });
}

export function loadLab(lab: LabSpec): LabFns {
  const fns: LabFns = {
    setup() {},
  };
  const factory = new Function("lab", lab.code) as (lab: LabFns) => void;
  factory(fns);
  return fns;
}

export function readout(sample: LabSample | { readouts?: { label: string; value: number }[] } | undefined, label: string): number {
  const value = sample?.readouts?.find((item) => item.label === label)?.value;
  if (typeof value !== "number") throw new Error(`Missing readout ${label}`);
  return value;
}

export function runLab(lab: LabSpec, controls: ControlMap, seconds: number, dt = 1 / 60) {
  const api = createApi();
  const fns = loadLab(lab);
  fns.setup(api, controls);
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i += 1) {
    api.time += dt;
    fns.step?.(dt, api, controls);
  }
  fns.draw?.(createMockContext(), api, controls);
  const sample = fns.sample?.(api, controls);
  return { api, fns, sample };
}
