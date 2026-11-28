import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Usuarios API", () => {
  it("should get all users", async () => {
    const res = await request(app).get("/usuarios");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("usuarios");
    expect(Array.isArray(res.body.usuarios)).toBe(true);
  });

  it("should filter users by query parameters", async () => {
    const uniqueName = "UserTest_Filter";
    const uniqueEmail = "usertest_filter@qa.com";

    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: uniqueName,
        email: uniqueEmail,
        password: "password123",
        administrador: "false"
      });

    expect(createRes.status).toBe(201);

    const res = await request(app).get(`/usuarios?nome=${uniqueName}`);
    expect(res.status).toBe(200);
    expect(res.body.quantidade).toBe(1);
    expect(res.body.usuarios[0].nome).toBe(uniqueName);
  });

  it("should create a new user successfully", async () => {
    const uniqueEmail = "newuser_success@qa.com";
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "Fulano da Silva",
        email: uniqueEmail,
        password: "teste",
        administrador: "true"
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Cadastro realizado com sucesso");
    expect(res.body).toHaveProperty("_id");
  });

  it("should not create a user with an already used email", async () => {
    const uniqueEmail = "duplicate_email@qa.com";
    const payload = {
      nome: "Fulano da Silva",
      email: uniqueEmail,
      password: "teste",
      administrador: "true"
    };

    const firstRes = await request(app).post("/usuarios").send(payload);
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app).post("/usuarios").send(payload);
    expect(secondRes.status).toBe(400);
    expect(secondRes.body.message).toBe("Este email já está sendo usado");
  });

  it("should get a single user by valid id", async () => {
    const uniqueEmail = "getone_user@qa.com";
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Test Get One",
        email: uniqueEmail,
        password: "123",
        administrador: "false"
      });

    expect(createRes.status).toBe(201);
    const userId = createRes.body._id;

    const res = await request(app).get(`/usuarios/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(userId);
    expect(res.body.email).toBe(uniqueEmail);
  });

  it("should return 400 when getting a non-existent user id with correct format", async () => {
    const res = await request(app).get("/usuarios/1234567890abcdef");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Usuário não encontrado");
  });

  it("should return validation error when getting user with invalid id format", async () => {
    const res = await request(app).get("/usuarios/invalid-id");
    expect(res.status).toBe(400);
  });

  it("should delete an existing user", async () => {
    const uniqueEmail = "delete_user@qa.com";
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "To Delete",
        email: uniqueEmail,
        password: "123",
        administrador: "false"
      });

    expect(createRes.status).toBe(201);
    const userId = createRes.body._id;

    const deleteRes = await request(app).delete(`/usuarios/${userId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe("Registro excluído com sucesso");
  });

  it("should return delete none message when deleting non-existent user", async () => {
    const deleteRes = await request(app).delete("/usuarios/nonexistentid12");
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe("Nenhum registro excluído");
  });

  it("should update an existing user via PUT", async () => {
    const uniqueEmail = "put_user@qa.com";
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Before Update",
        email: uniqueEmail,
        password: "123",
        administrador: "false"
      });

    expect(createRes.status).toBe(201);
    const userId = createRes.body._id;

    const putRes = await request(app)
      .put(`/usuarios/${userId}`)
      .send({
        nome: "After Update",
        email: uniqueEmail,
        password: "456",
        administrador: "true"
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.message).toBe("Registro alterado com sucesso");
  });

  it("should upsert a user via PUT if id does not exist", async () => {
    const uniqueEmail = "upsert_user@qa.com";
    const randomId = "abc1234567890xyz";

    const putRes = await request(app)
      .put(`/usuarios/${randomId}`)
      .send({
        nome: "Upserted User",
        email: uniqueEmail,
        password: "123",
        administrador: "false"
      });

    expect(putRes.status).toBe(201);
    expect(putRes.body.message).toBe("Cadastro realizado com sucesso");
    expect(putRes.body).toHaveProperty("_id");
  });
});
