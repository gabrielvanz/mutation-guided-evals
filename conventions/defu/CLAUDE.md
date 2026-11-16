## Específico: defu (merge recursivo de objetos com padrões)

- A função principal recebe o objeto de maior prioridade primeiro e os padrões depois.
- Os testes originais usam `it("should ...")` e comparam o resultado com `toEqual`.
- Cubra: valores `null`/`undefined`, arrays (concatenados), objetos aninhados, chaves perigosas como `__proto__`, funções de merge personalizadas (`createDefu`, `defuFn`, `defuArrayFn`).
