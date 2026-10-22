import { z } from "zod";

const idSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{0,40}$/, "Use a short lowercase id");

const controlIdSchema = z
  .string()
  .regex(/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/, "Control ids must be identifiers");

const sliderSchema = z
  .object({
    id: controlIdSchema,
    type: z.literal("slider"),
    label: z.string().min(1).max(60),
    unit: z.string().max(20).optional(),
    min: z.number().finite(),
    max: z.number().finite(),
    step: z.number().positive().finite(),
    default: z.number().finite(),
    live: z.boolean().default(true),
    group: z.string().min(1).max(40).optional(),
    hint: z.string().max(180).optional(),
  })
  .superRefine((control, ctx) => {
    if (control.min >= control.max) {
      ctx.addIssue("Slider min must be less than max");
    }
    if (control.step > control.max - control.min) {
      ctx.addIssue("Slider step is larger than the range");
    }
    if (control.default < control.min - 1e-9 || control.default > control.max + 1e-9) {
      ctx.addIssue("Slider default must lie inside the range");
    }
  });

const toggleSchema = z.object({
  id: controlIdSchema,
  type: z.literal("toggle"),
  label: z.string().min(1).max(60),
  default: z.boolean(),
  live: z.boolean().default(true),
  group: z.string().min(1).max(40).optional(),
  hint: z.string().max(180).optional(),
});

const selectSchema = z
  .object({
    id: controlIdSchema,
    type: z.literal("select"),
    label: z.string().min(1).max(60),
    options: z
      .array(
        z.object({
          value: z.string().min(1).max(40),
          label: z.string().min(1).max(40),
        }),
      )
      .min(2)
      .max(6),
    default: z.string(),
    live: z.boolean().default(true),
    group: z.string().min(1).max(40).optional(),
    hint: z.string().max(180).optional(),
  })
  .superRefine((control, ctx) => {
    if (!control.options.some((option) => option.value === control.default)) {
      ctx.addIssue("Select default must match an option value");
    }
  });

export const controlSchema = z.discriminatedUnion("type", [
  sliderSchema,
  toggleSchema,
  selectSchema,
]);

const choiceSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{1,12}$/),
  text: z.string().min(1).max(200),
});

export const questionSchema = z
  .object({
    id: idSchema,
    type: z.enum(["multiple_choice", "predict"]),
    prompt: z.string().min(8).max(400),
    choices: z.array(choiceSchema).min(2).max(5),
    correctId: z.string(),
    explanation: z.string().min(8).max(400),
    tryIt: z.string().max(280).optional(),
  })
  .superRefine((question, ctx) => {
    if (!question.choices.some((choice) => choice.id === question.correctId)) {
      ctx.addIssue("correctId must match one of the choices");
    }
    const ids = new Set(question.choices.map((choice) => choice.id));
    if (ids.size !== question.choices.length) {
      ctx.addIssue("Choice ids must be unique");
    }
    if (question.type === "predict" && (!question.tryIt || question.tryIt.trim().length < 8)) {
      ctx.addIssue("Predict questions need a tryIt hint of at least 8 characters");
    }
  });

export const chartSchema = z.object({
  title: z.string().min(2).max(80),
  xLabel: z.string().min(1).max(40),
  yLabel: z.string().min(1).max(40),
  xUnit: z.string().max(20).optional(),
  yUnit: z.string().max(20).optional(),
  emptyHint: z.string().max(160).optional(),
  seriesLabel: z.string().max(40).optional(),
  pointsLabel: z.string().max(40).optional(),
});

export const labSchema = z
  .object({
    id: idSchema.default("generated"),
    title: z.string().min(3).max(80),
    summary: z.string().min(10).max(180),
    subject: z.string().min(2).max(40),
    concept: z.string().min(40).max(1200),
    controls: z.array(controlSchema).min(2).max(8),
    code: z.string().min(40).max(20000),
    chart: chartSchema.optional(),
    questions: z.array(questionSchema).min(3).max(5),
  })
  .superRefine((lab, ctx) => {
    const controlIds = new Set(lab.controls.map((control) => control.id));
    if (controlIds.size !== lab.controls.length) {
      ctx.addIssue("Control ids must be unique");
    }
    const questionIds = new Set(lab.questions.map((question) => question.id));
    if (questionIds.size !== lab.questions.length) {
      ctx.addIssue("Question ids must be unique");
    }
    if (!lab.controls.some((control) => control.type === "slider")) {
      ctx.addIssue("Include at least one slider");
    }
    if (!lab.code.includes("lab.setup") || !lab.code.includes("lab.draw")) {
      ctx.addIssue("Simulation code must assign lab.setup and lab.draw");
    }
  });

export type LabSpec = z.infer<typeof labSchema>;
export type ControlSpec = z.infer<typeof controlSchema>;
export type QuestionSpec = z.infer<typeof questionSchema>;
export type ChartSpec = z.infer<typeof chartSchema>;
export type ControlValue = number | boolean | string;
export type ControlMap = Record<string, ControlValue>;

export function defaultControls(lab: LabSpec): ControlMap {
  const values: ControlMap = {};
  for (const control of lab.controls) {
    values[control.id] = control.default;
  }
  return values;
}

export function controlGroups(controls: ControlSpec[]): { name: string; controls: ControlSpec[] }[] {
  const order: string[] = [];
  const groups = new Map<string, ControlSpec[]>();
  for (const control of controls) {
    const name = control.group ?? "Controls";
    const list = groups.get(name);
    if (list) {
      list.push(control);
    } else {
      groups.set(name, [control]);
      order.push(name);
    }
  }
  return order.map((name) => ({ name, controls: groups.get(name) ?? [] }));
}

export function formatIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.map(String).join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("\n");
}

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}
