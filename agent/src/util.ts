import { createHash } from "node:crypto";

export const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

/** Inteiro de 31 bits determinístico, útil como seed de LLM. */
export function seedFrom(...parts: (string | number)[]): number {
  const h = createHash("sha256").update(parts.join("|")).digest();
  return h.readUInt32BE(0) & 0x7fffffff;
}

export function round(n: number | null, digits = 4): number | null {
  if (n === null || Number.isNaN(n)) return null;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const head = Math.floor(max * 0.6);
  const tail = max - head;
  return `${s.slice(0, head)}\n...[truncado ${s.length - max} caracteres]...\n${s.slice(s.length - tail)}`;
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
