import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Produtos API", () => {
  let adminToken: string;

  const getAdminToken = async () => {
    const email = "admin_qa@qa.com";
    await request(app)
      .post("/usuarios")
      .send({
        nome: "Admin User",
        email,
        password: "password",
        administrador: "true"
      });

    const loginRes = await request(app)
      .post("/login")
      .send({
        email,
        password: "password"
      });

    return loginRes.body.authorization;
  };

  describe("GET /produtos", () => {
    it("should list all products", async () => {
      const uniqueName = "Produto Lista Teste";
      await request(app)
        .post("/produtos")
        .set("authorization", await getAdminToken())
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
      expect(res.body.quantidade).toBeGreaterThanOrEqual(1);
    });

    it("should filter products by name", async () => {
      const uniqueName = "Produto Unico Teste";
      await request(app)
        .post("/produtos")
        .set("authorization", await (adminToken || (adminToken = await getAdminToken())))
        .send({
          nome: uniqueName,
          preco: 250,
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
    it("should return a product by id", async () => {
      const token = await getAdminToken();
      const createRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: "Produto Get One Teste",
          preco: 50,
          descricao: "Desc",
          quantidade: 12
        });

      const productId = createRes.body._id;

      const res = await request(app).get(`/produtos/${productId}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(productId);
    });

    it("should return 400 when product does not exist", async () => {
      const res = await request(app).get("/produtos/1234567890abcdef");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Produto não encontrado" });
    });

    it("should return 400 when id format is invalid", async () => {
      const res = await request(app).get("/produtos/invalid-id");

      expect(res.status).toBe(400);
    });
  });

  describe("POST /produtos", () => {
    it("should create a product when user is admin and body is valid", async () => {
      const token = await getAdminToken();
      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: "Produto Post Teste",
          preco: 199,
          descricao: "Legal",
          quantidade: 20,
          imagem: "http://imagem.com/img.png"
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
      expect(res.body).toHaveProperty("_id");
    });

    it("should return 400 when product name is already used", async () => {
      const token = await getAdminToken();
      const nome = "Produto Duplicado Teste";
      const payload = {
        nome,
        preco: 100,
        descricao: "Teste",
        quantidade: 10
      };

      await request(app).post("/produtos").set("authorization", token).send(payload);

      const res = await request(app).post("/produtos").set("authorization", token).send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Já existe produto com esse nome" });
    });

    it("should return 401/403 when user is not admin or token is missing", async () => {
      const res = await request(app)
        .post("/produtos")
        .send({
          nome: "Produto Sem Token Teste",
          preco: 100,
          descricao: "Teste",
          quantidade: 10
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
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

  describe("PUT /produtos/:id", () => {
    it("should update an existing product", async () => {
      const token = await getAdminToken();
      const createRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: "Produto Para Atualizar Teste",
          preco: 50,
          descricao: "Antiga",
          quantidade: 5
        });

      const productId = createRes.body._id;

      const res = await request(app)
        .put(`/produtos/${productId}`)
        .set("authorization", token)
        .send({
          nome: "Produto Atualizado Teste",
          preco: 75,
          descricao: "Nova",
          quantidade: 8
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Registro alterado com sucesso" });
    });

    it("should create product via put if it does not exist", async () => {
      const token = await getAdminToken();
      const res = await request(app)
        .put("/produtos/abcdef1234567891")
        .set("authorization", token)
        .send({
          nome: "Produto Upsert Teste",
          preco: 120,
          descricao: "Upsert",
          quantidade: 10
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
      expect(res.body).toHaveProperty("_id");
    });

    it("should return 400 when updating with an already used name", async () => {
      const token = await getAdminToken();
      const name1 = "Nome Um Teste";
      const name2 = "Nome Dois Teste";

      await request(app).post("/produtos").set("authorization", token).send({
        nome: name1,
        preco: 10,
        descricao: "d1",
        quantidade: 1
      });

      const p2 = await request(app).post("/produtos").set("authorization", token).send({
        nome: name2,
        preco: 20,
        descricao: "d2",
        quantidade: 2
      });

      const res = await request(app)
        .put(`/produtos/${p2.body._id}`)
        .set("authorization", token)
        .send({
          nome: name1,
          preco: 20,
          descricao: "d2",
          quantidade: 2
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Já existe produto com esse nome" });
    });
  });

  describe("DELETE /produtos/:id", () => {
    it("should delete an existing product", async () => {
      const token = await getAdminToken();
      const createRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: "Produto Para Deletar Teste",
          preco: 10,
          descricao: "Del",
          quantidade: 2
        });

      const productId = createRes.body._id;

      const res = await request(app)
        .delete(`/produtos/${productId}`)
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Registro excluído com sucesso" });
    });

    it("should return delete none when product does not exist", async () => {
      const token = await getAdminToken();
      const res = await request(app)
        .delete("/produtos/abcdef1234567892")
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Nenhum registro excluído" });
    });

    it("should not delete product if it is included in a cart", async () => {
      const token = await getAdminToken();
      const prodRes = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: "Produto No Carrinho Teste",
          preco: 100,
          descricao: "Cart",
          quantidade: 10
        });

      const productId = prodRes.body._id;

      const userEmail = "user_cart_teste@qa.com";
      await request(app).post("/usuarios").send({
        nome: "Cart User",
        email: userEmail,
        password: "password",
        administrador: "false"
      });
      const userLogin = await request(app).post("/login").send({
        email: userEmail,
        password: "password"
      });
      const userToken = userLogin.body.authorization;

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
