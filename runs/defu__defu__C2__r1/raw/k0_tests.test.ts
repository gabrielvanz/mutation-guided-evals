import { describe, it, expect } from "vitest";
import { defu, createDefu, defuFn, defuArrayFn } from "../../src/defu";

describe("defu", () => {
  it("should merge basic objects", () => {
    const result = defu({ a: 1 }, { b: 2, a: 3 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("should handle multiple arguments", () => {
    const result = defu({ a: 1 }, { b: 2 }, { c: 3, a: 4 });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should ignore null and undefined values in base object", () => {
    const result = defu({ a: undefined, b: null, c: 3 }, { a: 1, b: 2, c: 4 });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should recursively merge plain objects", () => {
    const result = defu(
      { nested: { a: 1, c: 3 } },
      { nested: { a: 2, b: 4 } }
    );
    expect(result).toEqual({ nested: { a: 1, b: 4, c: 3 } });
  });

  it("should concatenate arrays", () => {
    const result = defu({ arr: [3, 4] }, { arr: [1, 2] });
    expect(result).toEqual({ arr: [3, 4, 1, 2] });
  });

  it("should ignore dangerous keys like __proto__ and constructor", () => {
    const payload = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"polluted": true}, "a": 1}');
    const result = defu(payload, { a: 2, b: 3 });
    expect(result).toEqual({ a: 1, b: 3 });
    expect(({} as any).polluted).toBeUndefined();
  });

  it("should handle non-plain object defaults gracefully", () => {
    const result = defu({ a: 1 }, null as any);
    expect(result).toEqual({ a: 1 });
  });
});

describe("createDefu", () => {
  it("should create a custom defu instance with a custom merger", () => {
    const custom = createDefu((object, key, currentValue) => {
      if (key === "special") {
        object[key] = `custom_${currentValue}`;
        return true;
      }
    });

    const result = custom({ special: "value1" }, { special: "value2" });
    expect(result).toEqual({ special: "custom_value1" });
  });
});

describe("defuFn", () => {
  it("should invoke function values when merging", () => {
    const result = defuFn(
      { a: (val: number) => val + 1 },
      { a: 10 }
    );
    expect(result).toEqual({ a: 11 });
  });

  it("should not invoke function if target property is undefined", () => {
    const fn = (val: number) => val + 1;
    const result = defuFn({}, { a: fn });
    expect(result).toEqual({ a: fn });
  });
});

describe("defuArrayFn", () => {
  it("should invoke function only when target is an array", () => {
    const result = defuArrayFn(
      { arr: (val: number[]) => [...val, 3] },
      { arr: [1, 2] }
    );
    expect(result).toEqual({ arr: [1, 2, 3] });
  });

  it("should not invoke function when target is not an array", () => {
    const fn = (val: any) => val;
    const result = defuArrayFn({ arr: fn }, { arr: "not-an-array" });
    expect(result).toEqual({ arr: fn });
  });
});
