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
        email: "user_test_unique_01@test.com",
        password: "123",
        administrador: "true"
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Cadastro realizado com sucesso");
    expect(res.body).toHaveProperty("_id");
  });

  it("should not allow creating a user with an existing email", async () => {
    const payload = {
      nome: "User One",
      email: "user_dup_unique_02@test.com",
      password: "123",
      administrador: "false"
    };

    const firstRes = await request(app).post("/usuarios").send(payload);
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app).post("/usuarios").send({
      ...payload,
      nome: "User Two"
    });

    expect(secondRes.status).toBe(400);
    expect(secondRes.body.message).toBe("Este email já está sendo usado");
  });

  it("should return 400 when user is not found by id", async () => {
    const res = await request(app).get("/usuarios/1234567890abcdef");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Usuário não encontrado");
  });

  it("should get a specific user by id", async () => {
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Find Me",
        email: "getone_unique_03@test.com",
        password: "123",
        administrador: "false"
      });

    expect(createRes.status).toBe(201);
    const userId = createRes.body._id;

    const res = await request(app).get(`/usuarios/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(userId);
    expect(res.body.nome).toBe("Find Me");
    expect(res.body.email).toBe("getone_unique_03@test.com");
  });

  it("should delete an existing user", async () => {
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Delete Me",
        email: "del_unique_04@test.com",
        password: "123",
        administrador: "false"
      });

    const userId = createRes.body._id;

    const res = await request(app).delete(`/usuarios/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Registro excluído com sucesso");
  });

  it("should update an existing user with PUT or create if not exists", async () => {
    const fakeId = "9999999999999999";

    const res = await request(app)
      .put(`/usuarios/${fakeId}`)
      .send({
        nome: "Put User",
        email: "put_unique_05@test.com",
        password: "123",
        administrador: "true"
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Cadastro realizado com sucesso");
    expect(res.body).toHaveProperty("_id");
    expect(typeof res.body._id).toBe("string");
  });
});
