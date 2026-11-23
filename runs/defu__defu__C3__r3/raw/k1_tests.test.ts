import { describe, it, expect } from "vitest";
import defu, { createDefu, defuFn, defuArrayFn } from "../../src/defu";

describe("defu", () => {
  it("should merge basic objects", () => {
    const base = { a: 1, b: 2 };
    const defaults = { b: 3, c: 4 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1, b: 2, c: 4 });
  });

  it("should prioritize base object over defaults", () => {
    const result = defu({ a: 1 }, { a: 2, b: 3 });
    expect(result).toEqual({ a: 1, b: 3 });
  });

  it("should handle multiple arguments", () => {
    const result = defu({ a: 1 }, { b: 2 }, { c: 3, a: 10 });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should ignore null and undefined values in base", () => {
    const result = defu({ a: null, b: undefined, c: 1 }, { a: 10, b: 20, c: 30 });
    expect(result).toEqual({ a: 10, b: 20, c: 1 });
  });

  it("should handle non-plain-object defaults gracefully by treating them as empty objects", () => {
    const result = defu({ a: 1, b: 2 }, "not-an-object");
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("should concatenate arrays", () => {
    const result = defu({ a: [3, 4] }, { a: [1, 2] });
    expect(result).toEqual({ a: [3, 4, 1, 2] });
  });

  it("should recursively merge nested objects and track namespace correctly", () => {
    const customMerger = (object: any, key: string, value: any, namespace: string) => {
      if (key === "d") {
        object[key] = `${namespace}:${value}`;
        return true;
      }
    };
    const customDefu = createDefu(customMerger);
    const base = {
      nested: { c: { d: "val" } },
    };
    const defaults = {
      nested: { c: { d: "default" } },
    };
    const result = customDefu(base, defaults);
    expect(result).toEqual({
      nested: { c: { d: "nested.c:val" } },
    });
  });

  it("should ignore __proto__ and constructor keys", () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}, "a": 1}');
    const result = defu(malicious, { b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
    expect({}.polluted).toBeUndefined();
  });
});

describe("createDefu", () => {
  it("should create a custom defu instance with a custom merger", () => {
    const customMerger = (object: any, key: string, value: any) => {
      if (key === "special") {
        object[key] = `custom-${value}`;
        return true;
      }
    };
    const customDefu = createDefu(customMerger);
    const result = customDefu({ special: "value" }, { special: "default" });
    expect(result).toEqual({ special: "custom-value" });
  });
});

describe("defuFn", () => {
  it("should invoke function values with current object value", () => {
    const base = {
      score: (val: number) => val + 10,
    };
    const defaults = {
      score: 5,
    };
    const result = defuFn(base, defaults);
    expect(result).toEqual({ score: 15 });
  });

  it("should not invoke function if default value is undefined", () => {
    const base = {
      score: (val: number) => val + 10,
    };
    const defaults = {};
    const result = defuFn(base, defaults);
    expect(result).toEqual({ score: base.score });
  });
});

describe("defuArrayFn", () => {
  it("should invoke function if default value is an array", () => {
    const base = {
      items: (val: string[]) => [...val, "c"],
    };
    const defaults = {
      items: ["a", "b"],
    };
    const result = defuArrayFn(base, defaults);
    expect(result).toEqual({ items: ["a", "b", "c"] });
  });

  it("should not invoke function if default value is not an array", () => {
    const fn = (val: any) => val;
    const defaults = {
      items: "not-an-array",
    };
    const result = defuArrayFn({ items: fn }, defaults);
    expect(result).toEqual({ items: fn });
  });

  it("should not invoke function if default value is a plain object instead of an array", () => {
    const fn = (val: any) => val;
    const defaults = {
      items: { a: 1 },
    };
    const result = defuArrayFn({ items: fn }, defaults);
    expect(result).toEqual({ items: fn });
  });
});
