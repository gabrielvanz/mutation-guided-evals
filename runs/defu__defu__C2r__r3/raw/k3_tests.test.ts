import { describe, it, expect } from "vitest";
import { defu, createDefu, defuFn, defuArrayFn } from "../../src/defu";

describe("defu", () => {
  it("should merge basic objects", () => {
    const base = { a: 1, b: 2 };
    const defaults = { b: 3, c: 4 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1, b: 2, c: 4 });
  });

  it("should handle multiple arguments prioritizing the first", () => {
    const result = defu({ a: 1 }, { a: 2, b: 2 }, { b: 3, c: 3 });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should ignore null and undefined values in base object", () => {
    const base = { a: null, b: undefined, c: 3 };
    const defaults = { a: 1, b: 2, c: 4 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should handle non-plain object defaults gracefully", () => {
    const result = defu({ a: 1 }, null);
    expect(result).toEqual({ a: 1 });
  });

  it("should concatenate arrays", () => {
    const base = { arr: [3, 4] };
    const defaults = { arr: [1, 2] };
    const result = defu(base, defaults);
    expect(result).toEqual({ arr: [3, 4, 1, 2] });
  });

  it("should recursively merge plain objects", () => {
    const base = { nested: { a: 1 } };
    const defaults = { nested: { b: 2, a: 5 } };
    const result = defu(base, defaults);
    expect(result).toEqual({ nested: { a: 1, b: 2 } });
  });

  it("should ignore prototype pollution keys", () => {
    const base = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}, "a": 1}');
    const defaults = { a: 2, b: 3 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1, b: 3 });
    expect(({} as any).polluted).toBeUndefined();
  });
});

describe("createDefu", () => {
  it("should create a custom defu instance with a custom merger", () => {
    const custom = createDefu((object, key, value) => {
      if (typeof value === "string") {
        object[key] = value.toUpperCase();
        return true;
      }
    });

    const result = custom({ a: "hello" }, { a: "world", b: "test" });
    expect(result).toEqual({ a: "HELLO", b: "test" });
  });
});

describe("defuFn", () => {
  it("should merge using function values", () => {
    const base = {
      callback: (val: number) => val + 1,
    };
    const defaults = {
      callback: 10,
    };
    const result = defuFn(base, defaults);
    expect(result.callback).toBe(11);
  });

  it("should assign function if object property is undefined", () => {
    const base = {
      callback: (val: number) => val + 1,
    };
    const defaults = {};
    const result = defuFn(base, defaults);
    expect(typeof result.callback).toBe("function");
  });
});

describe("defuArrayFn", () => {
  it("should invoke function if default/object property is an array", () => {
    const base = {
      items: (arr: number[]) => [...arr, 3, 4],
    };
    const defaults = {
      items: [1, 2],
    };
    const result = defuArrayFn(base, defaults);
    expect(result.items).toEqual([1, 2, 3, 4]);
  });
});
