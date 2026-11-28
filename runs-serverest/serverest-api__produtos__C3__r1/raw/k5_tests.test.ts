import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Produtos API", () => {
  let counter = 0;
  function getUniqueString(prefix: string) {
    counter++;
    return `${prefix}_${counter}`;
  }

  async function getAdminToken() {
    const adminEmail = getUniqueString("admin_prod") + "@qa.com";
    await request(app)
      .post("/usuarios")
      .send({
        nome: "Admin Test",
        email: adminEmail,
        password: "teste",
        administrador: "true"
      });

    const loginRes = await request(app)
      .post("/login")
      .send({
        email: adminEmail,
        password: "teste"
      });

    return loginRes.body.authorization;
  }

  describe("GET /produtos", () => {
    it("should list all products", async () => {
      const prodName = getUniqueString("ProdutoList");
      const token = await getAdminToken();

      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: prodName,
          preco: 100,
          descricao: "Teste descricao",
          quantidade: 10
        });

      const res = await request(app).get("/produtos");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("quantidade");
      expect(res.body).toHaveProperty("produtos");
      expect(Array.isArray(res.body.produtos)).toBe(true);
      expect(res.body.quantidade).toBeGreaterThan(0);
    });

    it("should filter products by name query", async () => {
      const uniqueName = getUniqueString("UniqueName");
      const token = await getAdminToken();

      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 200,
          descricao: "Desc",
          quantidade: 5
        });

      const res = await request(app).get(`/produtos?nome=${uniqueName}`);

      expect(res.status).toBe(200);
      expect(res.body.quantidade).toBe(1);
      expect(res.body.produtos[0].nome).toBe(uniqueName);
    });
  });

  describe("GET /produtos/:id", () => {
    it("should get a product by id", async () => {
      const token = await getAdminToken();
      const createRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: getUniqueString("ProdOne"),
          preco: 150,
          descricao: "Desc",
          quantidade: 12
        });

      const productId = createRes.body._id;

      const res = await request(app).get(`/produtos/${productId}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(productId);
      expect(res.body.descricao).toBe("Desc");
    });

    it("should return 400 when product id does not exist", async () => {
      const fakeId = "1234567890abcdef";
      const res = await request(app).get(`/produtos/${fakeId}`);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Produto não encontrado" });
    });

    it("should return 400 when product id format is invalid", async () => {
      const res = await request(app).get("/produtos/invalid-id");

      expect(res.status).toBe(400);
    });
  });

  describe("POST /produtos", () => {
    it("should create a product when authorized as admin", async () => {
      const token = await getAdminToken();
      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: getUniqueString("NovoProduto"),
          preco: 450,
          descricao: "Mouse gamer",
          quantidade: 30,
          imagem: "  http://example.com/img.png  "
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
      expect(res.body).toHaveProperty("_id");

      const checkRes = await request(app).get(`/produtos/${res.body._id}`);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.imagem).toBe("http://example.com/img.png");
    });

    it("should return 400 when product name is already used", async () => {
      const token = await getAdminToken();
      const name = getUniqueString("Duplicado");

      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: name,
          preco: 100,
          descricao: "Teste",
          quantidade: 10
        });

      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: name,
          preco: 200,
          descricao: "Outro",
          quantidade: 5
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Já existe produto com esse nome" });
    });

    it("should return 401 when token is missing", async () => {
      const res = await request(app)
        .post("/produtos")
        .send({
          nome: "Sem Token",
          preco: 100,
          descricao: "Teste",
          quantidade: 10
        });

      expect(res.status).toBe(401);
    });

    it("should return 403 when user is not admin", async () => {
      const normalEmail = getUniqueString("normal") + "@qa.com";
      await request(app)
        .post("/usuarios")
        .send({
          nome: "Normal User",
          email: normalEmail,
          password: "teste",
          administrador: "false"
        });

      const loginRes = await request(app)
        .post("/login")
        .send({
          email: normalEmail,
          password: "teste"
        });

      const token = loginRes.body.authorization;

      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: "Nao Admin",
          preco: 100,
          descricao: "Teste",
          quantidade: 10
        });

      expect(res.status).toBe(403);
    });

    it("should return 400 when required fields are missing", async () => {
      const token = await getAdminToken();
      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: "Incompleto"
        });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /produtos/:id", () => {
    it("should update an existing product or create if not present", async () => {
      const token = await getAdminToken();
      const createRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: getUniqueString("ParaAtualizar"),
          preco: 100,
          descricao: "Antigo",
          quantidade: 10
        });

      const productId = createRes.body._id;

      const res = await request(app)
        .put(`/produtos/${productId}`)
        .set("authorization", token)
        .send({
          nome: getUniqueString("Atualizado"),
          preco: 120,
          descricao: "Novo",
          quantidade: 15
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Registro alterado com sucesso" });
    });

    it("should return 201 when PUT creates a product because id did not exist", async () => {
      const token = await getAdminToken();
      const newId = "a1b2c3d4e5f67890";
      const res = await request(app)
        .put(`/produtos/${newId}`)
        .set("authorization", token)
        .send({
          nome: getUniqueString("CriadoViaPut"),
          preco: 99,
          descricao: "Criado pelo put",
          quantidade: 5
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
      expect(res.body).toHaveProperty("_id");
    });

    it("should return 400 when updating with a name already used by another product", async () => {
      const token = await getAdminToken();
      const name1 = getUniqueString("ProdA");
      const name2 = getUniqueString("ProdB");

      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: name1,
          preco: 100,
          descricao: "Desc",
          quantidade: 10
        });

      const createRes2 = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: name2,
          preco: 100,
          descricao: "Desc",
          quantidade: 10
        });

      const productId2 = createRes2.body._id;

      const res = await request(app)
        .put(`/produtos/${productId2}`)
        .set("authorization", token)
        .send({
          nome: name1,
          preco: 150,
          descricao: "Novo",
          quantidade: 5
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Já existe produto com esse nome" });
    });

    it("should return 401 when updating without token", async () => {
      const res = await request(app)
        .put("/produtos/1234567890abcdef")
        .send({
          nome: "Teste",
          preco: 100,
          descricao: "Desc",
          quantidade: 10
        });

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /produtos/:id", () => {
    it("should delete an existing product", async () => {
      const token = await getAdminToken();
      const createRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: getUniqueString("ParaDeletar"),
          preco: 50,
          descricao: "Deletavel",
          quantidade: 5
        });

      const productId = createRes.body._id;

      const res = await request(app)
        .delete(`/produtos/${productId}`)
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Registro excluído com sucesso" });
    });

    it("should prevent deleting a product that is present in a cart and return cart id", async () => {
      const token = await getAdminToken();
      const userEmail = getUniqueString("cartuser") + "@qa.com";

      await request(app)
        .post("/usuarios")
        .send({
          nome: "Cart User",
          email: userEmail,
          password: "teste",
          administrador: "false"
        });

      const userLogin = await request(app)
        .post("/login")
        .send({
          email: userEmail,
          password: "teste"
        });
      const userToken = userLogin.body.authorization;

      const prodRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: getUniqueString("ProdCart"),
          preco: 30,
          descricao: "No carrinho",
          quantidade: 10
        });
      const prodId = prodRes.body._id;

      const cartRes = await request(app)
        .post("/carrinhos")
        .set("authorization", userToken)
        .send({
          produtos: [{ idProduto: prodId, quantidade: 2 }]
        });

      expect(cartRes.status).toBe(201);
      const cartId = cartRes.body._id;

      const deleteRes = await request(app)
        .delete(`/produtos/${prodId}`)
        .set("authorization", token);

      expect(deleteRes.status).toBe(400);
      expect(deleteRes.body.message).toBe("Não é permitido excluir produto que faz parte de carrinho");
      expect(deleteRes.body.idCarrinhos).toEqual([cartId]);
    });

    it("should return delete none message when product id does not exist", async () => {
      const token = await getAdminToken();
      const fakeId = "1234567890abcdef";

      const res = await request(app)
        .delete(`/produtos/${fakeId}`)
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Nenhum registro excluído" });
    });

    it("should return 401 when deleting without token", async () => {
      const res = await request(app).delete("/produtos/1234567890abcdef");

      expect(res.status).toBe(401);
    });
  });
});
