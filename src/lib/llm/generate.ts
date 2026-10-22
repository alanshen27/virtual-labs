import type { LabSpec } from "@/lib/spec";
import { formatIssues, labSchema } from "@/lib/spec";
import type { ChatMessage, LLMClient } from "@/lib/llm/client";

const CONTRACT = `You design one interactive high-school science lab as a single JSON object.
The learner already has a host page. You only describe the lab.

Schema:
- id: string, lowercase, start with a letter (the host replaces this)
- title, summary (one line, <= 180 chars), subject, concept (plain prose, 40-900 chars)
- controls: 2 to 8 items. Each is a slider, toggle, or select.
  slider: { id, type:"slider", label, unit?, min, max, step, default, live, group?, hint? }
  toggle: { id, type:"toggle", label, default, live, group?, hint? }
  select: { id, type:"select", label, options:[{value,label}], default, live, group?, hint? }
  ids are identifiers. live:false means the value applies when the simulation resets (release angle, launch speed).
  group is a short accordion heading.
- chart: { title, xLabel, yLabel, xUnit?, yUnit?, emptyHint?, seriesLabel?, pointsLabel? }
- questions: 3 to 5. type "multiple_choice" or "predict".
  { id, type, prompt, choices:[{id,text}] (2-5, ids like "a"), correctId, explanation, tryIt? }
  predict questions must include tryIt: what to change in the sim to see the answer.
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
Physics must be correct for the level you were given. Questions must be answerable from the controls and readouts.
Use only the control ids you declared. Keep code under 160 lines.
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
  context?: { subject?: string; grade?: string },
): ChatMessage[] {
  const shots = examples.map((lab) => JSON.stringify(lab)).join("\n\n");
  const grade = context?.grade?.trim() || "High school";
  const subject = context?.subject?.trim() || "Any";
  return [
    {
      role: "system",
      content: `${CONTRACT}\n\nFew-shot labs that follow the contract:\n${shots}`,
    },
    {
      role: "user",
      content: `Grade level: ${grade}\nSubject focus: ${subject}\nLearner prompt: ${prompt}`,
    },
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
  idFactory?: () => string;
}): Promise<LabSpec> {
  const messages = buildMessages(options.prompt, options.examples, {
    subject: options.subject,
    grade: options.grade,
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
  const id = (options.idFactory ?? createLabId)();
  return labSchema.parse({ ...lab, id });
}
