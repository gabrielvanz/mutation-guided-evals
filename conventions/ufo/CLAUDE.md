## Específico: ufo (utilitários de URL)

- Entradas típicas: URLs absolutas, caminhos relativos, `//host`, strings com `?query` e `#hash`, protocolos (`http:`, `file:`, `data:`), strings vazias.
- Os testes originais usam tabelas `{ input, out }` e comparam strings completas de saída com `toBe`/`toEqual`.
- Cubra variações com e sem barra final, barras duplicadas e percent-encoding.
