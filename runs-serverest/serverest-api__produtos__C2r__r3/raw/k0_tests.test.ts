import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Produtos API", () => {
  let adminToken: string;
  let counter = 0;

  const getAdminToken = async () => {
    if (adminToken) return adminToken;
    counter++;
    const email = `admin_prod_${counter}@qa.com`;
    await request(app)
      .post("/usuarios")
      .send({
        nome: "Admin Teste",
        email,
        password: "teste",
        administrador: "true"
      });
    const loginRes = await request(app)
      .post("/login")
      .send({ email, password: "teste" });
    adminToken = loginRes.body.authorization;
    return adminToken;
  };

  describe("GET /produtos", () => {
    it("should return all products", async () => {
      const token = await getAdminToken();
      counter++;
      const uniqueName = `Produto Get ${counter}`;
      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 100,
          descricao: "Descricao",
          quantidade: 10
        });

      const res = await request(app).get("/produtos");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("quantidade");
      expect(res.body).toHaveProperty("produtos");
      expect(Array.isArray(res.body.produtos)).toBe(true);
      expect(res.body.produtos.length).toBeGreaterThan(0);
    });

    it("should filter products by query parameters", async () => {
      const token = await getAdminToken();
      counter++;
      const uniqueName = `Produto Filtro ${counter}`;
      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 250,
          descricao: "Descricao Filtro",
          quantidade: 5
        });

      const res = await request(app).get(`/produtos?nome=${encodeURIComponent(uniqueName)}`);
      expect(res.status).toBe(200);
      expect(res.body.quantidade).toBe(1);
      expect(res.body.produtos[0].nome).toBe(uniqueName);
    });
  });

  describe("GET /produtos/:id", () => {
    it("should return a product by valid id", async () => {
      const token = await getAdminToken();
      counter++;
      const uniqueName = `Produto GetOne ${counter}`;
      const createRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 50,
          descricao: "Descricao GetOne",
          quantidade: 15
        });

      const productId = createRes.body._id;
      const res = await request(app).get(`/produtos/${productId}`);
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(productId);
      expect(res.body.nome).toBe(uniqueName);
    });

    it("should return 400 when product id does not exist", async () => {
      const nonExistentId = "1234567890abcdef";
      const res = await request(app).get(`/produtos/${nonExistentId}`);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Produto não encontrado" });
    });

    it("should return validation error for invalid product id format", async () => {
      const res = await request(app).get("/produtos/invalid-id");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /produtos", () => {
    it("should create a product successfully when authorized as admin", async () => {
      const token = await getAdminToken();
      counter++;
      const uniqueName = `Novo Produto ${counter}`;
      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 199,
          descricao: "Produto novo",
          quantidade: 20
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
      expect(res.body).toHaveProperty("_id");
    });

    it("should return 400 when product name is already used", async () => {
      const token = await getAdminToken();
      counter++;
      const uniqueName = `Produto Duplicado ${counter}`;
      const payload = {
        nome: uniqueName,
        preco: 100,
        descricao: "Descricao",
        quantidade: 10
      };

      await request(app).post("/produtos").set("authorization", token).send(payload);
      const res = await request(app).post("/produtos").set("authorization", token).send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Já existe produto com esse nome" });
    });

    it("should return 401 when token is missing", async () => {
      const res = await request(app)
        .post("/produtos")
        .send({
          nome: "Sem Token",
          preco: 100,
          descricao: "Descricao",
          quantidade: 10
        });

      expect(res.status).toBe(401);
    });

    it("should return validation error when required fields are missing", async () => {
      const token = await getAdminToken();
      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          preco: 100
        });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /produtos/:id", () => {
    it("should update an existing product successfully", async () => {
      const token = await getAdminToken();
      counter++;
      const uniqueName = `Produto Para Put ${counter}`;
      const createRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 100,
          descricao: "Descricao",
          quantidade: 10
        });

      const productId = createRes.body._id;
      counter++;
      const updatedName = `Produto Atualizado ${counter}`;
      const res = await request(app)
        .put(`/produtos/${productId}`)
        .set("authorization", token)
        .send({
          nome: updatedName,
          preco: 150,
          descricao: "Descricao Atualizada",
          quantidade: 12
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Registro alterado com sucesso" });
    });

    it("should create or update (upsert) when product id does not exist", async () => {
      const token = await getAdminToken();
      const nonExistentId = "abcdef1234567890";
      counter++;
      const uniqueName = `Produto Upsert ${counter}`;
      const res = await request(app)
        .put(`/produtos/${nonExistentId}`)
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 300,
          descricao: "Upsert desc",
          quantidade: 5
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
      expect(res.body).toHaveProperty("_id");
    });

    it("should return 400 when updating with an already used name", async () => {
      const token = await getAdminToken();
      counter++;
      const name1 = `Produto Um ${counter}`;
      counter++;
      const name2 = `Produto Dois ${counter}`;

      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({ nome: name1, preco: 100, descricao: "D1", quantidade: 10 });

      const res2 = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({ nome: name2, preco: 100, descricao: "D2", quantidade: 10 });

      const product2Id = res2.body._id;

      const res = await request(app)
        .put(`/produtos/${product2Id}`)
        .set("authorization", token)
        .send({ nome: name1, preco: 120, descricao: "D2", quantidade: 10 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Já existe produto com esse nome" });
    });

    it("should return 401 when updating without token", async () => {
      const res = await request(app)
        .put("/produtos/1234567890abcdef")
        .send({
          nome: "Sem Token",
          preco: 100,
          descricao: "Desc",
          quantidade: 10
        });

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /produtos/:id", () => {
    it("should delete an existing product successfully", async () => {
      const token = await getAdminToken();
      counter++;
      const uniqueName = `Produto Delete ${counter}`;
      const createRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 100,
          descricao: "Desc",
          quantidade: 10
        });

      const productId = createRes.body._id;
      const res = await request(app)
        .delete(`/produtos/${productId}`)
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Registro excluído com sucesso" });
    });

    it("should return delete none message when product does not exist", async () => {
      const token = await getAdminToken();
      const nonExistentId = "fedcba0987654321";
      const res = await request(app)
        .delete(`/produtos/${nonExistentId}`)
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Nenhum registro excluído" });
    });

    it("should prevent deletion and return cart error if product is part of a cart", async () => {
      const token = await getAdminToken();
      counter++;
      const uniqueName = `Produto Carrinho ${counter}`;
      const productRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 50,
          descricao: "Desc",
          quantidade: 10
        });

      const productId = productRes.body._id;

      counter++;
      const userEmail = `user_prod_${counter}@qa.com`;
      await request(app)
        .post("/usuarios")
        .send({
          nome: "User Teste",
          email: userEmail,
          password: "teste",
          administrador: "false"
        });
      const loginRes = await request(app)
        .post("/login")
        .send({ email: userEmail, password: "teste" });
      const userToken = loginRes.body.authorization;

      await request(app)
        .post("/carrinhos")
        .set("authorization", userToken)
        .send({
          produtos: [{ idProduto: productId, quantidade: 2 }]
        });

      const res = await request(app)
        .delete(`/produtos/${productId}`)
        .set("authorization", token);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message", "Não é permitido excluir produto que faz parte de carrinho");
      expect(res.body).toHaveProperty("idCarrinhos");
      expect(Array.isArray(res.body.idCarrinhos)).toBe(true);
    });

    it("should return 401 when deleting without token", async () => {
      const res = await request(app).delete("/produtos/1234567890abcdef");
      expect(res.status).toBe(401);
    });
  });
});
