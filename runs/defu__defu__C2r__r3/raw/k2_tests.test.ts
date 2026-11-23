import { describe, it, expect } from "vitest";
import { defu, createDefu, defuFn, defuArrayFn } from "../../src/defu";

describe("defu", () => {
  it("should merge basic objects with defaults", () => {
    const base = { a: 1, c: 3 };
    const defaults = { a: 2, b: 2 };
    const result = defu(base, defaults);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should handle multiple arguments prioritizing earlier arguments", () => {
    const result = defu({ a: 1 }, { a: 2, b: 2 }, { b: 3, c: 3 });

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should ignore null and undefined values in base object", () => {
    const base = { a: null, b: undefined, c: 3 };
    const defaults = { a: 1, b: 2, c: 1 };
    const result = defu(base, defaults);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should recursively merge nested plain objects", () => {
    const base = {
      nested: { a: 1, c: { x: 10 } }
    };
    const defaults = {
      nested: { a: 2, b: 2, c: { y: 20 } }
    };
    const result = defu(base, defaults);

    expect(result).toEqual({
      nested: { a: 1, b: 2, c: { x: 10, y: 20 } }
    });
  });

  it("should concatenate arrays", () => {
    const base = { arr: [3, 4] };
    const defaults = { arr: [1, 2] };
    const result = defu(base, defaults);

    expect(result).toEqual({ arr: [3, 4, 1, 2] });
  });

  it("should ignore prototype pollution keys", () => {
    const base = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}, "a": 1}');
    const defaults = { a: 2, b: 2 };
    const result = defu(base, defaults);

    expect(result).toEqual({ a: 1, b: 2 });
    expect(({} as any).polluted).toBeUndefined();
  });

  it("should fallback to empty defaults when defaults is not a plain object", () => {
    const base = { a: 1 };
    const result = defu(base, null as any);

    expect(result).toEqual({ a: 1 });
  });
});

describe("createDefu", () => {
  it("should allow creating a custom defu instance with custom merger", () => {
    const customMerger = (obj: any, key: string, val: any) => {
      if (key === "special") {
        obj[key] = val * 10;
        return true;
      }
    };
    const customDefu = createDefu(customMerger);
    const result = customDefu({ special: 5, normal: 1 }, { special: 1, normal: 2 });

    expect(result).toEqual({ special: 50, normal: 1 });
  });
});

describe("defuFn", () => {
  it("should invoke function values with current value when merging", () => {
    const base = {
      callback: (val: number) => val + 10
    };
    const defaults = {
      callback: 5
    };
    const result = defuFn(base, defaults);

    expect(result).toEqual({
      callback: 15
    });
  });

  it("should not invoke function if defaults value is not defined", () => {
    const base = {
      callback: (val: number) => val + 10
    };
    const defaults = {};
    const result = defuFn(base, defaults);

    expect(typeof result.callback).toBe("function");
  });
});

describe("defuArrayFn", () => {
  it("should invoke function only when default value is an array", () => {
    const base = {
      arr: (val: number[]) => [...val, 3, 4],
      num: (val: number) => val + 10
    };
    const defaults = {
      arr: [1, 2],
      num: 5
    };
    const result = defuArrayFn(base, defaults);

    expect(result.arr).toEqual([1, 2, 3, 4]);
    expect(typeof result.num).toBe("function");
  });
});
