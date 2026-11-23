import { describe, it, expect } from "vitest";
import defu, { createDefu, defuFn, defuArrayFn } from "../../src/defu";

describe("defu", () => {
  it("should assign default values when properties are missing", () => {
    const base = { a: 1 };
    const defaults = { a: 2, b: 3 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1, b: 3 });
  });

  it("should handle multiple arguments", () => {
    const result = defu({ a: 1 }, { b: 2 }, { c: 3 });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should concatenate arrays", () => {
    const base = { arr: [3, 4] };
    const defaults = { arr: [1, 2] };
    const result = defu(base, defaults);
    expect(result).toEqual({ arr: [3, 4, 1, 2] });
  });

  it("should deep merge plain objects", () => {
    const base = { obj: { x: 1 } };
    const defaults = { obj: { y: 2, x: 99 } };
    const result = defu(base, defaults);
    expect(result).toEqual({ obj: { x: 1, y: 2 } });
  });

  it("should ignore null and undefined values in base object", () => {
    const base = { a: null, b: undefined, c: 5 };
    const defaults = { a: 1, b: 2, c: 3 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1, b: 2, c: 5 });
  });

  it("should ignore prototype pollution keys", () => {
    const base = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}, "a": 1}');
    const defaults = { a: 2, b: 3 };
    const result = defu(base, defaults);
    expect(result).toEqual({ a: 1, b: 3 });
    expect({}.polluted).toBeUndefined();
  });

  it("should fallback defaults if defaults is not a plain object", () => {
    const base = { a: 1 };
    const result = defu(base, null as any);
    expect(result).toEqual({ a: 1 });
  });

  it("should allow creating custom defu with merger", () => {
    const customDefu = createDefu((object, key, value) => {
      if (key === "special") {
        object[key] = "custom-" + value;
        return true;
      }
    });
    const result = customDefu({ special: "base" }, { special: "default" });
    expect(result).toEqual({ special: "custom-base" });
  });

  describe("defuFn", () => {
    it("should invoke function values with current value", () => {
      const base = {
        val: (val: number) => val + 10,
      };
      const defaults = { val: 5 };
      const result = defuFn(base, defaults);
      expect(result).toEqual({ val: 15 });
    });
  });

  describe("defuArrayFn", () => {
    it("should invoke function values only when target is an array", () => {
      const fn = (val: number) => val + 1;
      const base = {
        arr: (val: number[]) => [...val, 3],
        notArr: fn,
      };
      const defaults = {
        arr: [1, 2],
        notArr: 10,
      };
      const result = defuArrayFn(base, defaults);
      expect(result).toEqual({
        arr: [1, 2, 3],
        notArr: fn,
      });
    });
  });
});
