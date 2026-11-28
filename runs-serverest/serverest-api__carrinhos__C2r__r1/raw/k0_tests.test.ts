import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("carrinhos API", () => {
  let counter = 0;
  function getUniqueString(prefix: string) {
    counter += 1;
    return `${prefix}_${counter}`;
  }

  async function criarUsuarioToken(email: string, nome: string) {
    await request(app).post("/usuarios").send({
      nome,
      email,
      password: "password123",
      administrador: "true"
    });
    const loginRes = await request(app).post("/login").send({
      email,
      password: "password123"
    });
    return loginRes.body.authorization;
  }

  async function criarProduto(nome: string, preco: number, quantidade: number) {
    const token = await criarUsuarioToken(`${getUniqueString("adm")}@email.com`, "Adm User");
    const res = await request(app)
      .post("/produtos")
      .set("authorization", token)
      .send({
        nome,
        preco,
        descricao: "Produto teste",
        quantidade
      });
    return res.body._id;
  }

  describe("GET /carrinhos", () => {
    it("should list all carts successfully", async () => {
      const res = await request(app).get("/carrinhos");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("quantidade");
      expect(res.body).toHaveProperty("carrinhos");
      expect(Array.isArray(res.body.carrinhos)).toBe(true);
    });

    it("should filter carts by query parameters", async () => {
      const res = await request(app).get("/carrinhos?precoTotal=100");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.carrinhos)).toBe(true);
    });

    it("should fail when query validation fails", async () => {
      const res = await request(app).get("/carrinhos?precoTotal=abc");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /carrinhos/:id", () => {
    it("should return cart not found when ID does not exist", async () => {
      const res = await request(app).get("/carrinhos/1234567890abcdef");
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Carrinho não encontrado" });
    });

    it("should fail validation for invalid ID format", async () => {
      const res = await request(app).get("/carrinhos/invalid-id");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /carrinhos", () => {
    it("should create a cart successfully and decrease stock", async () => {
      const email = `${getUniqueString("user")}@email.com`;
      const token = await criarUsuarioToken(email, "User Cart");
      const produtoId = await criarProduto(getUniqueString("Produto_Cart"), 50, 10);

      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({
          produtos: [
            { idProduto: produtoId, quantidade: 2 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
      expect(res.body).toHaveProperty("_id");
    });

    it("should reject creation if user already has a cart", async () => {
      const email = `${getUniqueString("user")}@email.com`;
      const token = await criarUsuarioToken(email, "User Cart 2");
      const produtoId1 = await criarProduto(getUniqueString("Produto_Cart1"), 10, 20);
      const produtoId2 = await criarProduto(getUniqueString("Produto_Cart2"), 10, 20);

      await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({
          produtos: [{ idProduto: produtoId1, quantidade: 1 }]
        });

      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({
          produtos: [{ idProduto: produtoId2, quantidade: 1 }]
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Não é permitido ter mais de 1 carrinho" });
    });

    it("should reject duplicate products in the same cart", async () => {
      const email = `${getUniqueString("user")}@email.com`;
      const token = await criarUsuarioToken(email, "User Dup");
      const produtoId = await criarProduto(getUniqueString("Produto_Dup"), 10, 20);

      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({
          produtos: [
            { idProduto: produtoId, quantidade: 1 },
            { idProduto: produtoId, quantidade: 2 }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Não é permitido possuir produto duplicado");
      expect(res.body.idProdutosDuplicados).toBeDefined();
    });

    it("should reject when product does not exist", async () => {
      const email = `${getUniqueString("user")}@email.com`;
      const token = await criarUsuarioToken(email, "User NoProd");

      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({
          produtos: [
            { idProduto: "nonexistentid", quantidade: 1 }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Produto não encontrado");
    });

    it("should reject when stock is not enough", async () => {
      const email = `${getUniqueString("user")}@email.com`;
      const token = await criarUsuarioToken(email, "User Stock");
      const produtoId = await criarProduto(getUniqueString("Produto_Stock"), 10, 2);

      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({
          produtos: [
            { idProduto: produtoId, quantidade: 5 }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Produto não possui quantidade suficiente");
    });

    it("should reject when unauthenticated", async () => {
      const res = await request(app)
        .post("/carrinhos")
        .send({
          produtos: [
            { idProduto: "123", quantidade: 1 }
          ]
        });

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /carrinhos/cancelar-compra", () => {
    it("should cancel cart and replenish stock when cart exists", async () => {
      const email = `${getUniqueString("user")}@email.com`;
      const token = await criarUsuarioToken(email, "User Cancel");
      const produtoId = await criarProduto(getUniqueString("Produto_Cancel"), 20, 10);

      await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({
          produtos: [{ idProduto: produtoId, quantidade: 3 }]
        });

      const res = await request(app)
        .delete("/carrinhos/cancelar-compra")
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Registro excluído com sucesso. Estoque dos produtos reabastecido");
    });

    it("should return no cart message when user has no cart", async () => {
      const email = `${getUniqueString("user")}@email.com`;
      const token = await criarUsuarioToken(email, "User NoCartCancel");

      const res = await request(app)
        .delete("/carrinhos/cancelar-compra")
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Não foi encontrado carrinho para esse usuário" });
    });

    it("should reject when unauthenticated", async () => {
      const res = await request(app).delete("/carrinhos/cancelar-compra");
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /carrinhos/concluir-compra", () => {
    it("should complete purchase and delete cart when cart exists", async () => {
      const email = `${getUniqueString("user")}@email.com`;
      const token = await criarUsuarioToken(email, "User Concluir");
      const produtoId = await criarProduto(getUniqueString("Produto_Concluir"), 30, 10);

      await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({
          produtos: [{ idProduto: produtoId, quantidade: 2 }]
        });

      const res = await request(app)
        .delete("/carrinhos/concluir-compra")
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Registro excluído com sucesso" });
    });

    it("should return no cart message when user has no cart to complete", async () => {
      const email = `${getUniqueString("user")}@email.com`;
      const token = await criarUsuarioToken(email, "User NoCartConcluir");

      const res = await request(app)
        .delete("/carrinhos/concluir-compra")
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Não foi encontrado carrinho para esse usuário" });
    });

    it("should reject when unauthenticated", async () => {
      const res = await request(app).delete("/carrinhos/concluir-compra");
      expect(res.status).toBe(401);
    });
  });
});
