import { describe, it, expect } from "vitest";
import produtosService from "../../src/services/produtos-service";

describe("getAll", () => {
  it("should return all products matching query", async () => {
    const produtos = await produtosService.getAll({});
    expect(Array.isArray(produtos)).toBe(true);
  });
});

describe("getOne", () => {
  it("should return null when product does not exist", async () => {
    const produto = await produtosService.getOne("id-inexistente");
    expect(produto).toBeNull();
  });
});

describe("existeProduto", () => {
  it("should return null when product is not found", async () => {
    const resultado = await produtosService.existeProduto({ nome: "Produto Inexistente Xpto" });
    expect(resultado).toBeNull();
  });
});

describe("criarProduto", () => {
  it("should format values and create a product", async () => {
    const novoProduto = {
      nome: "  Produto Teste  ",
      preco: "100.50",
      quantidade: "10",
      descricao: "Teste",
      imagem: " imagem.jpg "
    };

    const criado = await produtosService.criarProduto(novoProduto);
    expect(criado).toHaveProperty("_id");
    expect(criado.nome).toBe("Produto Teste");
    expect(criado.preco).toBe(100.50);
    expect(criado.quantidade).toBe(10);
    expect(criado.imagem).toBe("imagem.jpg");
    expect(criado).toHaveProperty("alteradoEm");
  });
});

describe("getPrecosUnitariosPorLote", () => {
  it("should return error when product in batch does not exist", async () => {
    const resultado = await produtosService.getPrecosUnitariosPorLote([
      { idProduto: "id-inexistente-lote", quantidade: 1 }
    ]);
    expect(resultado).toHaveProperty("error");
    expect(resultado.error.statusCode).toBe(400);
    expect(resultado.error.index).toBe(0);
  });
});

describe("deleteById", () => {
  it("should delete product by id and return count of removed docs", async () => {
    const removidos = await produtosService.deleteById("id-inexistente-remover");
    expect(removidos).toBe(0);
  });
});

describe("updateById", () => {
  it("should update product by id using upsert", async () => {
    const updateBody = { $set: { nome: "Nome Modificado" } };
    const resultado = await produtosService.updateById("id-teste-update", updateBody);
    expect(resultado).toHaveProperty("nome", "Nome Modificado");
  });
});
