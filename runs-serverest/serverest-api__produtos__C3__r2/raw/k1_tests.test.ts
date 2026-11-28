import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Produtos API", () => {
  let adminToken: string;

  const getAdminToken = async () => {
    if (adminToken) return adminToken;
    const email = "admin_test@qa.com";
    await request(app)
      .post("/usuarios")
      .send({
        nome: "Admin Test",
        email,
        password: "teste",
        administrador: "true"
      });
    const loginRes = await request(app)
      .post("/login")
      .send({
        email,
        password: "teste"
      });
    adminToken = loginRes.body.authorization;
    return adminToken;
  };

  describe("GET /produtos", () => {
    it("should list all produtos", async () => {
      const token = await getAdminToken();
      const uniqueName = "Produto List A";
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

    it("should filter produtos by nome query parameter", async () => {
      const token = await getAdminToken();
      const uniqueName = "UniqueSearchNameB";
      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 150,
          descricao: "Descricao filtro",
          quantidade: 5
        });

      const res = await request(app).get(`/produtos?nome=${uniqueName}`);
      expect(res.status).toBe(200);
      expect(res.body.quantidade).toBe(1);
      expect(res.body.produtos[0].nome).toBe(uniqueName);
    });
  });

  describe("GET /produtos/:id", () => {
    it("should get a produto by valid id", async () => {
      const token = await getAdminToken();
      const uniqueName = "Produto Get One C";
      const postRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 200,
          descricao: "Descricao",
          quantidade: 20
        });

      const produtoId = postRes.body._id;
      const res = await request(app).get(`/produtos/${produtoId}`);
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(produtoId);
      expect(res.body.nome).toBe(uniqueName);
    });

    it("should return 400 when produto does not exist", async () => {
      const res = await request(app).get("/produtos/1234567890abcdef");
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Produto não encontrado" });
    });

    it("should return validation error for invalid id format", async () => {
      const res = await request(app).get("/produtos/invalid-id");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /produtos", () => {
    it("should create a produto when data is valid and user is admin", async () => {
      const token = await getAdminToken();
      const uniqueName = "Novo Produto D";
      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 499,
          descricao: "Smartphone moderno",
          quantidade: 15,
          imagem: "http://imagem.com/img.png"
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
      expect(res.body).toHaveProperty("_id");
    });

    it("should return 400 when produto name is already used", async () => {
      const token = await getAdminToken();
      const uniqueName = "Duplicado E";
      const productData = {
        nome: uniqueName,
        preco: 100,
        descricao: "Descricao",
        quantidade: 10
      };

      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send(productData);

      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send(productData);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Já existe produto com esse nome" });
    });

    it("should return 401 when token is missing", async () => {
      const res = await request(app)
        .post("/produtos")
        .send({
          nome: "Sem Token F",
          preco: 100,
          descricao: "Descricao",
          quantidade: 10
        });

      expect(res.status).toBe(401);
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
  });

  describe("DELETE /produtos/:id", () => {
    it("should delete an existing produto", async () => {
      const token = await getAdminToken();
      const uniqueName = "Delete Produto G";
      const postRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 50,
          descricao: "Desc",
          quantidade: 5
        });

      const produtoId = postRes.body._id;
      const res = await request(app)
        .delete(`/produtos/${produtoId}`)
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Registro excluído com sucesso" });
    });

    it("should return DELETE_NONE when produto id does not exist", async () => {
      const token = await getAdminToken();
      const res = await request(app)
        .delete("/produtos/1234567890abcdef")
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Nenhum registro excluído" });
    });

    it("should return 401 when deleting without token", async () => {
      const res = await request(app).delete("/produtos/1234567890abcdef");
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /produtos/:id", () => {
    it("should update an existing produto successfully", async () => {
      const token = await getAdminToken();
      const uniqueName = "Put Produto H";
      const postRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 80,
          descricao: "Original",
          quantidade: 10
        });

      const produtoId = postRes.body._id;
      const res = await request(app)
        .put(`/produtos/${produtoId}`)
        .set("authorization", token)
        .send({
          nome: "Put Produto H Updated",
          preco: 90,
          descricao: "Atualizado",
          quantidade: 12
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Registro alterado com sucesso" });
    });

    it("should create/upsert produto via PUT if ID does not exist yet", async () => {
      const token = await getAdminToken();
      const uniqueName = "Upsert Produto I";
      const nonExistentId = "abcdef1234567890";
      const res = await request(app)
        .put(`/produtos/${nonExistentId}`)
        .set("authorization", token)
        .send({
          nome: uniqueName,
          preco: 110,
          descricao: "Upsert Desc",
          quantidade: 8
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
      expect(res.body).toHaveProperty("_id");
    });

    it("should return 400 when updating with an already used name by another product", async () => {
      const token = await getAdminToken();
      const name1 = "Prod One J";
      const name2 = "Prod Two J";

      await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({ nome: name1, preco: 10, descricao: "Desc", quantidade: 1 });

      const postRes2 = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({ nome: name2, preco: 20, descricao: "Desc", quantidade: 2 });

      const produtoId2 = postRes2.body._id;

      const res = await request(app)
        .put(`/produtos/${produtoId2}`)
        .set("authorization", token)
        .send({
          nome: name1,
          preco: 25,
          descricao: "Desc Updated",
          quantidade: 2
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Já existe produto com esse nome" });
    });

    it("should return 401 when updating without token", async () => {
      const res = await request(app)
        .put("/produtos/1234567890abcdef")
        .send({
          nome: "No Token K",
          preco: 10,
          descricao: "Desc",
          quantidade: 1
        });

      expect(res.status).toBe(401);
    });
  });
});
