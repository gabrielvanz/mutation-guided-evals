## Específico: ServeRest como API (testes de API via HTTP com supertest)

- Os testes exercitam a API só por requisições HTTP ao app Express (`request(app).get("/usuarios")`, `.post`, `.put`, `.delete`), com `.send({...})` para o corpo e `.set("authorization", token)` para rotas protegidas. O token vem de `POST /login`.
- O banco de dados é em memória e compartilhado pelos testes do arquivo. Cada teste cadastra os dados de que precisa, com valores únicos (por exemplo, e-mail e nome com um sufixo exclusivo), e não depende de outro teste nem da ordem de execução.
- Verifique sempre o status HTTP e o corpo da resposta (`res.status`, `res.body`), com o texto exato das mensagens que aparece no código-fonte.
- Cubra, para cada rota: o caminho feliz, validação do corpo (campos ausentes, tipos errados, valores em branco ou limites), autenticação e autorização (sem token, token inválido, usuário não administrador), recursos inexistentes, conflitos (e-mail ou nome já usado) e regras de negócio (por exemplo, não excluir usuário com carrinho, estoque insuficiente).
- Filtros e listas: teste cada parâmetro de consulta suportado e a ordem em que a lista é devolvida.
- Não importe controllers, services ou models: só o app.
