# Virtual Labs

Teachers design an interactive science visualisation by chatting with a model. Students run that experiment: a live canvas, roomy controls, a short first-run tour, and an activity sheet they fill in while they work. There is no quiz.

Built-in labs work with no API key and no account. Creating, editing, and saving a lab requires sign-in.

## Setup

```bash
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run lint
npm run build
```

`npm install` generates the Prisma client. `npx prisma db push` creates the local SQLite file.

## Two modes

- **Explore** (`/explore`, and each `/lab/[id]`) is the student experiment. Built-in labs open with no account. A published custom lab opens the same way. The first visit shows a short tour of the canvas, controls, readouts, activity sheet, and export menu.
- **Create** (`/create`) is the teacher studio. A chat sits on the left. The live preview, including the controls, sits on the right. Sign-in is required. Say “start from the pendulum lab” to remix a built-in without an API key. Further edits need `OPENAI_API_KEY`.

The home page routes into those two paths.

## Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | For new labs and chat edits | empty | Bearer token. When empty, chat can still remix a built-in. |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | OpenAI-compatible base URL. The client posts to `{base}/chat/completions`. |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model name sent in the request. |
| `AUTH_SECRET` | Yes, for sign-in | none | Auth.js session signing secret. Use a long random string before any shared deploy. |
| `DATABASE_URL` | Yes, for saved labs | `file:./dev.db` | SQLite file. Prisma resolves it relative to the `prisma/` folder. |
| `AUTH_DEV_EMAIL` | No | `teacher@localhost` | Email for the local credentials provider. |
| `AUTH_DEV_PASSWORD` | No | `virtuallabs` | Password for that local account. Change it before exposing the app. |
| `AUTH_GITHUB_ID` | No | empty | GitHub OAuth client id. When both GitHub variables are set, the sign-in page shows GitHub. |
| `AUTH_GITHUB_SECRET` | No | empty | GitHub OAuth client secret. |

The model key stays on the server. Sessions are JWTs. Users and saved labs are rows in SQLite.

### Local sign-in

The credentials provider accepts only the dev email and password above. It upserts that user in SQLite. GitHub sign-in is optional and uses the same user table, matched by email.

## UI

Components, icons, and theming come from [Ant Design](https://ant.design/) (`antd`, `@ant-design/icons`) through `ConfigProvider`. Tailwind is only for page layout. Spacing is deliberately loose: controls are stacked with room between them, the canvas is large, and the activity sheet sits below the fold instead of being packed into a third column.

## Architecture

- **Spec.** Every lab, built-in or generated, is one object validated by zod in `src/lib/spec.ts`.
- **Sandbox.** Generated JavaScript never runs on the host page. `src/lib/sandbox/srcdoc.ts` wraps it in an iframe document with `sandbox="allow-scripts"` (no `allow-same-origin`). The iframe's own content security policy allows `unsafe-eval` so it can compile the program with `new Function`. That permission does not apply to the host page, and the frame's opaque origin cannot read the host. The iframe talks to the parent through `postMessage`. A PNG export asks the iframe to post a `data:image/png` snapshot of its own canvas.
- **Playback.** Play, pause, reset, and speed (0.5×, 1×, 2×) are host controls. `live: false` on a control (release angle, launch speed) restarts the run so the new value is the initial condition.
- **Generation.** `POST /api/generate` requires a session. The reply must be JSON. If zod rejects it, the route asks once more with the validation errors, then gives up. New ids are `c-` plus random hex so a model cannot overwrite a built-in lab. A follow-up message sends the current lab JSON plus the teacher's instruction.
- **Storage.** Saved labs belong to the signed-in user (`SavedLab` in Prisma). Students can open a lab when it is marked “Students can open this”. A share link (`/share#…`) still copies a lab into this browser's `localStorage` for anyone who has the hash.

## Built-in labs

| Id | Idea | Exports |
| --- | --- | --- |
| `pendulum` | Period vs length, with the elliptic-integral prediction and a measured period. | CSV of period vs length, PNG of the canvas |
| `projectile` | Vacuum trajectory plus quadratic drag. | CSV of the trajectory, PNG of the canvas |
| `ideal-gas` | \(P = nRT/V\). Holding temperature off, compressing the piston heats the gas. | CSV of pressure vs volume, PNG of the canvas |
| `ohms-law` | \(I = V/R\). A second resistor in series doubles the resistance. | CSV of current vs voltage, PNG of the canvas |
| `interference` | Two point sources. Fringe spacing is about \(\lambda L / d\). | CSV of intensity along the line, PNG of the canvas |

Pendulum and Ohm's law are the few-shot examples inside the prompt.

## Lab spec

```ts
{
  id: "pendulum",
  title: "Simple pendulum",
  summary: "One line, 10–180 chars",
  subject: "Physics",
  concept: "Plain prose the learner reads, 40–1200 chars",
  controls: [
    { id: "length", type: "slider", label: "Length", unit: "m",
      min: 0.2, max: 3, step: 0.05, default: 1, live: true, group: "Pendulum" }
  ],
  chart: { title: "Period vs length", xLabel: "Length", yLabel: "Period", xUnit: "m", yUnit: "s" },
  activity: {
    title: "Activity sheet",
    intro: "Optional note shown above the blanks.",
    items: [
      { id: "period", prompt: "Record the period at 1.0 m.", kind: "short", placeholder: "seconds" },
      { id: "note", prompt: "What changed when you shortened the string?", kind: "observation" }
    ]
  },
  tour: [
    { id: "canvas", target: "canvas", title: "The swing", body: "The bob moves here." },
    { id: "controls", target: "controls", title: "Controls", body: "Length changes the period." },
    { id: "export", target: "export", title: "Export", body: "Download a CSV or a PNG." }
  ],
  exports: [
    { id: "period-csv", label: "Period vs length (CSV)", format: "csv", mime: "text/csv", source: "chart" },
    { id: "canvas-png", label: "Canvas image (PNG)", format: "png", mime: "image/png", source: "canvas" }
  ],
  code: "lab.setup = function (api, controls) {}; lab.draw = function (ctx, api, controls) {};"
}
```

### Activity sheet

`activity.items` has 3–6 prompts. `kind` is `short` (one line) or `observation` (a short paragraph). Answers are stored in this browser only. They are not graded and they are not sent to the model.

### Tour

`tour` has 3–6 steps. `target` is `canvas`, `controls`, `readouts`, `chart`, `activity`, or `export`. The student sees the tour once per lab.

### Exports

`exports` lists the files the Export menu offers.

| Field | Meaning |
| --- | --- |
| `id` | Stable key, lowercase. |
| `label` | Menu text. |
| `format` | `csv`, `png`, or `json`. |
| `mime` | Download content type. |
| `source` | How the host produces the file. |
| `filename` | Optional download name. |

`source` values:

- `chart` — CSV of the measured points the chart has collected.
- `series` — CSV of the latest curve (a trajectory or a waveform).
- `readouts` — CSV of the current numbers.
- `canvas` — PNG. The sandboxed iframe draws one more frame and posts `canvas.toDataURL("image/png")`. The host never reads the iframe document.
- `state` — JSON of the controls, readouts, and collected points.

A `png` export must use `canvas`. A `csv` export must use `chart`, `series`, or `readouts`. A `json` export must use `state`. If a teacher asks for a PDF or SVG, the model is told to map that onto the closest of these three and to say so in the label.

The generation prompt includes any formats the teacher typed in the chat composer, and it tells the model to fill `exports` when the message names a format.

### Simulation code

Controls are `slider`, `toggle`, or `select` (2–8, at least one slider).

The `code` string is plain JavaScript with no imports, network, or DOM. It assigns:

- `lab.setup(api, controls)`
- `lab.step(dt, api, controls)` — `dt` is seconds
- `lab.draw(ctx, api, controls)` — `ctx` is a 2D canvas context
- `lab.sample(api, controls)` → `{ readouts: [{label, value, unit, digits}], point: {x, y} | null, series: [{x, y}] | null, clearChart }`
- optional `lab.controlsChanged(api, controls, prev)`

`api` provides `state` (an object the lab owns), `time`, `width`, `height`, `clamp`, `lerp`, and `map`.

Host messages into the iframe: `{type:'controls', values}`, `{type:'playback', playing, speed}`, `{type:'reset', values, playing, speed}`, `{type:'capture', requestId}`. The iframe replies with `{type:'ready'}`, `{type:'sample', ...}`, `{type:'capture', requestId, dataUrl}`, and `{type:'error', message}`.
