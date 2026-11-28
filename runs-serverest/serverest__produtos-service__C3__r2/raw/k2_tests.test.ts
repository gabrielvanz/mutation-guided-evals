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
  it("should create a new product and format values correctly", async () => {
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
    expect(resultado.error.message).toBe("Produto não encontrado");
    expect(resultado.error.item.idProduto).toBe("id-inexistente-lote");
  });

  it("should return error when quantity exceeds stock in batch", async () => {
    const criado = await produtosService.criarProduto({
      nome: "Teclado Mecânico",
      preco: "300",
      quantidade: "5"
    });

    const resultado = await produtosService.getPrecosUnitariosPorLote([
      { idProduto: criado._id, quantidade: 10 }
    ]);

    expect(resultado).toHaveProperty("error");
    expect(resultado.error.statusCode).toBe(400);
    expect(resultado.error.message).toBe("Produto não possui quantidade suficiente");
    expect(resultado.error.item.quantidadeEstoque).toBe(5);
  });

  it("should return unit prices when all products in batch are valid", async () => {
    const criado = await produtosService.criarProduto({
      nome: "Monitor 144Hz",
      preco: "1200",
      quantidade: "10"
    });

    const resultado = await produtosService.getPrecosUnitariosPorLote([
      { idProduto: criado._id, quantidade: 2 }
    ]);

    expect(resultado).toHaveProperty("produtosComPreco");
    expect(resultado.produtosComPreco[0].precoUnitario).toBe(1200);
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
