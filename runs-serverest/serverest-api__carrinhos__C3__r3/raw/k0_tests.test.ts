import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Carrinhos API", () => {
  async function criarUsuarioToken(email: string, nome: string) {
    await request(app)
      .post("/usuarios")
      .send({ nome, email, password: "password123", administrador: "true" });
    const loginRes = await request(app)
      .post("/login")
      .send({ email, password: "password123" });
    return loginRes.body.authorization;
  }

  async function criarProduto(nome: string, preco: number, quantidade: number, token: string) {
    const res = await request(app)
      .post("/produtos")
      .set("authorization", token)
      .send({ nome, preco, descricao: "Produto teste", quantidade });
    return res.body._id;
  }

  describe("GET /carrinhos", () => {
    it("should list all carts", async () => {
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
  });

  describe("GET /carrinhos/:id", () => {
    it("should return cart not found when ID does not exist", async () => {
      const res = await request(app).get("/carrinhos/1234567890123456");
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Carrinho não encontrado" });
    });

    it("should fail with invalid id format", async () => {
      const res = await request(app).get("/carrinhos/invalid-id");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /carrinhos", () => {
    it("should fail without authorization token", async () => {
      const res = await request(app)
        .post("/carrinhos")
        .send({ produtos: [{ idProduto: "123", quantidade: 1 }] });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
    });

    it("should fail when product does not exist", async () => {
      const token = await criarUsuarioToken("user_cart_1@email.com", "User Cart 1");
      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({ produtos: [{ idProduto: "inexistente123", quantidade: 1 }] });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message", "Produto não encontrado");
    });

    it("should fail when quantity exceeds stock", async () => {
      const token = await criarUsuarioToken("user_cart_2@email.com", "User Cart 2");
      const prodId = await criarProduto("Produto Estoque", 50, 5, token);

      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({ produtos: [{ idProduto: prodId, quantidade: 10 }] });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message", "Produto não possui quantidade suficiente");
    });

    it("should fail when sending duplicate products", async () => {
      const token = await criarUsuarioToken("user_cart_3@email.com", "User Cart 3");
      const prodId = await criarProduto("Produto Duplicado", 50, 10, token);

      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({
          produtos: [
            { idProduto: prodId, quantidade: 1 },
            { idProduto: prodId, quantidade: 2 }
          ]
        });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message", "Não é permitido possuir produto duplicado");
      expect(res.body.idProdutosDuplicados).toEqual([prodId]);
    });

    it("should successfully create a cart", async () => {
      const token = await criarUsuarioToken("user_cart_4@email.com", "User Cart 4");
      const prodId = await criarProduto("Produto Valido", 25, 10, token);

      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({ produtos: [{ idProduto: prodId, quantidade: 2 }] });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
      expect(res.body).toHaveProperty("_id");
    });

    it("should prevent creating more than one cart per user", async () => {
      const token = await criarUsuarioToken("user_cart_5@email.com", "User Cart 5");
      const prodId1 = await criarProduto("Produto Valido A", 10, 10, token);
      const prodId2 = await criarProduto("Produto Valido B", 15, 10, token);

      await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({ produtos: [{ idProduto: prodId1, quantidade: 1 }] });

      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({ produtos: [{ idProduto: prodId2, quantidade: 1 }] });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Não é permitido ter mais de 1 carrinho" });
    });
  });

  describe("DELETE /carrinhos/concluir-compra", () => {
    it("should fail without authorization token", async () => {
      const res = await request(app).delete("/carrinhos/concluir-compra");
      expect(res.status).toBe(401);
    });

    it("should return no cart message when user has no cart", async () => {
      const token = await criarUsuarioToken("user_concluir_1@email.com", "User Concluir 1");
      const res = await request(app)
        .delete("/carrinhos/concluir-compra")
        .set("authorization", token);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Não foi encontrado carrinho para esse usuário" });
    });

    it("should successfully complete a purchase and delete the cart", async () => {
      const token = await criarUsuarioToken("user_concluir_2@email.com", "User Concluir 2");
      const prodId = await criarProduto("Produto Concluir", 10, 10, token);

      await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({ produtos: [{ idProduto: prodId, quantidade: 2 }] });

      const res = await request(app)
        .delete("/carrinhos/concluir-compra")
        .set("authorization", token);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Registro excluído com sucesso" });
    });
  });

  describe("DELETE /carrinhos/cancelar-compra", () => {
    it("should fail without authorization token", async () => {
      const res = await request(app).delete("/carrinhos/cancelar-compra");
      expect(res.status).toBe(401);
    });

    it("should return no cart message when user has no cart to cancel", async () => {
      const token = await criarUsuarioToken("user_cancelar_1@email.com", "User Cancelar 1");
      const res = await request(app)
        .delete("/carrinhos/cancelar-compra")
        .set("authorization", token);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Não foi encontrado carrinho para esse usuário" });
    });

    it("should successfully cancel a purchase, replenish stock and delete cart", async () => {
      const token = await criarUsuarioToken("user_cancelar_2@email.com", "User Cancelar 2");
      const prodId = await criarProduto("Produto Cancelar", 10, 5, token);

      await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({ produtos: [{ idProduto: prodId, quantidade: 3 }] });

      const res = await request(app)
        .delete("/carrinhos/cancelar-compra")
        .set("authorization", token);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Registro excluído com sucesso. Estoque dos produtos reabastecido" });
    });
  });
});
