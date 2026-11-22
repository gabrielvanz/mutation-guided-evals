import { describe, it, expect } from "vitest";
import defu, {
  defu as namedDefu,
  createDefu,
  defuFn,
  defuArrayFn,
} from "../../src/defu";

describe("defu", () => {
  it("should export defu as both default and named export", () => {
    expect(namedDefu).toBe(defu);
  });

  const cases = [
    {
      name: "empty arguments",
      args: [],
      expected: {},
    },
    {
      name: "single object",
      args: [{ a: 1, b: "hello" }],
      expected: { a: 1, b: "hello" },
    },
    {
      name: "basic defaults",
      args: [{ a: 1 }, { a: 2, b: 2 }],
      expected: { a: 1, b: 2 },
    },
    {
      name: "multiple defaults with priority left to right",
      args: [{ a: 1 }, { a: 2, b: 2 }, { a: 3, b: 3, c: 3 }],
      expected: { a: 1, b: 2, c: 3 },
    },
    {
      name: "nested objects",
      args: [
        { a: { b: 1, c: { d: 1 } } },
        { a: { b: 2, c: { d: 2, e: 2 }, f: 2 } },
      ],
      expected: { a: { b: 1, c: { d: 1, e: 2 }, f: 2 } },
    },
    {
      name: "array concatenation",
      args: [{ arr: [1, 2] }, { arr: [3, 4] }],
      expected: { arr: [1, 2, 3, 4] },
    },
    {
      name: "null and undefined values in source do not override defaults",
      args: [
        { a: null, b: undefined, c: 0, d: false, e: "" },
        { a: 1, b: 2, c: 3, d: true, e: "default" },
      ],
      expected: { a: 1, b: 2, c: 0, d: false, e: "" },
    },
    {
      name: "non-plain object defaults are ignored",
      args: [{ a: 1 }, null, undefined, "string", 42],
      expected: { a: 1 },
    },
    {
      name: "array vs non-array overrides default",
      args: [{ a: [1, 2], b: "str" }, { a: "not-array", b: [3, 4] }],
      expected: { a: [1, 2], b: "str" },
    },
  ];

  it.each(cases)("should handle $name", ({ args, expected }) => {
    expect(defu(...args)).toEqual(expected);
  });

  it("should ignore __proto__ and constructor keys", () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
    const result = defu(malicious, { a: 1 });

    expect(result).toEqual({ a: 1 });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    const withConstructor = { constructor: { prototype: { polluted: true } }, a: 1 };
    const result2 = defu(withConstructor, { b: 2 });
    expect(result2).toEqual({ a: 1, b: 2 });
  });

  it("should not mutate input objects", () => {
    const source = { a: { b: 1 }, arr: [1] };
    const defaults = { a: { b: 2, c: 3 }, arr: [2] };

    const result = defu(source, defaults);

    expect(result).toEqual({ a: { b: 1, c: 3 }, arr: [1, 2] });
    expect(source).toEqual({ a: { b: 1 }, arr: [1] });
    expect(defaults).toEqual({ a: { b: 2, c: 3 }, arr: [2] });
  });
});

describe("createDefu", () => {
  it("should allow custom merger to override merge behavior", () => {
    const customDefu = createDefu((obj, key, value) => {
      if (typeof obj[key] === "number" && typeof value === "number") {
        obj[key] += value;
        return true;
      }
    });

    expect(customDefu({ a: 2, b: "x" }, { a: 3, b: "y", c: 1 })).toEqual({
      a: 5,
      b: "x",
      c: 1,
    });
  });

  it("should fall back to default merge when merger returns falsy", () => {
    const customDefu = createDefu(() => false);

    expect(customDefu({ a: 1, arr: [1] }, { a: 2, b: 3, arr: [2] })).toEqual({
      a: 1,
      b: 3,
      arr: [1, 2],
    });
  });

  it("should pass nested namespace to merger", () => {
    const namespaces: string[] = [];
    const customDefu = createDefu((_obj, key, _value, namespace) => {
      namespaces.push(namespace ? `${namespace}.${key}` : key);
      return false;
    });

    customDefu({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } });

    expect(namespaces).toContain("a");
    expect(namespaces).toContain("a.b");
    expect(namespaces).toContain("a.b.c");
  });
});

describe("defuFn", () => {
  it("should call function when default value is defined", () => {
    const result = defuFn(
      {
        count: (val: number) => val + 1,
        nested: {
          items: (arr: string[]) => [...arr, "b"],
        },
      },
      {
        count: 10,
        nested: {
          items: ["a"],
        },
      },
    );

    expect(result).toEqual({
      count: 11,
      nested: {
        items: ["a", "b"],
      },
    });
  });

  it("should keep function as value when default is undefined", () => {
    const fn = (val: number) => val + 1;
    const result = defuFn({ fn }, {});

    expect(result.fn).toBe(fn);
  });
});

describe("defuArrayFn", () => {
  it("should call function only when default value is an array", () => {
    const fn = (val: number) => val + 1;
    const result = defuArrayFn(
      {
        arr: (items: number[]) => items.map((x) => x * 2),
        num: fn,
      },
      {
        arr: [1, 2, 3],
        num: 10,
      },
    );

    expect(result).toEqual({
      arr: [2, 4, 6],
      num: fn,
    });
  });
});
