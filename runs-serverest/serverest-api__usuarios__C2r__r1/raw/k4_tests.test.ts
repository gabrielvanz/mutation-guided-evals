import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Usuarios API", () => {
  it("should get all usuarios", async () => {
    const res = await request(app).get("/usuarios");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("usuarios");
    expect(Array.isArray(res.body.usuarios)).toBe(true);
  });

  it("should filter usuarios by nome", async () => {
    const uniqueName = "UserTest_UniqueName";
    const email = "test_unique@example.com";

    await request(app)
      .post("/usuarios")
      .send({
        nome: uniqueName,
        email,
        password: "password123",
        administrador: "true"
      });

    const res = await request(app).get(`/usuarios?nome=${uniqueName}`);
    expect(res.status).toBe(200);
    expect(res.body.quantidade).toBe(1);
    expect(res.body.usuarios[0].nome).toBe(uniqueName);
  });

  it("should create a new usuario successfully", async () => {
    const email = "new_user@example.com";
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "Novo Usuario",
        email,
        password: "password123",
        administrador: "false"
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Cadastro realizado com sucesso");
    expect(res.body).toHaveProperty("_id");
  });

  it("should not create a usuario with an already used email", async () => {
    const email = "duplicate_user@example.com";
    const userPayload = {
      nome: "Usuario Um",
      email,
      password: "password123",
      administrador: "false"
    };

    const firstRes = await request(app).post("/usuarios").send(userPayload);
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app).post("/usuarios").send({
      ...userPayload,
      nome: "Usuario Dois"
    });

    expect(secondRes.status).toBe(400);
    expect(secondRes.body.message).toBe("Este email já está sendo usado");
  });

  it("should return validation error when posting missing fields", async () => {
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "Incompleto"
      });

    expect(res.status).toBe(400);
  });

  it("should get one usuario by id", async () => {
    const email = "getone_user@example.com";
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Get One",
        email,
        password: "password123",
        administrador: "false"
      });

    const userId = createRes.body._id;

    const res = await request(app).get(`/usuarios/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(userId);
    expect(res.body.email).toBe(email);
  });

  it("should return not found for a non-existent usuario id", async () => {
    const res = await request(app).get("/usuarios/1234567890abcdef");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Usuário não encontrado");
  });

  it("should delete an existing usuario", async () => {
    const email = "delete_user@example.com";
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Para Deletar",
        email,
        password: "password123",
        administrador: "false"
      });

    const userId = createRes.body._id;

    const res = await request(app).delete(`/usuarios/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Registro excluído com sucesso");
  });

  it("should return delete none message when deleting non-existent usuario id", async () => {
    const res = await request(app).delete("/usuarios/9999999999999999");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Nenhum registro excluído");
  });

  it("should not delete usuario if they have an associated cart", async () => {
    const email = "cartuser@example.com";
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Usuario com Carrinho",
        email,
        password: "password123",
        administrador: "false"
      });

    const userId = createRes.body._id;

    const adminEmail = "admin_cart@example.com";
    await request(app).post("/usuarios").send({
      nome: "Admin",
      email: adminEmail,
      password: "adminpassword",
      administrador: "true"
    });

    const loginRes = await request(app).post("/login").send({
      email: adminEmail,
      password: "adminpassword"
    });

    const token = loginRes.body.authorization;

    const prodCreate = await request(app)
      .post("/produtos")
      .set("authorization", token)
      .send({
        nome: "Produto Cart",
        preco: 10,
        descricao: "Desc",
        quantidade: 5
      });

    const produtoId = prodCreate.body._id;

    const userLoginRes = await request(app).post("/login").send({
      email,
      password: "password123"
    });
    const userToken = userLoginRes.body.authorization;

    await request(app)
      .post("/carrinhos")
      .set("authorization", userToken)
      .send({
        produtos: [
          { idProduto: produtoId, quantidade: 1 }
        ]
      });

    const deleteRes = await request(app).delete(`/usuarios/${userId}`);
    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.message).toBe("Não é permitido excluir usuário com carrinho cadastrado");
  });

  it("should update an existing usuario with PUT", async () => {
    const email = "put_user@example.com";
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Antes Put",
        email,
        password: "password123",
        administrador: "false"
      });

    const userId = createRes.body._id;

    const updateRes = await request(app)
      .put(`/usuarios/${userId}`)
      .send({
        nome: "Depois Put",
        email,
        password: "newpassword",
        administrador: "true"
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.message).toBe("Registro alterado com sucesso");
  });
});
