import { describe, it, expect } from "vitest";
import carrinhosService from "../../src/services/carrinhos-service";

describe("extrairProdutosDuplicados", () => {
  it("should return an empty array when there are no duplicate products", () => {
    const produtos = [
      { idProduto: "1", quantidade: 2 },
      { idProduto: "2", quantidade: 1 }
    ];
    const result = carrinhosService.extrairProdutosDuplicados(produtos);
    expect(result).toEqual([]);
  });

  it("should extract duplicate product IDs when products appear multiple times", () => {
    const produtos = [
      { idProduto: "1", quantidade: 2 },
      { idProduto: "2", quantidade: 1 },
      { idProduto: "1", quantidade: 3 }
    ];
    const result = carrinhosService.extrairProdutosDuplicados(produtos);
    expect(result).toEqual(["1"]);
  });
});

describe("precoTotal", () => {
  it("should calculate total price correctly for a list of products", () => {
    const produtos = [
      { precoUnitario: 10, quantidade: 2 },
      { precoUnitario: 5, quantidade: 4 }
    ];
    const result = carrinhosService.precoTotal(produtos);
    expect(result).toBe(40);
  });

  it("should return zero when product list is empty", () => {
    const result = carrinhosService.precoTotal([]);
    expect(result).toBe(0);
  });
});

describe("quantidadeTotal", () => {
  it("should calculate total quantity correctly for a list of products", () => {
    const produtos = [
      { quantidade: 2 },
      { quantidade: 5 }
    ];
    const result = carrinhosService.quantidadeTotal(produtos);
    expect(result).toBe(7);
  });

  it("should return zero when product list is empty", () => {
    const result = carrinhosService.quantidadeTotal([]);
    expect(result).toBe(0);
  });
});

describe("totaisSaoSeguros", () => {
  it("should return true when both totals are safe integers", () => {
    const result = carrinhosService.totaisSaoSeguros(100, 50);
    expect(result).toBe(true);
  });

  it("should return false when price total is not a safe integer", () => {
    const result = carrinhosService.totaisSaoSeguros(Number.MAX_SAFE_INTEGER + 1, 10);
    expect(result).toBe(false);
  });

  it("should return false when quantity total is not a safe integer", () => {
    const result = carrinhosService.totaisSaoSeguros(100, Number.MAX_SAFE_INTEGER + 1);
    expect(result).toBe(false);
  });
});

describe("Database initialization and functions", () => {
  it("should have functions exported correctly", () => {
    expect(typeof carrinhosService.getAll).toBe("function");
    expect(typeof carrinhosService.getOne).toBe("function");
    expect(typeof carrinhosService.existeCarrinho).toBe("function");
    expect(typeof carrinhosService.existeCarrinhoComProduto).toBe("function");
    expect(typeof carrinhosService.criarCarrinho).toBe("function");
    expect(typeof carrinhosService.getProdutosComPrecoUnitarioOuErro).toBe("function");
    expect(typeof carrinhosService.deleteById).toBe("function");
    expect(typeof carrinhosService.concluiCompra).toBe("function");
    expect(typeof carrinhosService.removeCarrinho).toBe("function");
    expect(typeof carrinhosService.getCarrinhoDoUsuario).toBe("function");
    expect(typeof carrinhosService.usuarioJaPossuiCarrinho).toBe("function");
    expect(typeof carrinhosService.baixarEstoque).toBe("function");
    expect(typeof carrinhosService.reabasteceEstoque).toBe("function");
  });
});

describe("Module logic and database operations", () => {
  it("should return a truthy result for getAll", async () => {
    const result = await carrinhosService.getAll({ idUsuario: "abc" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should return null or object for getOne", async () => {
    const result = await carrinhosService.getOne("123");
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("should return null or object for existeCarrinho", async () => {
    const result = await carrinhosService.existeCarrinho({ idUsuario: "abc" });
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("should return null or object for existeCarrinhoComProduto", async () => {
    const result = await carrinhosService.existeCarrinhoComProduto("prod1");
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("should return a promise for criarCarrinho", () => {
    const result = carrinhosService.criarCarrinho({ produtos: [], idUsuario: "abc" });
    expect(result).toBeInstanceOf(Promise);
  });

  it("should return a promise for deleteById", () => {
    const result = carrinhosService.deleteById("123");
    expect(result).toBeInstanceOf(Promise);
  });

  it("should return a promise for baixarEstoque", () => {
    const result = carrinhosService.baixarEstoque([]);
    expect(result).toBeInstanceOf(Promise);
  });

  it("should return a promise for reabasteceEstoque", () => {
    const result = carrinhosService.reabasteceEstoque([]);
    expect(result).toBeInstanceOf(Promise);
  });

  it("should return a promise for getProdutosComPrecoUnitarioOuErro", () => {
    const result = carrinhosService.getProdutosComPrecoUnitarioOuErro([]);
    expect(result).toBeInstanceOf(Promise);
  });
});
