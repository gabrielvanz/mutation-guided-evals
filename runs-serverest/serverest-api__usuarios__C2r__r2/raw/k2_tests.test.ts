import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("usuarios API", () => {
  it("should get all users", async () => {
    const res = await request(app).get("/usuarios");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("usuarios");
    expect(Array.isArray(res.body.usuarios)).toBe(true);
  });

  it("should filter users by query parameters", async () => {
    const uniqueEmail = "user_filter@test.com";
    const uniqueName = "User Filter";

    await request(app)
      .post("/usuarios")
      .send({
        nome: uniqueName,
        email: uniqueEmail,
        password: "password123",
        administrador: "true"
      });

    const res = await request(app).get(`/usuarios?email=${uniqueEmail}`);
    expect(res.status).toBe(200);
    expect(res.body.quantidade).toBe(1);
    expect(res.body.usuarios[0].email).toBe(uniqueEmail);
  });

  it("should return 400 for invalid query parameters", async () => {
    const res = await request(app).get("/usuarios?email=invalid-email");
    expect(res.status).toBe(400);
  });

  it("should create a new user successfully", async () => {
    const uniqueEmail = "new_user@test.com";
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "Novo Usuario",
        email: uniqueEmail,
        password: "password123",
        administrador: "false"
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
    expect(res.body).toHaveProperty("_id");
  });

  it("should not create a user with an existing email", async () => {
    const uniqueEmail = "dup_user@test.com";
    const payload = {
      nome: "Usuario Duplicado",
      email: uniqueEmail,
      password: "password123",
      administrador: "false"
    };

    const firstRes = await request(app).post("/usuarios").send(payload);
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app).post("/usuarios").send(payload);
    expect(secondRes.status).toBe(400);
    expect(secondRes.body).toHaveProperty("message", "Este email já está sendo usado");
  });

  it("should return validation error when posting incomplete user data", async () => {
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "Incompleto"
      });

    expect(res.status).toBe(400);
  });

  it("should get one user by id", async () => {
    const uniqueEmail = "getone_user@test.com";
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Get One",
        email: uniqueEmail,
        password: "password123",
        administrador: "false"
      });

    const userId = createRes.body._id;

    const res = await request(app).get(`/usuarios/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(userId);
    expect(res.body.email).toBe(uniqueEmail);
  });

  it("should return 400 when user is not found by id", async () => {
    const fakeId = "1234567890abcdef";
    const res = await request(app).get(`/usuarios/${fakeId}`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "Usuário não encontrado");
  });

  it("should delete an existing user", async () => {
    const uniqueEmail = "del_user@test.com";
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Para Deletar",
        email: uniqueEmail,
        password: "password123",
        administrador: "false"
      });

    const userId = createRes.body._id;

    const res = await request(app).delete(`/usuarios/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Registro excluído com sucesso");
  });

  it("should return deletion none message when user does not exist on delete", async () => {
    const fakeId = "abcdef1234567890";
    const res = await request(app).delete(`/usuarios/${fakeId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Nenhum registro excluído");
  });

  it("should update an existing user via PUT or create if not exists", async () => {
    const uniqueEmail = "put_user@test.com";
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Usuario Put",
        email: uniqueEmail,
        password: "password123",
        administrador: "false"
      });

    const userId = createRes.body._id;
    const updatedEmail = "updated_user@test.com";

    const res = await request(app)
      .put(`/usuarios/${userId}`)
      .send({
        nome: "Usuario Atualizado",
        email: updatedEmail,
        password: "password456",
        administrador: "true"
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Registro alterado com sucesso");
  });
});
