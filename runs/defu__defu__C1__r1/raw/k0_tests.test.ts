import { describe, it, expect } from "vitest";
import defuDefault, { defu, createDefu, defuFn, defuArrayFn } from "../../src/defu";

describe("defu", () => {
  it("exports defu as both named and default export", () => {
    expect(defuDefault).toBe(defu);
  });

  it("merges basic objects with left-most priority", () => {
    const result = defu({ a: 1 }, { a: 2, b: 3 });
    expect(result).toEqual({ a: 1, b: 3 });
  });

  it("merges multiple objects in order of priority", () => {
    const result = defu({ a: 1 }, { a: 2, b: 2 }, { a: 3, b: 3, c: 3 });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("ignores null and undefined values in source", () => {
    const result = defu(
      { a: null, b: undefined, c: 0, d: false, e: "" },
      { a: 1, b: 2, c: 3, d: true, e: "default" },
    );
    expect(result).toEqual({ a: 1, b: 2, c: 0, d: false, e: "" });
  });

  it("recursively merges nested plain objects", () => {
    const result = defu(
      { nested: { a: 1, deep: { x: 10 } } },
      { nested: { a: 2, b: 3, deep: { x: 20, y: 30 } } },
    );
    expect(result).toEqual({
      nested: { a: 1, b: 3, deep: { x: 10, y: 30 } },
    });
  });

  it("concatenates arrays with source elements first", () => {
    const result = defu({ arr: [1, 2] }, { arr: [3, 4] });
    expect(result).toEqual({ arr: [1, 2, 3, 4] });
  });

  it("overwrites non-array with array and vice versa", () => {
    expect(defu({ a: [1, 2] }, { a: "str" })).toEqual({ a: [1, 2] });
    expect(defu({ a: "str" }, { a: [1, 2] })).toEqual({ a: "str" });
  });

  it("handles non-plain-object defaults gracefully", () => {
    expect(defu({ a: 1 }, null as any)).toEqual({ a: 1 });
    expect(defu({ a: 1 }, undefined as any)).toEqual({ a: 1 });
    expect(defu({ a: 1 }, 42 as any)).toEqual({ a: 1 });
  });

  it("does not mutate input objects", () => {
    const source = { a: 1, nested: { x: 1 } };
    const defaults = { a: 2, b: 3, nested: { x: 2, y: 2 } };
    const result = defu(source, defaults);

    expect(result).toEqual({ a: 1, b: 3, nested: { x: 1, y: 2 } });
    expect(source).toEqual({ a: 1, nested: { x: 1 } });
    expect(defaults).toEqual({ a: 2, b: 3, nested: { x: 2, y: 2 } });
  });

  it("prevents prototype pollution via __proto__ and constructor", () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"polluted": true}}');
    const result = defu(malicious, { safe: true });

    expect(result).toEqual({ safe: true });
    expect(({} as any).polluted).toBeUndefined();
  });
});

describe("createDefu", () => {
  it("uses custom merger and passes correct namespace", () => {
    const namespaces: string[] = [];
    const customDefu = createDefu((obj, key, value, namespace) => {
      namespaces.push(namespace ? `${namespace}.${key}` : key);
      if (typeof obj[key] === "number" && typeof value === "number") {
        obj[key] += value;
        return true;
      }
    });

    const result = customDefu(
      { count: 5, nested: { score: 10 } },
      { count: 3, nested: { score: 20, extra: 1 } },
    );

    expect(result).toEqual({ count: 8, nested: { score: 30, extra: 1 } });
    expect(namespaces).toEqual(["count", "nested", "nested.score"]);
  });
});

describe("defuFn", () => {
  it("calls function with default value when default is defined", () => {
    const result = defuFn(
      {
        count: (val: number) => val * 2,
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

  it("keeps function as-is when default is undefined", () => {
    const fn = () => "hello";
    const result = defuFn({ fn }, {});
    expect(result.fn).toBe(fn);
  });
});

describe("defuArrayFn", () => {
  it("calls function only when default value is an array", () => {
    const nonArrayFn = (val: number) => val + 1;
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
