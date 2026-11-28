import { describe, it, expect } from "vitest";
import carrinhosService from "../../src/services/carrinhos-service";

describe("extrairProdutosDuplicados", () => {
  it("should return an empty array when there are no duplicate products", () => {
    const produtos = [
      { idProduto: "1" },
      { idProduto: "2" },
      { idProduto: "3" }
    ];
    const result = carrinhosService.extrairProdutosDuplicados(produtos);
    expect(result).toEqual([]);
  });

  it("should return duplicate product IDs when products are repeated", () => {
    const produtos = [
      { idProduto: "1" },
      { idProduto: "2" },
      { idProduto: "1" },
      { idProduto: "3" },
      { idProduto: "2" }
    ];
    const result = carrinhosService.extrairProdutosDuplicados(produtos);
    expect(result).toEqual(["1", "2"]);
  });

  it("should return an empty array for empty product arrays", () => {
    const result = carrinhosService.extrairProdutosDuplicados([]);
    expect(result).toEqual([]);
  });
});

describe("precoTotal", () => {
  it("should calculate the correct total price for a list of products", () => {
    const produtos = [
      { precoUnitario: 10, quantidade: 2 },
      { precoUnitario: 5.5, quantidade: 4 }
    ];
    const result = carrinhosService.precoTotal(produtos);
    expect(result).toBe(42);
  });

  it("should return zero for an empty product list", () => {
    const result = carrinhosService.precoTotal([]);
    expect(result).toBe(0);
  });
});

describe("quantidadeTotal", () => {
  it("should calculate the correct total quantity for a list of products", () => {
    const produtos = [
      { quantidade: 2 },
      { quantidade: 5 },
      { quantidade: 3 }
    ];
    const result = carrinhosService.quantidadeTotal(produtos);
    expect(result).toBe(10);
  });

  it("should return zero for an empty product list", () => {
    const result = carrinhosService.quantidadeTotal([]);
    expect(result).toBe(0);
  });
});

describe("totaisSaoSeguros", () => {
  it("should return true for safe integers", () => {
    expect(carrinhosService.totaisSaoSeguros(100, 5)).toBe(true);
  });

  it("should return false if precoTotal is not a safe integer", () => {
    expect(carrinhosService.totaisSaoSeguros(Number.MAX_SAFE_INTEGER + 1, 5)).toBe(false);
  });

  it("should return false if quantidadeTotal is not a safe integer", () => {
    expect(carrinhosService.totaisSaoSeguros(100, Number.MAX_SAFE_INTEGER + 1)).toBe(false);
  });

  it("should return false for floating point numbers or unsafe values", () => {
    expect(carrinhosService.totaisSaoSeguros(10.5, 2)).toBe(false);
  });
});
