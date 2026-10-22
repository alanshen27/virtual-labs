export const subjects = ["Any", "Physics", "Chemistry", "Electricity", "Waves"] as const;
export const grades = ["Middle school", "High school", "Intro college"] as const;

export type Subject = (typeof subjects)[number];
export type Grade = (typeof grades)[number];

export const suggestions: { label: string; prompt: string; subject: Subject; labId?: string }[] = [
  {
    label: "Pendulum length and period",
    prompt: "Show me how pendulum length affects the period",
    subject: "Physics",
    labId: "pendulum",
  },
  {
    label: "Projectile with air resistance",
    prompt: "Simulate projectile motion with air resistance",
    subject: "Physics",
    labId: "projectile",
  },
  {
    label: "Ideal gas law",
    prompt: "Show the ideal gas law with a piston I can move",
    subject: "Chemistry",
    labId: "ideal-gas",
  },
  {
    label: "Ohm's law circuit",
    prompt: "Build an Ohm's law circuit I can tweak",
    subject: "Electricity",
    labId: "ohms-law",
  },
  {
    label: "Two-source interference",
    prompt: "Show two-source wave interference",
    subject: "Waves",
    labId: "interference",
  },
  {
    label: "Mass on a spring",
    prompt: "How does mass change the period of a mass on a spring?",
    subject: "Physics",
  },
];

export function builtinIdForPrompt(prompt: string): string | null {
  const key = prompt.trim().toLowerCase();
  const match = suggestions.find((item) => item.labId && item.prompt.toLowerCase() === key);
  return match?.labId ?? null;
}

export const gallerySections: {
  id: string;
  title: string;
  subtitle: string;
  labIds: string[];
}[] = [
  {
    id: "mechanics",
    title: "Mechanics",
    subtitle: "Swing it, launch it, and measure what changes.",
    labIds: ["pendulum", "projectile"],
  },
  {
    id: "matter",
    title: "Matter and circuits",
    subtitle: "Pressure, temperature, and current you can dial in.",
    labIds: ["ideal-gas", "ohms-law"],
  },
  {
    id: "waves",
    title: "Waves",
    subtitle: "Watch crests add and cancel.",
    labIds: ["interference"],
  },
];
