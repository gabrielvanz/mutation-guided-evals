import { describe, it, expect } from "vitest";
import { defu, createDefu, defuFn, defuArrayFn } from "../../src/defu";

describe("defu", () => {
  it("should merge basic objects with defaults", () => {
    const result = defu({ a: 1 }, { a: 2, b: 3 });
    expect(result).toEqual({ a: 1, b: 3 });
  });

  it("should handle nested objects recursively", () => {
    const result = defu({ a: { x: 1 } }, { a: { x: 2, y: 3 }, b: 4 });
    expect(result).toEqual({ a: { x: 1, y: 3 }, b: 4 });
  });

  it("should concatenate arrays", () => {
    const result = defu({ a: [1, 2] }, { a: [3, 4] });
    expect(result).toEqual({ a: [1, 2, 3, 4] });
  });

  it("should ignore null and undefined values from base object", () => {
    const result = defu({ a: undefined, b: null, c: 1 }, { a: 10, b: 20, c: 30 });
    expect(result).toEqual({ a: 10, b: 20, c: 1 });
  });

  it("should handle multiple arguments", () => {
    const result = defu({ a: 1 }, { b: 2 }, { c: 3, a: 10 });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should ignore prototype pollution keys", () => {
    const result = defu(JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}, "a": 1}'), { a: 2, b: 3 });
    expect(result).toEqual({ a: 1, b: 3 });
    expect({}.polluted).toBeUndefined();
  });

  it("should fall back to empty object when defaults is not a plain object", () => {
    const result = defu({ a: 1 }, null);
    expect(result).toEqual({ a: 1 });
  });
});

describe("createDefu", () => {
  it("should create a custom defu instance with a custom merger", () => {
    const customDefu = createDefu((object, key, value) => {
      if (key === "special") {
        object[key] = `custom-${value}`;
        return true;
      }
    });

    const result = customDefu({ special: "value" }, { special: "default" });
    expect(result).toEqual({ special: "custom-value" });
  });
});

describe("defuFn", () => {
  it("should merge functions when current value is a function", () => {
    const result = defuFn(
      { a: (val: number) => val + 1 },
      { a: 1 }
    );
    expect(result).toEqual({ a: 2 });
  });
});

describe("defuArrayFn", () => {
  it("should merge arrays using a function when default is an array", () => {
    const result = defuArrayFn(
      { a: (val: number[]) => [...val, 3] },
      { a: [1, 2] }
    );
    expect(result).toEqual({ a: [1, 2, 3] });
  });
});
