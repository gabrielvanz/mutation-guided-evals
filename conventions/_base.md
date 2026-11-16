# Convenções de teste (projetos UnJS)

- Framework: Vitest. Imports no topo: `import { describe, it, expect } from "vitest";`.
- Estilo do código: aspas duplas, ponto e vírgula, indentação de 2 espaços.
- Organização: um `describe` de nível superior por função exportada; dentro dele, casos agrupados por comportamento.
- Para funções puras, prefira testes orientados a tabela (array de casos `{ input, expected }` percorrido com `for ... of` ou `it.each`), como nos testes originais do projeto.
- Títulos de teste descritivos, no formato "should ..." ou o valor de entrada serializado; um comportamento por teste.
- Asserções exatas: use `toBe` para primitivos, `toEqual`/`toStrictEqual` para objetos e arrays, `toThrow` (com tipo ou mensagem) para erros. Evite asserções frouxas como `toBeTruthy` quando o valor exato é conhecido.
- Cubra: o uso principal documentado, argumentos omitidos/valores padrão, entradas vazias, valores limite, caracteres especiais e os caminhos de erro.
- Não use snapshots, não faça mocks do módulo sob teste e não dependa de ordem de execução entre testes.
- Teste apenas a API pública exportada pelo módulo.
