import { describe, it, expect } from "vitest";
import defu, {
  createDefu,
  defu as namedDefu,
  defuFn,
  defuArrayFn,
} from "../../src/defu";

describe("defu", () => {
  it("should export defu as both default and named export", () => {
    expect(namedDefu).toBe(defu);
  });

  it("should return an empty object when called with no arguments", () => {
    expect(defu()).toEqual({});
  });

  it("should handle a single object argument", () => {
    expect(defu({ a: 1, b: "hello" })).toEqual({ a: 1, b: "hello" });
  });

  it("should merge basic objects with priority to earlier arguments", () => {
    const cases = [
      {
        input: [{ a: 1 }, { a: 2, b: 3 }],
        expected: { a: 1, b: 3 },
      },
      {
        input: [{ a: 1 }, { b: 2 }, { a: 3, b: 3, c: 4 }],
        expected: { a: 1, b: 2, c: 4 },
      },
      {
        input: [{}, { a: 1 }],
        expected: { a: 1 },
      },
      {
        input: [{ a: 1 }, {}],
        expected: { a: 1 },
      },
    ];

    for (const { input, expected } of cases) {
      expect(defu(...input)).toEqual(expected);
    }
  });

  it("should ignore null and undefined values in source objects", () => {
    const cases = [
      {
        input: [{ a: null, b: undefined }, { a: 1, b: 2 }],
        expected: { a: 1, b: 2 },
      },
      {
        input: [{ a: 0, b: false, c: "" }, { a: 1, b: true, c: "default" }],
        expected: { a: 0, b: false, c: "" },
      },
    ];

    for (const { input, expected } of cases) {
      expect(defu(...input)).toEqual(expected);
    }
  });

  it("should handle non-plain-object defaults", () => {
    expect(defu({ a: 1 }, null as any)).toEqual({ a: 1 });
    expect(defu({ a: 1 }, undefined as any)).toEqual({ a: 1 });
    expect(defu({ a: 1 }, "string" as any)).toEqual({ a: 1 });
    expect(defu({ a: 1 }, 123 as any)).toEqual({ a: 1 });
  });

  it("should concatenate arrays with source items first", () => {
    expect(defu({ items: [1, 2] }, { items: [3, 4] })).toEqual({
      items: [1, 2, 3, 4],
    });
    expect(defu({ items: [] }, { items: [1, 2] })).toEqual({
      items: [1, 2],
    });
  });

  it("should override non-array with array and vice versa", () => {
    expect(defu({ a: [1, 2] }, { a: "not-array" })).toEqual({ a: [1, 2] });
    expect(defu({ a: "not-array" }, { a: [1, 2] })).toEqual({
      a: "not-array",
    });
  });

  it("should merge nested plain objects recursively", () => {
    const result = defu(
      {
        nested: {
          a: 1,
          deep: { x: 10 },
        },
      },
      {
        nested: {
          a: 2,
          b: 3,
          deep: { x: 20, y: 30 },
        },
      },
    );

    expect(result).toEqual({
      nested: {
        a: 1,
        b: 3,
        deep: { x: 10, y: 30 },
      },
    });
  });

  it("should prevent prototype pollution via __proto__ and constructor keys", () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
    const result = defu(malicious, {});

    expect(result).toEqual({});
    expect(({} as any).polluted).toBeUndefined();

    const withConstructor = { constructor: { prototype: { polluted: true } } };
    const result2 = defu(withConstructor, { a: 1 });
    expect(result2).toEqual({ a: 1 });
  });

  it("should not mutate input objects", () => {
    const base = { a: 1, nested: { x: 1 } };
    const defaults = { b: 2, nested: { x: 2, y: 3 } };

    const result = defu(base, defaults);

    expect(result).toEqual({ a: 1, b: 2, nested: { x: 1, y: 3 } });
    expect(base).toEqual({ a: 1, nested: { x: 1 } });
    expect(defaults).toEqual({ b: 2, nested: { x: 2, y: 3 } });
  });
});

describe("createDefu", () => {
  it("should create a custom defu function using the provided merger", () => {
    const customDefu = createDefu((obj, key, value) => {
      if (typeof obj[key] === "number" && typeof value === "number") {
        obj[key] += value;
        return true;
      }
    });

    expect(customDefu({ count: 5, name: "a" }, { count: 10, name: "b" })).toEqual(
      {
        count: 15,
        name: "a",
      },
    );
  });

  it("should pass the correct namespace to the merger", () => {
    const namespaces: string[] = [];
    const customDefu = createDefu((_obj, key, _value, namespace) => {
      namespaces.push(`${namespace}:${key}`);
    });

    customDefu(
      { a: 1, nested: { b: 2, deep: { c: 3 } } },
      { a: 0, nested: { b: 0, deep: { c: 0 } } },
    );

    expect(namespaces).toEqual([
      ":a",
      ":nested",
      "nested:b",
      "nested:deep",
      "nested.deep:c",
    ]);
  });

  it("should fall back to default merge when merger returns falsy", () => {
    const customDefu = createDefu(() => false);

    expect(customDefu({ a: [1] }, { a: [2] })).toEqual({ a: [1, 2] });
  });
});

describe("defuFn", () => {
  it("should invoke function values with the default value when default is defined", () => {
    const result = defuFn(
      {
        count: (v: number) => v + 1,
        items: (arr: number[]) => [...arr, 3],
      },
      {
        count: 10,
        items: [1, 2],
      },
    );

    expect(result).toEqual({
      count: 11,
      items: [1, 2, 3],
    });
  });

  it("should keep function as value when default is undefined", () => {
    const fn = () => "hello";
    const result = defuFn({ fn }, {});

    expect(result.fn).toBe(fn);
  });
});

describe("defuArrayFn", () => {
  it("should invoke function values only when the default value is an array", () => {
    const nonArrayFn = (v: number) => v + 1;
    const result = defuArrayFn(
      {
        items: (arr: number[]) => arr.filter((n) => n > 1),
        count: nonArrayFn,
      },
      {
        items: [1, 2, 3],
        count: 10,
      },
    );

    expect(result.items).toEqual([2, 3]);
    expect(result.count).toBe(nonArrayFn);
  });
});
