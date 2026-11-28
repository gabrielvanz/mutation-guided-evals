import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("usuarios API", () => {
  it("should get all usuarios", async () => {
    const res = await request(app).get("/usuarios");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("usuarios");
    expect(Array.isArray(res.body.usuarios)).toBe(true);
  });

  it("should create a new usuario successfully", async () => {
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "Test User",
        email: "user_unique_1@test.com",
        password: "password123",
        administrador: "true"
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
    expect(res.body).toHaveProperty("_id");
  });

  it("should return error when creating usuario with existing email", async () => {
    const payload = {
      nome: "Test User",
      email: "user_unique_2@test.com",
      password: "password123",
      administrador: "true"
    };

    await request(app).post("/usuarios").send(payload);

    const res = await request(app).post("/usuarios").send(payload);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Este email já está sendo usado" });
  });

  it("should return validation error when posting invalid usuario data", async () => {
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "",
        email: "invalid-email",
        password: "",
        administrador: "invalid"
      });

    expect(res.status).toBe(400);
  });

  it("should get one usuario by id", async () => {
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Get One User",
        email: "user_unique_3@test.com",
        password: "password123",
        administrador: "false"
      });

    const userId = createRes.body._id;

    const res = await request(app).get(`/usuarios/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("_id", userId);
    expect(res.body).toHaveProperty("email", "user_unique_3@test.com");
  });

  it("should return user not found for non-existent id format", async () => {
    const res = await request(app).get("/usuarios/invalididformat123");
    expect(res.status).toBe(400);
  });

  it("should return user not found when id does not exist", async () => {
    const res = await request(app).get("/usuarios/1234567890abcdef");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Usuário não encontrado" });
  });

  it("should delete an existing usuario", async () => {
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Delete User",
        email: "user_unique_4@test.com",
        password: "password123",
        administrador: "false"
      });

    const userId = createRes.body._id;

    const res = await request(app).delete(`/usuarios/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Registro excluído com sucesso" });
  });

  it("should not allow deleting a usuario that has an associated cart", async () => {
    const adminRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Admin Cart",
        email: "admin_cart@test.com",
        password: "password123",
        administrador: "true"
      });

    const loginAdminRes = await request(app)
      .post("/login")
      .send({
        email: "admin_cart@test.com",
        password: "password123"
      });

    const token = loginAdminRes.body.authorization;

    const prodPost = await request(app)
      .post("/produtos")
      .set("authorization", token)
      .send({
        nome: "Prod Cart",
        preco: 10,
        descricao: "Desc",
        quantidade: 10
      });

    const produtoId = prodPost.body._id;

    const cartUserRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Cart Owner",
        email: "cart_owner@test.com",
        password: "password123",
        administrador: "false"
      });
    const cartUserId = cartUserRes.body._id;

    const cartUserLogin = await request(app)
      .post("/login")
      .send({
        email: "cart_owner@test.com",
        password: "password123"
      });
    const cartUserToken = cartUserLogin.body.authorization;

    await request(app)
      .post("/carrinhos")
      .set("authorization", cartUserToken)
      .send({
        produtos: [{ idProduto: produtoId, quantidade: 1 }]
      });

    const delRes = await request(app).delete(`/usuarios/${cartUserId}`);
    expect(delRes.status).toBe(400);
    expect(delRes.body).toHaveProperty("message", "Não é permitido excluir usuário com carrinho cadastrado");
    expect(delRes.body).toHaveProperty("idCarrinho");
  });

  it("should return delete none when deleting non-existent usuario", async () => {
    const res = await request(app).delete("/usuarios/nonexistentid");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Nenhum registro excluído" });
  });

  it("should update an existing usuario via put", async () => {
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Put User",
        email: "user_unique_5@test.com",
        password: "password123",
        administrador: "false"
      });

    const userId = createRes.body._id;

    const res = await request(app)
      .put(`/usuarios/${userId}`)
      .send({
        nome: "Updated User Name",
        email: "user_unique_5@test.com",
        password: "newpassword123",
        administrador: "true"
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Registro alterado com sucesso" });
  });

  it("should upsert (create) a new usuario via put when id does not exist", async () => {
    const newId = "1234567890abcdef";
    const res = await request(app)
      .put(`/usuarios/${newId}`)
      .send({
        nome: "Upserted User",
        email: "user_upsert@test.com",
        password: "password123",
        administrador: "false"
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
    expect(res.body).toHaveProperty("_id");
  });

  it("should return error when put uses an email already used by another user", async () => {
    await request(app)
      .post("/usuarios")
      .send({
        nome: "User A",
        email: "usera@test.com",
        password: "password123",
        administrador: "false"
      });

    const userBRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "User B",
        email: "userb@test.com",
        password: "password123",
        administrador: "false"
      });

    const userBId = userBRes.body._id;

    const res = await request(app)
      .put(`/usuarios/${userBId}`)
      .send({
        nome: "User B Updated",
        email: "usera@test.com",
        password: "password123",
        administrador: "false"
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Este email já está sendo usado" });
  });

  it("should filter usuarios by query parameters", async () => {
    await request(app)
      .post("/usuarios")
      .send({
        nome: "Filterable User",
        email: "user_unique_6@test.com",
        password: "password123",
        administrador: "true"
      });

    const res = await request(app).get("/usuarios?email=user_unique_6@test.com");
    expect(res.status).toBe(200);
    expect(res.body.quantidade).toBe(1);
    expect(res.body.usuarios[0].email).toBe("user_unique_6@test.com");
  });
});
