# Virtual Labs

A learner types a prompt and gets an interactive science simulation: a live canvas, controls that change the run, a short explainer, and questions with instant feedback.

Built-in labs work with no API key. Custom labs need an OpenAI-compatible chat model.

## Setup

```bash
npm install
cp .env.example .env.local   # optional, only for custom generation
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run lint
npm run build
```

## Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | For custom labs only | empty | Bearer token. When empty, `/api/generate` returns 503 and the home page says so. |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | OpenAI-compatible base URL. The client posts to `{base}/chat/completions`. |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model name sent in the request. |

The key stays on the server. The browser asks `/api/status` whether generation is enabled.

## Architecture

- **Spec.** Every lab, built-in or generated, is one object validated by zod in `src/lib/spec.ts`.
- **Sandbox.** Generated JavaScript never runs on the host page. `src/lib/sandbox/srcdoc.ts` wraps it in an iframe document with `sandbox="allow-scripts"` (no `allow-same-origin`). The iframe's own content security policy allows `unsafe-eval` so it can compile the program with `new Function`. That permission does not apply to the host page, and the frame's opaque origin cannot read the host. The iframe talks to the parent through `postMessage`. The host sanitizes samples before drawing readouts or the chart.
- **Playback.** Play, pause, reset, and speed (0.5×, 1×, 2×) are host controls. `live: false` on a control (release angle, launch speed) restarts the run so the new value is the initial condition.
- **Generation.** `POST /api/generate` sends the prompt plus two few-shot labs (pendulum and Ohm's law) to the model. The reply must be JSON. If zod rejects it, the route asks once more with the validation errors, then gives up. New ids are always `c-` plus random hex so a model cannot overwrite a built-in lab.
- **Storage.** No account and no database. Custom labs live in `localStorage` (`virtuallabs.custom.v1`, up to 24). Share copies a link of the form `/share#<base64url json>`, which this browser saves and opens.

## Built-in labs

| Id | Idea |
| --- | --- |
| `pendulum` | Period vs length, with the elliptic-integral prediction and a measured period. |
| `projectile` | Vacuum trajectory plus quadratic drag. 30° and 60° share a range only when drag is off. |
| `ideal-gas` | \(P = nRT/V\). Holding temperature off, compressing the piston heats the gas (\(TV\) roughly constant in this 2D model). |
| `ohms-law` | \(I = V/R\). A second resistor in series doubles the resistance. |
| `interference` | Two point sources. Fringe spacing is about \(\lambda L / d\). A 180° phase shift darkens the center. |

The same schema is what the model has to fill in. Pendulum and Ohm's law are the few-shot examples inside the prompt; the other three are not, so the prompt stays smaller.

## Lab spec

```ts
{
  id: "pendulum",              // lowercase, host replaces this for generated labs
  title: "Simple pendulum",
  summary: "One line, 10–180 chars",
  subject: "Physics",
  concept: "Plain prose the learner reads, 40–1200 chars",
  controls: [
    { id: "length", type: "slider", label: "Length", unit: "m",
      min: 0.2, max: 3, step: 0.05, default: 1, live: true, group: "Pendulum" },
    { id: "angle", type: "slider", label: "Release angle", unit: "deg",
      min: 5, max: 80, step: 1, default: 20, live: false, group: "Motion" }
  ],
  chart: { title: "Period vs length", xLabel: "Length", yLabel: "Period", xUnit: "m", yUnit: "s" },
  questions: [
    { id: "q1", type: "multiple_choice", prompt: "…",
      choices: [{ id: "a", text: "…" }, { id: "b", text: "…" }],
      correctId: "a", explanation: "…" },
    { id: "q2", type: "predict", prompt: "…", tryIt: "What to change, then press Play.",
      choices: [{ id: "a", text: "…" }, { id: "b", text: "…" }],
      correctId: "b", explanation: "…" }
  ],
  code: "lab.setup = function (api, controls) {}; lab.draw = function (ctx, api, controls) {};"
}
```

Controls are `slider`, `toggle`, or `select` (2–8, at least one slider). Questions are 3–5, `multiple_choice` or `predict`. A predict question must include `tryIt`.

The `code` string is plain JavaScript with no imports, network, or DOM. It assigns:

- `lab.setup(api, controls)`
- `lab.step(dt, api, controls)` — `dt` is seconds
- `lab.draw(ctx, api, controls)` — `ctx` is a 2D canvas context
- `lab.sample(api, controls)` → `{ readouts: [{label, value, unit, digits}], point: {x, y} | null, series: [{x, y}] | null, clearChart }`
- optional `lab.controlsChanged(api, controls, prev)`

`api` provides `state` (an object the lab owns), `time`, `width`, `height`, `clamp`, `lerp`, and `map`.

Host messages into the iframe: `{type:'controls', values}`, `{type:'playback', playing, speed}`, `{type:'reset', values, playing, speed}`. The iframe replies with `{type:'ready'}`, `{type:'sample', ...}`, and `{type:'error', message}`.
