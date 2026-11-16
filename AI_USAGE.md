# Uso de IA neste trabalho

As diretrizes da disciplina permitem e incentivam o uso de IA, desde que documentado. Este arquivo é a fonte do
trecho correspondente no capítulo de Metodologia do artigo.

## Ferramentas

- **Claude (Anthropic)**, em interface de chat com ambiente de execução (Linux, Node 22, Python 3.12).

## O que a IA fez

| Parte | Contribuição da IA | Verificação feita |
|---|---|---|
| Desenho experimental (`PROTOCOL.md`) | Propôs as condições C2r (controle de orçamento), o split de mutantes feedback/avaliação, os guardrails e o plano estatístico | Revisão pelos autores; correções motivadas por medições reais (ver abaixo) |
| Agente, executor, CLI, workflows, schema | Escreveu o código TypeScript e os workflows | 65 testes unitários; teste de fumaça com Vitest e Stryker reais; validação do `result.json` contra o schema |
| Análise estatística (`analysis/`) | Escreveu o script (Wilcoxon, Holm, Cliff, bootstrap, Friedman, Page, Spearman) | Rodado em dados **sintéticos** apenas para testar a mecânica |
| Seleção de módulos | Rodou o Stryker nas suítes humanas e propôs critérios de inclusão | Números reais em `data/module-selection.csv` |
| Baseline C0 | Executou o pipeline sobre os módulos | `runs/*__C0__*` |
| Artigo | Redigiu o rascunho | **Os autores devem revisar integralmente**; referências precisam ser conferidas |

## O que a IA NÃO fez

- Não executou as condições C1, C2, C2r e C3 (exigem chave de API que a IA não possui).
- Não produziu nenhum resultado de LLM; qualquer número nessas condições deve vir de `runs/` gerado pelo pipeline.

## Erros da IA detectados e corrigidos durante o trabalho

1. O protocolo v0.1 definia o denominador do mutation score sem excluir `RuntimeError`; a medição real mostrou que o Stryker os exclui. Corrigido na v0.2.
2. A chave de identificação de mutantes colidia para mutantes aninhados (mesmo início, fim diferente); o teste contra um relatório real do Stryker revelou e a chave agora inclui o fim do trecho.
3. A seleção inicial (`scule` como biblioteca principal) falhou: Vitest 1.x é incompatível com o Stryker atual. Substituída por `knitwork`.
4. A estimativa inicial de 100–800 mutantes por módulo não se sustentou; vários módulos têm menos de 50 mutantes válidos e foram excluídos.
5. O escopo dos testes humanos importa: para `ufo/parse.ts` o score com só `parse.test.ts` é muito menor que com a suíte inteira. Por isso C0 é reportado nos dois escopos.

## Riscos de governança a discutir

Alucinação de APIs e expectativas nos testes gerados (mitigada por guardrail G3: testes devem passar no código original),
testes que "passam" mas afirmam comportamento incorreto (o código atual é tomado como oráculo), uso de dados pelo
tier gratuito do provedor (código open-source, risco baixo), e custo computacional do teste de mutação.
