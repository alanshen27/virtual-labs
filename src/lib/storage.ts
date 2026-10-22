import { labSchema, type LabSpec } from "@/lib/spec";

const KEY = "virtuallabs.custom.v1";

export function loadCustomLabs(): LabSpec[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const labs: LabSpec[] = [];
    for (const item of parsed) {
      const result = labSchema.safeParse(item);
      if (result.success) labs.push(result.data);
    }
    return labs;
  } catch {
    return [];
  }
}

export function saveCustomLab(lab: LabSpec): void {
  const next = [lab, ...loadCustomLabs().filter((item) => item.id !== lab.id)].slice(0, 24);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function getCustomLab(id: string): LabSpec | null {
  return loadCustomLabs().find((lab) => lab.id === id) ?? null;
}
