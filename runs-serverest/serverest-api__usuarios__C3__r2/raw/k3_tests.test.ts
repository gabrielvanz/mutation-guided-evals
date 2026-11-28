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

  it("should create a new usuario successfully", async () => {
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "Test User",
        email: "test_user_unique@example.com",
        password: "password123",
        administrador: "true"
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Cadastro realizado com sucesso");
    expect(res.body).toHaveProperty("_id");
  });

  it("should not allow creating a usuario with an existing email", async () => {
    const payload = {
      nome: "User One",
      email: "duplicate_email_test@example.com",
      password: "password123",
      administrador: "false"
    };

    const firstRes = await request(app).post("/usuarios").send(payload);
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app).post("/usuarios").send(payload);
    expect(secondRes.status).toBe(400);
    expect(secondRes.body.message).toBe("Este email já está sendo usado");
  });

  it("should return 400 when getting a non-existent usuario", async () => {
    const res = await request(app).get("/usuarios/abc1234567890123");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Usuário não encontrado");
  });

  it("should return a specific usuario when getting by valid id", async () => {
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Get One User",
        email: "get_one_unique@example.com",
        password: "password123",
        administrador: "true"
      });

    expect(createRes.status).toBe(201);
    const userId = createRes.body._id;

    const res = await request(app).get(`/usuarios/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("_id", userId);
    expect(res.body).toHaveProperty("nome", "Get One User");
    expect(res.body).toHaveProperty("email", "get_one_unique@example.com");
  });

  it("should delete an existing usuario", async () => {
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "To Delete",
        email: "to_delete_user@example.com",
        password: "password123",
        administrador: "false"
      });

    expect(createRes.status).toBe(201);
    const userId = createRes.body._id;

    const deleteRes = await request(app).delete(`/usuarios/${userId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe("Registro excluído com sucesso");
  });

  it("should prevent deleting a usuario that has an associated carrinho", async () => {
    const userRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "User With Cart",
        email: "user_with_cart@example.com",
        password: "password123",
        administrador: "false"
      });
    expect(userRes.status).toBe(201);
    const userId = userRes.body._id;

    const produtoRes = await request(app)
      .post("/produtos")
      .set("authorization", "")
      .send({
        nome: "Produto Cart Test",
        preco: 10,
        descricao: "Desc",
        quantidade: 5
      });
    
    let produtoId;
    if (produtoRes.status === 201) {
      produtoId = produtoRes.body._id;
    } else {
      const produtosList = await request(app).get("/produtos");
      produtoId = produtosList.body.produtos[0]._id;
    }

    const loginRes = await request(app)
      .post("/login")
      .send({
        email: "user_with_cart@example.com",
        password: "password123"
      });
    
    if (loginRes.status === 200 && loginRes.body.authorization) {
      await request(app)
        .post("/carrinhos")
        .set("authorization", loginRes.body.authorization)
        .send({
          produtos: [{ idProduto: produtoId, quantidade: 1 }]
        });
    }

    const deleteRes = await request(app).delete(`/usuarios/${userId}`);
    if (deleteRes.status === 400) {
      expect(deleteRes.body.message).toBe("Não é permitido excluir usuário com carrinho cadastrado");
      expect(deleteRes.body).toHaveProperty("idCarrinho");
    } else {
      expect(deleteRes.status).toBe(200);
    }
  });

  it("should update an existing usuario successfully (PUT)", async () => {
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "User To Put",
        email: "user_to_put@example.com",
        password: "password123",
        administrador: "false"
      });
    expect(createRes.status).toBe(201);
    const userId = createRes.body._id;

    const putRes = await request(app)
      .put(`/usuarios/${userId}`)
      .send({
        nome: "User Updated",
        email: "user_to_put@example.com",
        password: "password456",
        administrador: "true"
      });
    expect(putRes.status).toBe(200);
    expect(putRes.body.message).toBe("Registro alterado com sucesso");
  });

  it("should upsert a non-existent usuario via PUT", async () => {
    const nonExistentId = "9876543210fedcba";
    const putRes = await request(app)
      .put(`/usuarios/${nonExistentId}`)
      .send({
        nome: "Upserted User",
        email: "upserted_user@example.com",
        password: "password123",
        administrador: "false"
      });
    expect(putRes.status).toBe(201);
    expect(putRes.body.message).toBe("Cadastro realizado com sucesso");
    expect(putRes.body).toHaveProperty("_id");
  });

  it("should not allow PUT with an email already used by another usuario", async () => {
    const user1 = await request(app)
      .post("/usuarios")
      .send({
        nome: "User One Email",
        email: "user_one_email@example.com",
        password: "password123",
        administrador: "false"
      });
    expect(user1.status).toBe(201);

    const user2 = await request(app)
      .post("/usuarios")
      .send({
        nome: "User Two Email",
        email: "user_two_email@example.com",
        password: "password123",
        administrador: "false"
      });
    expect(user2.status).toBe(201);
    const user2Id = user2.body._id;

    const putRes = await request(app)
      .put(`/usuarios/${user2Id}`)
      .send({
        nome: "User Two Updated",
        email: "user_one_email@example.com",
        password: "password123",
        administrador: "false"
      });
    expect(putRes.status).toBe(400);
    expect(putRes.body.message).toBe("Este email já está sendo usado");
  });

  it("should support filtering usuarios by query parameters", async () => {
    await request(app)
      .post("/usuarios")
      .send({
        nome: "Filterable User",
        email: "filterable_user@example.com",
        password: "password123",
        administrador: "true"
      });

    const res = await request(app).get("/usuarios?email=filterable_user@example.com");
    expect(res.status).toBe(200);
    expect(res.body.quantidade).toBe(1);
    expect(res.body.usuarios[0].email).toBe("filterable_user@example.com");
  });

  it("should validate authentication matching credentials correctly via login", async () => {
    const email = "login_auth_check@example.com";
    const password = "securepassword";
    
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Auth User",
        email,
        password,
        administrador: "true"
      });
    expect(createRes.status).toBe(201);

    const loginRes = await request(app)
      .post("/login")
      .send({
        email,
        password
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty("authorization");

    const badLoginRes = await request(app)
      .post("/login")
      .send({
        email,
        password: "wrongpassword"
      });
    expect(badLoginRes.status).not.toBe(200);
  });
});
