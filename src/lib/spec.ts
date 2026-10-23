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

export const activityItemSchema = z.object({
  id: idSchema,
  prompt: z.string().min(8).max(280),
  kind: z.enum(["short", "observation"]),
  placeholder: z.string().max(120).optional(),
});

export const activitySchema = z.object({
  title: z.string().min(3).max(80),
  intro: z.string().max(400).optional(),
  items: z.array(activityItemSchema).min(3).max(6),
});

export const tourStepSchema = z.object({
  id: idSchema,
  target: z.enum(["canvas", "controls", "readouts", "chart", "activity", "export"]),
  title: z.string().min(3).max(80),
  body: z.string().min(8).max(280),
});

export const exportSchema = z
  .object({
    id: idSchema,
    label: z.string().min(3).max(80),
    format: z.enum(["csv", "png", "json"]),
    mime: z.string().min(3).max(80),
    source: z.enum(["chart", "series", "readouts", "canvas", "state"]),
    filename: z.string().min(3).max(80).optional(),
  })
  .superRefine((item, ctx) => {
    if (item.format === "png" && item.source !== "canvas") {
      ctx.addIssue("A PNG export has to use the canvas source");
    }
    if (item.format === "csv" && !["chart", "series", "readouts"].includes(item.source)) {
      ctx.addIssue("A CSV export has to use chart, series, or readouts");
    }
    if (item.format === "json" && item.source !== "state") {
      ctx.addIssue("A JSON export has to use the state source");
    }
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
    activity: activitySchema,
    tour: z.array(tourStepSchema).min(3).max(6),
    exports: z.array(exportSchema).min(1).max(6),
  })
  .superRefine((lab, ctx) => {
    const controlIds = new Set(lab.controls.map((control) => control.id));
    if (controlIds.size !== lab.controls.length) {
      ctx.addIssue("Control ids must be unique");
    }
    const itemIds = new Set(lab.activity.items.map((item) => item.id));
    if (itemIds.size !== lab.activity.items.length) {
      ctx.addIssue("Activity ids must be unique");
    }
    const exportIds = new Set(lab.exports.map((item) => item.id));
    if (exportIds.size !== lab.exports.length) {
      ctx.addIssue("Export ids must be unique");
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
export type ChartSpec = z.infer<typeof chartSchema>;
export type ActivitySheet = z.infer<typeof activitySchema>;
export type TourStep = z.infer<typeof tourStepSchema>;
export type ExportSpec = z.infer<typeof exportSchema>;
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
