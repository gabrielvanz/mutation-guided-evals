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

  it("should handle empty product array", () => {
    const result = carrinhosService.extrairProdutosDuplicados([]);
    expect(result).toEqual([]);
  });
});

describe("precoTotal", () => {
  it("should calculate total price correctly for multiple products", () => {
    const produtos = [
      { precoUnitario: 10, quantidade: 2 },
      { precoUnitario: 5, quantidade: 4 }
    ];
    const result = carrinhosService.precoTotal(produtos);
    expect(result).toBe(40);
  });

  it("should return zero for empty product array", () => {
    const result = carrinhosService.precoTotal([]);
    expect(result).toBe(0);
  });

  it("should handle decimal prices correctly", () => {
    const produtos = [
      { precoUnitario: 10.5, quantidade: 2 },
      { precoUnitario: 3.25, quantidade: 4 }
    ];
    const result = carrinhosService.precoTotal(produtos);
    expect(result).toBe(34);
  });
});

describe("quantidadeTotal", () => {
  it("should calculate total quantity correctly", () => {
    const produtos = [
      { quantidade: 2 },
      { quantidade: 5 },
      { quantidade: 3 }
    ];
    const result = carrinhosService.quantidadeTotal(produtos);
    expect(result).toBe(10);
  });

  it("should return zero for empty product array", () => {
    const result = carrinhosService.quantidadeTotal([]);
    expect(result).toBe(0);
  });
});

describe("totaisSaoSeguros", () => {
  it("should return true when both totals are safe integers", () => {
    const result = carrinhosService.totaisSaoSeguros(100, 10);
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

  it("should return false when totals are floats or NaN", () => {
    expect(carrinhosService.totaisSaoSeguros(10.5, 5)).toBe(false);
    expect(carrinhosService.totaisSaoSeguros(NaN, 5)).toBe(false);
  });
});

describe("getAll", () => {
  it("should be a function and call find on datastore", async () => {
    expect(typeof carrinhosService.getAll).toBe("function");
    const result = await carrinhosService.getAll({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("getOne", () => {
  it("should return null or a cart when fetching by id", async () => {
    expect(typeof carrinhosService.getOne).toBe("function");
    const result = await carrinhosService.getOne("inexistent-id");
    expect(result).toBeNull();
  });
});

describe("existeCarrinho", () => {
  it("should return null when cart does not exist for criteria", async () => {
    expect(typeof carrinhosService.existeCarrinho).toBe("function");
    const result = await carrinhosService.existeCarrinho({ idUsuario: "inexistent" });
    expect(result).toBeNull();
  });
});

describe("existeCarrinhoComProduto", () => {
  it("should return null when no cart contains the product", async () => {
    expect(typeof carrinhosService.existeCarrinhoComProduto).toBe("function");
    const result = await carrinhosService.existeCarrinhoComProduto("inexistent-prod");
    expect(result).toBeNull();
  });
});

describe("criarCarrinho", () => {
  it("should be a function", () => {
    expect(typeof carrinhosService.criarCarrinho).toBe("function");
  });
});

describe("getProdutosComPrecoUnitarioOuErro", () => {
  it("should be a function", () => {
    expect(typeof carrinhosService.getProdutosComPrecoUnitarioOuErro).toBe("function");
  });
});

describe("deleteById", () => {
  it("should be a function", () => {
    expect(typeof carrinhosService.deleteById).toBe("function");
  });
});

describe("concluiCompra", () => {
  it("should be a function", () => {
    expect(typeof carrinhosService.concluiCompra).toBe("function");
  });
});

describe("removeCarrinho", () => {
  it("should be a function", () => {
    expect(typeof carrinhosService.removeCarrinho).toBe("function");
  });
});

describe("getCarrinhoDoUsuario", () => {
  it("should be a function", () => {
    expect(typeof carrinhosService.getCarrinhoDoUsuario).toBe("function");
  });
});

describe("usuarioJaPossuiCarrinho", () => {
  it("should be a function", () => {
    expect(typeof carrinhosService.usuarioJaPossuiCarrinho).toBe("function");
  });
});

describe("baixarEstoque", () => {
  it("should be a function", () => {
    expect(typeof carrinhosService.baixarEstoque).toBe("function");
  });
});

describe("reabasteceEstoque", () => {
  it("should be a function", () => {
    expect(typeof carrinhosService.reabasteceEstoque).toBe("function");
  });
});
