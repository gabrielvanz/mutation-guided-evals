import { describe, it, expect } from "vitest";
import { defu, createDefu, defuFn, defuArrayFn } from "../../src/defu";

describe("defu", () => {
  it("should return an empty object when called with no arguments", () => {
    expect(defu()).toEqual({});
  });

  it("should merge objects with priority to the first argument", () => {
    const cases = [
      {
        input: [{ a: 1 }, { a: 2, b: 3 }],
        expected: { a: 1, b: 3 },
      },
      {
        input: [{ a: "override" }, { a: "default", b: "keep" }],
        expected: { a: "override", b: "keep" },
      },
      {
        input: [{ a: false }, { a: true }],
        expected: { a: false },
      },
      {
        input: [{ a: 0 }, { a: 1 }],
        expected: { a: 0 },
      },
      {
        input: [{ a: "" }, { a: "default" }],
        expected: { a: "" },
      },
    ];

    for (const { input, expected } of cases) {
      expect(defu(input[0], input[1])).toEqual(expected);
    }
  });

  it("should ignore null and undefined values in the base object", () => {
    expect(defu({ a: null, b: undefined, c: 3 }, { a: 1, b: 2, c: 4 })).toEqual({
      a: 1,
      b: 2,
      c: 3,
    });
  });

  it("should recursively merge nested plain objects", () => {
    expect(
      defu(
        { a: { b: { c: 1 } }, d: { x: 10 } },
        { a: { b: { c: 2, d: 3 }, e: 4 }, d: { y: 20 } },
      ),
    ).toEqual({
      a: { b: { c: 1, d: 3 }, e: 4 },
      d: { x: 10, y: 20 },
    });
  });

  it("should concatenate arrays with base values first", () => {
    expect(defu({ arr: [1, 2] }, { arr: [3, 4] })).toEqual({
      arr: [1, 2, 3, 4],
    });
  });

  it("should support multiple default objects", () => {
    expect(defu({ a: 1 }, { b: 2 }, { a: 10, b: 20, c: 30 })).toEqual({
      a: 1,
      b: 2,
      c: 30,
    });
  });

  it("should handle non-plain defaults by treating them as empty objects", () => {
    expect(defu({ a: 1 }, null as any)).toEqual({ a: 1 });
    expect(defu({ a: 1 }, undefined as any)).toEqual({ a: 1 });
    expect(defu({ a: 1 }, "invalid" as any)).toEqual({ a: 1 });
  });

  it("should overwrite non-plain objects instead of merging them", () => {
    const date1 = new Date("2024-01-01");
    const date2 = new Date("2025-01-01");
    expect(defu({ date: date1 }, { date: date2 })).toEqual({ date: date1 });
  });

  it("should ignore __proto__ and constructor keys to prevent prototype pollution", () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
    const result = defu(malicious, { safe: true });
    expect(result).toEqual({ safe: true });
    expect(({} as any).polluted).toBeUndefined();

    const withConstructor = { constructor: { prototype: { polluted: true } }, a: 1 };
    expect(defu(withConstructor, { b: 2 })).toEqual({ a: 1, b: 2 });
  });
});

describe("createDefu", () => {
  it("should behave like defu when called without a merger", () => {
    const customDefu = createDefu();
    expect(customDefu({ a: 1 }, { a: 2, b: 3 })).toEqual({ a: 1, b: 3 });
  });

  it("should use a custom merger when provided", () => {
    const addMerger = createDefu((obj, key, value) => {
      if (typeof obj[key] === "number" && typeof value === "number") {
        obj[key] += value;
        return true;
      }
    });

    expect(addMerger({ a: 10, b: "x" }, { a: 5, b: "y", c: 1 })).toEqual({
      a: 15,
      b: "x",
      c: 1,
    });
  });

  it("should pass the nested namespace to the custom merger", () => {
    const namespaces: string[] = [];
    const spyDefu = createDefu((_obj, key, _value, namespace) => {
      namespaces.push(namespace ? `${namespace}.${String(key)}` : String(key));
      return false;
    });

    spyDefu({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } });
    expect(namespaces).toEqual(["a", "a.b", "a.b.c"]);
  });
});

describe("defuFn", () => {
  it("should invoke function values with the default value when default is defined", () => {
    expect(
      defuFn(
        {
          count: (val: number) => val * 2,
          items: (arr: string[]) => [...arr, "c"],
        },
        {
          count: 5,
          items: ["a", "b"],
        },
      ),
    ).toEqual({
      count: 10,
      items: ["a", "b", "c"],
    });
  });

  it("should keep the function when the default value is undefined", () => {
    const fn = () => 42;
    expect(defuFn({ fn }, {})).toEqual({ fn });
  });
});

describe("defuArrayFn", () => {
  it("should invoke function values only when the default value is an array", () => {
    const nonArrayFn = () => "should-not-run";
    expect(
      defuArrayFn(
        {
          items: (arr: number[]) => arr.map((n) => n * 2),
          other: nonArrayFn,
        },
        {
          items: [1, 2, 3],
          other: "default",
        },
      ),
    ).toEqual({
      items: [2, 4, 6],
      other: nonArrayFn,
    });
  });
});
