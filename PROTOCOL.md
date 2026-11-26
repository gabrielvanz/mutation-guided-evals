# PROTOCOL.md — Protocolo Experimental

**Projeto:** Malha de Continuous Evals Guiada por Mutação para Geração de Testes com LLM
**Autores:** Andriano Toazza e Gabriel Vanz
**Estágio do SDLC:** 4. Test · **Modalidade:** A (Prática)
**Versão do protocolo:** 0.2 (medições de seleção incorporadas; valores com ⚠️ dependem de decisão ou execução)

> Este documento é a fonte única de verdade do experimento. Qualquer desvio
> durante a execução deve ser registrado na seção 12 (Registro de desvios),
> com data e justificativa, e nunca editado retroativamente no corpo do texto.

---

## 1. Pergunta de pesquisa e hipóteses

**PP.** O feedback de mutantes sobreviventes aumenta o mutation score de testes
gerados por LLM, e a que custo, comparado a testes escritos por humanos?

| ID | Hipótese | Métrica principal | Teste |
|----|----------|-------------------|-------|
| H1 | C3 tem `ms_eval` maior que C1, C2 **e C2r** | `ms_eval` final | Wilcoxon pareado + Holm |
| H2 | Cobertura de linha sobe sem que o mutation score suba na mesma proporção | Δ`line_cov` vs Δ`ms_eval`; gap `line_cov − ms_all` | Wilcoxon pareado + Spearman |
| H3 | O ganho de C3 tem retorno decrescente com custo em tokens por ponto crescente | `ms_eval(k)` e `tokens_por_pp(k)` | Friedman/Page sobre Δ_k |

H1 só é considerada sustentada se **C3 > C2r**. A comparação com C1 e C2 sozinha
confunde "feedback" com "mais tentativas".

## 2. Unidade de análise

A unidade é o **módulo** (um arquivo `.ts` com lógica pura), não a biblioteca.
Meta original: 12 módulos. **Após medir as candidatas reais, restaram 9** (ver `data/module-selection.csv`): `ufo` (query, parse, punycode, url, utils), `defu` (defu), `pathe` (path, utils) e `knitwork` (string). `pathe/_glob` (424 mutantes) não teve a medição concluída e ficou fora; pode ser incluído como módulo adicional se houver tempo, **antes** de ver qualquer resultado de C1–C3. Cada módulo é uma unidade pareada
entre condições; as repetições (seção 6) são agregadas pela mediana por módulo
antes dos testes estatísticos.

### 2.1 Critérios de inclusão de módulo

- Funções puras, sem I/O, rede, relógio ou aleatoriedade não controlada.
- De 50 a 300 linhas ⚠️ (ajustar após medição).
- Possui suíte humana que passa no commit fixado.
- Pelo menos **50 mutantes válidos** (Killed+Timeout+Survived+NoCoverage), para que cada metade do split tenha ≥ 25; no máximo ~800.
- Score humano (C0) de no máximo **92%**, para haver espaço de melhoria (efeito teto). Os critérios foram aplicados sobre medições reais (`data/module-selection.csv`).
- Rodada do Stryker com a suíte do módulo em menos de ~3 min.

### 2.2 Bibliotecas

| Papel | Biblioteca | Observação |
|-------|-----------|------------|
| Principal | `unjs/ufo` | confirmar Vitest, licença e atividade |
| Principal | `unjs/knitwork` | substitui `scule` (ver `data/module-selection.csv`) |
| Principal | `unjs/defu` | idem |
| Principal | `unjs/pathe` | era reserva; promovida após `scule` falhar |

Cada biblioteca é fixada em um **commit SHA** (registrado em `data/subjects.json`).
Nenhum módulo é escolhido ou descartado depois de ver resultados de C1–C3.
A seleção usa apenas as medições de Stryker sobre a suíte humana (C0).

## 3. Condições experimentais

Mesmo modelo, mesmos parâmetros e mesmos módulos em todas as condições.

| ID | Descrição | Chamadas por unidade/repetição |
|----|-----------|-------------------------------|
| C0 | Testes humanos do módulo (baseline) | 0 |
| C1 | Zero-shot: apenas o código-fonte do módulo | 1 |
| C2 | C1 + `CLAUDE.md` com convenções do projeto | 1 |
| C2r | C2 repetido `1+N` vezes de forma independente (controle de orçamento) | 1+N |
| C3 | C2 + loop com mutantes sobreviventes, `N` iterações | 1+N |

- **N = 5.** O estado é registrado em cada `k = 0..5` (k = 0 é a geração inicial).
- **C2r** isola o efeito do *feedback* do efeito de *tentar mais vezes*. Seleciona-se a
  amostra com maior `ms_feedback` (o mesmo sinal que C3 otimiza); o `ms_eval` dela é reportado.
- C1 e C2 têm orçamento menor por construção. C2r é a comparação de orçamento igualado.
  Reportar sempre curvas de score por token acumulado, não só o valor final.
- O arquivo de convenções é chamado `CLAUDE.md` por coerência com o playbook AI-Native, mas
  como o modelo pode não ser o Claude, ele é apenas **injetado no prompt**. O artigo deve
  afirmar que C2 mede "convenções em contexto", não a feature de memória de uma ferramenta específica.

## 4. Modelo e parâmetros

| Parâmetro | Valor |
|-----------|-------|
| Provedor | Google AI Studio (tier gratuito) ⚠️ confirmar cota |
| Modelo | Gemini Flash-Lite ⚠️ registrar o **ID exato** do painel |
| `temperature` | 0.7 (todas as condições) |
| `top_p` | padrão do provedor |
| `max_output_tokens` | 8192 |
| `seed` | derivado de `hash(módulo, condição, repetição, k)` se o provedor suportar |
| Fallback | Groq (modelo aberto) — **uma troca invalida o run**: o run é refeito inteiro, sem misturar modelos numa mesma comparação |

Regras de reprodutibilidade:
1. Salvar **todos os prompts e respostas brutas** como artefatos (`runs/<run_id>/raw/`).
2. Registrar o ID do modelo, a data e a versão do SDK em cada run.
3. Registrar tokens de entrada/saída reportados pela API (`usage`), nunca estimados.
4. Converter para um preço de referência (`usd_ref`) usando uma tabela fixa em
   `config/pricing.json`, apenas para discussão de custo (o custo real é zero).
5. Declarar no artigo que o tier gratuito pode usar dados para treino e que o código é open-source.

## 5. Pipeline por run

Um *run* = (módulo, condição, repetição).

```
1. checkout do commit fixado; npm ci
2. gerar prompt (C1 | C2 | C3-k)         → chamada ao LLM → <módulo>.test.ts
3. guardrails estáticos                  → rejeita e conta como tentativa de reparo se falhar
4. vitest (código original)              → deve passar; até 2 reparos (contam no orçamento)
5. repetir 3x para detectar flakiness
6. vitest --coverage (v8)                → line_cov, branch_cov
7. stryker run (só o módulo)             → relatório JSON
8. split determinístico de mutantes      → ms_feedback, ms_eval, ms_all, sobreviventes de feedback
9. C3: se k < N e há sobreviventes de feedback → monta prompt de feedback e volta ao passo 2
10. grava runs/<run_id>/result.json (validado por schemas/run-result.schema.json)
```

### 5.1 Equalização de escopo

O `mutate` do Stryker é **idêntico** em todas as condições, incluindo C0: apenas o módulo-alvo
(`mutate: ["src/<módulo>.ts"]`). C0 é reportado em **dois escopos**, porque a medição real mostrou que a diferença é grande
(ex.: `ufo/parse.ts` 58% só com `parse.test.ts`, contra 86% com a suíte inteira, pois outros arquivos de teste
exercitam `parse.ts` indiretamente):
- **C0 (escopo módulo, principal):** só os arquivos de teste humano mapeados ao módulo em `data/subjects.json`.
  É a comparação com mesma informação: os testes gerados também só veem o módulo.
- **C0-suite (referência superior):** toda a suíte humana do repositório, com o `mutate` restrito ao módulo.

### 5.2 Configuração do Stryker (fixa em todos os runs)

- `testRunner: "vitest"`, `coverageAnalysis: "perTest"`
- `timeoutMS` e `timeoutFactor` fixos; `concurrency` limitado
- `plugins: ["@stryker-mutator/vitest-runner"]` explícito (com pnpm o plugin não é descoberto sozinho)
- `mutator`: conjunto padrão do Stryker, sem exclusões, mesma versão em todo o experimento
- `reporters: ["json"]`, sem modo incremental entre condições diferentes (evita vazamento de resultado)

## 6. Repetições

- **3 repetições** por (módulo, condição) em C1, C2, C2r e C3. C0 é determinístico (1 execução).
- Se a cota permitir, subir para 5 ⚠️.
- Estimativa: 9 módulos × 3 rep × (1 + 1 + 6 + 6 = 14 chamadas) ≈ **378 chamadas** de LLM.
  Reparos podem aumentar isso em até ~30%.
- Estimativa de Stryker: 9 × 3 × 14 ≈ 378 execuções (tempo medido por rodada: de ~20 s a ~160 s em 1 vCPU;
  `ufo/utils` ≈ 130 s, `pathe/_path` ≈ 160 s). O gargalo é o tempo do Stryker, não os tokens.

## 7. Split de mutantes (anti-overfitting)

O agente em C3 otimiza o mesmo sinal que seria usado para avaliá-lo. Para evitar isso:

1. Após cada Stryker, cada mutante recebe a chave `k = (arquivo, linha, coluna, mutator, replacement)`.
2. Dentro de cada `mutator`, ordenam-se os mutantes por `sha256(SEED_SPLIT + k)` e alterna-se
   `feedback, eval, feedback, ...`. `SEED_SPLIT` é fixo e público em `config/split.json`.
   O split é calculado sobre **todos** os mutantes gerados (qualquer status), que dependem só do código-fonte
   e da versão do Stryker, nunca dos testes; assim o mesmo mutante cai no mesmo grupo em todas as condições.
3. Estratificação: se um mutator tiver número ímpar de mutantes, o excedente vai para o grupo `feedback`.
4. **Feedback (0):** só sobreviventes deste grupo vão ao prompt.
5. **Avaliação (1):** nunca é mostrado ao agente. É a métrica principal de H1.
6. Reportar também `ms_all` (todos os mutantes), para comparação com C0.

Limitação conhecida: o Stryker é a mesma ferramenta nos dois grupos. Por isso a validação cruzada
(seção 11, item V3) com um segundo conjunto de operadores é uma análise de sensibilidade planejada.

## 8. Prompt de feedback (C3)

Para cada iteração `k ≥ 1`, o prompt inclui:
- o código-fonte do módulo e o `CLAUDE.md`;
- o arquivo de teste **atual** (que passa);
- até **20** sobreviventes do grupo `feedback`, amostrados de forma estratificada por mutator
  com seed fixa, cada um com: linha, mutator, trecho original, trecho mutado;
- instrução de devolver o arquivo de teste **completo**, mantendo os testes existentes que passam.

Se o novo arquivo não passar no código original após 2 reparos, **descarta-se** a iteração (mantém-se
o arquivo anterior), registra-se `valid=false` e o consumo de tokens continua contando.

**Base da iteração seguinte (C3):** a melhor iteração válida até o momento (maior `ms_feedback`), não necessariamente a última.

**Arquivo final de C3 e C2r:** a iteração/amostra com maior `ms_feedback` (empate: a mais antiga).
O `ms_eval` dessa seleção é o valor reportado em H1.

**Critério de parada (C3):** `k = N`, **ou** nenhum sobrevivente restante no grupo `feedback`,
**ou** teto de tokens por módulo atingido ⚠️ (definir após medição).

## 9. Guardrails (validade interna)

Verificados automaticamente; violação invalida a tentativa:

| ID | Regra |
|----|-------|
| G1 | O agente só escreve em `*.test.ts`. `git diff -- src/` deve ser vazio. |
| G2 | Proibido `.skip`, `.todo`, `.only`, `expect(true)` e testes sem nenhuma assertion (checagem por AST). |
| G3 | Testes devem passar no código original. |
| G4 | Sem acesso a rede, relógio ou `Math.random` não mockado nos testes gerados. |
| G5 | Timeout em Vitest e Stryker. |
| G6 | Três reexecuções idênticas; qualquer falha marca `flaky=true`. Runs flaky são reportados mas excluídos das análises principais (análise de sensibilidade inclui-os). |
| G7 | O agente nunca vê o relatório de nenhum mutante do grupo `avaliação`, nem testes humanos. |

## 10. Métricas

Registradas por run (e por iteração `k`) em `result.json`.

| Métrica | Definição |
|---------|-----------|
| `ms_eval` | (Killed + Timeout) / (Killed + Timeout + Survived + NoCoverage), no grupo avaliação (critério do próprio Stryker). `CompileError`, `RuntimeError` e `Ignored` saem do denominador. *Correção v0.2: a v0.1 não excluía `RuntimeError`; medições reais mostraram que o Stryker os exclui.* |
| `ms_feedback` | idem, no grupo feedback. |
| `ms_all` | idem, em todos os mutantes. |
| `ms_covered` | score só sobre mutantes cobertos (reportado pelo Stryker). |
| `ms_killable` | mortos / |união de mutantes mortos por **qualquer** condição no módulo|. Aproxima o teto prático, já que equivalência é indecidível. Calculado **depois** de todos os runs. |
| `line_cov`, `branch_cov` | Vitest, provedor v8, restrito ao módulo-alvo. |
| `gap_cov_ms` | `line_cov − ms_all` (em pontos percentuais). |
| `tokens_in`, `tokens_out` | acumulados até a iteração `k`, incluindo reparos. |
| `usd_ref` | tokens × preço de referência. |
| `tokens_por_pp` | `tokens_acumulados / (ms_eval(k) − ms_eval(0))`, indefinido se o ganho ≤ 0. |
| `n_iter`, `wall_s` | iterações usadas e tempo total (relógio). |
| `valid_rate` | iterações válidas / iterações tentadas. |
| `flaky` | boolean (G6). |
| `n_tests`, `n_asserts` | tamanho e densidade do arquivo de teste. |
| `memo_sim` | similaridade do probe de memorização (seção 11, V1). |

## 11. Análise estatística

Unidade: módulo (mediana das repetições). Nível de significância α = 0,05 com correção de Holm
dentro de cada família de hipóteses. Reportar sempre tamanho de efeito e IC bootstrap de 95%
(10.000 reamostragens), pois com 12 unidades p-valores isolados são frágeis.

**H1.** Wilcoxon de postos sinalizados pareado em `ms_eval`: C3 vs C1, C3 vs C2, **C3 vs C2r**.
Tamanho de efeito: Cliff's δ e r. Hipótese alternativa unilateral (C3 > outra), declarada a priori.

**H2.** (a) Para cada módulo, Δ`line_cov` e Δ`ms_eval` entre k=0 e k=N em C3; correlação de
Spearman entre os dois Δ e comparação pareada (Wilcoxon) dos Δ. (b) Wilcoxon pareado em
`gap_cov_ms` entre condições, incluindo C0. H2 é sustentada se Δ`line_cov` > Δ`ms_eval` de forma
consistente, ou se `gap_cov_ms` é positivo e não diminui.

**H3.** `ms_eval(k)` para k=0..5 (mediana + IC). Ganho marginal Δ_k = `ms_eval(k) − ms_eval(k−1)`.
Teste de Friedman sobre os Δ_k por módulo e teste de tendência de Page (ordem decrescente esperada).
Reportar `tokens_por_pp(k)`. Fazer o ajuste de uma curva de saturação (`a·(1 − e^(−bk))`) como descritivo.

**Estratificação por memorização (V1).** Todas as análises acima são repetidas separadamente para
módulos de memorização baixa e alta (corte pela mediana de `memo_sim`, definido **antes** de ver C1–C3).

**Análises de sensibilidade planejadas**
- **V1 — Memorização:** probe com a primeira metade do teste humano; medir a similaridade da continuação
  com a metade real (ex.: Jaccard de tokens e similaridade de edição normalizada). Incluir, se possível,
  um módulo escrito/alterado depois do corte de conhecimento do modelo.
- **V2 — Equivalentes:** reportar `ms_killable` além de `ms_eval`.
- **V3 — Operadores:** reavaliar os testes finais com um segundo conjunto de mutantes (por exemplo,
  operadores do Stryker desativados no experimento principal, ou outra ferramenta).
- **V4 — Flaky:** incluir/excluir runs flaky.

## 12. Registro de desvios

| Data | Seção | Desvio | Justificativa | Impacto |
|------|-------|--------|---------------|---------|
| 2026-11-26 | §6 | Três runs além das repetições previstas (r1–r3) foram coletados e ficam **fora da análise**: `pathe__path__C1__r4`, `pathe__path__C1__r8` e `pathe__path__C2__r7` (lote de 2026-11-23, commit `aa81e65`, workflow run 45212339765). | O protocolo prevê 3 repetições por (módulo, condição). Esses três runs, todos de `pathe/path`, têm status `ok` e o mesmo modelo, mas ultrapassam esse número; a origem exata (execução de teste ou reexecução do lote) não foi confirmada. Mantê-los daria a `pathe/path` mais repetições que aos demais módulos nas condições C1 e C2, desbalanceando a mediana por módulo. Os arquivos permanecem em `runs/`, sem alteração; a exclusão é feita na análise (filtro de repetição ≤ 3). | `pathe/path` usa só r1–r3 em C1 e C2. Os demais módulos e condições não mudam. Sem impacto na validade, pois os runs não foram escolhidos pelo resultado; a exclusão é por regra de número de repetições. |

## 13. Ameaças à validade (versão inicial)

- **Interna:** estocasticidade do modelo (mitigação: repetições + estatística não paramétrica);
  *drift* de modelo gratuito (mitigação: ID fixo, artefatos brutos, janela curta de execução);
  overfitting ao Stryker (mitigação: split de mutantes); testes frágeis ou triviais (guardrails G1–G6).
- **Construto:** mutation score subestima por mutantes equivalentes (V2); mutantes sintéticos nem sempre
  representam falhas reais; custo medido em tokens, não em esforço humano.
- **Externa:** 4 bibliotecas TypeScript de funções puras (9 módulos), de um mesmo ecossistema, um único modelo.
  Resultados não se generalizam a código com I/O, estado ou outras linguagens.
- **Memorização:** bibliotecas populares provavelmente fazem parte do treino (V1, estratificação).
- **Conclusão:** poucos módulos (9) → baixo poder; por isso tamanho de efeito e IC.
- **Uso de IA no próprio trabalho:** registrar em `AI_USAGE.md` quais partes do código, protocolo e texto
  tiveram apoio de IA, e discutir na metodologia do artigo (exigência das diretrizes).

## 14. Estrutura do repositório (sugerida)

```
.
├── PROTOCOL.md
├── AI_USAGE.md
├── CLAUDE.md                  # memória do projeto para agentes de código (não entra nos prompts)
├── conventions/               # arquivo de convenções injetado em C2/C3 (base + um por biblioteca)
├── agent/                     # agente TypeScript (providers, prompts, loop, guardrails)
├── analysis/                  # scripts de análise (Python/R) e notebooks
├── config/                    # pricing.json, split.json, stryker.base.json
├── data/subjects.json         # bibliotecas, SHAs, módulos, mapeamento de testes humanos
├── schemas/run-result.schema.json
├── runs/<run_id>/             # result.json + raw/ (prompts e respostas)
└── .github/workflows/         # matriz biblioteca × condição × repetição
```

## 15. Checklist de reprodutibilidade (para o README e o artigo)

- [ ] Commits fixados de todas as bibliotecas
- [ ] ID e data do modelo registrados em cada run
- [ ] Prompts e respostas brutas arquivados
- [ ] Seeds e `SEED_SPLIT` públicos
- [ ] Versões de Node, Vitest e Stryker fixadas (lockfile)
- [ ] Todos os `result.json` validados pelo schema
- [ ] Comando único para reproduzir um run: `npm run run -- --module <m> --cond <c> --rep <r>`
- [ ] Notebook de análise que regenera todas as tabelas e figuras a partir de `runs/`
