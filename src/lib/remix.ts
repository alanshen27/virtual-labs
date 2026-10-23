import { builtinIdForPrompt } from "@/lib/catalog";

const HINTS: [string, string][] = [
  ["pendulum", "pendulum"],
  ["projectile", "projectile"],
  ["ideal gas", "ideal-gas"],
  ["ohm", "ohms-law"],
  ["interference", "interference"],
];

export function remixTarget(message: string): string | null {
  const named = builtinIdForPrompt(message);
  if (named) return named;
  const text = message.toLowerCase();
  if (!/(start|remix|from the|open the|copy|begin with)/.test(text)) return null;
  for (const [word, id] of HINTS) {
    if (text.includes(word)) return id;
  }
  return null;
}
