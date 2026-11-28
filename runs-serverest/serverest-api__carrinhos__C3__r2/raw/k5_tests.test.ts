import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("carrinhos API", () => {
  it("should list all carrinhos", async () => {
    const res = await request(app).get("/carrinhos");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("carrinhos");
    expect(Array.isArray(res.body.carrinhos)).toBe(true);
  });

  it("should return 400 for non-existent carrinho by id with wrong length or format", async () => {
    const res = await request(app).get("/carrinhos/1234567890abcdef");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Carrinho não encontrado" });
  });

  it("should validate strict 16 alphanumeric characters for getOne param id", async () => {
    const resShort = await request(app).get("/carrinhos/1234567890abcde");
    expect(resShort.status).toBe(400);

    const resLong = await request(app).get("/carrinhos/1234567890abcdef1");
    expect(resLong.status).toBe(400);
  });

  it("should require authentication to post a carrinho", async () => {
    const res = await request(app)
      .post("/carrinhos")
      .send({
        produtos: [{ idProduto: "123456", quantidade: 1 }]
      });
    expect(res.status).toBe(401);
  });

  it("should require authentication to cancel a purchase", async () => {
    const res = await request(app).delete("/carrinhos/cancelar-compra");
    expect(res.status).toBe(401);
  });

  it("should require authentication to conclude a purchase", async () => {
    const res = await request(app).delete("/carrinhos/concluir-compra");
    expect(res.status).toBe(401);
  });

  it("should validate minimum 1 product and prevent max 1 product restriction mutation", async () => {
    const email = "testuser_cart@email.com";
    const password = "password123";

    await request(app)
      .post("/usuarios")
      .send({
        nome: "Test User Cart",
        email,
        password,
        administrador: "true"
      });

    const loginRes = await request(app)
      .post("/login")
      .send({ email, password });

    const token = loginRes.body.authorization;

    const prod1Res = await request(app)
      .post("/produtos")
      .set("authorization", token)
      .send({
        nome: "Produto A",
        preco: 10,
        descricao: "Desc",
        quantidade: 5
      });

    const prod2Res = await request(app)
      .post("/produtos")
      .set("authorization", token)
      .send({
        nome: "Produto B",
        preco: 20,
        descricao: "Desc",
        quantidade: 5
      });

    const produtoId1 = prod1Res.body._id;
    const produtoId2 = prod2Res.body._id;

    const res = await request(app)
      .post("/carrinhos")
      .set("authorization", token)
      .send({
        produtos: [
          { idProduto: produtoId1, quantidade: 1 },
          { idProduto: produtoId2, quantidade: 1 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
    expect(res.body).toHaveProperty("_id");
  });

  it("should detect duplicate products in request body", async () => {
    const email = "testuser_dup@email.com";
    const password = "password123";

    await request(app)
      .post("/usuarios")
      .send({
        nome: "Test User Dup",
        email,
        password,
        administrador: "true"
      });

    const loginRes = await request(app)
      .post("/login")
      .send({ email, password });

    const token = loginRes.body.authorization;

    const prodRes = await request(app)
      .post("/produtos")
      .set("authorization", token)
      .send({
        nome: "Produto Dup",
        preco: 10,
        descricao: "Desc",
        quantidade: 10
      });

    const produtoId = prodRes.body._id;

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
    expect(res.body.idProdutosDuplicados).toEqual([produtoId]);
  });
});
