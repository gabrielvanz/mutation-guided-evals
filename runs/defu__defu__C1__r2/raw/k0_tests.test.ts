import { describe, it, expect } from "vitest";
import defuDefault, {
  defu,
  createDefu,
  defuFn,
  defuArrayFn,
} from "../../src/defu";

describe("defu", () => {
  it("exports defu as both named and default export", () => {
    expect(defuDefault).toBe(defu);
  });

  it("merges objects with defaults without mutating inputs", () => {
    const source = { a: 1, b: undefined as number | undefined };
    const defaults = { a: 2, b: 3, c: 4 };

    const result = defu(source, defaults);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
    expect(source).toEqual({ a: 1, b: undefined });
    expect(defaults).toEqual({ a: 2, b: 3, c: 4 });
  });

  it("supports multiple default arguments in order of priority", () => {
    const result = defu({ a: 1 }, { a: 2, b: 2 }, { a: 3, b: 3, c: 3 });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("ignores null and undefined values in source", () => {
    const result = defu(
      { a: null, b: undefined, c: 0, d: false, e: "" },
      { a: "defaultA", b: "defaultB", c: 1, d: true, e: "defaultE" },
    );
    expect(result).toEqual({
      a: "defaultA",
      b: "defaultB",
      c: 0,
      d: false,
      e: "",
    });
  });

  it("handles non-plain-object defaults gracefully", () => {
    const result = defu({ a: 1 }, null as any, undefined as any, "str" as any);
    expect(result).toEqual({ a: 1 });
  });

  it("deeply merges nested plain objects", () => {
    const result = defu(
      { nested: { a: 1, deep: { x: 10 } } },
      { nested: { a: 2, b: 3, deep: { x: 20, y: 30 } } },
    );
    expect(result).toEqual({
      nested: { a: 1, b: 3, deep: { x: 10, y: 30 } },
    });
  });

  it("concatenates arrays with source items before default items", () => {
    const result = defu({ items: [1, 2] }, { items: [3, 4] });
    expect(result).toEqual({ items: [1, 2, 3, 4] });
  });

  it("overwrites non-array default with array source and vice versa", () => {
    expect(defu({ a: [1, 2] }, { a: "not-array" })).toEqual({ a: [1, 2] });
    expect(defu({ a: "not-array" }, { a: [1, 2] })).toEqual({
      a: "not-array",
    });
  });

  it("skips __proto__ and constructor keys to prevent prototype pollution", () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
    const withConstructor = { constructor: { prototype: { polluted: true } } };

    const result1 = defu(malicious, {});
    const result2 = defu(withConstructor, {});

    expect(({} as any).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(result1, "__proto__")).toBe(
      false,
    );
    expect(
      Object.prototype.hasOwnProperty.call(result2, "constructor"),
    ).toBe(false);
  });
});

describe("createDefu", () => {
  it("uses custom merger and passes namespace", () => {
    const namespaces: string[] = [];
    const customDefu = createDefu((obj, key, value, namespace) => {
      namespaces.push(namespace ? `${namespace}.${key}` : key);
      if (typeof obj[key] === "number" && typeof value === "number") {
        obj[key] += value;
        return true;
      }
    });

    const result = customDefu(
      { count: 2, nested: { count: 3 } },
      { count: 5, nested: { count: 7 } },
    );

    expect(result).toEqual({ count: 7, nested: { count: 10 } });
    expect(namespaces).toContain("count");
    expect(namespaces).toContain("nested");
    expect(namespaces).toContain("nested.count");
  });
});

describe("defuFn", () => {
  it("calls function values with the default value when default is defined", () => {
    const result = defuFn(
      {
        count: (v: number) => v * 2,
        items: (arr: string[]) => [...arr, "c"],
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

  it("assigns the function itself when default is undefined", () => {
    const fn = (v: number) => v + 1;
    const result = defuFn({ fn }, {});
    expect(result.fn).toBe(fn);
  });
});

describe("defuArrayFn", () => {
  it("calls function values only when the default value is an array", () => {
    const nonArrayFn = (v: number) => v * 2;
    const result = defuArrayFn(
      {
        items: (arr: number[]) => arr.filter((n) => n > 1),
        count: nonArrayFn,
      },
      {
        items: [1, 2, 3],
        count: 5,
      },
    );

    expect(result.items).toEqual([2, 3]);
    expect(result.count).toBe(nonArrayFn);
  });
});
