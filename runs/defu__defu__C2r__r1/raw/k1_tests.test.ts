import { describe, it, expect } from "vitest";
import { defu, createDefu, defuFn, defuArrayFn } from "../../src/defu";

describe("defu", () => {
  it("should return an empty object when called with no arguments", () => {
    expect(defu()).toEqual({});
  });

  it("should merge basic objects with priority to the first argument", () => {
    const cases = [
      {
        input: [{ a: 1 }, { a: 2, b: 2 }],
        expected: { a: 1, b: 2 },
      },
      {
        input: [{ a: 1 }, { b: 2 }, { c: 3 }],
        expected: { a: 1, b: 2, c: 3 },
      },
      {
        input: [{ a: 1 }, { a: 2 }, { a: 3, b: 4 }],
        expected: { a: 1, b: 4 },
      },
    ];

    for (const { input, expected } of cases) {
      expect(defu(...input)).toEqual(expected);
    }
  });

  it("should ignore null and undefined values in the base object", () => {
    const result = defu(
      { a: null, b: undefined, c: 0, d: false, e: "" },
      { a: 1, b: 2, c: 3, d: true, e: "default" },
    );
    expect(result).toEqual({ a: 1, b: 2, c: 0, d: false, e: "" });
  });

  it("should concatenate arrays from base object and defaults", () => {
    const result = defu({ items: [1, 2] }, { items: [3, 4] });
    expect(result).toEqual({ items: [1, 2, 3, 4] });
  });

  it("should recursively merge nested plain objects", () => {
    const result = defu(
      { nested: { a: 1, deep: { x: 10 } } },
      { nested: { a: 2, b: 3, deep: { x: 20, y: 30 } } },
    );
    expect(result).toEqual({
      nested: { a: 1, b: 3, deep: { x: 10, y: 30 } },
    });
  });

  it("should handle non-plain-object defaults gracefully", () => {
    expect(defu({ a: 1 }, null as any)).toEqual({ a: 1 });
    expect(defu({ a: 1 }, "string" as any)).toEqual({ a: 1 });
    expect(defu({ a: 1 }, 42 as any)).toEqual({ a: 1 });
  });

  it("should ignore __proto__ and constructor keys", () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"x": 1}, "safe": 1}');
    const result = defu(malicious, { safe: 2 });
    expect(result).toEqual({ safe: 1 });
    expect(({} as any).polluted).toBeUndefined();
  });
});

describe("createDefu", () => {
  it("should support a custom merger function with namespace", () => {
    const namespaces: string[] = [];
    const customDefu = createDefu((obj, key, value, namespace) => {
      namespaces.push(namespace ? `${namespace}.${String(key)}` : String(key));
      if (typeof obj[key] === "number" && typeof value === "number") {
        obj[key] = obj[key] + value;
        return true;
      }
    });

    const result = customDefu(
      { count: 2, nested: { score: 5 } },
      { count: 3, nested: { score: 10 } },
    );

    expect(result).toEqual({ count: 5, nested: { score: 15 } });
    expect(namespaces).toEqual(["count", "nested", "nested.score"]);
  });
});

describe("defuFn", () => {
  it("should invoke function values with the default value when defined", () => {
    const result = defuFn(
      {
        count: (val: number) => val + 5,
        items: (arr: number[]) => arr.filter((n) => n > 1),
      },
      {
        count: 10,
        items: [1, 2, 3],
      },
    );

    expect(result).toEqual({ count: 15, items: [2, 3] });
  });

  it("should keep the function as value when default is undefined", () => {
    const fn = (val: number) => val + 1;
    const result = defuFn({ fn }, {});
    expect(result.fn).toBe(fn);
  });
});

describe("defuArrayFn", () => {
  it("should invoke function values only when the default value is an array", () => {
    const fn = (val: number) => val + 1;
    const result = defuArrayFn(
      {
        items: (arr: number[]) => arr.map((n) => n * 2),
        notAnArray: fn,
      },
      {
        items: [1, 2, 3],
        notAnArray: 10,
      },
    );

    expect(result.items).toEqual([2, 4, 6]);
    expect(result.notAnArray).toBe(fn);
  });
});
