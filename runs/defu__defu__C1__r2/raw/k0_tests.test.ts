import { describe, it, expect } from "vitest";
import defu, { createDefu, defuFn, defuArrayFn } from "../../src/defu";

describe("defu", () => {
  it("should assign default values when properties are missing", () => {
    const base = { a: 1 };
    const defaults = { a: 2, b: 3 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1, b: 3 });
  });

  it("should merge nested plain objects recursively", () => {
    const base = { user: { name: "John" } };
    const defaults = { user: { name: "Default", age: 30 } };
    const result = defu(base, defaults);
    expect(result).toEqual({ user: { name: "John", age: 30 } });
  });

  it("should concatenate arrays", () => {
    const base = { tags: ["b", "c"] };
    const defaults = { tags: ["a"] };
    const result = defu(base, defaults);
    expect(result).toEqual({ tags: ["b", "c", "a"] });
  });

  it("should support multiple arguments", () => {
    const result = defu({ a: 1 }, { b: 2 }, { c: 3, a: 10 });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should ignore null and undefined values in base object", () => {
    const base = { a: null, b: undefined, c: 2 };
    const defaults = { a: 10, b: 20, c: 30 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 10, b: 20, c: 2 });
  });

  it("should ignore prototype pollution keys", () => {
    const base = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}, "a": 1}');
    const defaults = { a: 2, b: 3 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1, b: 3 });
    expect({}.polluted).toBeUndefined();
  });

  it("should handle non-plain object defaults gracefully", () => {
    const base = { a: 1 };
    const result = defu(base, null as any);
    expect(result).toEqual({ a: 1 });
  });

  it("should support createDefu with custom merger", () => {
    const customDefu = createDefu((object, key, value) => {
      if (key === "custom") {
        object[key] = "merged-" + value;
        return true;
      }
    });
    const result = customDefu({ custom: "base" }, { custom: "default" });
    expect(result).toEqual({ custom: "merged-base" });
  });

  it("should support defuFn with function merging", () => {
    const base = {
      val: (existing: number) => existing + 5,
    };
    const defaults = {
      val: 10,
    };
    const result = defuFn(base, defaults);
    expect(result).toEqual({ val: 15 });
  });

  it("should support defuArrayFn with array function merging", () => {
    const base = {
      items: (existing: string[]) => [...existing, "c"],
    };
    const defaults = {
      items: ["a", "b"],
    };
    const result = defuArrayFn(base, defaults);
    expect(result).toEqual({ items: ["a", "b", "c"] });
  });
});
