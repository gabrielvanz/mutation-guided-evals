import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

let counter = 0;
function uniqueId(prefix: string) {
  counter++;
  return `${prefix}_${counter}`;
}

async function getAdminToken() {
  const email = `${uniqueId("admin")}@qa.com`;
  await request(app)
    .post("/usuarios")
    .send({
      nome: "Admin Teste",
      email,
      password: "teste",
      administrador: "true"
    });

  const res = await request(app)
    .post("/login")
    .send({
      email,
      password: "teste"
    });

  return res.body.authorization;
}

describe("Produtos API", () => {
  describe("GET /produtos", () => {
    it("should list all products", async () => {
      const token = await getAdminToken();
      const uniqueName = uniqueId("Produto List");
      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 100,
          descricao: "Descrição do produto",
          quantidade: 10
        });

      const res = await request(app).get("/produtos");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("quantidade");
      expect(res.body).toHaveProperty("produtos");
      expect(Array.isArray(res.body.produtos)).toBe(true);
      expect(res.body.quantidade).toBeGreaterThan(0);
    });

    it("should filter products by query parameters", async () => {
      const token = await getAdminToken();
      const uniqueName = uniqueId("Produto Filtro");
      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 250,
          descricao: "Produto para filtro",
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
      const uniqueName = uniqueId("Produto Get One");
      const postRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 150,
          descricao: "Teste get one",
          quantidade: 8
        });

      const productId = postRes.body._id;

      const res = await request(app).get(`/produtos/${productId}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(productId);
      expect(res.body.nome).toBe(uniqueName);
    });

    it("should return 400 when product id does not exist", async () => {
      const res = await request(app).get("/produtos/1234567890abcdef");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Produto não encontrado" });
    });

    it("should return 400 for invalid product id format", async () => {
      const res = await request(app).get("/produtos/invalid-id");

      expect(res.status).toBe(400);
    });
  });

  describe("POST /produtos", () => {
    it("should create a product successfully when user is admin", async () => {
      const token = await getAdminToken();
      const uniqueName = uniqueId("Produto Post");

      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 500,
          descricao: "Produto novo",
          quantidade: 20
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
      expect(res.body).toHaveProperty("_id");
    });

    it("should return 400 when product name is already used", async () => {
      const token = await getAdminToken();
      const uniqueName = uniqueId("Produto Duplicado");

      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 100,
          descricao: "Primeiro",
          quantidade: 10
        });

      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 200,
          descricao: "Segundo",
          quantidade: 5
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Já existe produto com esse nome" });
    });

    it("should return 400 when required fields are missing", async () => {
      const token = await getAdminToken();

      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          preco: 100
        });

      expect(res.status).toBe(400);
    });

    it("should return 401 when token is missing or invalid", async () => {
      const res = await request(app)
        .post("/produtos")
        .send({
          nome: "Produto Sem Token",
          preco: 100,
          descricao: "Teste",
          quantidade: 10
        });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais" });
    });

    it("should return 403 when user is not admin", async () => {
      const email = `${uniqueId("user")}@qa.com`;
      await request(app)
        .post("/usuarios")
        .send({
          nome: "User Comum",
          email,
          password: "teste",
          administrador: "false"
        });

      const loginRes = await request(app)
        .post("/login")
        .send({
          email,
          password: "teste"
        });

      const token = loginRes.body.authorization;

      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: "Produto Usuario Comum",
          preco: 100,
          descricao: "Teste",
          quantidade: 10
        });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: "Rota exclusiva para administradores" });
    });
  });

  describe("PUT /produtos/:id", () => {
    it("should update a product successfully", async () => {
      const token = await getAdminToken();
      const uniqueName = uniqueId("Produto Put");
      const postRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 100,
          descricao: "Original",
          quantidade: 10
        });

      const productId = postRes.body._id;
      const updatedName = uniqueId("Produto Atualizado");

      const res = await request(app)
        .put(`/produtos/${productId}`)
        .set("authorization", token)
        .send({
          nome: updatedName,
          preco: 150,
          descricao: "Atualizado",
          quantidade: 20
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Registro alterado com sucesso" });
    });

    it("should return 400 when updating to a name already used by another product", async () => {
      const token = await getAdminToken();
      const name1 = uniqueId("Produto Alpha");
      const name2 = uniqueId("Produto Beta");

      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: name1,
          preco: 100,
          descricao: "Alpha",
          quantidade: 10
        });

      const postRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: name2,
          preco: 200,
          descricao: "Beta",
          quantidade: 10
        });

      const productId2 = postRes.body._id;

      const res = await request(app)
        .put(`/produtos/${productId2}`)
        .set("authorization", token)
        .send({
          nome: name1,
          preco: 200,
          descricao: "Beta",
          quantidade: 10
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Já existe produto com esse nome" });
    });
  });

  describe("DELETE /produtos/:id", () => {
    it("should delete a product successfully", async () => {
      const token = await getAdminToken();
      const uniqueName = uniqueId("Produto Delete");
      const postRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 100,
          descricao: "Para deletar",
          quantidade: 10
        });

      const productId = postRes.body._id;

      const res = await request(app)
        .delete(`/produtos/${productId}`)
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Registro excluído com sucesso" });
    });

    it("should return delete none message when product id does not exist", async () => {
      const token = await getAdminToken();

      const res = await request(app)
        .delete("/produtos/1234567890abcdef")
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Nenhum registro excluído" });
    });

    it("should not allow deleting a product that is part of a cart", async () => {
      const token = await getAdminToken();
      const uniqueName = uniqueId("Produto Carrinho");
      const productRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 100,
          descricao: "Com carrinho",
          quantidade: 10
        });

      const productId = productRes.body._id;

      const userEmail = `${uniqueId("client")}@qa.com`;
      await request(app)
        .post("/usuarios")
        .send({
          nome: "Cliente Carrinho",
          email: userEmail,
          password: "teste",
          administrador: "false"
        });

      const loginRes = await request(app)
        .post("/login")
        .send({
          email: userEmail,
          password: "teste"
        });

      const userToken = loginRes.body.authorization;

      await request(app)
        .post("/carrinhos")
        .set("authorization", userToken)
        .send({
          produtos: [
            { idProduto: productId, quantidade: 2 }
          ]
        });

      const res = await request(app)
        .delete(`/produtos/${productId}`)
        .set("authorization", token);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message", "Não é permitido excluir produto que faz parte de carrinho");
      expect(res.body).toHaveProperty("idCarrinhos");
      expect(Array.isArray(res.body.idCarrinhos)).toBe(true);
    });
  });
});
