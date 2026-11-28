import { describe, it, expect } from "vitest";
import carrinhosService from "../../src/services/carrinhos-service";

describe("extrairProdutosDuplicados", () => {
  it("should return empty array when there are no duplicate products", () => {
    const produtos = [
      { idProduto: "1" },
      { idProduto: "2" },
      { idProduto: "3" }
    ];
    const result = carrinhosService.extrairProdutosDuplicados(produtos);
    expect(result).toEqual([]);
  });

  it("should return duplicated product IDs when products appear more than once", () => {
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

  it("should handle empty product array", () => {
    const result = carrinhosService.extrairProdutosDuplicados([]);
    expect(result).toEqual([]);
  });
});

describe("precoTotal", () => {
  it("should calculate total price correctly for multiple products", () => {
    const produtos = [
      { precoUnitario: 10, quantidade: 2 },
      { precoUnitario: 5.5, quantidade: 4 }
    ];
    const result = carrinhosService.precoTotal(produtos);
    expect(result).toBe(42);
  });

  it("should return zero for empty product list", () => {
    const result = carrinhosService.precoTotal([]);
    expect(result).toBe(0);
  });
});

describe("quantidadeTotal", () => {
  it("should calculate total quantity correctly for multiple products", () => {
    const produtos = [
      { quantidade: 2 },
      { quantidade: 5 },
      { quantidade: 3 }
    ];
    const result = carrinhosService.quantidadeTotal(produtos);
    expect(result).toBe(10);
  });

  it("should return zero for empty product list", () => {
    const result = carrinhosService.quantidadeTotal([]);
    expect(result).toBe(0);
  });
});

describe("totaisSaoSeguros", () => {
  it("should return true for safe integer totals", () => {
    const result = carrinhosService.totaisSaoSeguros(100, 10);
    expect(result).toBe(true);
  });

  it("should return false when precoTotal is not a safe integer", () => {
    const result = carrinhosService.totaisSaoSeguros(Number.MAX_SAFE_INTEGER + 1, 10);
    expect(result).toBe(false);
  });

  it("should return false when quantidadeTotal is not a safe integer", () => {
    const result = carrinhosService.totaisSaoSeguros(100, Number.MAX_SAFE_INTEGER + 1);
    expect(result).toBe(false);
  });

  it("should return false for floating point totals", () => {
    const result = carrinhosService.totaisSaoSeguros(10.5, 2);
    expect(result).toBe(false);
  });
});
