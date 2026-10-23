import { labSchema, type LabSpec } from "@/lib/spec";

const code = `
function sources(controls) {
  var sep = controls.separation;
  return {
    x0: 12,
    y1: 30 - sep / 2,
    y2: 30 + sep / 2,
    screen: 68
  };
}
function amplitude(r) {
  return 1 / Math.sqrt(r + 0.5);
}
function field(x, y, time, controls) {
  var s = sources(controls);
  var k = (2 * Math.PI) / controls.wavelength;
  var omega = (2 * Math.PI * controls.speed) / controls.wavelength;
  var r1 = Math.hypot(x - s.x0, y - s.y1);
  var value = amplitude(r1) * Math.sin(k * r1 - omega * time);
  if (controls.sources === "two") {
    var r2 = Math.hypot(x - s.x0, y - s.y2);
    var phi = (controls.phase * Math.PI) / 180;
    value += amplitude(r2) * Math.sin(k * r2 - omega * time + phi);
  }
  return value;
}
function intensity(y, controls) {
  var s = sources(controls);
  var r1 = Math.hypot(s.screen - s.x0, y - s.y1);
  var A1 = amplitude(r1);
  var A2 = 0;
  var r2 = r1;
  if (controls.sources === "two") {
    r2 = Math.hypot(s.screen - s.x0, y - s.y2);
    A2 = amplitude(r2);
  }
  var k = (2 * Math.PI) / controls.wavelength;
  var phi = (controls.phase * Math.PI) / 180;
  var span = Math.max(1, s.screen - s.x0);
  return (A1 * A1 + A2 * A2 + 2 * A1 * A2 * Math.cos(k * (r1 - r2) - phi)) * span;
}
lab.setup = function (api) {
  api.state.ready = true;
};
lab.step = function () {};
lab.draw = function (ctx, api, controls) {
  var w = api.width;
  var h = api.height;
  if (w < 20 || h < 20) return;
  var cols = 72;
  var rows = 46;
  var cw = w / cols;
  var ch = h / rows;
  var j;
  var i;
  for (j = 0; j < rows; j++) {
    for (i = 0; i < cols; i++) {
      var cmx = ((i + 0.5) / cols) * 80;
      var cmy = ((j + 0.5) / rows) * 60;
      var v = Math.tanh(field(cmx, cmy, api.time, controls) * 1.35);
      var crest = v > 0 ? v : 0;
      var trough = v < 0 ? -v : 0;
      var r = Math.round(10 + crest * 210 + trough * 6);
      var g = Math.round(36 + crest * 170 + trough * 24);
      var b = Math.round(78 + crest * 130 + trough * 50);
      ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
      ctx.fillRect(i * cw, j * ch, cw + 0.6, ch + 0.6);
    }
  }
  function X(cm) { return (cm / 80) * w; }
  function Y(cm) { return (cm / 60) * h; }
  var s = sources(controls);
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(X(s.x0), Y(s.y1), 5, 0, Math.PI * 2);
  ctx.fill();
  if (controls.sources === "two") {
    ctx.beginPath();
    ctx.arc(X(s.x0), Y(s.y2), 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(251, 191, 36, 0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X(s.screen), Y(4));
  ctx.lineTo(X(s.screen), Y(56));
  ctx.stroke();
};
lab.sample = function (api, controls) {
  var series = [];
  var i;
  for (i = 0; i <= 52; i++) {
    var y = 4 + i;
    series.push({ x: y, y: intensity(y, controls) });
  }
  var spacing = 0;
  if (controls.sources === "two" && controls.separation > 0) {
    spacing = (controls.wavelength * (68 - 12)) / controls.separation;
  }
  return {
    readouts: [
      { label: "Fringe spacing", value: spacing, unit: "cm", digits: 2 },
      { label: "Wavelength", value: controls.wavelength, unit: "cm", digits: 1 },
      { label: "Phase", value: controls.phase, unit: "deg", digits: 0 }
    ],
    point: null,
    series: series,
    clearChart: false
  };
};
`;

export const interferenceLab: LabSpec = labSchema.parse({
  id: "interference",
  title: "Wave interference",
  summary: "Two ripples add into bright and dark bands. Change the wavelength and watch the bands spread.",
  subject: "Waves",
  concept:
    "Each source sends a circular wave. Where they overlap, the displacements add. On the detection line, a path difference of a whole number of wavelengths puts crest on crest: constructive interference, a bright peak on the graph. A difference of half a wavelength, or a 180° phase shift between the sources, puts crest on trough and the center goes dark. The spacing of those fringes is about λL / d. A longer wavelength, or sources closer together, spreads the fringes out. One source alone has no interference pattern, just a smooth hump.",
  controls: [
    {
      id: "sources",
      type: "select",
      label: "Sources",
      options: [
        { value: "one", label: "One" },
        { value: "two", label: "Two" },
      ],
      default: "two",
      live: true,
      group: "Sources",
    },
    {
      id: "separation",
      type: "slider",
      label: "Separation",
      unit: "cm",
      min: 4,
      max: 24,
      step: 0.5,
      default: 10,
      live: true,
      group: "Sources",
      hint: "Closer sources make wider fringes.",
    },
    {
      id: "phase",
      type: "slider",
      label: "Phase difference",
      unit: "deg",
      min: 0,
      max: 180,
      step: 15,
      default: 0,
      live: true,
      group: "Sources",
      hint: "180° swaps bright and dark.",
    },
    {
      id: "wavelength",
      type: "slider",
      label: "Wavelength",
      unit: "cm",
      min: 2,
      max: 12,
      step: 0.5,
      default: 4,
      live: true,
      group: "Wave",
      hint: "Longer waves make wider fringes.",
    },
    {
      id: "speed",
      type: "slider",
      label: "Wave speed",
      unit: "cm/s",
      min: 8,
      max: 40,
      step: 1,
      default: 18,
      live: true,
      group: "Wave",
      hint: "Changes how fast the ripples move, not the fringe spacing.",
    },
  ],
  chart: {
    title: "Time-averaged intensity on the detection line",
    xLabel: "Position",
    yLabel: "Intensity",
    xUnit: "cm",
    yUnit: "",
    seriesLabel: "Intensity",
    emptyHint: "The detection line is the amber bar on the right.",
  },
  activity: {
    title: "Activity sheet",
    intro: "Watch the detection line and the graph together. Describe the pattern in your own words.",
    items: [
      {
        id: "center-0",
        kind: "short",
        prompt: "Two sources, phase difference 0°. Is the center of the detection line bright or dark?",
        placeholder: "Bright or dark",
      },
      {
        id: "center-180",
        kind: "short",
        prompt: "Set the phase difference to 180°. What happens at that same center spot?",
        placeholder: "What you see",
      },
      {
        id: "one-source",
        kind: "observation",
        prompt: "Switch to one source. How does the intensity graph change compared with two sources?",
        placeholder: "What you noticed",
      },
    ],
  },
  tour: [
    {
      id: "canvas",
      target: "canvas",
      title: "Two ripples",
      body: "The sources are on the left. Bright bands are where crests meet. The amber bar is the detection line.",
    },
    {
      id: "controls",
      target: "controls",
      title: "Wavelength and phase",
      body: "Separation and wavelength change the fringe spacing. Phase 180° swaps bright and dark.",
    },
    {
      id: "chart",
      target: "chart",
      title: "Intensity along the line",
      body: "Peaks on the graph are the bright fringes. A single source makes a smooth hump.",
    },
    {
      id: "activity",
      target: "activity",
      title: "Describe the pattern",
      body: "Note the center at 0° and at 180°, then what one source does.",
    },
    {
      id: "export",
      target: "export",
      title: "Export the pattern",
      body: "Download the intensity curve as CSV, or a PNG of the ripples.",
    },
  ],
  exports: [
    {
      id: "intensity-csv",
      label: "Intensity along the line (CSV)",
      format: "csv",
      mime: "text/csv",
      source: "series",
      filename: "interference-intensity.csv",
    },
    {
      id: "canvas-png",
      label: "Canvas image (PNG)",
      format: "png",
      mime: "image/png",
      source: "canvas",
      filename: "interference.png",
    },
  ],
  code,
});
