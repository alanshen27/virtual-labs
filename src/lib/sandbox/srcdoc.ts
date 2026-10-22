import type { ControlMap } from "@/lib/spec";

function embed(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Builds a sandboxed iframe document. The lab source is embedded as a JSON
 * string and compiled with new Function only inside this document — never on
 * the host page. The iframe CSP allows unsafe-eval for that compile; the
 * sandbox has no allow-same-origin, so the frame cannot touch the host.
 * The host talks to it with postMessage.
 */
export function buildSrcdoc(code: string, initialControls: ControlMap): string {
  const source = embed(code);
  const controls = embed(initialControls);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data:;">
<style>
  html, body { margin: 0; height: 100%; background: #111; overflow: hidden; }
  canvas { display: block; width: 100%; height: 100%; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
(function () {
  const SOURCE = ${source};
  let controls = ${controls};
  let playing = true;
  let speed = 1;
  let errored = false;
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha: false });
  let lab = null;
  let api = null;
  let last = performance.now();
  let sampleWait = 0;
  let loopId = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function makeApi() {
    return {
      state: {},
      time: 0,
      width: 300,
      height: 200,
      clamp: clamp,
      lerp: function (a, b, t) { return a + (b - a) * t; },
      map: function (v, a, b, c, d) {
        if (a === b) return c;
        return c + ((v - a) / (b - a)) * (d - c);
      }
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(10, canvas.clientWidth || window.innerWidth || 300);
    const h = Math.max(10, canvas.clientHeight || window.innerHeight || 200);
    const bw = Math.max(1, Math.floor(w * dpr));
    const bh = Math.max(1, Math.floor(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    api.width = w;
    api.height = h;
  }

  function boot() {
    api = makeApi();
    lab = {};
    const factory = new Function("lab", SOURCE);
    factory(lab);
    if (typeof lab.setup !== "function" || typeof lab.draw !== "function") {
      throw new Error("Simulation must assign lab.setup and lab.draw");
    }
    resize();
    lab.setup(api, controls);
  }

  function postError(err) {
    errored = true;
    const message = (err && err.message) ? String(err.message) : String(err);
    parent.postMessage({ type: "error", message: message.slice(0, 300) }, "*");
  }

  function postSample(force) {
    if (typeof lab.sample !== "function") {
      parent.postMessage({ type: "sample", time: api.time, readouts: [], point: null, series: null, clearChart: false }, "*");
      return;
    }
    const sample = lab.sample(api, controls) || {};
    parent.postMessage({
      type: "sample",
      time: api.time,
      readouts: sample.readouts || [],
      point: sample.point || null,
      series: sample.series || null,
      clearChart: !!sample.clearChart
    }, "*");
    if (force) sampleWait = 0;
  }

  function startLoop() {
    const id = ++loopId;
    last = performance.now();
    function frame(now) {
      if (id !== loopId || errored) return;
      requestAnimationFrame(frame);
      const wall = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      try {
        resize();
        if (playing) {
          const dt = wall * speed;
          api.time += dt;
          if (typeof lab.step === "function") lab.step(dt, api, controls);
        }
        lab.draw(ctx, api, controls);
        sampleWait += wall;
        if (sampleWait >= 0.1) {
          sampleWait = 0;
          postSample(false);
        }
      } catch (err) {
        postError(err);
      }
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("message", function (event) {
    const msg = event.data;
    if (!msg || typeof msg !== "object") return;
    try {
      if (msg.type === "controls" && msg.values && typeof msg.values === "object") {
        const prev = controls;
        controls = msg.values;
        if (lab && typeof lab.controlsChanged === "function") {
          lab.controlsChanged(api, controls, prev);
        }
      } else if (msg.type === "playback") {
        playing = !!msg.playing;
        if (typeof msg.speed === "number" && isFinite(msg.speed)) {
          speed = clamp(msg.speed, 0.1, 3);
        }
      } else if (msg.type === "reset") {
        if (msg.values && typeof msg.values === "object") controls = msg.values;
        if (typeof msg.playing === "boolean") playing = msg.playing;
        if (typeof msg.speed === "number" && isFinite(msg.speed)) speed = clamp(msg.speed, 0.1, 3);
        errored = false;
        boot();
        postSample(true);
        startLoop();
      }
    } catch (err) {
      postError(err);
    }
  });

  try {
    boot();
    parent.postMessage({ type: "ready" }, "*");
    postSample(true);
    startLoop();
  } catch (err) {
    postError(err);
  }
})();
</script>
</body>
</html>`;
}
