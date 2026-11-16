## Específico: pathe (utilitários de caminho multiplataforma)

- A biblioteca normaliza caminhos para separadores POSIX (`/`), inclusive para entradas estilo Windows (`C:\\dir\\file`).
- Os testes originais comparam strings completas de saída com `toBe`/`toEqual`.
- Cubra: caminhos absolutos e relativos, `.` e `..`, barras duplicadas, caminhos Windows com letra de unidade, string vazia, extensões e nomes de arquivo.
