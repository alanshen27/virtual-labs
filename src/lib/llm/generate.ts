import type { LabSpec } from "@/lib/spec";
import { formatIssues, labSchema } from "@/lib/spec";
import type { ChatMessage, LLMClient } from "@/lib/llm/client";

export const LAB_CONTRACT = `You design one interactive science visualisation as a single JSON object.
The learner already has a host page. You only describe the lab. There is no quiz.

Schema:
- id: string, lowercase, start with a letter (the host replaces this on a new lab)
- title, summary (one line, <= 180 chars), subject, concept (plain prose, 40-900 chars)
- controls: 2 to 8 items. Each is a slider, toggle, or select.
  slider: { id, type:"slider", label, unit?, min, max, step, default, live, group?, hint? }
  toggle: { id, type:"toggle", label, default, live, group?, hint? }
  select: { id, type:"select", label, options:[{value,label}], default, live, group?, hint? }
  ids are identifiers. live:false means the value applies when the simulation resets (release angle, launch speed).
  group is a short section heading. Leave room between ideas; do not invent more than 8 controls.
- chart: { title, xLabel, yLabel, xUnit?, yUnit?, emptyHint?, seriesLabel?, pointsLabel? }
- activity: a fill-in sheet, not a graded quiz.
  { title, intro?, items: 3 to 5 of { id, prompt, kind, placeholder? } }
  kind is "short" (a number or a few words) or "observation" (a sentence).
- tour: 3 to 5 coach marks.
  { id, target, title, body }
  target is one of canvas, controls, readouts, chart, activity, export.
- exports: 1 to 6 files the student can download.
  { id, label, format, mime, source, filename? }
  format is csv, png, or json.
  source is how the host builds the file:
    chart — csv of measured points the chart has collected
    series — csv of the latest curve (trajectory or waveform)
    readouts — csv of the current numbers
    canvas — png snapshot of the simulation
    state — json of the controls and readouts
  A png export must use source canvas. A csv export must use chart, series, or readouts. A json export must use source state.
  If the author names formats, cover each one. Map PDF, SVG, or a worksheet onto the closest of csv, png, or json and say that in the label.
  Always include at least one export.
- code: a JavaScript program, no imports, no network, no DOM. It assigns:
  lab.setup = function (api, controls) {}
  lab.step = function (dt, api, controls) {}
  lab.draw = function (ctx, api, controls) {}
  lab.sample = function (api, controls) {
    return { readouts:[{label,value,unit,digits}], point:{x,y}|null, series:[{x,y}]|null, clearChart:false };
  }
  Optional: lab.controlsChanged = function (api, controls, prev) {}

api fields: state (object you own), time (seconds), width, height,
clamp(v,a,b), lerp(a,b,t), map(v,a,b,c,d).
ctx is a CanvasRendering2D. dt is seconds.
Physics must be correct for the level you were given.
Use only the control ids you declared. Keep code under 160 lines.
Do not include quiz questions.
Return JSON only. No markdown.`;

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object found");
  return JSON.parse(raw.slice(start, end + 1));
}

export function buildMessages(
  prompt: string,
  examples: LabSpec[],
  context?: { subject?: string; grade?: string; formats?: string[]; current?: LabSpec },
): ChatMessage[] {
  const shots = examples.map((lab) => JSON.stringify(lab)).join("\n\n");
  const grade = context?.grade?.trim() || "High school";
  const subject = context?.subject?.trim() || "Any";
  const formats = (context?.formats ?? []).map((format) => format.trim()).filter(Boolean);
  const formatLine = formats.length
    ? `The author asked for these export formats: ${formats.join(", ")}. Include an exports entry for each, using csv, png, or json as documented.`
    : "Choose sensible exports for this lab, including a CSV of the measured data when the chart has points or a curve.";
  const user = context?.current
    ? `Grade level: ${grade}\nSubject focus: ${subject}\n${formatLine}\n\nCurrent lab JSON:\n${JSON.stringify(context.current)}\n\nTeacher message: ${prompt}\nReturn the full updated lab JSON only.`
    : `Grade level: ${grade}\nSubject focus: ${subject}\n${formatLine}\nTeacher prompt: ${prompt}`;
  return [
    {
      role: "system",
      content: `${LAB_CONTRACT}\n\nFew-shot labs that follow the contract:\n${shots}`,
    },
    { role: "user", content: user },
  ];
}

export function createLabId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `c-${hex}`;
}

async function completeOnce(
  llm: LLMClient,
  messages: ChatMessage[],
): Promise<{ lab?: LabSpec; raw: string; error?: string }> {
  const raw = await llm.complete(messages);
  try {
    const parsed = labSchema.safeParse(extractJson(raw));
    if (!parsed.success) return { raw, error: formatIssues(parsed.error) };
    return { lab: parsed.data, raw };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { raw, error: message };
  }
}

export async function generateLab(options: {
  prompt: string;
  llm: LLMClient;
  examples: LabSpec[];
  subject?: string;
  grade?: string;
  formats?: string[];
  current?: LabSpec;
  idFactory?: () => string;
}): Promise<LabSpec> {
  const messages = buildMessages(options.prompt, options.examples, {
    subject: options.subject,
    grade: options.grade,
    formats: options.formats,
    current: options.current,
  });
  const first = await completeOnce(options.llm, messages);
  let lab = first.lab;
  if (!lab) {
    const repairMessages: ChatMessage[] = [
      ...messages,
      { role: "assistant", content: first.raw },
      {
        role: "user",
        content: `That JSON failed validation:\n${first.error}\nReturn the full corrected JSON object only.`,
      },
    ];
    const second = await completeOnce(options.llm, repairMessages);
    if (!second.lab) {
      throw new Error(second.error || "The lab could not be generated.");
    }
    lab = second.lab;
  }
  const id = options.current?.id ?? (options.idFactory ?? createLabId)();
  return labSchema.parse({ ...lab, id });
}
