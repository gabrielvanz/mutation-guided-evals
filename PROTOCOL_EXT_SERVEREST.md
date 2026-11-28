# Extensão do protocolo: ServeRest (API REST em Node/Express)

Versão 0.1, 27/11/2026. Complementa o `PROTOCOL.md` (v0.2) sem alterá-lo. **Nada desta extensão entra na análise principal**:
dados em `data/subjects-serverest.json` e `runs-serverest/`, análise em `analysis/out-serverest/`.

**Registro prévio.** Este documento e a seleção de módulos (`data/module-selection-serverest.csv`) foram fechados **antes de
qualquer execução de C1, C2, C2r ou C3 na ServeRest**. A seleção usou só medições do baseline humano (C0), como no protocolo
principal (§2.2). Qualquer mudança posterior vai em §9 abaixo.

## 1. Motivo

A principal limitação do estudo é que os 9 módulos são funções puras de bibliotecas TypeScript. A ServeRest
(`ServeRest/ServeRest`, commit `357bb6507dd862742cb312dc8a00c01c7984e057`, versão 3.5.0, licença GPL-3.0) é uma API real em
JavaScript (CommonJS), com rotas, middlewares, validação e banco em arquivo. Ela já tem uma suíte humana (Mocha, chai, sinon,
supertest) e já usa Stryker, o que permite um baseline C0 honesto.

## 2. O que NÃO muda

Modelo e parâmetros (§4), condições C0, C1, C2, C2r e C3 (§3), N = 5, 3 repetições, o split determinístico de mutantes com a
semente de `config/split.json` (§7), o prompt de feedback (§8), os guardrails G1 a G7 (§9), as métricas (§10) e o plano
estatístico (§11). Os testes **gerados** continuam sendo arquivos TypeScript do Vitest.

## 3. O que muda

| Ponto | Protocolo principal | Extensão ServeRest |
|---|---|---|
| Linguagem do código sob teste | TypeScript | JavaScript CommonJS (nota no prompt; bloco de código `js`) |
| Gerenciador de pacotes | pnpm | npm (`pm: "npm"` em `data/subjects-serverest.json`) |
| Baseline humano (C0) | Vitest | **Mocha** com cobertura do `nyc` (rc próprio, ignora o `.nycrc.json` do projeto) |
| Stryker no C0 | `vitest-runner` | `mocha-runner` (mesmos mutantes: mesmo arquivo, mesma versão do Stryker) |
| Stryker nos testes gerados | `vitest-runner` | `vitest-runner` com `vitest.related = false` (o código CommonJS é carregado por `require`, fora do grafo do Vite) |
| Estado | funções puras | bancos NeDB **em memória**, com a semente versionada e sem gravar em disco (`agent/assets/nedb-em-memoria.cjs`), em **todas** as condições |
| Prova de que o código não mudou | `git diff -- src` vazio | `git diff -- src ':(exclude)src/data'` vazio |
| Execuções de teste | sem variáveis extras | `TEST_TYPE=mutation`, `NODE_ENV=serverest-test` (as mesmas do Stryker do projeto) |

**Por que o banco em memória.** Com o banco em arquivo, o estado deixado por um mutante passava ao seguinte e **inflava** o
score do baseline. Medimos os dois ambientes: `usuarios-service` foi de 87,5% (disco) para 58,3% (memória),
`carrinhos-service` de 93,4% para 68,9% e `produtos-service` de 60,0% para 50,4%. Os 447 testes humanos de integração passam
nos dois ambientes.

## 4. Dois conjuntos de unidades

- **`serverest` (unidade de módulo).** Um arquivo `.js` por unidade; testes gerados por Vitest que chamam as funções exportadas
  (`req`/`res` simulados nos middlewares e controllers).
- **`serverest-api` (unidade de API).** Um recurso da API por unidade, com **vários arquivos mutados juntos** (controller,
  service e model). Os testes gerados usam **`supertest` sobre o app Express** (`import app from "../../src/app"`), com um
  prompt de sistema próprio, o arquivo de rotas como contexto somente leitura, e o guardrail de imports aceita `supertest`
  além do `vitest`. Os sobreviventes do prompt de feedback indicam o arquivo de cada mutante.

As duas famílias são analisadas **separadamente**. Os módulos da primeira são arquivos que também fazem parte das unidades da
segunda (há sobreposição de mutantes); por isso não se agrupam os dois conjuntos.

## 5. Critérios de seleção de unidades

Os do `PROTOCOL.md` §2.1, medidos no escopo do módulo (C0 com os testes humanos da unidade):

- pelo menos **50 mutantes válidos** (Killed, Timeout, Survived, NoCoverage);
- score humano de no máximo **92%**;
- a suíte humana da unidade passa e não é instável (3 reexecuções);
- **sem rede e sem sistema de arquivos em tempo de execução** (critério original de "funções puras", relaxado só para
  permitir banco em memória, `req`/`res` e HTTP em processo);
- o teste humano precisa executar o módulo (um baseline que não o executa não tem valor).

Resultado (`data/module-selection-serverest.csv`): de 26 candidatos (21 módulos e 5 unidades de API) ficaram **9 unidades**.

| Família | Selecionadas | Score humano (C0, módulo) |
|---|---|---|
| `serverest` | error-handler (142 mutantes), carrinhos-controller (72), produtos-service (115), carrinhos-service (61), rate-limiter (131) | 65,5%, 79,2%, 50,4%, 68,9%, 87,0% |
| `serverest-api` | usuarios (79), produtos (176), carrinhos (145), middlewares (191) | 65,8%, 54,5%, 68,3%, 67,5% |

Excluídas, entre outras: `etapas` (96,3%, teto), `github-release` (rede), `lab-entrega` (sistema de arquivos), `swagger-sw`
(o teste não executa o módulo), `authentication-middleware` (49 mutantes, um abaixo do mínimo) e os três `*-model`
(12 a 21 mutantes, esquemas declarativos).

## 6. Hipóteses e análise

As mesmas H1 a H3. Como há **5 unidades** em `serverest` e **4** em `serverest-api`, o teste de Wilcoxon unilateral pareado não
alcança significância depois do Holm: o menor p possível com n = 5 é 1/32 = 0,031, e o ajuste sobre três comparações já o
leva acima de 0,05. Por isso **a extensão é exploratória e descritiva**: tabelas por unidade, medianas por condição,
tamanho de efeito (delta de Cliff) e intervalos, **sem declarar significância**. Não se juntam os dados da extensão aos das 9 unidades originais em nenhum teste confirmatório.
Pergunta adicional, descritiva: o ganho do feedback (C3 contra C2r) muda entre testes de unidade e testes de API?

Comando: `python analysis/analyze.py --runs runs-serverest --out analysis/out-serverest --paper analysis/paper-serverest`.

## 7. Como executar

```bash
scripts/setup-subject.sh serverest subjects/serverest          # npm; instala Vitest, Stryker e mocha-runner
# C0 (sem LLM); use --library serverest-api para as unidades de API
npm run run -- --subjects data/subjects-serverest.json --out runs-serverest \
  --library serverest --module error-handler --condition C0 --workdir subjects/serverest
# condições com LLM
export LLM_PROVIDER=gemini LLM_MODEL=<id-exato> GEMINI_API_KEY=<chave>
npm run run -- --subjects data/subjects-serverest.json --out runs-serverest \
  --library serverest-api --module usuarios --condition C3 --rep 1 --workdir subjects/serverest
npm run validate -- --dir runs-serverest
```

Em lote: workflow `.github/workflows/experiment-serverest.yml` (mesmo grupo de concorrência do experimento principal).
Teste de fumaça sem LLM: `npx tsx agent/scripts/smoke-serverest.ts` (ver o cabeçalho do arquivo).

## 8. Ameaças específicas

- **Memorização.** A ServeRest é muito usada na comunidade brasileira de testes de API; o modelo pode conhecê-la bem. A sonda
  de memorização (V1) foi executada depois (`data/memorization-serverest.json`): mediana 0,086, com `usuarios` alto (0,716).
- **Ambiente da seleção.** As medições de C0 para escolher módulos foram feitas em Windows (Node 24); a coleta oficial rodou em Linux
  (WSL Ubuntu, Node 22). As diferenças de ambiente mudaram o C0 em até cerca de 5 pontos (ver §10).
- **Runners diferentes no C0.** O baseline roda em Mocha e os testes gerados, em Vitest. Os mutantes são os mesmos e a
  regra de "morto" é a mesma (algum teste falha), mas a cobertura vem de ferramentas diferentes (`nyc` e v8).
- **Banco em memória.** Difere da execução real da API (arquivos). Foi aplicado igualmente a todas as condições.
- **Oráculo.** Como no estudo principal, o comportamento atual do código é o oráculo; a documentação OpenAPI (`docs/swagger.json`)
  não é usada como oráculo nesta versão.
- **Licença.** A ServeRest é GPL-3.0; o código dela não é redistribuído aqui (clone no commit fixo em `subjects/`, ignorado pelo git).
- **Limitação do Vitest com CommonJS (decisão final, 28/11/2026).** No Vitest, o `import` de um arquivo CommonJS devolve outro objeto que o
  `require` do módulo sob teste; `vi.mock` não intercepta o `require` e `vi.spyOn` no objeto importado não afeta o que o módulo chama
  (só `createRequire(import.meta.url)` dá o mesmo objeto). Por isso `carrinhos-controller` (12 de 12 runs inválidas na v1 e na v2) e, em
  boa parte, `error-handler` não têm teste gerado válido. Os autores decidiram **não** fazer uma v3 com `createRequire`: a limitação
  fica documentada e as conclusões da extensão não cobrem essas unidades (ver §10.1 e §11.1).
- **Poucas unidades** (seção 6).

## 9. Registro de desvios da extensão

| Data | Desvio | Justificativa | Impacto |
|---|---|---|---|
| 2026-11-27 | A seleção foi medida **no escopo do módulo** e não da suíte inteira (que o protocolo principal usou). | Cada unidade tem a sua suíte humana (os testes do recurso); a suíte inteira roda ~790 testes por mutante coberto e não representa o C0 da unidade. | Os scores humanos de seleção são os do C0 que será reportado. |
| 2026-11-27 | A coleta usa `gemini-3.5-flash-lite`, o mesmo modelo do estudo principal (o `.env` indicava outro modelo; não usado para não misturar modelos). Intervalo mínimo de 9 s entre chamadas, 2 workers em WSL (Ubuntu, Node 22). | Comparabilidade com o estudo principal. | Nenhum na análise. |
| 2026-11-27 | Timeout de 180 s por requisição ao Gemini (`requestTimeoutMs`), adicionado durante a coleta. A run `serverest__carrinhos-controller__C3__r2` ficou 17 min parada numa requisição sem resposta, foi interrompida (rc=143) e será refeita do zero. | Sem timeout, uma conexão pendurada trava o run indefinidamente. | Só infraestrutura: estourar o limite vira falha de rede e a chamada é refeita; prompts e parâmetros do modelo não mudam. |
| 2026-11-27 | `.nycrc.json` do projeto ignorado na cobertura. | Ele exclui `rate-limiter` e exige 100%; o experimento mede só o(s) arquivo(s) da unidade. | Só afeta `line_cov`, não o score de mutação. |
| 2026-11-28 | Análise complementar v2 (3 unidades, instrução de prompt nova), registrada em §11 antes das runs. | §10.1: três unidades sem teste válido na v1. | Só afeta `runs-serverest-v2/`; v1 intacta; nunca misturadas. |

## 10. Resultados da coleta (27/11/2026)

117 runs (9 C0 + 3 repetições × 9 unidades × 4 condições de LLM), modelo `gemini-3.5-flash-lite`, em WSL Ubuntu.
77 `ok` e 40 `invalid_all_iterations`; nenhum erro de infraestrutura no final. **Análise exploratória, sem declarar significância** (§6).
O `analyze.py` agrupa as duas famílias e imprime testes de Wilcoxon (n = 6 e 9): esses valores **não** são reportados como
confirmatórios, porque o §4 pede análise separada e cada família tem só 3 unidades com dados.

Mediana de `ms_eval` (%) entre as runs `ok`; `-` = nenhuma run válida:

| Unidade | C0 | C1 | C2 | C2r | C3 |
|---|---|---|---|---|---|
| carrinhos-controller | 81,8 | - | - | - | - |
| carrinhos-service | 65,4 | 28,6 | 28,6 | 28,6 | 33,3 |
| error-handler | 66,7 | - | - | - | - |
| produtos-service | 51,9 | 5,8 | 30,8 | 34,6 | 38,5 |
| rate-limiter | 88,7 | 14,5 | 29,0 | 43,5 | 61,3 |
| api/carrinhos | 66,7 | 7,8 | 18,8 | 89,6 | 95,5 |
| api/middlewares | 67,4 | 5,4 | - | - | - |
| api/produtos | 56,0 | 10,1 | 69,5 | 69,5 | 72,0 |
| api/usuarios | 60,5 | 71,4 | 74,3 | 97,1 | 94,3 |

Leitura descritiva: nas unidades com dados, C3 e C2r ficam acima de C1 e C2, e C3 contra C2r é próximo (diferença mediana de
4,3 pontos entre unidades). Nas unidades de módulo, os testes gerados ficam abaixo do baseline humano; nas de API, `carrinhos`
e `usuarios` passam dele com feedback. `error-handler`, `carrinhos-controller` e `middlewares` não tiveram teste gerado válido
(`tests_fail_on_original`): as conclusões não cobrem essas unidades. Taxa de validade de run por condição: C1 63,0%, C2 55,6%,
C2r 66,7%, C3 66,7%.

C0 em Linux contra a seleção em Windows (pontos): usuarios 60,5 (65,8), produtos 56,0 (54,5), carrinhos 66,7 (68,3), middlewares
67,4 (67,5), carrinhos-service 65,4 (68,9), produtos-service 51,9 (50,4), rate-limiter 88,7 (87,0), carrinhos-controller 81,8
(79,2), error-handler 66,7 (65,5). Todas as nove unidades continuam abaixo do teto de 92%.

### 10.1 Por que três unidades não têm teste gerado válido

Diagnóstico feito em 27/11/2026 rodando os testes gerados contra o código original (todos os descartes são `tests_fail_on_original`,
exceto 5 de guardrail em `middlewares`):

- **`carrinhos-controller` (artefato do ambiente).** Em 126 de 126 respostas o modelo usa `vi.mock("../../src/services/carrinhos-service")`.
  O controller é CommonJS e carrega o service com `require`, que o `vi.mock` não intercepta: os espiões têm 0 chamadas e o service real
  recebe `null`. Os 12 testes de um arquivo típico falham. É uma limitação da extensão (ferramenta de teste × módulo CommonJS), não só
  do modelo.
- **`error-handler` (contexto insuficiente).** O módulo depende de `montarMensagemDeErroDeSchema`, que lê `error.details.body|query|params`.
  O prompt traz só o código do módulo, não o dessa dependência; o modelo erra o formato do erro de validação nas 42 iterações e,
  como um teste que falha invalida o arquivo inteiro, o resultado é descartado.
- **`middlewares` (suposição errada do modelo).** Os testes afirmam 401/400 em rotas que na API real respondem 200 (o modelo supõe que
  rotas são protegidas ou que certas URLs geram erro). Limitação do modelo, mesmo com `rotas-da-api.js` no contexto.

Consequência: não corrigi nada para não mudar o protocolo no meio da coleta. Refazer essas unidades com outra instrução (por exemplo,
proibir `vi.mock` de módulos CommonJS e incluir as dependências diretas como contexto) seria um desvio novo, a registrar em §9.

## 11. Análise complementar v2 (registro prévio, 27/11/2026)

**Fechado antes de qualquer run v2.** Motivo: §10.1 mostrou que três unidades (`error-handler`, `carrinhos-controller`,
`middlewares`) não tiveram teste gerado válido por causas de contexto, de ambiente ou de suposição do modelo.

- **O que muda (só o prompt, via `data/subjects-serverest-v2.json`):** a nota do projeto ganha a instrução de não usar
  `vi.mock`/`vi.doMock` em módulos do projeto (usar `vi.spyOn` no objeto exportado), de só afirmar o que decorre do código e do
  contexto e, nas unidades de API, de decidir 401/403 pelos arquivos de rotas e obter tokens por `POST /login`. As dependências diretas
  entram como contexto somente leitura: `error-handler` (`montarMensagemDeErroDeSchema`, `constants`, `logger`), `carrinhos-controller`
  (`carrinhos-service`, `constants`) e `middlewares` (as quatro rotas e `rotas-da-api`).
- **O que NÃO muda:** modelo (`gemini-3.5-flash-lite`), parâmetros, condições, N = 5, 3 repetições, split de mutantes, guardrails,
  ambiente (WSL Ubuntu) e as unidades. O C0 não depende do prompt: as 3 execuções de C0 da coleta v1 são reaproveitadas.
- **Separação:** resultados em `runs-serverest-v2/`, **nunca** misturados com os de `runs-serverest/` (v1) em nenhum teste. A v2 é
  descritiva e cobre só essas 3 unidades (36 runs: 3 unidades × C1, C2, C2r, C3 × 3 repetições). Não se compara v1 e v2 como se fossem
  a mesma condição: as duas usam instruções diferentes.
- **Ressalva:** a instrução v2 foi escrita depois de ver os erros da v1 nessas unidades; é uma correção guiada pelos dados, não um
  desenho prévio independente.

### 11.1 Resultados da v2 (28/11/2026)

36 runs concluídas e validadas (`runs-serverest-v2/`), sem erro de infraestrutura. **Descritivo**, três unidades, sem teste de hipótese.
C0 das três unidades vem da v1 (não depende do prompt): `middlewares` 67,4%, `error-handler` 66,7%, `carrinhos-controller` 81,8%.

Mediana de `ms_eval` (%) entre as runs `ok` (n de runs `ok` / 3):

| Unidade | C1 | C2 | C2r | C3 |
|---|---|---|---|---|
| middlewares | 14,1 (3/3) | 27,7 (2/3) | 28,3 (3/3) | 48,9 (3/3) |
| error-handler | - (0/3) | - (0/3) | 56,5 (1/3) | 56,5 (1/3) |
| carrinhos-controller | - (0/3) | - (0/3) | - (0/3) | - (0/3) |

- **`middlewares`: recuperada.** Passou de quase nenhuma run válida na v1 para 11 de 12; C3 (48,9%) fica acima de C2r (28,3%), C2 e C1,
  mas todos abaixo do baseline humano.
- **`error-handler`: melhora parcial.** 2 de 12 runs `ok`. Agora o modelo usa as dependências, mas passou a espionar `log`
  (`vi.spyOn`), que o módulo desestrutura no `require`, então as chamadas não são registradas.
- **`carrinhos-controller`: sem nenhuma run válida** (0 de 12), embora o modelo tenha abandonado o `vi.mock` (0 de 126 respostas) e usado
  `vi.spyOn` (126 de 126). Causa confirmada em experimento no WSL: o `import` ESM de um arquivo CommonJS no Vitest devolve **outro objeto**
  que o `require` do módulo sob teste (`service === service_require` é `false`); `vi.spyOn` no objeto importado não afeta o que o controller
  chama. Usando `createRequire(import.meta.url)` para obter o mesmo objeto, o espião é chamado. Ou seja, o impedimento é do ambiente
  (Vitest × CommonJS), e uma v3 teria de instruir o uso de `createRequire`; **não foi feita**.
- A v2 não é comparável com a v1 como condição (instruções diferentes); os dois conjuntos nunca foram misturados.
