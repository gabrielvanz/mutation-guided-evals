import { describe, it, expect } from "vitest";
import { defu, createDefu, defuFn, defuArrayFn } from "../../src/defu";

describe("defu", () => {
  it("should merge basic objects", () => {
    const base = { a: 1, b: 2 };
    const defaults = { b: 3, c: 4 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1, b: 2, c: 4 });
  });

  it("should handle multiple arguments prioritizing the first one", () => {
    const result = defu({ a: 1 }, { a: 2, b: 2 }, { b: 3, c: 3 });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should ignore null and undefined values in base", () => {
    const base = { a: null, b: undefined, c: 1 };
    const defaults = { a: 10, b: 20, c: 30 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 10, b: 20, c: 1 });
  });

  it("should concatenate arrays", () => {
    const base = { arr: [3, 4] };
    const defaults = { arr: [1, 2] };
    const result = defu(base, defaults);
    expect(result).toEqual({ arr: [3, 4, 1, 2] });
  });

  it("should recursively merge nested objects", () => {
    const base = { nested: { a: 1 } };
    const defaults = { nested: { b: 2, a: 99 } };
    const result = defu(base, defaults);
    expect(result).toEqual({ nested: { a: 1, b: 2 } });
  });

  it("should prevent prototype pollution via __proto__ and constructor", () => {
    const base = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}, "a": 1}');
    const defaults = { a: 2, b: 3 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1, b: 3 });
    expect({}.polluted).toBeUndefined();
  });

  it("should handle non-plain object defaults gracefully", () => {
    const base = { a: 1 };
    const result = defu(base, null as any);
    expect(result).toEqual({ a: 1 });
  });
});

describe("createDefu", () => {
  it("should allow custom mergers", () => {
    const custom = createDefu((object, key, value) => {
      if (key === "special") {
        object[key] = `custom_${value}`;
        return true;
      }
    });
    const result = custom({ special: "val" }, { special: "default" });
    expect(result).toEqual({ special: "custom_val" });
  });
});

describe("defuFn", () => {
  it("should invoke function values with current value", () => {
    const base = {
      val: (current: number) => current + 10,
    };
    const defaults = {
      val: 5,
    };
    const result = defuFn(base, defaults);
    expect(result).toEqual({ val: 15 });
  });
});

describe("defuArrayFn", () => {
  it("should invoke function values only for defined arrays", () => {
    const fn = (current: number) => current + 1;
    const base = {
      arr: (current: number[]) => [...current, 3],
      notArr: fn,
    };
    const defaults = {
      arr: [1, 2],
      notArr: 10,
    };
    const result = defuArrayFn(base, defaults);
    expect(result).toEqual({
      arr: [1, 2, 3],
      notArr: fn,
    });
  });
});
