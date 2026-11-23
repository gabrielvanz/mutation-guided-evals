import { describe, it, expect } from "vitest";
import { defu, createDefu, defuFn, defuArrayFn } from "../../src/defu";

describe("defu", () => {
  it("should merge basic objects", () => {
    const base = { a: 1, b: 2 };
    const defaults = { b: 3, c: 4 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1, b: 2, c: 4 });
  });

  it("should handle multiple arguments prioritizing earlier ones", () => {
    const result = defu({ a: 1 }, { a: 2, b: 2 }, { b: 3, c: 3 });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should ignore null and undefined values from base", () => {
    const base = { a: null, b: undefined, c: 3 };
    const defaults = { a: 1, b: 2, c: 4 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should concatenate arrays", () => {
    const base = { arr: [1, 2] };
    const defaults = { arr: [3, 4] };
    const result = defu(base, defaults);
    expect(result).toEqual({ arr: [1, 2, 3, 4] });
  });

  it("should recursively merge plain objects", () => {
    const base = { nested: { a: 1 } };
    const defaults = { nested: { b: 2 }, other: 3 };
    const result = defu(base, defaults);
    expect(result).toEqual({ nested: { a: 1, b: 2 }, other: 3 });
  });

  it("should handle non-plain object defaults gracefully", () => {
    const base = { a: 1 };
    const defaults = null;
    const result = defu(base, defaults as any);
    expect(result).toEqual({ a: 1 });
  });

  it("should prevent prototype pollution", () => {
    const base = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}, "a": 1}');
    const defaults = { a: 2 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1 });
    expect(({} as any).polluted).toBeUndefined();
  });
});

describe("createDefu", () => {
  it("should create a custom defu instance with a custom merger", () => {
    const customMerger = (object: any, key: string, currentValue: any) => {
      if (key === "special") {
        object[key] = currentValue * 10;
        return true;
      }
    };
    const customDefu = createDefu(customMerger);
    const result = customDefu({ special: 5, normal: 1 }, { special: 1, normal: 2 });
    expect(result).toEqual({ special: 50, normal: 1 });
  });
});

describe("defuFn", () => {
  it("should merge using functions", () => {
    const base = {
      callback: (val: number) => val + 1,
    };
    const defaults = {
      callback: 10,
    };
    const result = defuFn(base, defaults);
    expect(result).toEqual({ callback: 11 });
  });
});

describe("defuArrayFn", () => {
  it("should execute function when default is an array", () => {
    const base = {
      arr: (val: number[]) => [...val, 3],
    };
    const defaults = {
      arr: [1, 2],
    };
    const result = defuArrayFn(base, defaults);
    expect(result).toEqual({ arr: [1, 2, 3] });
  });

  it("should not execute function when default is not an array", () => {
    const fn = (val: any) => val;
    const base = {
      arr: fn,
    };
    const defaults = {
      arr: "not-an-array",
    };
    const result = defuArrayFn(base, defaults);
    expect(result).toEqual({ arr: fn });
  });
});
