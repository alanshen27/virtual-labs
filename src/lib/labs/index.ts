import { idealGasLab } from "@/lib/labs/ideal-gas";
import { interferenceLab } from "@/lib/labs/interference";
import { ohmsLawLab } from "@/lib/labs/ohms-law";
import { pendulumLab } from "@/lib/labs/pendulum";
import { projectileLab } from "@/lib/labs/projectile";
import type { LabSpec } from "@/lib/spec";

export const builtinLabs: LabSpec[] = [
  pendulumLab,
  projectileLab,
  idealGasLab,
  ohmsLawLab,
  interferenceLab,
];

const byId = new Map(builtinLabs.map((lab) => [lab.id, lab]));

export function getBuiltinLab(id: string): LabSpec | undefined {
  return byId.get(id);
}

export function exampleLabs(): LabSpec[] {
  return [pendulumLab, ohmsLawLab];
}
