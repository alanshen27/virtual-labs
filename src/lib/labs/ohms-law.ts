import { labSchema, type LabSpec } from "@/lib/spec";

const code = `
function equivalent(controls) {
  return controls.r1 + (controls.series ? controls.r2 : 0);
}
function currentOf(controls) {
  if (!controls.closed) return 0;
  var R = equivalent(controls);
  if (R <= 0) return 0;
  return controls.voltage / R;
}
lab.setup = function (api) {
  api.state.phase = 0;
  api.state.clearChart = false;
};
lab.controlsChanged = function (api, controls, prev) {
  if (!prev) return;
  if (controls.r1 !== prev.r1 || controls.r2 !== prev.r2 || controls.series !== prev.series || controls.closed !== prev.closed) {
    api.state.clearChart = true;
  }
};
lab.step = function (dt, api, controls) {
  var I = currentOf(controls);
  api.state.phase += dt * (40 + 220 * api.clamp(I / 0.15, 0, 1));
};
lab.draw = function (ctx, api, controls) {
  var w = api.width;
  var h = api.height;
  if (w < 20 || h < 20) return;
  ctx.fillStyle = "#0e1724";
  ctx.fillRect(0, 0, w, h);
  var left = Math.max(36, w * 0.12);
  var right = w - left;
  var top = Math.max(36, h * 0.18);
  var bottom = h - Math.max(48, h * 0.22);
  var I = currentOf(controls);
  var R = equivalent(controls);
  var power = I * controls.voltage;
  ctx.strokeStyle = "#dbe7f5";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.strokeRect(left, top, right - left, bottom - top);
  function zigzag(x0, x1, y) {
    var span = x1 - x0;
    var steps = 7;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    var i;
    for (i = 0; i <= steps; i++) {
      var x = x0 + (span * i) / steps;
      var yoff = i === 0 || i === steps ? 0 : i % 2 === 0 ? 10 : -10;
      ctx.lineTo(x, y + yoff);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2;
  zigzag(left + 28, left + (right - left) * 0.46, top);
  if (controls.series) zigzag(right - 8, right - 8, top);
  if (controls.series) {
    var zx = right - (right - left) * 0.22;
    ctx.beginPath();
    ctx.moveTo(zx, top + 16);
    var j;
    for (j = 0; j <= 7; j++) {
      var y = top + 16 + ((bottom - top - 32) * j) / 7;
      var xoff = j === 0 || j === 7 ? 0 : j % 2 === 0 ? 10 : -10;
      ctx.lineTo(zx + xoff, y);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left, top + 18);
  ctx.lineTo(left, top + 34);
  ctx.moveTo(left - 8, top + 46);
  ctx.lineTo(left + 8, top + 46);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, top + 58);
  ctx.lineTo(left, bottom - 8);
  ctx.stroke();
  var bulbX = (left + right) / 2;
  var bulbY = bottom;
  var glow = api.clamp(power / 1.2, 0, 1);
  if (glow > 0.01) {
    var rad = ctx.createRadialGradient(bulbX, bulbY, 4, bulbX, bulbY, 36 + glow * 20);
    rad.addColorStop(0, "rgba(255, 214, 120, " + (0.35 + glow * 0.5) + ")");
    rad.addColorStop(1, "rgba(255, 214, 120, 0)");
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(bulbX, bulbY, 40, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = glow > 0.05 ? "#fde68a" : "#334155";
  ctx.beginPath();
  ctx.arc(bulbX, bulbY, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.stroke();
  if (!controls.closed) {
    ctx.strokeStyle = "#0e1724";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(left + 36, bottom);
    ctx.lineTo(left + 62, bottom);
    ctx.stroke();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(left + 34, bottom);
    ctx.lineTo(left + 58, bottom - 16);
    ctx.stroke();
  }
  var loop = [
    [left, bottom],
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom]
  ];
  var seg = [];
  var total = 0;
  var s;
  for (s = 0; s < loop.length - 1; s++) {
    var len = Math.hypot(loop[s + 1][0] - loop[s][0], loop[s + 1][1] - loop[s][1]);
    seg.push(len);
    total += len;
  }
  function at(dist) {
    var d = ((dist % total) + total) % total;
    var k;
    for (k = 0; k < seg.length; k++) {
      if (d <= seg[k]) {
        var u = seg[k] === 0 ? 0 : d / seg[k];
        return [
          loop[k][0] + (loop[k + 1][0] - loop[k][0]) * u,
          loop[k][1] + (loop[k + 1][1] - loop[k][1]) * u
        ];
      }
      d -= seg[k];
    }
    return loop[0];
  }
  ctx.fillStyle = "#38bdf8";
  var dots = 8;
  var n;
  for (n = 0; n < dots; n++) {
    var pos = at((api.state.phase || 0) + (total * n) / dots);
    ctx.beginPath();
    ctx.arc(pos[0], pos[1], 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "13px sans-serif";
  ctx.fillText(I.toFixed(3) + " A", left + 16, (top + bottom) / 2);
  ctx.fillText(R.toFixed(0) + " ohm", right - 78, top + 28);
};
lab.sample = function (api, controls) {
  var I = currentOf(controls);
  var R = equivalent(controls);
  var clearChart = !!api.state.clearChart;
  api.state.clearChart = false;
  return {
    readouts: [
      { label: "Current", value: I, unit: "A", digits: 3 },
      { label: "Resistance", value: R, unit: "ohm", digits: 0 },
      { label: "Power", value: I * controls.voltage, unit: "W", digits: 3 }
    ],
    point: controls.closed ? { x: controls.voltage, y: I } : null,
    series: null,
    clearChart: clearChart
  };
};
`;

export const ohmsLawLab: LabSpec = labSchema.parse({
  id: "ohms-law",
  title: "Ohm's law",
  summary: "Change the battery and the resistors and watch the current dots speed up or stall.",
  subject: "Electricity",
  concept:
    "In this series circuit the current is I = V / R. Double the battery voltage and the current doubles. Double the resistance and the current is cut in half. A second resistor in series adds: R = R1 + R2. The bulb's brightness follows the power P = IV. With resistance fixed, doubling V multiplies the power by four, because the current doubles too. Open the switch and the current is zero. The moving dots are conventional current, from the long battery plate around the loop.",
  controls: [
    {
      id: "voltage",
      type: "slider",
      label: "Voltage",
      unit: "V",
      min: 0,
      max: 12,
      step: 0.5,
      default: 6,
      live: true,
      group: "Source",
    },
    {
      id: "closed",
      type: "toggle",
      label: "Switch closed",
      default: true,
      live: true,
      group: "Source",
    },
    {
      id: "r1",
      type: "slider",
      label: "R1",
      unit: "ohm",
      min: 10,
      max: 500,
      step: 10,
      default: 100,
      live: true,
      group: "Resistors",
    },
    {
      id: "series",
      type: "toggle",
      label: "Add R2 in series",
      default: false,
      live: true,
      group: "Resistors",
    },
    {
      id: "r2",
      type: "slider",
      label: "R2",
      unit: "ohm",
      min: 10,
      max: 500,
      step: 10,
      default: 100,
      live: true,
      group: "Resistors",
      hint: "Counts only while Add R2 in series is on.",
    },
  ],
  chart: {
    title: "Current vs voltage",
    xLabel: "Voltage",
    yLabel: "Current",
    xUnit: "V",
    yUnit: "A",
    pointsLabel: "Measured",
    emptyHint: "Close the switch and move the voltage to trace the line.",
  },
  activity: {
    title: "Activity sheet",
    intro: "Close the switch before you trust the current. Write the readings as you change one part of the circuit.",
    items: [
      {
        id: "current-6v",
        kind: "short",
        prompt: "Switch closed, R2 off, R1 at 100 ohm, voltage 6 V. Record the current.",
        placeholder: "Current in amps",
      },
      {
        id: "current-12v",
        kind: "short",
        prompt: "Double the voltage to 12 V. What is the current now?",
        placeholder: "Current in amps",
      },
      {
        id: "series-note",
        kind: "observation",
        prompt: "Set the voltage back to 6 V and turn on a second 100 ohm resistor in series. What happens to the current and the bulb?",
        placeholder: "What you noticed",
      },
    ],
  },
  tour: [
    {
      id: "canvas",
      target: "canvas",
      title: "The circuit",
      body: "The bulb glows only while the switch is closed. Brightness follows the power.",
    },
    {
      id: "controls",
      target: "controls",
      title: "Voltage and resistance",
      body: "R2 counts only when Add R2 in series is on. Open the switch and the current drops to zero.",
    },
    {
      id: "readouts",
      target: "readouts",
      title: "Current and power",
      body: "Current is I = V / R. Power is IV. Both update as soon as you move a control.",
    },
    {
      id: "activity",
      target: "activity",
      title: "Two currents",
      body: "Record the current at 6 V and at 12 V, then describe the series resistor.",
    },
    {
      id: "export",
      target: "export",
      title: "Export the line",
      body: "Download current against voltage as CSV, or a PNG of the circuit.",
    },
  ],
  exports: [
    {
      id: "iv-csv",
      label: "Current vs voltage (CSV)",
      format: "csv",
      mime: "text/csv",
      source: "chart",
      filename: "ohms-law-iv.csv",
    },
    {
      id: "canvas-png",
      label: "Canvas image (PNG)",
      format: "png",
      mime: "image/png",
      source: "canvas",
      filename: "ohms-law.png",
    },
  ],
  code,
});
