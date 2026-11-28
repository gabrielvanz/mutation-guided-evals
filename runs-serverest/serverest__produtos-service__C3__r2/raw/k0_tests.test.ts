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
    const produto = await produtosService.existeProduto({ nome: "Produto Inexistente Xpto" });
    expect(produto).toBeNull();
  });
});

describe("criarProduto", () => {
  it("should create a new product and format values", async () => {
    const novoProduto = {
      nome: "  Logitech MX Master 3  ",
      preco: "250",
      descricao: "Mouse ergônomico",
      quantidade: "15",
      imagem: "  imagem.jpg  "
    };

    const criado = await produtosService.criarProduto(novoProduto);
    expect(criado).toHaveProperty("_id");
    expect(criado.nome).toBe("Logitech MX Master 3");
    expect(criado.preco).toBe(250);
    expect(criado.quantidade).toBe(15);
    expect(criado.imagem).toBe("imagem.jpg");
    expect(criado).toHaveProperty("alteradoEm");
  });
});

describe("getPrecosUnitariosPorLote", () => {
  it("should return product not found error for missing product in batch", async () => {
    const resultado = await produtosService.getPrecosUnitariosPorLote([
      { idProduto: "id-inexistente-lote", quantidade: 1 }
    ]);
    expect(resultado).toHaveProperty("error");
    expect(resultado.error.statusCode).toBe(400);
    expect(resultado.error.item.idProduto).toBe("id-inexistente-lote");
  });
});

describe("deleteById", () => {
  it("should delete product by id", async () => {
    const removidos = await produtosService.deleteById("id-inexistente-remover");
    expect(removidos).toBe(0);
  });
});

describe("updateById", () => {
  it("should update product by id", async () => {
    const atualizado = await produtosService.updateById("id-inexistente-atualizar", {
      $set: { nome: "Atualizado" }
    });
    expect(atualizado).toBeDefined();
  });
});
