# Relatório de qualidade do projeto

Revisão do código do arcabouço (`agent/`) e da análise (`analysis/`), em 26/11/2026, sobre o commit `1eeb585` mais as
alterações locais. Todos os números abaixo foram medidos; nenhum é estimado. As ferramentas rodaram fora do repositório
(nada foi adicionado ao `package.json`).

## 1. Resumo

| Item | Resultado |
|---|---|
| `tsc --noEmit` (strict) | passa, sem erros |
| Testes unitários | 71 de 71 passam (5 arquivos, 2,2 s, sem rede e sem LLM) |
| Cobertura (v8) de `agent/src` | 53,7% das linhas; 80,8% dos ramos; 88% das funções |
| Complexidade ciclomática (133 funções) | média 3,95; 108 funções de 1 a 5; 3 acima de 20; máxima 55 |
| Herança | 7 classes; profundidade máxima (DIT) = 1; nenhuma hierarquia própria |
| ESLint 9 + typescript-eslint (type-checked) | 54 erros e 21 avisos em 23 arquivos |
| Ruff (Python, `analysis/`) | 36 achados; 1 deles é falso positivo |
| SonarQube | **não executado** (exige servidor e token) |

## 2. Revisão de código (segurança, qualidade e riscos)

### Achados que merecem ação

**R1. Lacuna nos guardrails e segredo exposto ao código gerado (severidade média).**
O guardrail só bloqueia `import` estático fora de `vitest` e do módulo, `fetch`, `XMLHttpRequest`, `WebSocket` e imports de
`http`, `net` e afins. Testei `analyzeTestFile` com um teste que usa `process.env.GEMINI_API_KEY`, `await import("node:http")`
e `require("node:fs")`: **nenhuma violação foi reportada**. Além disso, `agent/src/exec.ts` repassa todo o `process.env` aos
processos filhos (Vitest e Stryker), que executam o código gerado pelo modelo, então `GEMINI_API_KEY` fica visível a ele.
*Impacto real até agora: nenhum.* Procurei nos 262 `*_tests.test.ts` arquivados em `runs/` por `process.env`, `require(`,
`import(`, `child_process`, `globalThis` e `eval(`: **0 ocorrências**. O risco é potencial (injeção de prompt por comentário no
código-alvo, ou alucinação). *Correção sugerida:* passar aos filhos um `env` com lista de permissão (sem a chave) e acrescentar
esses padrões ao guardrail. Como isso muda o comportamento depois da coleta, deve ser registrado em §12 do `PROTOCOL.md`.

**R2. `executeRun` é grande demais (qualidade).** `agent/src/pipeline.ts:114` tem 308 linhas, complexidade ciclomática 55
(ESLint conta 63 com `&&`/`||`/`??`) e aninhamento até 6. É o coração do experimento e também onde estão as linhas não
cobertas (174, 297 a 299, 311 a 318, 349 a 351). Sugestão: extrair as fases (geração, validação, avaliação, iteração de
feedback) em funções menores, com os testes existentes como rede de segurança.

**R3. `analyzeTestFile` / `visit` (qualidade).** `guardrails.ts:138` tem complexidade 49 em 65 linhas: um grande
`visit` com todas as regras G1 a G7 misturadas. Uma tabela de regras (um objeto por guardrail) tornaria cada regra testável e
reduziria o risco de esquecer um padrão, como em R1.

**R4. Código crítico sem teste (testes).** `cli.ts` (291 linhas), `runner.ts` (207) e `exec.ts` (51) têm 0% de cobertura. O
`runner` e o `exec` são justamente quem executa Vitest e Stryker e trata timeout e saída; hoje só o `smoke.ts` manual os
exercita.

### Achados menores

- **Tipos inseguros vindos de JSON** (`no-unsafe-assignment`, `no-unsafe-argument`, `no-unsafe-member-access`: 21 ocorrências,
  em `cli.ts`, `config.test.ts`, `providers.test.ts`, `pipeline.test.ts`, `mutants.test.ts`, `smoke.ts`). Faltam validações
  de formato depois de `JSON.parse`. O schema JSON já valida a saída; a entrada (`config/*.json`) poderia ter o mesmo.
- **`complexity` > 10** também em `cmdRun` (27), `providerFromEnv` (17), `gemini.ts:41` (21), `selectSurvivors` (15),
  `openai-compat.ts:35` (14), `cmdMatrix` (11).
- **`max-depth`** > 4 em `cli.ts:182` e `pipeline.ts:296 a 322`.
- **`provider.ts:95`** usa `!= null`; é o idioma intencional para `null` e `undefined`, mas viola `eqeqeq`.
- **`runner.ts:113`** (`no-control-regex`) remove sequências ANSI com `\u001b`; é intencional.
- **`require-await`** (16): `mock.ts:18` e métodos de teste `async` sem `await`; baixo impacto.
- **`no-base-to-string`** em `providers.test.ts:36 e 47`: só em teste.
- **Python:** `analyze.py` tem `h2` com complexidade 24 e `runs_to_frames` com 23 (índice de manutenibilidade B, 12,6); `analyze.py:260`
  (B023) é **falso positivo**, pois a `lambda` roda dentro da mesma iteração. Itens triviais: imports não usados
  (`combinations`, `sys`), variável `cols` não usada em `sensitivity_v3.py`, `open()` sem `with` em `subjects_table.py` e 21
  usos de `dict()` no lugar de `{}` (C408).

### O que está bom

- Processos filhos criados com `spawn` **sem shell** e com lista de argumentos (sem injeção de comando).
- Chaves de API enviadas em cabeçalho (`x-goog-api-key`, `Authorization`), nunca na URL; `.env` está no `.gitignore`;
  os workflows usam `secrets.*`.
- TypeScript em modo estrito, com `noUncheckedIndexedAccess`; `tsc` passa limpo.
- Sem dependências de runtime além de `typescript`; CI roda `typecheck` e `test` a cada push.
- Reprodutibilidade: schema JSON de saída validado em todos os 129 resultados, prompts e respostas brutas arquivados.

## 3. Testes unitários

O projeto tem 71 testes em 5 arquivos (`mutants` 15, `guardrails` 20, `pipeline` 14, `providers` 13, `config` 9), todos
determinísticos, sem rede e com um `MockProvider` no lugar do LLM.

| Arquivo | Linhas cobertas | Ramos |
|---|---|---|
| `mutants.ts`, `prompts.ts`, `extract.ts` | 100% | 77 a 85% |
| `pipeline.ts` | 95,3% | 83,2% |
| `guardrails.ts` | 86,2% | 83,5% |
| `providers/*` | 97 a 100% | 42 a 96% (`openai-compat` é o mais fraco) |
| `config.ts` | 78,6% | 76,5% |
| `probe.ts`, `util.ts` | 51,6% e 77,8% | 66,7% e 75% |
| `cli.ts`, `runner.ts`, `exec.ts` | **0%** | 0% |

Pontos fortes: cobertura das regras de negócio do experimento (split de mutantes, seleção de sobreviventes, guardrails,
laço de feedback com provedor falso, retentativas com `retryDelay`). Pontos fracos: a camada de orquestração e de processos
(R4) e os ramos de erro do provedor compatível com OpenAI.

Sugestão em linha com o trabalho: como o tema é teste de mutação, aplicar o próprio Stryker em `guardrails.ts` e
`mutants.ts` mediria a qualidade dos testes do arcabouço.

## 4. Métricas de software (TypeScript, `agent/src`, 1.831 linhas, 133 funções)

Complexidade ciclomática de McCabe (cada `if`, laço, `catch`, `?:`, `case`, `&&`, `||` e `??` soma 1), medida com a API do compilador TypeScript.

| Faixa de CC | Funções |
|---|---|
| 1 a 5 (simples) | 108 |
| 6 a 10 (moderada) | 17 |
| 11 a 20 (alta) | 5 |
| acima de 20 (muito alta) | 3 |

Maiores: `executeRun` 55, `guardrails.visit` 49, `cmdRun` 26, `gemini.ts` (chamada) 17, `providerFromEnv` 16,
`selectSurvivors` 14. Maior concentração por arquivo (soma de CC): `guardrails.ts` 107, `pipeline.ts` 96, `cli.ts` 81, `mutants.ts` 66.

Herança: 7 classes (`CostMeter`, `SubjectEvaluator`, `GeminiProvider`, `MockProvider`, `OpenAICompatProvider`,
`ProviderError`, `RateLimiter`). Só `ProviderError` herda (de `Error`, DIT = 1); NOC = 0 em todas. Os provedores
**implementam a interface** `LLMProvider` em vez de herdar: o desenho prefere composição, e a profundidade de herança não é um risco aqui.

Python (`radon`): complexidade média C (17,1) nas 7 funções com CC ≥ 11 de `analyze.py`; `h2` é D (24).

## 5. Qualidade estática

ESLint 9 com `typescript-eslint` em modo type-checked, mais `complexity` (10), `max-lines-per-function` (60), `max-depth` (4)
e `eqeqeq`. Resultado nos 23 arquivos de `agent/`: **54 erros e 21 avisos**.

| Regra | Qtde |
|---|---|
| `require-await` | 16 |
| `no-unnecessary-type-assertion` | 13 |
| `no-unsafe-assignment` | 11 |
| `complexity` (aviso) | 9 |
| `max-lines-per-function` (aviso) | 6 |
| `max-depth` (aviso) | 6 |
| `no-unsafe-argument` | 6 |
| `no-unsafe-member-access` | 4 |
| `no-base-to-string` | 2 |
| `eqeqeq`, `no-control-regex` | 1 cada |

Nenhum dos erros é de correção funcional: são sobretudo tipagem frouxa (`any` vindo de JSON), asserções de tipo
desnecessárias e funções longas. `no-floating-promises` não acusou nada.

**SonarQube não foi executado.** Ele precisa de um servidor (ou conta no SonarCloud) e de um token. Para rodar:
`docker run -p 9000:9000 sonarqube`, criar o projeto e executar `sonar-scanner` com `sonar.sources=agent/src,analysis`.
As regras de complexidade cognitiva, duplicação e *code smells* dele se sobrepõem em boa parte às do ESLint acima.

## 6. Prioridades sugeridas

1. **R1:** remover a chave do ambiente dos filhos e ampliar o guardrail (pequeno, com impacto de segurança). Registrar em §12.
2. **R4:** testes para `exec.ts` (timeout, limite de bytes) e `runner.ts` (com Vitest falso).
3. **R2/R3:** dividir `executeRun` e `visit` em funções menores.
4. Limpar os avisos triviais (`no-unnecessary-type-assertion`, imports não usados) com `--fix`.
