import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Usuarios API", () => {
  it("should get empty or list of users", async () => {
    const res = await request(app).get("/usuarios");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("usuarios");
    expect(Array.isArray(res.body.usuarios)).toBe(true);
  });

  it("should create a new user successfully", async () => {
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "Test User",
        email: "user_test_unique_1@test.com",
        password: "password123",
        administrador: "true"
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
    expect(res.body).toHaveProperty("_id");
  });

  it("should fail to create a user with duplicate email", async () => {
    const userData = {
      nome: "User One",
      email: "user_dup_unique_2@test.com",
      password: "password123",
      administrador: "false"
    };

    const firstRes = await request(app).post("/usuarios").send(userData);
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app).post("/usuarios").send({
      ...userData,
      nome: "User Two"
    });
    expect(secondRes.status).toBe(400);
    expect(secondRes.body).toEqual({ message: "Este email já está sendo usado" });
  });

  it("should fail to create a user with missing fields", async () => {
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "Incomplete User"
      });

    expect(res.status).toBe(400);
  });

  it("should get a single user by id", async () => {
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Find Me",
        email: "user_find_unique_3@test.com",
        password: "123",
        administrador: "true"
      });

    const userId = createRes.body._id;

    const res = await request(app).get(`/usuarios/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("_id", userId);
    expect(res.body).toHaveProperty("nome", "Find Me");
  });

  it("should return 400 when getting a non-existent user", async () => {
    const fakeId = "1234567890abcdef";
    const res = await request(app).get(`/usuarios/${fakeId}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Usuário não encontrado" });
  });

  it("should delete an existing user", async () => {
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Delete Me",
        email: "user_del_unique_4@test.com",
        password: "123",
        administrador: "false"
      });

    const userId = createRes.body._id;

    const res = await request(app).delete(`/usuarios/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Registro excluído com sucesso" });
  });

  it("should return deletion message when deleting non-existent user if schema allows", async () => {
    const fakeId = "someNonExistentId123";
    const res = await request(app).delete(`/usuarios/${fakeId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Nenhum registro excluído" });
  });

  it("should update an existing user via put", async () => {
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Update Me",
        email: "user_put_unique_5@test.com",
        password: "123",
        administrador: "false"
      });

    const userId = createRes.body._id;

    const res = await request(app)
      .put(`/usuarios/${userId}`)
      .send({
        nome: "Updated Name",
        email: "user_put_unique_5@test.com",
        password: "456",
        administrador: "true"
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Registro alterado com sucesso" });
  });
});
