/**
 * Diagnóstico da API do Gemini: descobre QUAL campo do request o modelo rejeita (HTTP 400 INVALID_ARGUMENT).
 * Faz poucas chamadas minúsculas (custo desprezível). Não grava nada.
 *
 * uso: GEMINI_API_KEY=... LLM_MODEL=<id-exato> npx tsx agent/scripts/check-api.ts
 */
const key = process.env.GEMINI_API_KEY;
const model = process.env.LLM_MODEL;
if (!key || !model) {
  console.error("Defina GEMINI_API_KEY e LLM_MODEL.");
  process.exit(2);
}
const base = "https://generativelanguage.googleapis.com/v1beta";

async function call(label: string, generationConfig: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`${base}/models/${encodeURIComponent(model!)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key! },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Responda apenas: ok" }] }],
      generationConfig,
    }),
  });
  const body = await res.text();
  let detail = "";
  if (!res.ok) {
    try {
      detail = ` — ${(JSON.parse(body) as { error?: { message?: string } }).error?.message ?? body.slice(0, 200)}`;
    } catch {
      detail = ` — ${body.slice(0, 200)}`;
    }
  } else {
    const u = (JSON.parse(body) as { usageMetadata?: Record<string, number> }).usageMetadata ?? {};
    detail = ` — usageMetadata: ${JSON.stringify(u)}`;
  }
  console.log(`${res.ok ? "OK  " : "FALHA"} [${res.status}] ${label}${detail}`);
  return res.ok;
}

console.log(`modelo: ${model}\n`);
await call("mínimo (sem generationConfig)", {});
await call("temperature + maxOutputTokens", { temperature: 0, maxOutputTokens: 512 });
await call("+ seed", { temperature: 0, maxOutputTokens: 512, seed: 0 });
await call("+ thinkingBudget: 0", { temperature: 0, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } });
await call("+ thinkingLevel: minimal", { temperature: 0, maxOutputTokens: 512, thinkingConfig: { thinkingLevel: "minimal" } });
await call("+ thinkingLevel: low", { temperature: 0, maxOutputTokens: 512, thinkingConfig: { thinkingLevel: "low" } });

// Se nem o request mínimo passou, o problema é o ID do modelo: lista os parecidos.
const ok = await call("controle: mínimo de novo", {});
if (!ok) {
  const r = await fetch(`${base}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
  const names = ((await r.json()) as { models?: { name: string }[] }).models?.map((m) => m.name.replace(/^models\//, "")) ?? [];
  console.log("\nModelos que contêm 'flash':\n" + names.filter((n) => /flash/i.test(n)).join("\n"));
}
