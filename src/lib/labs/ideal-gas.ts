import { labSchema, type LabSpec } from "@/lib/spec";

const code = `
var R = 8.314462618;
var SPEED = 8;
function pressureKPa(n, T, liters) {
  return (n * R * T) / liters;
}
function makeRng(seed) {
  var s = seed >>> 0;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function chamber(api, volume) {
  var left = 48;
  var right = Math.max(left + 48, api.width - 48);
  var bottom = api.height - 28;
  var minH = 64;
  var maxH = Math.max(minH + 24, api.height - 72);
  var t = Math.max(0, Math.min(1, (volume - 2) / 18));
  var innerH = minH + t * (maxH - minH);
  return { left: left, right: right, bottom: bottom, top: bottom - innerH };
}
function countFor(moles) {
  return Math.max(8, Math.round(8 + moles * 10));
}
function measureT(particles) {
  if (!particles.length) return 0;
  var s = 0;
  var i;
  for (i = 0; i < particles.length; i++) {
    var p = particles[i];
    s += p.vx * p.vx + p.vy * p.vy;
  }
  return s / particles.length / (SPEED * SPEED);
}
function fill(api, controls) {
  var geom = chamber(api, controls.volume);
  var rand = api.state.rand;
  var n = countFor(controls.moles);
  var speed = SPEED * Math.sqrt(Math.max(1, controls.temperature));
  var particles = [];
  var i;
  var width = Math.max(16, geom.right - geom.left - 16);
  var height = Math.max(16, geom.bottom - geom.top - 16);
  for (i = 0; i < n; i++) {
    var ang = rand() * Math.PI * 2;
    var vary = 0.75 + rand() * 0.5;
    particles.push({
      x: geom.left + 8 + rand() * width,
      y: geom.top + 8 + rand() * height,
      vx: Math.cos(ang) * speed * vary,
      vy: Math.sin(ang) * speed * vary
    });
  }
  var measured = measureT(particles);
  if (measured > 0) {
    var f = Math.sqrt(controls.temperature / measured);
    for (i = 0; i < particles.length; i++) {
      particles[i].vx *= f;
      particles[i].vy *= f;
    }
  }
  api.state.particles = particles;
  api.state.top = geom.top;
}
function temperatureOf(api, controls) {
  if (controls.hold) return controls.temperature;
  return measureT(api.state.particles || []);
}
lab.setup = function (api, controls) {
  api.state.rand = makeRng(42);
  api.state.clearChart = false;
  api.state.particles = [];
  fill(api, controls);
};
function rescale(particles, factor) {
  var i;
  for (i = 0; i < particles.length; i++) {
    particles[i].vx *= factor;
    particles[i].vy *= factor;
  }
}
lab.controlsChanged = function (api, controls, prev) {
  if (!prev) return;
  if (countFor(controls.moles) !== countFor(prev.moles)) fill(api, controls);
  if (controls.moles !== prev.moles || controls.hold !== prev.hold) api.state.clearChart = true;
  if (controls.hold && controls.temperature !== prev.temperature) api.state.clearChart = true;
  if (!controls.hold && prev.volume > 0 && controls.volume !== prev.volume) {
    var particles = api.state.particles || [];
    var measured = measureT(particles);
    if (measured > 0) {
      var target = measured * (prev.volume / controls.volume);
      target = api.clamp(target, 40, 5000);
      rescale(particles, Math.sqrt(target / measured));
    }
  }
};
lab.step = function (dt, api, controls) {
  if (!api.state.particles || !api.state.particles.length) return;
  var left = Math.min(Math.max(dt, 0), 0.05);
  while (left > 1e-6) {
    var step = Math.min(1 / 120, left);
    var geom = chamber(api, controls.volume);
    api.state.top = geom.top;
    var r = 4;
    var particles = api.state.particles;
    var i;
    for (i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx * step;
      p.y += p.vy * step;
      if (p.x < geom.left + r) { p.x = geom.left + r; p.vx = Math.abs(p.vx); }
      if (p.x > geom.right - r) { p.x = geom.right - r; p.vx = -Math.abs(p.vx); }
      if (p.y > geom.bottom - r) { p.y = geom.bottom - r; p.vy = -Math.abs(p.vy); }
      if (p.y < geom.top + r) { p.y = geom.top + r; if (p.vy < 0) p.vy = -p.vy; }
    }
    if (controls.hold) {
      var measured = measureT(particles);
      if (measured > 0.5) rescale(particles, Math.sqrt(controls.temperature / measured));
    }
    left -= step;
  }
};
lab.draw = function (ctx, api, controls) {
  var w = api.width;
  var h = api.height;
  if (w < 20 || h < 20) return;
  ctx.fillStyle = "#10161c";
  ctx.fillRect(0, 0, w, h);
  var geom = chamber(api, controls.volume);
  ctx.fillStyle = "#1c2833";
  ctx.fillRect(geom.left, geom.top, geom.right - geom.left, geom.bottom - geom.top);
  var particles = api.state.particles || [];
  var i;
  for (i = 0; i < particles.length; i++) {
    var p = particles[i];
    var sp = Math.hypot(p.vx, p.vy) / (SPEED * Math.sqrt(500));
    var hot = api.clamp(sp, 0, 1);
    var red = Math.round(80 + hot * 175);
    var green = Math.round(140 + hot * 40);
    var blue = Math.round(220 - hot * 160);
    ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#d7dee6";
  ctx.fillRect(geom.left - 6, geom.top - 8, geom.right - geom.left + 12, 10);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect((geom.left + geom.right) / 2 - 4, geom.top - 28, 8, 22);
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 3;
  ctx.strokeRect(geom.left, geom.top, geom.right - geom.left, geom.bottom - geom.top);
};
lab.sample = function (api, controls) {
  var T = temperatureOf(api, controls);
  var P = pressureKPa(controls.moles, T, controls.volume);
  var clearChart = !!api.state.clearChart;
  api.state.clearChart = false;
  return {
    readouts: [
      { label: "Pressure", value: P, unit: "kPa", digits: 1 },
      { label: "Volume", value: controls.volume, unit: "L", digits: 1 },
      { label: "Temperature", value: T, unit: "K", digits: 1 },
      { label: "Amount", value: controls.moles, unit: "mol", digits: 2 }
    ],
    point: { x: controls.volume, y: P },
    series: null,
    clearChart: clearChart
  };
};
`;

export const idealGasLab: LabSpec = labSchema.parse({
  id: "ideal-gas",
  title: "Ideal gas law",
  summary: "Move the piston and watch pressure follow PV = nRT.",
  subject: "Chemistry",
  concept:
    "For an ideal gas, pressure, volume, temperature, and amount are tied together by PV = nRT. Hold temperature steady and squeeze the volume: pressure rises along a curve, an isotherm, not a straight line. Double the temperature at fixed volume and the pressure doubles. Turn off Hold temperature and the moving piston does work on the gas, so compressing it speeds the particles up and the temperature climbs. In this two-dimensional picture that work makes temperature proportional to 1/V, so halving the volume doubles the temperature. The dots are a kinetic picture; the pressure number is PV = nRT.",
  controls: [
    {
      id: "volume",
      type: "slider",
      label: "Volume",
      unit: "L",
      min: 2,
      max: 20,
      step: 0.5,
      default: 10,
      live: true,
      group: "Chamber",
      hint: "This is the piston. Smaller volume means a lower lid.",
    },
    {
      id: "temperature",
      type: "slider",
      label: "Temperature",
      unit: "K",
      min: 200,
      max: 500,
      step: 5,
      default: 300,
      live: true,
      group: "Gas",
      hint: "Sets the temperature while Hold temperature is on.",
    },
    {
      id: "moles",
      type: "slider",
      label: "Amount",
      unit: "mol",
      min: 0.5,
      max: 3,
      step: 0.1,
      default: 1,
      live: true,
      group: "Gas",
    },
    {
      id: "hold",
      type: "toggle",
      label: "Hold temperature",
      default: true,
      live: true,
      group: "Gas",
      hint: "Off: the piston can heat or cool the gas.",
    },
  ],
  chart: {
    title: "Pressure vs volume",
    xLabel: "Volume",
    yLabel: "Pressure",
    xUnit: "L",
    yUnit: "kPa",
    pointsLabel: "This run",
    emptyHint: "Move the piston to trace pressure against volume.",
  },
  questions: [
    {
      id: "boyle",
      type: "multiple_choice",
      prompt: "Temperature and amount stay fixed. You cut the volume in half. The pressure…",
      choices: [
        { id: "a", text: "Is cut in half" },
        { id: "b", text: "Doubles" },
        { id: "c", text: "Stays the same" },
      ],
      correctId: "b",
      explanation: "Boyle's law: at constant T and n, PV is constant, so halving V doubles P.",
    },
    {
      id: "charles",
      type: "predict",
      prompt: "Volume and amount stay fixed. You double the temperature from 250 K to 500 K. The pressure…",
      choices: [
        { id: "a", text: "Doubles" },
        { id: "b", text: "Is cut in half" },
        { id: "c", text: "Becomes 4 times as large" },
      ],
      correctId: "a",
      explanation: "P = nRT / V. With n and V fixed, pressure is proportional to temperature.",
      tryIt: "Leave Hold temperature on. Set 250 K, read the pressure, then set 500 K.",
    },
    {
      id: "isotherm",
      type: "multiple_choice",
      prompt: "With temperature held constant, the pressure-volume graph is…",
      choices: [
        { id: "a", text: "A straight line sloping up" },
        { id: "b", text: "A curve that falls as volume grows" },
        { id: "c", text: "A flat horizontal line" },
      ],
      correctId: "b",
      explanation: "An isotherm is P = constant / V. It drops quickly at first, then more gently.",
    },
    {
      id: "adiabatic",
      type: "predict",
      prompt: "You turn Hold temperature off and compress the gas with the piston. The temperature…",
      choices: [
        { id: "a", text: "Rises" },
        { id: "b", text: "Falls" },
        { id: "c", text: "Cannot change, because the gas is ideal" },
      ],
      correctId: "a",
      explanation: "The piston does work on the particles, so their kinetic energy — the temperature — goes up. Holding temperature on would remove that heat.",
      tryIt: "Turn Hold temperature off, then decrease the volume and watch Temperature.",
    },
  ],
  code,
});
