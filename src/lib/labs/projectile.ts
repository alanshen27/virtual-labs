import { labSchema, type LabSpec } from "@/lib/spec";

const code = `
function deriv(vx, vy, g, k) {
  var speed = Math.hypot(vx, vy);
  return { x: vx, y: vy, vx: -k * speed * vx, vy: -g - k * speed * vy };
}
function rk4(s, dt, g, k) {
  var k1 = deriv(s.vx, s.vy, g, k);
  var k2 = deriv(s.vx + k1.vx * dt / 2, s.vy + k1.vy * dt / 2, g, k);
  var k3 = deriv(s.vx + k2.vx * dt / 2, s.vy + k2.vy * dt / 2, g, k);
  var k4 = deriv(s.vx + k3.vx * dt, s.vy + k3.vy * dt, g, k);
  return {
    x: s.x + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y: s.y + (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    vx: s.vx + (dt / 6) * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx),
    vy: s.vy + (dt / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy)
  };
}
function launch(api, controls) {
  var th = (controls.angle * Math.PI) / 180;
  api.state.x = 0;
  api.state.y = 0;
  api.state.vx = controls.speed * Math.cos(th);
  api.state.vy = controls.speed * Math.sin(th);
  api.state.maxH = 0;
  api.state.trail = [{ x: 0, y: 0 }];
  api.state.landed = false;
  api.state.mark = 0;
}
function noDragRange(controls) {
  var th = (controls.angle * Math.PI) / 180;
  return (controls.speed * controls.speed * Math.sin(2 * th)) / Math.max(controls.gravity, 0.1);
}
lab.setup = function (api, controls) {
  launch(api, controls);
};
lab.step = function (dt, api, controls) {
  if (api.state.landed) return;
  var g = Math.max(0.1, controls.gravity);
  var k = controls.air ? controls.drag / Math.max(0.05, controls.mass) : 0;
  var left = Math.min(Math.max(dt, 0), 0.05);
  var s = { x: api.state.x, y: api.state.y, vx: api.state.vx, vy: api.state.vy };
  while (left > 1e-6 && !api.state.landed) {
    var step = Math.min(1 / 240, left);
    s = rk4(s, step, g, k);
    left -= step;
    if (s.y > api.state.maxH) api.state.maxH = s.y;
    if (s.y <= 0 && s.vy < 0 && api.time > 0.05) {
      var dtBack = Math.min(step, s.y / s.vy);
      s.x = s.x - s.vx * dtBack;
      s.y = 0;
      s.vx = 0;
      s.vy = 0;
      api.state.landed = true;
    }
  }
  api.state.x = s.x;
  api.state.y = Math.max(0, s.y);
  api.state.vx = s.vx;
  api.state.vy = s.vy;
  api.state.mark += dt;
  if (api.state.mark > 0.03) {
    api.state.trail.push({ x: api.state.x, y: api.state.y });
    if (api.state.trail.length > 180) api.state.trail.shift();
    api.state.mark = 0;
  }
};
lab.draw = function (ctx, api, controls) {
  var w = api.width;
  var h = api.height;
  if (w < 20 || h < 20) return;
  var sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#8ec6ef");
  sky.addColorStop(1, "#e7f4ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  var v = Math.max(1, controls.speed);
  var g = Math.max(0.1, controls.gravity);
  var th = (controls.angle * Math.PI) / 180;
  var worldW = Math.max(24, (v * v / g) * 1.25);
  var worldH = Math.max(10, ((v * Math.sin(th)) * (v * Math.sin(th))) / (2 * g) * 1.8);
  var left = 46;
  var bottom = h - 32;
  var scale = Math.min((w - 70) / worldW, (h - 58) / worldH);
  function X(m) { return left + m * scale; }
  function Y(m) { return bottom - m * scale; }
  ctx.fillStyle = "#3e7a49";
  ctx.fillRect(0, bottom, w, h - bottom);
  ctx.strokeStyle = "#24512f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  ctx.lineTo(w, bottom);
  ctx.stroke();
  ctx.fillStyle = "#24512f";
  ctx.font = "11px sans-serif";
  var tick = worldW > 80 ? 20 : 10;
  var m;
  for (m = 0; m <= worldW; m += tick) {
    var px = X(m);
    ctx.fillRect(px, bottom, 1, 5);
    ctx.fillText(String(m), px - 6, bottom + 16);
  }
  var T = (2 * v * Math.sin(th)) / g;
  ctx.strokeStyle = "rgba(30, 50, 70, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  var i;
  for (i = 0; i <= 48; i++) {
    var t = (T * i) / 48;
    var gx = v * Math.cos(th) * t;
    var gy = v * Math.sin(th) * t - 0.5 * g * t * t;
    if (i === 0) ctx.moveTo(X(gx), Y(Math.max(0, gy)));
    else ctx.lineTo(X(gx), Y(Math.max(0, gy)));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  var trail = api.state.trail || [];
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (i = 0; i < trail.length; i++) {
    var p = trail[i];
    if (i === 0) ctx.moveTo(X(p.x), Y(p.y));
    else ctx.lineTo(X(p.x), Y(p.y));
  }
  ctx.stroke();
  var bx = X(api.state.x || 0);
  var by = Y(api.state.y || 0);
  ctx.save();
  ctx.translate(X(0), Y(0));
  ctx.rotate(-th);
  ctx.fillStyle = "#334155";
  ctx.fillRect(-6, -7, 22, 10);
  ctx.restore();
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(bx, by, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = 1;
  ctx.stroke();
};
lab.sample = function (api, controls) {
  var range = noDragRange(controls);
  return {
    readouts: [
      { label: "Distance", value: api.state.x || 0, unit: "m", digits: 2 },
      { label: "No-drag range", value: range, unit: "m", digits: 2 },
      { label: "Height", value: api.state.y || 0, unit: "m", digits: 2 },
      { label: "Max height", value: api.state.maxH || 0, unit: "m", digits: 2 }
    ],
    point: null,
    series: (api.state.trail || []).map(function (p) { return { x: p.x, y: p.y }; }),
    clearChart: false
  };
};
`;

export const projectileLab: LabSpec = labSchema.parse({
  id: "projectile",
  title: "Projectile motion",
  summary: "Launch a ball, then turn on air resistance and watch the range fall short.",
  subject: "Physics",
  concept:
    "With no air resistance, horizontal and vertical motion are independent. On level ground the range is R = v² sin(2θ) / g, so 45° goes farthest and 30° matches 60°. Range grows with the square of speed. The dashed curve is that no-drag path. Air resistance pushes against the velocity, so the solid path lands short. A heavier mass, with the same drag factor, decelerates less because a = −(drag / mass) v².",
  controls: [
    {
      id: "speed",
      type: "slider",
      label: "Launch speed",
      unit: "m/s",
      min: 8,
      max: 30,
      step: 1,
      default: 20,
      live: false,
      group: "Launch",
      hint: "Changing this relaunches.",
    },
    {
      id: "angle",
      type: "slider",
      label: "Launch angle",
      unit: "deg",
      min: 15,
      max: 75,
      step: 1,
      default: 45,
      live: false,
      group: "Launch",
      hint: "Changing this relaunches.",
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
      group: "World",
    },
    {
      id: "air",
      type: "toggle",
      label: "Air resistance",
      default: false,
      live: true,
      group: "World",
      hint: "The dashed line stays the no-drag path.",
    },
    {
      id: "drag",
      type: "slider",
      label: "Drag factor",
      unit: "kg/m",
      min: 0.001,
      max: 0.02,
      step: 0.001,
      default: 0.004,
      live: true,
      group: "World",
      hint: "Used only while air resistance is on.",
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
      group: "World",
      hint: "Mass matters only when drag is on.",
    },
  ],
  chart: {
    title: "Trajectory",
    xLabel: "Distance",
    yLabel: "Height",
    xUnit: "m",
    yUnit: "m",
    seriesLabel: "Path",
    emptyHint: "The path appears as soon as the ball leaves the ground.",
  },
  activity: {
    title: "Activity sheet",
    intro: "Launch, read the distance, and compare. Your notes stay on this device.",
    items: [
      {
        id: "range-45",
        kind: "short",
        prompt: "Turn air resistance off, set 20 m/s at 45°, and reset. Record the landing distance.",
        placeholder: "Distance in metres",
      },
      {
        id: "range-drag",
        kind: "short",
        prompt: "Turn air resistance on with the same launch and reset. What is the landing distance now?",
        placeholder: "Distance in metres",
      },
      {
        id: "drag-note",
        kind: "observation",
        prompt: "How did the path change when drag was on? Mention the dashed no-drag curve if you can see it.",
        placeholder: "What you noticed",
      },
    ],
  },
  tour: [
    {
      id: "canvas",
      target: "canvas",
      title: "The flight",
      body: "The ball leaves the ground on reset. The dashed curve is the same launch with no drag.",
    },
    {
      id: "controls",
      target: "controls",
      title: "Launch settings",
      body: "Speed and angle apply when you reset. Air resistance and mass can change a flight that is already going.",
    },
    {
      id: "readouts",
      target: "readouts",
      title: "Distance and height",
      body: "Distance is how far it has travelled horizontally. No-drag range is the vacuum prediction.",
    },
    {
      id: "activity",
      target: "activity",
      title: "Compare two launches",
      body: "Write the two landing distances on the activity sheet before you export.",
    },
    {
      id: "export",
      target: "export",
      title: "Save the trajectory",
      body: "Export a CSV of the path, or a PNG of the canvas.",
    },
  ],
  exports: [
    {
      id: "trajectory-csv",
      label: "Trajectory (CSV)",
      format: "csv",
      mime: "text/csv",
      source: "series",
      filename: "projectile-trajectory.csv",
    },
    {
      id: "canvas-png",
      label: "Canvas image (PNG)",
      format: "png",
      mime: "image/png",
      source: "canvas",
      filename: "projectile.png",
    },
  ],
  code,
});
