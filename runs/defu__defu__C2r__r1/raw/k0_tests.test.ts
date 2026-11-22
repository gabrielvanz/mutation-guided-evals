import { describe, it, expect } from "vitest";
import defu, {
  createDefu,
  defu as namedDefu,
  defuFn,
  defuArrayFn,
} from "../../src/defu";

describe("defu", () => {
  it("should export defu as both default and named export", () => {
    expect(defu).toBe(namedDefu);
  });

  it("should return an empty object when called with no arguments", () => {
    expect(defu()).toEqual({});
  });

  const basicCases = [
    {
      name: "should merge simple objects with source taking priority",
      args: [{ a: 1 }, { a: 2, b: 3 }],
      expected: { a: 1, b: 3 },
    },
    {
      name: "should merge multiple objects in priority order",
      args: [{ a: 1 }, { a: 2, b: 2 }, { b: 3, c: 3 }],
      expected: { a: 1, b: 2, c: 3 },
    },
    {
      name: "should merge nested plain objects recursively",
      args: [
        { a: { b: 1 } },
        { a: { b: 2, c: 3 }, d: 4 },
      ],
      expected: { a: { b: 1, c: 3 }, d: 4 },
    },
    {
      name: "should concatenate arrays with source items first",
      args: [{ items: [1, 2] }, { items: [3, 4] }],
      expected: { items: [1, 2, 3, 4] },
    },
    {
      name: "should ignore null and undefined values in source",
      args: [{ a: null, b: undefined, c: 0, d: false, e: "" }, { a: 1, b: 2, c: 3, d: true, e: "x" }],
      expected: { a: 1, b: 2, c: 0, d: false, e: "" },
    },
    {
      name: "should handle non-plain-object defaults by falling back to empty object",
      args: [{ a: 1 }, null as any, undefined as any, "invalid" as any],
      expected: { a: 1 },
    },
    {
      name: "should overwrite non-array with array and vice versa",
      args: [{ a: [1], b: "text" }, { a: "text", b: [2] }],
      expected: { a: [1], b: "text" },
    },
  ];

  for (const { name, args, expected } of basicCases) {
    it(name, () => {
      expect(defu(...args)).toEqual(expected);
    });
  }

  it("should ignore __proto__ and constructor keys to prevent prototype pollution", () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
    const withConstructor = { constructor: { prototype: { polluted: true } } };

    const result = defu(malicious, withConstructor, { safe: true });

    expect(result).toEqual({ safe: true });
    expect(({} as any).polluted).toBeUndefined();
  });
});

describe("createDefu", () => {
  it("should use custom merger when provided", () => {
    const customDefu = createDefu((object, key, value) => {
      if (typeof value === "number" && typeof object[key] === "number") {
        object[key] = object[key] + value;
        return true;
      }
    });

    expect(customDefu({ count: 5, label: "a" }, { count: 10, label: "b" })).toEqual({
      count: 15,
      label: "a",
    });
  });

  it("should pass namespace to custom merger for nested objects", () => {
    const namespaces: string[] = [];
    const trackingDefu = createDefu((_object, key, _value, namespace) => {
      namespaces.push(`${namespace}:${key}`);
      return false;
    });

    trackingDefu({ a: { b: 1 } }, { a: { b: 2 } });

    expect(namespaces).toEqual([":a", "a:b"]);
  });
});

describe("defuFn", () => {
  it("should call function in source with default value when default is defined", () => {
    const result = defuFn(
      {
        count: (val: number) => val + 5,
        nested: {
          items: (arr: string[]) => [...arr, "c"],
        },
      },
      {
        count: 10,
        nested: {
          items: ["a", "b"],
        },
      },
    );

    expect(result).toEqual({
      count: 15,
      nested: {
        items: ["a", "b", "c"],
      },
    });
  });

  it("should keep function as value when default is undefined", () => {
    const fn = () => "hello";
    const result = defuFn({ fn }, {});

    expect(result.fn).toBe(fn);
  });
});

describe("defuArrayFn", () => {
  it("should call function in source when default value is an array", () => {
    const result = defuArrayFn(
      {
        items: (arr: number[]) => arr.filter((n) => n > 1),
      },
      {
        items: [1, 2, 3],
      },
    );

    expect(result).toEqual({
      items: [2, 3],
    });
  });

  it("should not call function when default value is not an array", () => {
    const fn = () => "not-called";
    const result = defuArrayFn({ value: fn }, { value: "string-default" });

    expect(result.value).toBe(fn);
  });
});
