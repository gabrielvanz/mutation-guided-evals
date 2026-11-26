# Uso de IA neste trabalho

As diretrizes da disciplina permitem e incentivam o uso de IA, desde que documentado. Este arquivo é a fonte do
trecho correspondente no capítulo de Metodologia do artigo.

## Ferramentas

- **Claude (Anthropic)**, em interface de chat com ambiente de execução (Linux, Node 22, Python 3.12). Usado na fase de
  desenho, implementação e baseline C0.
- **Claude Code** (extensão do VS Code, modelo Claude Sonnet 5.5), no repositório local. Usado na fase de análise dos
  resultados das condições com LLM e de reescrita do artigo (novembro de 2026).

## O que a IA fez

| Parte | Contribuição da IA | Verificação feita |
|---|---|---|
| Desenho experimental (`PROTOCOL.md`) | Propôs as condições C2r (controle de orçamento), o split de mutantes feedback/avaliação, os guardrails e o plano estatístico | Revisão pelos autores; correções motivadas por medições reais (ver abaixo) |
| Agente, executor, CLI, workflows, schema | Escreveu o código TypeScript e os workflows | 71 testes unitários passando (65 na primeira versão); teste de fumaça com Vitest e Stryker reais; validação do `result.json` contra o schema (129/129 válidos) |
| Análise estatística (`analysis/`) | Escreveu o script (Wilcoxon, Holm, Cliff, bootstrap, Friedman, Page, Spearman); na fase de análise, acrescentou o filtro de repetição ≤ 3, o Holm sobre a família H2, a opção `--stratum` (V1) e o script da V2 | Primeiro rodado em dados **sintéticos** apenas para testar a mecânica; depois rodado sobre `runs/` reais, com os números conferidos contra `analysis/out` |
| Seleção de módulos | Rodou o Stryker nas suítes humanas e propôs critérios de inclusão | Números reais em `data/module-selection.csv` |
| Baseline C0 | Executou o pipeline sobre os módulos | `runs/*__C0__*` |
| Análise dos resultados de C1–C3 | Rodou `analyze.py`, as análises V1, V2 e V4, e investigou a causa dos runs inválidos de C2 lendo os prompts e respostas em `raw/` | A causa foi lida em uma amostra (a repetição 1 de `knitwork/string`, `ufo/url` e `ufo/utils`) e confirmada nos motivos de descarte de todos os runs (`tests_fail_on_original`); não foram lidos todos os arquivos `raw/` |
| Registro de desvio | Redigiu a entrada de 2026-11-26 em §12 do `PROTOCOL.md` (3 runs extras de `pathe/path` fora da análise) | Os autores decidiram o desvio; a origem exata dos runs extras não foi confirmada |
| Artigo | Redigiu o rascunho e, depois, reescreveu resumos, resultados, sensibilidade e conclusão com os números reais | Números conferidos contra `analysis/out` e contra `data/module-selection.csv`; **o `main.tex` ainda não foi compilado nesta fase**; **os autores devem revisar integralmente** e conferir as referências |

## O que a IA NÃO fez

- Não executou as condições C1, C2, C2r e C3: foram executadas pelos autores no GitHub Actions (exigem chave de API que a IA não possui). A IA só analisou os `result.json` resultantes.
- Não produziu nenhum resultado de LLM; os números dessas condições vêm de `runs/` gerado pelo pipeline.
- Não executou a análise V3 (segundo conjunto de operadores): não há um conjunto definido, e a escolha cabe aos autores.
- Não preencheu os campos que dependem dos autores (`\pendente` no `main.tex`: domínio institucional, URL do repositório e confirmação da revisão).

## Erros da IA detectados e corrigidos durante o trabalho

1. O protocolo v0.1 definia o denominador do mutation score sem excluir `RuntimeError`; a medição real mostrou que o Stryker os exclui. Corrigido na v0.2.
2. A chave de identificação de mutantes colidia para mutantes aninhados (mesmo início, fim diferente); o teste contra um relatório real do Stryker revelou e a chave agora inclui o fim do trecho.
3. A seleção inicial (`scule` como biblioteca principal) falhou: Vitest 1.x é incompatível com o Stryker atual. Substituída por `knitwork`.
4. A estimativa inicial de 100–800 mutantes por módulo não se sustentou; vários módulos têm menos de 50 mutantes válidos e foram excluídos.
5. O escopo dos testes humanos importa: para `ufo/parse.ts` o score com só `parse.test.ts` é muito menor que com a suíte inteira. Por isso C0 é reportado nos dois escopos.
6. O rascunho do artigo dizia 16 módulos candidatos e 13 medidos; o CSV de seleção tem 17 e 14. Corrigido ao conferir o texto contra os dados.
7. As primeiras legendas das figuras de H2 e de H1 estavam erradas (dizia que todos os módulos ficavam acima da diagonal, quando um fica abaixo, e chamava de losango o triângulo da média). Detectado ao abrir os PDFs; corrigido.
8. A reescrita do artigo referenciava um rótulo inexistente (`sec:metodo`); detectado por busca no `main.tex` e substituído.
9. O Holm não era aplicado aos testes de H2: a redução da lacuna cobertura–score em C3 contra C2 aparecia significativa (p = 0,031) e deixou de ser (p Holm = 0,156). Corrigido no `analyze.py` e no texto.
10. A métrica `ms_killable` (V2) favorece C3 por incluir o grupo de feedback; o artigo registra que ela **não** sustenta H1.

## Riscos de governança a discutir

Alucinação de APIs e expectativas nos testes gerados (mitigada por guardrail G3: testes devem passar no código original;
nos runs de C2 sem teste válido, as falhas foram expectativas incorretas sobre o comportamento do código),
testes que "passam" mas afirmam comportamento incorreto (o código atual é tomado como oráculo), uso de dados pelo
tier gratuito do provedor (código open-source, risco baixo), e custo computacional do teste de mutação.

Outro risco é que a IA redigiu a interpretação dos resultados. As conclusões (H1, H2 e H3 não sustentadas; V2 com viés)
seguem os números de `analysis/out`, mas a leitura deve ser confirmada pelos autores antes da entrega.
