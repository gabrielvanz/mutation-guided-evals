# Malha de Continuous Evals Guiada por Mutação para Geração de Testes com LLM

Trabalho Final de *Engenharia de Software AI-Native* (PPGCA) · Modalidade A (Prático) · Estágio 4 do SDLC (**Test**)
**Autores:** Andriano Toazza e Gabriel Vanz

Um agente de LLM gera testes unitários (Vitest) para módulos de bibliotecas open-source reais; o **Stryker** mede o
*mutation score*; os **mutantes sobreviventes** realimentam o agente em um laço, tudo orquestrado pelo **GitHub Actions**.

> **Pergunta de pesquisa.** O feedback de mutantes sobreviventes aumenta o mutation score de testes gerados por LLM,
> e a que custo, comparado a testes escritos por humanos?

O protocolo completo (hipóteses H1–H3, condições, métricas, split de mutantes, guardrails e estatística) está em
[`PROTOCOL.md`](PROTOCOL.md). O artigo está em [`paper/`](paper/).

## Estado atual (leia antes de usar)

| Componente | Estado |
|---|---|
| Agente (condições C0, C1, C2, C2r, C3), guardrails, split de mutantes, schema | Implementado; **65 testes unitários** passando |
| Executor real (Vitest + cobertura v8 + Stryker) | Validado de ponta a ponta com um provedor *mock* |
| **Baseline humano (C0)** | **Medido de verdade** pelo próprio pipeline (`runs/*__C0__*`) |
| Chamadas reais ao LLM (Gemini) | Implementadas e testadas com `fetch` simulado; **ainda não executadas** (exigem chave de API) |
| Resultados de C1, C2, C2r, C3 | **Pendentes** — o experimento principal ainda não foi rodado |
| Análise estatística | Implementada e validada com dados **sintéticos** (que nunca entram no artigo) |

## Estrutura

```
PROTOCOL.md                 protocolo experimental (fonte única de verdade)
AI_USAGE.md                 como a IA foi usada neste trabalho (exigência das diretrizes)
CLAUDE.md                   memória do projeto para agentes de código (Claude Code etc.)
agent/src/                  agente em TypeScript (pipeline, providers, runner, guardrails, CLI)
agent/tests/                testes unitários do agente (Vitest), com relatório real do Stryker como fixture
agent/scripts/smoke.ts      teste de fumaça ponta a ponta (executor real + LLM mock)
conventions/                "CLAUDE.md" de convenções injetado em C2/C3 (base + um por biblioteca)
config/                     experimento, preços de referência, seed do split
data/subjects.json          bibliotecas, commits fixados, módulos e testes humanos
data/module-selection.csv   medições que justificam a inclusão/exclusão de cada módulo
schemas/                    JSON Schema do result.json
scripts/setup-subject.sh    prepara uma biblioteca no commit fixado (+ Vitest, cobertura, Stryker)
analysis/                   análise estatística (H1, H2, H3), tabelas LaTeX e figuras
runs/                       um diretório por run: result.json + raw/ (prompts, respostas, relatórios do Stryker)
.github/workflows/          ci.yml, experiment.yml (matriz), probe.yml (memorização)
paper/                      artigo (LaTeX)
```

## Início rápido

Requisitos: Node ≥ 20, Git, Python ≥ 3.10 (análise). O Stryker roda a suíte centenas de vezes: prefira ≥ 2 vCPUs.

```bash
npm ci
npm run typecheck && npm test          # 65 testes, sem rede e sem LLM

# 1) preparar um sujeito no commit fixado
scripts/setup-subject.sh ufo           # cria subjects/ufo

# 2) baseline humano (não usa LLM)
npm run run -- --library ufo --module query --condition C0 --workdir subjects/ufo
npm run run -- --library ufo --module query --condition C0 --c0-scope suite --workdir subjects/ufo

# 3) condições com LLM (exigem chave e ID EXATO do modelo)
export LLM_PROVIDER=gemini
export LLM_MODEL=<id-exato-do-modelo>        # aliases "-latest" são recusados de propósito
export GEMINI_API_KEY=<sua-chave>
npm run run -- --library ufo --module query --condition C3 --rep 1 --workdir subjects/ufo

# 4) validar resultados e analisar
npm run validate
python -m pip install -r analysis/requirements.txt
python analysis/analyze.py --runs runs --out analysis/out
```

Fallback para qualquer endpoint compatível com OpenAI (Groq, OpenRouter, vLLM):
`LLM_PROVIDER=openai LLM_BASE_URL=https://.../v1 LLM_API_KEY=... LLM_MODEL=...`.
**Trocar de provedor no meio do experimento invalida a comparação**: refaça o conjunto inteiro (PROTOCOL.md §4).

> **Atenção (não verificado contra a API real).** O cliente do Gemini foi escrito a partir do formato REST conhecido e
> testado só com `fetch` simulado. Antes da coleta, faça uma chamada de teste e confira: o nome do campo `seed`,
> `thinkingConfig` e o campo `usageMetadata` usado para contar tokens. Verificado com `gemini-3.5-flash-lite`:
> `thinkingBudget: 0` dá HTTP 400 e `thinkingLevel: "minimal"` funciona, então `config/experiment.json` usa
> `thinking_level: "minimal"` (modelos mais antigos usam `thinking_budget: 0`). `agent/scripts/check-api.ts` testa cada campo.

### Smoke test sem LLM

```bash
npx tsx agent/scripts/smoke.ts --workdir subjects/ufo --module query --replies replies.json
```

`replies.json` é uma lista de arquivos de teste que o *mock* devolve em sequência. Serve para validar o encanamento
(Vitest, cobertura, Stryker, split, schema). **Não produz dados do experimento.**

### Rodando no GitHub Actions

1. Crie o secret `GEMINI_API_KEY` no repositório.
2. Rode **Actions → memorization-probe** uma vez (gera `data/memorization.flat.json`; faça commit).
3. Rode **Actions → experiment** informando o ID exato do modelo. A matriz é módulo × condição × repetição;
   o job `analyze` valida os `result.json` e roda `analysis/analyze.py`.
   Use o parâmetro `library` para dividir a coleta em vários dias se a cota gratuita do provedor acabar;
   runs com `status=provider_error` são refeitos automaticamente na próxima execução.

## Reprodutibilidade

- Commits das bibliotecas, versões de Node/Vitest/Stryker, seed do split e hash do arquivo de convenções ficam em cada `result.json`.
- Todos os prompts e respostas brutas e o relatório do Stryker de cada iteração são arquivados em `runs/<run_id>/raw/`,
  de modo que a análise é refeita mesmo se o modelo gratuito desaparecer.
- Modelos de tier gratuito mudam; registre o ID e a data. Custos em USD são **de referência** (`config/pricing.json`); o custo real é zero.

## Limitações conhecidas

Veja `PROTOCOL.md §13` e a seção de ameaças à validade do artigo. Em resumo: poucos módulos (≈ 9), um único modelo,
bibliotecas populares que o modelo pode ter memorizado, mutantes equivalentes subestimam o score, e o `scule` foi
excluído por incompatibilidade de ferramenta (Vitest 1.x com o Stryker atual).

## Licença

MIT para o código deste repositório. As bibliotecas sob teste mantêm suas próprias licenças (todas MIT).
