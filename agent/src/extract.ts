/** Extrai o código TypeScript de uma resposta de LLM (bloco ```ts / ```typescript / ``` ou texto puro). */
export function extractCode(text: string): string | null {
  const fence = /```(?:typescript|ts|tsx|javascript|js)?[^\n]*\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    if (m[1] !== undefined) blocks.push(m[1]);
  }
  if (blocks.length > 0) {
    // prefere o maior bloco que contenha uma declaração de teste
    const withTests = blocks.filter((b) => /\b(describe|it|test)\s*[.(]/.test(b));
    const pool = withTests.length > 0 ? withTests : blocks;
    return pool.sort((a, b) => b.length - a.length)[0]!.trimEnd() + "\n";
  }
  // resposta cortada no meio de um bloco: ``` aberto e não fechado
  const open = /```(?:typescript|ts)?[^\n]*\n([\s\S]*)$/.exec(text);
  if (open?.[1] && /\b(describe|it|test)\s*[.(]/.test(open[1])) return open[1].trimEnd() + "\n";
  if (/\bimport\b[\s\S]*\b(describe|it|test)\s*\(/.test(text)) return text.trim() + "\n";
  return null;
}
