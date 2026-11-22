import { describe, it, expect } from "vitest";
import { defu, createDefu, defuFn, defuArrayFn } from "../../src/defu";

describe("defu", () => {
  it("should copy defaults when base object is empty", () => {
    expect(defu({}, { a: 1, b: "x" })).toEqual({ a: 1, b: "x" });
  });

  it("should prioritize base object properties over defaults", () => {
    expect(defu({ a: 1 }, { a: 2, b: 3 })).toEqual({ a: 1, b: 3 });
  });

  it("should ignore null and undefined values in base object", () => {
    const cases = [
      {
        input: [{ a: null, b: undefined, c: 0, d: false, e: "" }, { a: 1, b: 2, c: 3, d: true, e: "x" }],
        expected: { a: 1, b: 2, c: 0, d: false, e: "" },
      },
      {
        input: [{ a: null }, { a: undefined }],
        expected: { a: undefined },
      },
    ];

    for (const { input, expected } of cases) {
      expect(defu(input[0], input[1])).toEqual(expected);
    }
  });

  it("should recursively merge nested plain objects", () => {
    const result = defu(
      { a: { b: 1, d: { e: 2 } } },
      { a: { b: 10, c: 20, d: { e: 30, f: 40 } } },
    );

    expect(result).toEqual({
      a: {
        b: 1,
        c: 20,
        d: {
          e: 2,
          f: 40,
        },
      },
    });
  });

  it("should concatenate arrays with base object items first", () => {
    expect(defu({ arr: [1, 2] }, { arr: [3, 4] })).toEqual({
      arr: [1, 2, 3, 4],
    });
  });

  it("should overwrite non-array with array and vice versa", () => {
    expect(defu({ a: [1, 2] }, { a: "str" })).toEqual({ a: [1, 2] });
    expect(defu({ a: "str" }, { a: [1, 2] })).toEqual({ a: "str" });
  });

  it("should support multiple arguments in priority order", () => {
    expect(defu({ a: 1 }, { a: 2, b: 2 }, { b: 3, c: 3 })).toEqual({
      a: 1,
      b: 2,
      c: 3,
    });
  });

  it("should return empty object when called with no arguments", () => {
    expect(defu()).toEqual({});
  });

  it("should handle non-plain-object defaults gracefully", () => {
    expect(defu({ a: 1 }, null as any)).toEqual({ a: 1 });
    expect(defu({ a: 1 }, undefined as any)).toEqual({ a: 1 });
    expect(defu({ a: 1 }, "string" as any)).toEqual({ a: 1 });
  });

  it("should ignore __proto__ and constructor keys", () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"x": 1}, "safe": 1}');
    const result = defu(malicious, { safe: 2, other: 3 });

    expect(result).toEqual({ safe: 1, other: 3 });
    expect(({} as any).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(result, "constructor")).toBe(false);
  });

  it("should not mutate input objects", () => {
    const base = { a: { x: 1 }, arr: [1] };
    const defaults = { a: { y: 2 }, arr: [2] };

    const result = defu(base, defaults);

    expect(result).toEqual({ a: { x: 1, y: 2 }, arr: [1, 2] });
    expect(base).toEqual({ a: { x: 1 }, arr: [1] });
    expect(defaults).toEqual({ a: { y: 2 }, arr: [2] });
  });
});

describe("createDefu", () => {
  it("should allow custom merger function", () => {
    const custom = createDefu((obj, key, value) => {
      if (typeof obj[key] === "number" && typeof value === "number") {
        obj[key] += value;
        return true;
      }
    });

    expect(custom({ a: 2, b: "x" }, { a: 3, b: "y", c: 10 })).toEqual({
      a: 5,
      b: "x",
      c: 10,
    });
  });

  it("should pass namespace to custom merger", () => {
    const namespaces: string[] = [];
    const custom = createDefu((_obj, key, _value, namespace) => {
      namespaces.push(`${namespace}:${key}`);
    });

    custom({ a: { b: 1 } }, { a: { b: 2 } });

    expect(namespaces).toEqual([":a", "a:b"]);
  });
});

describe("defuFn", () => {
  it("should call function in base object with default value when default is defined", () => {
    const result = defuFn(
      {
        count: (val: number) => val * 2,
        items: (val: string[]) => [...val, "c"],
      },
      {
        count: 5,
        items: ["a", "b"],
      },
    );

    expect(result).toEqual({
      count: 10,
      items: ["a", "b", "c"],
    });
  });

  it("should keep function as value when default is undefined", () => {
    const fn = () => 42;
    const result = defuFn({ fn }, {});

    expect(result.fn).toBe(fn);
  });
});

describe("defuArrayFn", () => {
  it("should call function in base object only when default is an array", () => {
    const fn = (val: number) => val + 1;
    const result = defuArrayFn(
      {
        arr: (val: number[]) => val.filter((x) => x > 1),
        num: fn,
      },
      {
        arr: [1, 2, 3],
        num: 10,
      },
    );

    expect(result.arr).toEqual([2, 3]);
    expect(result.num).toBe(fn);
  });
});
