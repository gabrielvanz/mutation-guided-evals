## Específico: ServeRest (API REST de estudo em Node/Express, JavaScript CommonJS)

- Este projeto não é UnJS nem TypeScript: os módulos são CommonJS (`exports.nome = ...` ou `module.exports = função`), com mensagens e textos em português. Os testes que você escreve continuam em Vitest.
- Os testes originais do projeto usam títulos descritivos em português ("Deve retornar ...") e comparam valores concretos, sem depender de ordem de execução entre testes.
- Respostas de erro e mensagens vêm de constantes do projeto: confira o texto exato no código-fonte antes de usar numa asserção.
- Cubra: entradas vazias ou só com espaços, tipos inesperados, valores em limites (zero, negativos, muito grandes), campos ausentes, ordem de chaves e os caminhos de erro de cada função exportada.
- Para middlewares e controllers, use objetos simples no lugar de `req`/`res`/`next` (`status`, `json` e `send` devolvem o próprio `res`) e verifique o status e o corpo enviados.
