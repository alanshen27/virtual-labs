import { labSchema, type LabSpec } from "@/lib/spec";

const code = `
function accel(theta, omega, L, g, b) {
  return -(g / L) * Math.sin(theta) - b * omega;
}
function rk4(theta, omega, dt, L, g, b) {
  var k1t = omega;
  var k1w = accel(theta, omega, L, g, b);
  var k2t = omega + (k1w * dt) / 2;
  var k2w = accel(theta + (k1t * dt) / 2, omega + (k1w * dt) / 2, L, g, b);
  var k3t = omega + (k2w * dt) / 2;
  var k3w = accel(theta + (k2t * dt) / 2, omega + (k2w * dt) / 2, L, g, b);
  var k4t = omega + k3w * dt;
  var k4w = accel(theta + k3t * dt, omega + k3w * dt, L, g, b);
  return [
    theta + (dt / 6) * (k1t + 2 * k2t + 2 * k3t + k4t),
    omega + (dt / 6) * (k1w + 2 * k2w + 2 * k3w + k4w)
  ];
}
function ellipticK(k) {
  var m = k * k;
  var term = 1;
  var sum = 1;
  var n;
  for (n = 1; n <= 12; n++) {
    var factor = (2 * n - 1) / (2 * n);
    term *= factor * factor * m;
    sum += term;
  }
  return (Math.PI / 2) * sum;
}
function predictedPeriod(L, g, theta0) {
  var k = Math.sin(Math.abs(theta0) / 2);
  return 4 * Math.sqrt(Math.max(L, 0.05) / Math.max(g, 0.1)) * ellipticK(k);
}
lab.setup = function (api, controls) {
  api.state.theta = (controls.angle * Math.PI) / 180;
  api.state.omega = 0;
  api.state.prevTheta = api.state.theta;
  api.state.lastCross = null;
  api.state.measured = null;
  api.state.trail = [];
  api.state.clearChart = false;
  api.state.emitPoint = false;
};
lab.controlsChanged = function (api, controls, prev) {
  if (!prev) return;
  if (controls.gravity !== prev.gravity || controls.damping !== prev.damping) {
    api.state.clearChart = true;
    api.state.measured = null;
    api.state.lastCross = null;
    api.state.emitPoint = false;
  }
  if (controls.length !== prev.length) {
    api.state.measured = null;
    api.state.lastCross = null;
    api.state.emitPoint = false;
    api.state.trail = [];
  }
};
lab.step = function (dt, api, controls) {
  var L = Math.max(0.05, controls.length);
  var g = Math.max(0.1, controls.gravity);
  var b = Math.max(0, controls.damping);
  var theta = api.state.theta;
  var omega = api.state.omega;
  var left = Math.min(Math.max(dt, 0), 0.05);
  while (left > 1e-6) {
    var step = Math.min(1 / 240, left);
    var next = rk4(theta, omega, step, L, g, b);
    theta = next[0];
    omega = next[1];
    left -= step;
  }
  if (api.state.prevTheta <= 0 && theta > 0) {
    if (api.state.lastCross != null) {
      var T = api.time - api.state.lastCross;
      if (T > 0.12 && T < 20) {
        api.state.measured = T;
        api.state.emitPoint = true;
      }
    }
    api.state.lastCross = api.time;
  }
  api.state.theta = theta;
  api.state.omega = omega;
  api.state.prevTheta = theta;
  api.state.trail.push(theta);
  if (api.state.trail.length > 90) api.state.trail.shift();
};
lab.draw = function (ctx, api, controls) {
  var w = api.width;
  var h = api.height;
  if (w < 20 || h < 20) return;
  ctx.fillStyle = "#14110e";
  ctx.fillRect(0, 0, w, h);
  var glow = ctx.createRadialGradient(w / 2, h * 0.12, 10, w / 2, h * 0.4, Math.max(w, h) * 0.75);
  glow.addColorStop(0, "#322a20");
  glow.addColorStop(1, "#14110e");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  var L = Math.max(0.05, controls.length);
  var pix = api.map(L, 0.2, 2, Math.min(78, h * 0.2), Math.min(h * 0.66, w * 0.42));
  var pivotX = w / 2;
  var pivotY = Math.max(26, h * 0.08);
  var theta = api.state.theta || 0;
  var bobX = pivotX + pix * Math.sin(theta);
  var bobY = pivotY + pix * Math.cos(theta);
  ctx.strokeStyle = "#3d362e";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(pivotX, pivotY + pix);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "#8d8478";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pivotX - Math.min(86, w * 0.16), pivotY);
  ctx.lineTo(pivotX + Math.min(86, w * 0.16), pivotY);
  ctx.stroke();
  var trail = api.state.trail || [];
  var i;
  for (i = 0; i < trail.length; i++) {
    var th = trail[i];
    ctx.globalAlpha = (i / trail.length) * 0.5;
    ctx.fillStyle = "#f0c36a";
    ctx.beginPath();
    ctx.arc(pivotX + pix * Math.sin(th), pivotY + pix * Math.cos(th), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#f4ead8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();
  ctx.strokeStyle = "rgba(240,195,106,0.95)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  var a0 = Math.PI / 2;
  var a1 = Math.PI / 2 + theta;
  ctx.arc(pivotX, pivotY, 32, Math.min(a0, a1), Math.max(a0, a1));
  ctx.stroke();
  var radius = api.map(controls.mass, 0.2, 5, 11, 26);
  var bob = ctx.createRadialGradient(bobX - radius * 0.35, bobY - radius * 0.4, 2, bobX, bobY, radius);
  bob.addColorStop(0, "#ffe7a8");
  bob.addColorStop(0.55, "#e0a44a");
  bob.addColorStop(1, "#8a5a22");
  ctx.fillStyle = bob;
  ctx.beginPath();
  ctx.arc(bobX, bobY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d9d0c1";
  ctx.font = "13px sans-serif";
  ctx.fillText(L.toFixed(2) + " m", pivotX + 16, pivotY + Math.max(46, pix * 0.32));
};
lab.sample = function (api, controls) {
  var L = controls.length;
  var g = controls.gravity;
  var theta0 = (controls.angle * Math.PI) / 180;
  var predicted = predictedPeriod(L, g, theta0);
  var readouts = [
    { label: "Predicted period", value: predicted, unit: "s", digits: 3 },
    { label: "Length", value: L, unit: "m", digits: 2 },
    { label: "Angle", value: ((api.state.theta || 0) * 180) / Math.PI, unit: "deg", digits: 1 }
  ];
  if (typeof api.state.measured === "number") {
    readouts.unshift({ label: "Measured period", value: api.state.measured, unit: "s", digits: 3 });
  }
  var series = [];
  var i;
  for (i = 0; i <= 24; i++) {
    var x = 0.2 + (1.8 * i) / 24;
    series.push({ x: x, y: predictedPeriod(x, g, theta0) });
  }
  var point = null;
  if (api.state.emitPoint && typeof api.state.measured === "number") {
    point = { x: L, y: api.state.measured };
    api.state.emitPoint = false;
  }
  var clearChart = !!api.state.clearChart;
  api.state.clearChart = false;
  return { readouts: readouts, point: point, series: series, clearChart: clearChart };
};
`;

export const pendulumLab: LabSpec = labSchema.parse({
  id: "pendulum",
  title: "Pendulum period",
  summary: "See why a longer string swings more slowly, and why a heavier bob does not.",
  subject: "Physics",
  concept:
    "A simple pendulum is a mass on a light string. The time for one full swing, the period, is T = 2π√(L/g) when the swing is small: it depends on length L and gravity g, not on mass. A larger release angle makes the true period a little longer. That correction is built into the predicted curve on the graph. Change the length and wait for one full swing — the measured dot should land on the curve.",
  controls: [
    {
      id: "length",
      type: "slider",
      label: "Length",
      unit: "m",
      min: 0.2,
      max: 2,
      step: 0.05,
      default: 1,
      live: true,
      group: "Pendulum",
      hint: "Period grows with the square root of length.",
    },
    {
      id: "mass",
      type: "slider",
      label: "Mass",
      unit: "kg",
      min: 0.2,
      max: 5,
      step: 0.1,
      default: 1,
      live: true,
      group: "Pendulum",
      hint: "Mass changes the size of the bob, not the period.",
    },
    {
      id: "gravity",
      type: "slider",
      label: "Gravity",
      unit: "m/s²",
      min: 1.6,
      max: 25,
      step: 0.1,
      default: 9.8,
      live: true,
      group: "Pendulum",
      hint: "Earth is 9.8. The Moon is about 1.6.",
    },
    {
      id: "angle",
      type: "slider",
      label: "Release angle",
      unit: "deg",
      min: 5,
      max: 70,
      step: 1,
      default: 20,
      live: false,
      group: "Motion",
      hint: "Applies when the swing resets.",
    },
    {
      id: "damping",
      type: "slider",
      label: "Damping",
      unit: "1/s",
      min: 0,
      max: 1.5,
      step: 0.05,
      default: 0.05,
      live: true,
      group: "Motion",
      hint: "Set this to 0 to compare periods cleanly.",
    },
  ],
  chart: {
    title: "Period vs length",
    xLabel: "Length",
    yLabel: "Period",
    xUnit: "m",
    yUnit: "s",
    seriesLabel: "Theory",
    pointsLabel: "Measured",
    emptyHint: "Let it swing through one full period to plot a point.",
  },
  questions: [
    {
      id: "mass",
      type: "multiple_choice",
      prompt: "You double the bob's mass and leave everything else the same. What happens to the period?",
      choices: [
        { id: "a", text: "It stays about the same" },
        { id: "b", text: "It doubles" },
        { id: "c", text: "It is cut in half" },
      ],
      correctId: "a",
      explanation: "The mass cancels out of the equation of motion. A heavier bob has more inertia and more gravitational torque, in equal measure.",
    },
    {
      id: "length4",
      type: "predict",
      prompt: "Air resistance is off. If you make the string 4 times as long, what happens to the period?",
      choices: [
        { id: "a", text: "It becomes 4 times as long" },
        { id: "b", text: "It doubles" },
        { id: "c", text: "It stays the same" },
        { id: "d", text: "It is cut in half" },
      ],
      correctId: "b",
      explanation: "T depends on √L. Multiplying length by 4 multiplies the period by 2.",
      tryIt: "Set damping to 0. Compare the period at 0.5 m with the period at 2.0 m.",
    },
    {
      id: "moon",
      type: "multiple_choice",
      prompt: "You move the same pendulum to the Moon, where g is about 1.6 m/s². The period…",
      choices: [
        { id: "a", text: "Gets longer" },
        { id: "b", text: "Gets shorter" },
        { id: "c", text: "Does not change" },
      ],
      correctId: "a",
      explanation: "Weaker gravity means a weaker restoring force, so each swing takes longer. T is proportional to 1/√g.",
    },
    {
      id: "angle",
      type: "predict",
      prompt: "With damping at 0, you change the release angle from 10° to 60°. The period…",
      choices: [
        { id: "a", text: "Increases a little" },
        { id: "b", text: "Doubles" },
        { id: "c", text: "Stays exactly the same" },
      ],
      correctId: "a",
      explanation: "The small-angle formula ignores this, but a real pendulum's period grows slightly as the amplitude grows. The predicted readout includes that.",
      tryIt: "Set damping to 0 and reset at 10°, then reset at 60°. Compare Predicted period.",
    },
    {
      id: "shape",
      type: "multiple_choice",
      prompt: "On the period-vs-length graph, as length increases the period…",
      choices: [
        { id: "a", text: "Rises in a straight line through the origin" },
        { id: "b", text: "Rises, but more and more slowly" },
        { id: "c", text: "Falls" },
      ],
      correctId: "b",
      explanation: "A square-root curve keeps climbing, but each extra meter of string adds less period than the one before.",
    },
  ],
  code,
});
