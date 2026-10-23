import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { builtinCards } from "@/lib/catalog";
import { builtinLabs } from "@/lib/labs";
import { idealGasLab } from "@/lib/labs/ideal-gas";
import { interferenceLab } from "@/lib/labs/interference";
import { ohmsLawLab } from "@/lib/labs/ohms-law";
import { pendulumLab } from "@/lib/labs/pendulum";
import { projectileLab } from "@/lib/labs/projectile";
import { idealGasPressureKPa, pendulumPeriod, smallAnglePeriod, vacuumRange } from "@/lib/physics";
import { defaultControls, labSchema, type ControlMap } from "@/lib/spec";
import { buildSrcdoc } from "@/lib/sandbox/srcdoc";
import { createApi, loadLab, readout, runLab } from "./helpers";

describe("built-in labs", () => {
  it("all match the lab schema", () => {
    expect(builtinLabs).toHaveLength(5);
    for (const lab of builtinLabs) {
      expect(labSchema.safeParse(lab).success).toBe(true);
      expect(lab.activity.items.length).toBeGreaterThanOrEqual(3);
      expect(lab.tour.length).toBeGreaterThanOrEqual(3);
      expect(lab.exports.some((item) => item.format === "csv")).toBe(true);
      expect(lab.exports.some((item) => item.format === "png")).toBe(true);
    }
    expect(builtinCards.map((card) => card.title)).toEqual(builtinLabs.map((lab) => lab.title));
  });

  it("measures a pendulum period close to theory", () => {
    const controls = { ...defaultControls(pendulumLab), damping: 0, length: 1, gravity: 9.8, angle: 20, mass: 1 };
    const { sample } = runLab(pendulumLab, controls, 10);
    const theta = (20 * Math.PI) / 180;
    const predicted = pendulumPeriod(1, 9.8, theta);
    expect(readout(sample, "Predicted period")).toBeCloseTo(predicted, 2);
    expect(readout(sample, "Measured period")).toBeCloseTo(predicted, 1);
    expect(predicted).toBeGreaterThan(smallAnglePeriod(1, 9.8));
  });

  it("lands a drag-free projectile on the vacuum range", () => {
    const controls = {
      ...defaultControls(projectileLab),
      speed: 20,
      angle: 45,
      gravity: 9.8,
      air: false,
      mass: 1,
    };
    const expected = vacuumRange(20, Math.PI / 4, 9.8);
    const { sample } = runLab(projectileLab, controls, 6);
    expect(readout(sample, "No-drag range")).toBeCloseTo(expected, 2);
    expect(readout(sample, "Distance")).toBeCloseTo(expected, 1);
    expect(readout(sample, "Height")).toBeCloseTo(0, 2);
  });

  it("shortens the range when air resistance is on", () => {
    const base = { ...defaultControls(projectileLab), speed: 20, angle: 45, gravity: 9.8, mass: 1 };
    const calm = runLab(projectileLab, { ...base, air: false }, 6);
    const drag = runLab(projectileLab, { ...base, air: true, drag: 0.008 }, 6);
    expect(readout(drag.sample, "Distance")).toBeLessThan(readout(calm.sample, "Distance") * 0.9);
  });

  it("follows the ideal gas law and heats when compressed", () => {
    const controls = { ...defaultControls(idealGasLab), volume: 10, temperature: 300, moles: 1, hold: true };
    const fns = loadLab(idealGasLab);
    const api = createApi();
    fns.setup(api, controls);
    const isothermal = fns.sample?.(api, controls);
    expect(readout(isothermal, "Pressure")).toBeCloseTo(idealGasPressureKPa(1, 300, 10), 1);
    const squeezed = fns.sample?.(api, { ...controls, volume: 5 });
    expect(readout(squeezed, "Pressure")).toBeCloseTo(idealGasPressureKPa(1, 300, 5), 1);

    const adiabatic = { ...controls, hold: false, volume: 10 };
    fns.setup(api, adiabatic);
    let current: ControlMap = adiabatic;
    const dt = 1 / 60;
    for (let i = 1; i <= 150; i += 1) {
      const next = { ...current, volume: 10 - (5 * i) / 150 };
      fns.controlsChanged?.(api, next, current);
      api.time += dt;
      fns.step?.(dt, api, next);
      current = next;
    }
    const after = fns.sample?.(api, current);
    const temperature = readout(after, "Temperature");
    expect(temperature).toBeGreaterThan(360);
    expect(temperature).toBeLessThan(900);
    expect(readout(after, "Pressure")).toBeCloseTo(idealGasPressureKPa(1, temperature, 5), 0);
  });

  it("uses Ohm's law for one resistor and for two in series", () => {
    const open = { ...defaultControls(ohmsLawLab), voltage: 6, r1: 100, series: false, closed: false };
    expect(readout(runLab(ohmsLawLab, open, 0).sample, "Current")).toBe(0);
    const one = { ...open, closed: true };
    expect(readout(runLab(ohmsLawLab, one, 0).sample, "Current")).toBeCloseTo(0.06, 5);
    expect(readout(runLab(ohmsLawLab, one, 0).sample, "Power")).toBeCloseTo(0.36, 5);
    const two = { ...one, series: true, r2: 100 };
    expect(readout(runLab(ohmsLawLab, two, 0).sample, "Current")).toBeCloseTo(0.03, 5);
    const doubled = { ...one, voltage: 12 };
    expect(readout(runLab(ohmsLawLab, doubled, 0).sample, "Power")).toBeCloseTo(1.44, 4);
  });

  it("puts a bright center fringe at phase 0 and a dark one at 180", () => {
    const base = { ...defaultControls(interferenceLab), sources: "two", separation: 10, wavelength: 4 };
    const bright = runLab(interferenceLab, { ...base, phase: 0 }, 0).sample?.series ?? [];
    const dark = runLab(interferenceLab, { ...base, phase: 180 }, 0).sample?.series ?? [];
    const at = (series: { x: number; y: number }[]) => series.find((point) => point.x === 30)?.y ?? -1;
    expect(at(bright)).toBeGreaterThan(at(dark) + 0.2);
    expect(readout(runLab(interferenceLab, { ...base, phase: 0 }, 0).sample, "Fringe spacing")).toBeCloseTo(
      (4 * 56) / 10,
      2,
    );
    const single = runLab(interferenceLab, { ...base, sources: "one" }, 0).sample?.series ?? [];
    const spread = (series: { y: number }[]) => {
      const mean = series.reduce((sum, point) => sum + point.y, 0) / series.length;
      return series.reduce((sum, point) => sum + (point.y - mean) ** 2, 0) / series.length;
    };
    expect(spread(single)).toBeLessThan(spread(bright));
  });

  it("draws every lab without throwing", () => {
    for (const lab of builtinLabs) {
      expect(() => runLab(lab, defaultControls(lab), 0.2)).not.toThrow();
    }
  });
});

describe("sandbox", () => {
  it("escapes a script breakout inside the iframe document", () => {
    const html = buildSrcdoc(`lab.setup = function(){ var x = "</script><script>alert(1)</script>"; }; lab.draw = function(){};`, {});
    expect(html.match(/<script/gi)).toHaveLength(1);
    expect(html).not.toContain("</script><script>");
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("new Function");
  });

  it("does not compile lab code on the host", () => {
    const root = path.resolve(__dirname, "../src");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
      }
    };
    walk(root);
    const offenders = files.filter((file) => {
      if (file.endsWith(`${path.sep}srcdoc.ts`)) return false;
      const text = readFileSync(file, "utf8");
      return text.includes("new Function") || text.includes("eval(");
    });
    expect(offenders).toEqual([]);
    const frame = readFileSync(path.join(root, "components/lab/sim-frame.tsx"), "utf8");
    expect(frame).toContain('sandbox="allow-scripts"');
    expect(frame).not.toContain("allow-same-origin");
  });
});
