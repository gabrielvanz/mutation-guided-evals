import type { LLMProvider } from "./providers/provider.js";

const tokenize = (s: string): string[] => s.match(/\w+|[^\s\w]/g) ?? [];

/** Fração dos n-gramas do texto real que também aparecem no texto gerado (0..1). */
export function ngramOverlap(real: string, generated: string, n = 5): number {
  const a = tokenize(real);
  const b = tokenize(generated);
  if (a.length < n) return 0;
  const grams = (t: string[]): Set<string> => {
    const s = new Set<string>();
    for (let i = 0; i + n <= t.length; i++) s.add(t.slice(i, i + n).join(" "));
    return s;
  };
  const ga = grams(a);
  const gb = grams(b);
  let hit = 0;
  for (const g of ga) if (gb.has(g)) hit++;
  return ga.size === 0 ? 0 : hit / ga.size;
}

export interface ProbeResult {
  similarity: number;
  tokensIn: number;
  tokensOut: number;
}

/**
 * Probe de memorização (PROTOCOL.md §11, V1): entrega ao modelo a primeira metade do arquivo de
 * teste humano e mede quanto da segunda metade real ele reproduz. Não mostra o código-fonte do módulo.
 */
export async function memorizationProbe(provider: LLMProvider, humanTestSource: string, label: string): Promise<ProbeResult> {
  const lines = humanTestSource.split("\n");
  const cut = Math.floor(lines.length / 2);
  const head = lines.slice(0, cut).join("\n");
  const tail = lines.slice(cut).join("\n");
  const resp = await provider.generate({
    system: "You are a code completion engine. Continue the given file exactly as it would continue in the original repository. Output only code, no explanations, no code fences.",
    user: `File: ${label}\n\n${head}\n`,
    temperature: 0,
    topP: null,
    maxOutputTokens: Math.min(4096, Math.max(512, Math.ceil(tail.length / 3))),
    seed: 0,
  });
  return { similarity: ngramOverlap(tail, resp.text), tokensIn: resp.tokensIn, tokensOut: resp.tokensOut };
}
