# Malha de Continuous Evals Guiada por Mutação para Geração de Testes com LLM

Trabalho Final de *Engenharia de Software AI-Native* (PPGCA) · Modalidade A (Prática) · Estágio 4 do SDLC (**Test**)
**Autores:** Andriano Toazza e Gabriel Vanz

Este README explica **o que é o trabalho, o que foi feito, o que descobrimos e o que falta entregar**, em linguagem
que não exige conhecimento prévio de teste de mutação. Os detalhes formais estão em [`PROTOCOL.md`](PROTOCOL.md) (o
protocolo do experimento) e no artigo em [`paper/`](paper/).

## Sumário

1. [A ideia em um minuto](#1-a-ideia-em-um-minuto)
2. [O problema: teste que "cobre" não é teste que "pega bug"](#2-o-problema)
3. [A nossa proposta](#3-a-nossa-proposta)
4. [O experimento, passo a passo](#4-o-experimento-passo-a-passo)
5. [O que foi feito (linha do tempo)](#5-o-que-foi-feito)
6. [Resultados](#6-resultados)
7. [O que podemos e o que não podemos concluir](#7-o-que-podemos-e-o-que-não-podemos-concluir)
8. [Proposta de entrega do trabalho](#8-proposta-de-entrega-do-trabalho)
9. [Como reproduzir](#9-como-reproduzir)
10. [Estrutura do repositório](#10-estrutura-do-repositório)
11. [Glossário](#11-glossário)
12. [Perguntas que podem aparecer na apresentação](#12-perguntas-que-podem-aparecer-na-apresentação)

---

## 1. A ideia em um minuto

Pedimos a uma IA (um modelo de linguagem, ou **LLM**) que escreva testes automatizados para código real. Depois
medimos **quão bons** esses testes são, não pela quantidade de linhas que eles executam, mas por **quantos defeitos
artificiais eles conseguem detectar**. Por fim, devolvemos à IA os defeitos que ela **não** detectou e pedimos que
melhore os testes. Repetimos isso até 5 vezes.

A pergunta que queremos responder:

> **O feedback de "defeitos não detectados" melhora os testes gerados pela IA? E a que custo (tokens/chamadas)?
> Como isso se compara a testes escritos por pessoas?**

Tudo é automatizado e roda no **GitHub Actions**, o que dá nome ao trabalho: uma *malha de continuous evals* (uma
esteira que avalia continuamente a qualidade do que a IA produz).

## 2. O problema

Um erro comum é achar que "100% de cobertura" significa "código bem testado". **Cobertura** só diz quais linhas o
teste *executou*. Não diz se o teste *percebeu* algum erro nelas.

### Exemplo

```ts
function ehMaiorDeIdade(idade: number) {
  return idade >= 18;
}
```

Um teste ruim: `expect(ehMaiorDeIdade(30)).toBe(true)`. Ele executa a linha (100% de cobertura), passa, e parece bom.

Agora imagine que um defeito é introduzido de propósito: trocamos `>=` por `>`. Esse código com defeito é chamado de
**mutante**. O teste acima continua passando para 30, então o mutante **sobrevive** (ninguém percebeu o erro). Um teste
melhor, `expect(ehMaiorDeIdade(18)).toBe(true)`, falha com o mutante: ele é **morto**.

Essa técnica é o **teste de mutação** (usamos a ferramenta **Stryker**). O **mutation score** é a porcentagem de
mutantes mortos: quanto maior, mais defeitos os testes detectam. Estudos mostram que cobertura sozinha é um indicador
fraco de qualidade, e é por isso que usamos o mutation score.

## 3. A nossa proposta

Montar uma esteira em que:

1. um **agente de IA** lê o código de um módulo e escreve testes (em Vitest);
2. o **Stryker** cria centenas de mutantes e vê quais os testes pegam;
3. os **sobreviventes** são mostrados à IA ("estes defeitos passaram despercebidos"), que reescreve os testes;
4. repetimos até 5 vezes, registrando **cada passo** (qualidade, tokens gastos, tempo).

E testar três hipóteses:

| ID | Hipótese (em palavras simples) |
|----|--------------------------------|
| **H1** | O laço com feedback gera testes **melhores** que os outros jeitos de usar a IA, **inclusive** que simplesmente pedir várias vezes e escolher o melhor |
| **H2** | A cobertura sobe **sem** que a capacidade de detectar defeitos suba na mesma proporção (cobrir ≠ detectar) |
| **H3** | O ganho do feedback tem **retorno decrescente**: a primeira rodada ajuda muito, as seguintes ajudam cada vez menos, e custam mais por ponto ganho |

## 4. O experimento, passo a passo

### 4.1 O que foi testado

**4 bibliotecas open-source** (todas MIT, do ecossistema UnJS), cada uma fixada em um *commit* exato para que o
código nunca mude: `ufo`, `defu`, `pathe` e `knitwork`. A unidade de análise é o **módulo** (um arquivo `.ts` de
funções puras, sem rede nem I/O). Consideramos **17 módulos candidatos**, medimos 14 e ficamos com **9**:

| Biblioteca | Módulos |
|---|---|
| ufo | `query`, `parse`, `punycode`, `url`, `utils` |
| defu | `defu` |
| pathe | `_path`, `utils` |
| knitwork | `string` |

Critérios, aplicados **antes** de rodar qualquer IA: pelo menos 50 mutantes válidos (para dividir em dois grupos de
25) e score humano de no máximo 92% (para haver espaço de melhoria). Os números estão em
[`data/module-selection.csv`](data/module-selection.csv). Dois candidatos não puderam ser medidos por falha de
ferramenta (`scule`, `ohash`) e um (`pathe/_glob`) ficou de fora por tempo.

### 4.2 As condições comparadas

Todas usam o **mesmo modelo** (`gemini-3.5-flash-lite`, camada gratuita do Google AI Studio), a mesma temperatura
(0,7) e os mesmos módulos.

| Condição | O que é | Chamadas à IA |
|---|---|---|
| **C0** | Testes **escritos por humanos** (linha de base) | 0 |
| **C0-suite** | Toda a suíte humana do repositório (referência superior) | 0 |
| **C1** | Só o código do módulo ("zero-shot") | 1 |
| **C2** | C1 + um arquivo de **convenções do projeto** | 1 |
| **C2r** | C2 repetido 6 vezes de forma independente; fica a melhor amostra | 6 |
| **C3** | C2 + **laço de feedback** com os mutantes sobreviventes, até 5 iterações | até 6 |

**Por que C2r existe?** C3 usa até 6 chamadas; C1 e C2 só 1. Se C3 ganhar, pode ser só porque "tentou mais vezes".
C2r dá o **mesmo número de tentativas** sem nenhum feedback, isolando o efeito do feedback. Por isso H1 só vale se
**C3 > C2r**.

**Cada condição foi repetida 3 vezes por módulo**, porque a IA é aleatória; usamos a mediana das repetições.

### 4.3 Como evitamos "colar" (o *split* de mutantes)

Se a IA otimiza o mesmo número que depois usamos para avaliá-la, ela pode "decorar a prova". Para evitar isso,
dividimos os mutantes de cada módulo em dois grupos de forma determinística (por hash, com semente pública em
[`config/split.json`](config/split.json)):

- **Grupo de feedback**: só os sobreviventes deste grupo são mostrados à IA;
- **Grupo de avaliação**: a IA **nunca** o vê. É a nota principal (`ms_eval`).

### 4.4 Regras anti-trapaça (guardrails)

Um teste gerado é rejeitado se: altera o código-fonte (a IA só pode escrever arquivos `*.test.ts`); usa `.skip`,
`.only`, `expect(true)` ou não tem nenhuma asserção; usa rede, relógio ou `Math.random`; **falha no código original**
(até 2 tentativas de conserto); ou é instável (rodamos 3 vezes para detectar *flakiness*).

### 4.5 O que cada execução ("run") faz

Um *run* é uma combinação (módulo, condição, repetição):

```
baixa a biblioteca no commit fixado → IA escreve o teste → guardrails → roda no código original
→ cobertura (v8) → Stryker (mutantes) → separa feedback/avaliação → (C3) volta à IA com os sobreviventes
→ grava runs/<run_id>/result.json (+ todos os prompts e respostas em raw/)
```

### 4.6 As métricas principais

| Métrica | Em palavras simples |
|---|---|
| `ms_eval` | % de mutantes mortos no grupo de **avaliação** (a nota principal) |
| `ms_all` | % de mutantes mortos em **todos** os mutantes |
| `line_cov` | % de linhas executadas pelos testes (cobertura) |
| lacuna (`gap`) | cobertura − `ms_all`: quanto os testes cobrem **sem** detectar |
| tokens | custo em "palavras" processadas pela IA, contadas pela API |
| taxa de validade | % de runs em que a IA produziu ao menos um teste que passa |

## 5. O que foi feito

1. **Protocolo** ([`PROTOCOL.md`](PROTOCOL.md)): hipóteses, condições, métricas, estatística e registro de desvios.
2. **Agente em TypeScript** (`agent/`): chama a IA, extrai o teste, aplica os guardrails, roda Vitest, cobertura e
   Stryker, calcula o split e o laço de feedback. Tem **71 testes unitários**, sem rede e sem IA.
3. **Seleção de módulos**: medimos a suíte humana de 14 módulos reais com o Stryker e aplicamos os critérios.
4. **Baseline humano (C0 e C0-suite)**: medido de verdade pelo próprio pipeline.
5. **Esteira no GitHub Actions** (`.github/workflows/`): matriz módulo × condição × repetição, 2 jobs em paralelo,
   com repetição automática dos erros de **infraestrutura** (cota, instabilidade da API) e arquivamento dos
   resultados no repositório. Erros do modelo (testes que falham) **não** são repetidos, para não enviesar.
6. **Teste de memorização (V1)**: um *probe* mede o quanto o modelo "já conhece" o teste humano de cada módulo.
7. **Coleta**: de 22 a 26/11/2026, **111 runs com IA** (C1, C2, C2r, C3 × 9 módulos × 3 repetições, mais 3 extras,
   explicados abaixo), todos com o mesmo modelo.
8. **Análise** (`analysis/`): estatística pareada por módulo (Wilcoxon, Holm, Cliff, bootstrap, Friedman, Page,
   Spearman), tabelas LaTeX e figuras.
9. **Análises de sensibilidade V1, V2 e V4** (explicadas na seção 6); a V3 foi executada com um segundo conjunto de operadores próprio.
10. **Artigo** (`paper/main.tex`): resumos, introdução, metodologia, resultados, discussão e conclusão atualizados
    com os números reais.
11. **Transparência de IA** ([`AI_USAGE.md`](AI_USAGE.md)): o que a IA fez, o que não fez e os erros dela que
    foram achados e corrigidos.

### Desvio registrado

Três runs de `pathe/path` além das 3 repetições previstas (`C1 r4`, `C1 r8`, `C2 r7`) estavam no repositório. Foram
**excluídos da análise** para não dar a esse módulo mais repetições que aos demais. Os arquivos continuam em `runs/`
e o desvio está registrado em [`PROTOCOL.md` §12](PROTOCOL.md). A origem exata desses runs não foi confirmada.

## 6. Resultados

> **Resumo honesto:** o feedback **ajuda** em relação a "só pedir uma vez" (C1, C2), mas, quando comparamos com o
> mesmo número de tentativas **sem** feedback (C2r), **não há diferença estatisticamente comprovada**. H1 **não é
> sustentada**.

Números abaixo: 9 módulos, 3 repetições, `gemini-3.5-flash-lite`. Dos 126 runs analisados, 105 entraram na análise
principal (os 21 restantes são runs em que a IA **não conseguiu produzir nenhum teste válido**).

### 6.1 Nota por condição (`ms_eval`, mediana, em %)

| Condição | Nota | Runs válidos | Tokens (mediana) |
|---|---|---|---|
| C0 (humano) | 82,1 | 9/9 | 0 |
| C0-suite (humano, tudo) | 84,0 | 9/9 | 0 |
| C1 (zero-shot) | 70,0 | 23/27 (85,2%) | 5,3 mil |
| C2 (+ convenções) | 76,1 | 17/27 (63,0%) | 5,9 mil |
| C2r (6 amostras, melhor) | 79,0 | 24/27 (88,9%) | 52 mil |
| C3 (com feedback) | 80,3 | 23/27 (85,2%) | 64 mil |

A cobertura de linha chega a **100%** em todas as condições com IA (o humano tem 95,5%): o problema nunca foi
cobrir, foi detectar.

### 6.2 H1: o feedback é melhor? (Wilcoxon pareado unilateral, correção de Holm)

| Comparação | Módulos pareados | Diferença | p ajustado | Conclusão |
|---|---|---|---|---|
| C3 > C1 | 8 | +7,6 pp | 0,109 | não significativo |
| C3 > C2 | 6 | +12,2 pp | **0,047** | significativo |
| **C3 > C2r** | 8 | +4,0 pp | 0,109 | **não significativo** |

(pp = pontos percentuais.) Como C2r e C3 gastam cerca de 10 vezes mais tokens que C1 e C2, parte da vantagem de C3 é
compatível com "ter tentado mais". A diferença contra C2r é positiva, mas o intervalo de confiança inclui zero.

### 6.3 H2: cobertura sobe sem o score subir? **Não sustentada**

Em C3 a cobertura já parte de ~95–100%, então quase não tem para onde subir (ganho mediano de 1,1 pp), enquanto o
score de avaliação sobe 9,8 pp. A lacuna cobertura–score é **maior em C1 que no humano** (26,0 contra 19,5 pp,
p ajustado = 0,047: testes "zero-shot" cobrem mais do que detectam), mas a redução dela em C3 não resiste à
correção de Holm.

### 6.4 H3: retorno decrescente? **Indício, sem significância**

A mediana do melhor score em C3 vai de 73,5% (k=0) para 77,3% (k=1) e 78,9% (k=5): quase todo o ganho vem da
**primeira** rodada de feedback. O custo por ponto ganho sobe de ~1,3 mil tokens (k=1) para ~4,8 mil (k=5). Os
testes estatísticos, porém, não rejeitam a hipótese nula (Friedman p = 0,28; Page p = 0,066).

### 6.5 Por que tantos runs inválidos em C2?

C2 teve 10 de 27 runs sem nenhum teste válido, concentrados em `knitwork/string`, `ufo/url` e `ufo/utils`. Lemos os
prompts e respostas: **não é falha de infraestrutura**; é a IA **errando o que o código faz**. Exemplos: esperou que
`isAbsolute` devolvesse `true` quando o código devolve um número; esperou uma barra no final de uma URL que o código
não coloca; confundiu o escape de quebra de linha. Os consertos às vezes pioram (em um caso a IA alterou a asserção
errada). Como o **código atual é o "oráculo"**, um teste que erra o comportamento é descartado.

### 6.6 Análises de sensibilidade

| Análise | O que testa | Resultado |
|---|---|---|
| **V1** Memorização | O modelo já "conhece" a biblioteca? Dividimos em 5 módulos de baixa e 4 de alta memorização | Poucos módulos por grupo para testes formais; nos dados descritivos, C3 e C2r empatam na baixa (79,0%) |
| **V2** Mutantes equivalentes | Refaz H1 com `ms_killable` (mortos ÷ união dos mortos por qualquer condição) | C3 > C2r fica significativo (p ajustado 0,047), mas **essa métrica inclui o grupo de feedback**, que C3 otimiza, então **não é prova** a favor de H1 |
| **V3** Outros operadores | Reavaliar com outro conjunto de mutantes | **Executada** com 4 operadores próprios (literal ±1, `return undefined`, troca de argumentos): C3 85,5 · C2r 83,5 · C2 80,0 · C1 76,4 · C0 78,6; H1 segue não sustentada (p Holm 0,188 nas três comparações) |
| **V4** Runs instáveis | Incluir/excluir runs flaky | Nenhum run foi instável, sem efeito |

## 7. O que podemos e o que não podemos concluir

**Podemos dizer:**

- O arcabouço funciona de ponta a ponta e é reproduzível (todos os 129 resultados validam no schema; prompts e
  respostas brutas estão arquivados).
- Com um modelo, 9 módulos e 3 repetições, o laço de feedback supera "pedir uma vez" (C1 e C2).
- Quando o orçamento é igualado (C2r), **a vantagem do feedback não é comprovada** (+4,0 pp, p ajustado 0,109).
- A IA atinge 100% de cobertura mas detecta menos defeitos que o humano na mediana (80,3% a 70,0% contra 82,1%).
- Quase todo o ganho do feedback vem da **primeira** iteração.

**Não podemos dizer:**

- Que o feedback "não funciona": o efeito é positivo, mas **o poder estatístico é baixo** (só 6 a 8 módulos pareados).
- Que os resultados valem para outros modelos, outras linguagens ou código com I/O e estado.
- Que a memorização não importa (V1 não tem módulos suficientes).

**Limitações principais:** um único modelo gratuito; 9 módulos de funções puras do mesmo ecossistema; mutantes
sintéticos não são defeitos reais; mutantes equivalentes subestimam o score; o código atual é usado como oráculo
(um teste que "congela" um comportamento errado ainda passa).

## 8. Proposta de entrega do trabalho

### 8.1 O que entregar

1. **Artigo** em [`paper/main.tex`](paper/main.tex) (formato SBC), com resumo em português e inglês.
2. **Repositório** (este), com código, protocolo, dados brutos e análise reprodutíveis.
3. **`AI_USAGE.md`**: o registro obrigatório do uso de IA.

### 8.2 A mensagem central (sugestão de narrativa)

1. **O problema:** cobertura é uma métrica fraca; testes de IA cobrem sem detectar.
2. **A proposta:** uma malha de continuous evals que usa o teste de mutação como sinal de qualidade e como feedback.
3. **O rigor:** split de mutantes (para não avaliar no que a IA otimizou), controle de orçamento (C2r) e guardrails.
4. **O achado:** o feedback melhora o score em relação ao uso simples, mas com **orçamento igualado a diferença não
   se sustenta**; quase todo o ganho vem da primeira iteração. É um **resultado nulo, relatado com honestidade**,
   que é uma contribuição válida (evita concluir que "feedback funciona" por confundi-lo com "tentar mais vezes").
5. **O que fica:** o arcabouço, o protocolo e os dados, para quem quiser repetir com mais módulos ou modelos.

### 8.3 O que ainda falta antes de entregar

| Pendência | Quem resolve |
|---|---|
| **Compilar o `main.tex`** e gerar um novo `main.pdf` (o PDF em `paper/` é de 16/11, **anterior** a todos os resultados) | Vocês (precisa de LaTeX; não foi compilado ainda) |
| Preencher o **domínio institucional** dos e-mails e o **URL público do repositório** (`\pendente` no artigo) | Vocês |
| **Revisar integralmente** o artigo e conferir as **referências**; trocar o `\pendente` de revisão | Vocês |
| Conferir a frase de que "os autores executaram C1–C3" em `AI_USAGE.md` | Vocês |
| Revisar se o conjunto de operadores da **V3** (definido pela IA) é aceitável | Vocês |
| Opcional: mais módulos/modelos, para ganhar poder estatístico | Vocês, se houver tempo |

## 9. Como reproduzir

Requisitos: Node ≥ 20, Git, Python ≥ 3.10 (análise). O Stryker roda a suíte centenas de vezes: prefira ≥ 2 vCPUs.

```bash
npm ci
npm run typecheck && npm test          # 71 testes, sem rede e sem LLM

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
npm run validate                                          # valida runs/**/result.json contra o schema
python -m pip install -r analysis/requirements.txt
python analysis/analyze.py --runs runs --out analysis/out
python analysis/analyze.py --runs runs --out analysis/out/v1_low  --paper /tmp/p --stratum low    # V1
python analysis/analyze.py --runs runs --out analysis/out/v1_high --paper /tmp/p --stratum high   # V1
python analysis/analyze.py --runs runs --out analysis/out/v4 --paper /tmp/p --include-flaky       # V4
python analysis/sensitivity_v2.py --out analysis/out                                              # V2
```

A análise ignora automaticamente repetições acima de 3 (desvio registrado em `PROTOCOL.md` §12). Ela escreve tabelas e
figuras em `paper/tables` e `paper/figs`; nas execuções de sensibilidade, use `--paper` apontando para outra pasta
para não sobrescrever o artigo.

**Fallback de provedor:** qualquer endpoint compatível com OpenAI:
`LLM_PROVIDER=openai LLM_BASE_URL=https://.../v1 LLM_API_KEY=... LLM_MODEL=...`.
**Trocar de provedor ou de modelo no meio do experimento invalida a comparação**: refaça o conjunto inteiro
(PROTOCOL.md §4).

> **Sobre o cliente do Gemini.** Foi escrito a partir do formato REST e verificado com `gemini-3.5-flash-lite`:
> `thinkingBudget: 0` dá HTTP 400 e `thinkingLevel: "minimal"` funciona, então `config/experiment.json` usa
> `thinking_level: "minimal"`. `agent/scripts/check-api.ts` testa cada campo da API.

### Rodando no GitHub Actions

1. Crie o secret `GEMINI_API_KEY` no repositório.
2. Rode **Actions → memorization-probe** uma vez (gera `data/memorization.flat.json`; faça commit).
3. Rode **Actions → experiment** informando o ID exato do modelo. A matriz é módulo × condição × repetição; cada lote
   comita seus resultados em `runs/`. Use o parâmetro `library` para dividir a coleta em vários dias se a cota
   gratuita acabar. Runs com erro de infraestrutura (`provider_error`, `stryker_error`, `timeout`) são descartados e
   refeitos no próximo lote.

### Smoke test sem LLM

```bash
npx tsx agent/scripts/smoke.ts --workdir subjects/ufo --module query --replies replies.json
```

Serve para validar o encanamento (Vitest, cobertura, Stryker, split, schema) com uma IA simulada. **Não produz dados
do experimento.**

### Reprodutibilidade

- Commits das bibliotecas, versões de Node/Vitest/Stryker, seed do split e hash das convenções ficam em cada `result.json`.
- Todos os prompts e respostas brutas e o relatório do Stryker de cada iteração estão em `runs/<run_id>/raw/`.
- Modelos gratuitos mudam: registramos o ID exato e a data. Custos em USD são **de referência**
  (`config/pricing.json`); o custo real é zero.

## 10. Estrutura do repositório

```
PROTOCOL.md                 protocolo experimental (fonte única de verdade; §12 = registro de desvios)
AI_USAGE.md                 como a IA foi usada neste trabalho (exigência das diretrizes)
CLAUDE.md                   regras do projeto para agentes de código
agent/src/                  agente em TypeScript (pipeline, providers, runner, guardrails, CLI)
agent/tests/                testes unitários do agente, com relatório real do Stryker como fixture
agent/scripts/              smoke.ts (ponta a ponta com IA simulada) e check-api.ts (confere a API do Gemini)
conventions/                convenções injetadas em C2/C3 (base + uma por biblioteca)
config/                     experimento, preços de referência, seed do split
data/subjects.json          bibliotecas, commits fixados, módulos e testes humanos
data/module-selection.csv   medições que justificam a inclusão/exclusão de cada módulo
data/memorization*.json     resultado do probe de memorização (V1)
schemas/                    JSON Schema do result.json
scripts/setup-subject.sh    prepara uma biblioteca no commit fixado (+ Vitest, cobertura, Stryker)
analysis/                   analyze.py (H1–H3, V1, V4), sensitivity_v2.py (V2), figuras e tabelas
runs/                       um diretório por run: result.json + raw/ (prompts, respostas, relatórios do Stryker)
.github/workflows/          ci.yml, experiment.yml (matriz), probe.yml (memorização)
paper/                      artigo (LaTeX), tabelas e figuras geradas
```

**Regras do projeto** (de [`CLAUDE.md`](CLAUDE.md)): não alterar `PROTOCOL.md` nem `config/split.json` depois de
iniciar a coleta (desvios vão em §12); dados sintéticos servem só para testar código e nunca entram no artigo;
nunca inventar resultados (todo número do artigo vem de `runs/`); não misturar modelos numa mesma comparação; o
arquivo `conventions/` não menciona teste de mutação (para não contaminar o efeito do feedback).

## 11. Glossário

| Termo | Significado |
|---|---|
| **LLM** | Modelo de linguagem de grande porte (a IA que escreve os testes) |
| **Teste unitário** | Teste automático de uma função isolada |
| **Cobertura** | % de linhas de código executadas pelos testes |
| **Mutante** | Cópia do código com um defeito artificial (ex.: `>=` virou `>`) |
| **Mutante morto / sobrevivente** | Morto: algum teste falhou (detectou). Sobrevivente: todos passaram (não detectou) |
| **Mutation score** | % de mutantes mortos; mede a capacidade de detectar defeitos |
| **Mutante equivalente** | Mutante que não muda o comportamento; não pode ser morto e puxa o score para baixo |
| **Stryker** | Ferramenta que gera mutantes e roda os testes contra eles |
| **Vitest** | Framework de testes usado nos módulos |
| **Zero-shot** | Pedir à IA sem exemplos nem feedback |
| **Oráculo** | O que define se um resultado está "certo"; aqui, o próprio código atual |
| **Wilcoxon, Holm, Cliff, bootstrap** | Teste estatístico pareado; correção para múltiplas comparações; tamanho de efeito; intervalo de confiança por reamostragem |
| **pp** | Pontos percentuais (diferença entre duas porcentagens) |
| **Flaky** | Teste que às vezes passa e às vezes falha sem mudança no código |
| **Run** | Uma execução: (módulo, condição, repetição) |

## 12. Perguntas que podem aparecer na apresentação

- **"Por que não usar só cobertura?"** Porque cobre-se linha sem detectar erro (seção 2). A IA chega a 100% de
  cobertura e ainda assim detecta menos defeitos que o humano.
- **"Por que C2r?"** Para separar o efeito do *feedback* do efeito de *tentar mais vezes* (seção 4.2).
- **"Por que dividir os mutantes em dois grupos?"** Para a IA não ser avaliada no mesmo que otimizou (seção 4.3).
- **"O feedback funciona?"** Melhora em relação ao uso simples; com orçamento igualado, não conseguimos comprovar
  (+4,0 pp, p ajustado 0,109). Ganha quase tudo na primeira iteração.
- **"Por que tantos runs inválidos em C2?"** O modelo erra o comportamento do código e o teste é descartado ao falhar
  no código original (seção 6.5). Isso é um resultado, não um defeito do experimento.
- **"Por que só 9 módulos?"** Os critérios eliminaram os demais (poucos mutantes, score humano já alto, falhas de
  ferramenta). Com 9, o poder estatístico é baixo e relatamos tamanho de efeito e intervalos.
- **"Os resultados valem para outros modelos?"** Não sabemos: só um modelo gratuito foi usado.
- **"A IA fez o trabalho?"** Ela ajudou no desenho, no código, na análise e no rascunho; os autores executaram a
  coleta e devem revisar tudo. Está documentado em [`AI_USAGE.md`](AI_USAGE.md), inclusive com os erros dela.
- **"O que diferencia isto de trabalhos como MuTAP?"** Isolamos o efeito do feedback do efeito de mais tentativas
  (C2r), separamos mutantes de feedback e de avaliação, e usamos bibliotecas TypeScript reais com guardrails.

## Licença

MIT para o código deste repositório. As bibliotecas sob teste mantêm suas próprias licenças (todas MIT).
