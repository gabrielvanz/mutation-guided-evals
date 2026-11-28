# CLAUDE.md — memória do projeto (para agentes de código)

Projeto acadêmico: arcabouço de continuous evals guiado por mutação para geração de testes com LLM.
Leia `PROTOCOL.md` antes de qualquer mudança no experimento.

## Comandos

- `npm run typecheck` · `npm test` (sem rede, sem LLM; deve sempre passar)
- `npm run run -- --library L --module M --condition C --rep R --workdir DIR`
- `npm run validate` valida `runs/**/result.json` contra `schemas/run-result.schema.json`
- `python analysis/analyze.py --runs runs --out analysis/out`

## Extensão ServeRest

- Protocolo em `PROTOCOL_EXT_SERVEREST.md`; sujeitos em `data/subjects-serverest.json` (**não** em `data/subjects.json`) e
  resultados em `runs-serverest/` (**nunca** em `runs/`). Use `--subjects data/subjects-serverest.json --out runs-serverest`.
- A seleção de unidades usa só C0 e está congelada; mudanças vão em §9 do protocolo da extensão.
- O comportamento do experimento principal não pode mudar: as opções novas do executor (`humanRunner`, `preload`, `mutatePaths`,
  `kind`) só valem quando o sujeito as define.

## Regras

- **Não altere `PROTOCOL.md` nem `config/split.json` depois de iniciar a coleta.** Desvios vão em §12 (registro de desvios).
- Dados sintéticos (`analysis/make_synthetic.py`) servem só para testar o código; nunca os use no artigo.
- Nunca invente resultados. Números do artigo vêm de `runs/`.
- Não misture modelos numa mesma comparação; ID do modelo exato (sem `-latest`).
- O agente só escreve `*.test.ts` em `test/__generated__/` do sujeito; `git diff -- src` deve ficar vazio.
- `conventions/` é o arquivo de convenções injetado em C2/C3. **Não** mencione mutation testing nele (isolaria mal o efeito do feedback).
- Mudou o formato de `result.json`? Atualize schema, `types.ts`, `pipeline.ts`, `analysis/analyze.py` e os testes juntos.
- Estilo: TypeScript estrito, ESM, sem dependências de runtime além de `typescript` (usado pelos guardrails).
