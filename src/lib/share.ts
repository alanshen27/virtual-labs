import { labSchema, type LabSpec } from "@/lib/spec";

export function encodeShareHash(lab: LabSpec): string {
  const bytes = new TextEncoder().encode(JSON.stringify(lab));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export function decodeShareHash(hash: string): LabSpec {
  const trimmed = hash.trim();
  if (!trimmed) throw new Error("This link is empty.");
  const pad = trimmed.length % 4 === 0 ? "" : "=".repeat(4 - (trimmed.length % 4));
  const binary = atob(trimmed.replaceAll("-", "+").replaceAll("_", "/") + pad);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  const parsed: unknown = JSON.parse(json);
  const result = labSchema.safeParse(parsed);
  if (!result.success) throw new Error("This link doesn't contain a valid lab.");
  return result.data;
}

export function shareUrl(origin: string, lab: LabSpec): string {
  return `${origin}/share#${encodeShareHash(lab)}`;
}
