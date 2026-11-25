import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("parseQuery", () => {
  it("should parse standard query strings", () => {
    const cases = [
      { input: "foo=bar&baz=qux", expected: { foo: "bar", baz: "qux" } },
      { input: "?foo=bar&baz=qux", expected: { foo: "bar", baz: "qux" } },
      { input: "", expected: {} },
      { input: "?", expected: {} },
      { input: "foo=bar=baz", expected: { foo: "bar=baz" } },
      { input: "foo", expected: { foo: "" } },
      { input: "foo=&bar=baz", expected: { foo: "", bar: "baz" } },
    ];

    for (const { input, expected } of cases) {
      expect(parseQuery(input)).toEqual(expected);
    }
  });

  it("should handle array parameters and repeated keys", () => {
    const input = "tags=javascript&tags=web&tags=dev";
    const expected = { tags: ["javascript", "web", "dev"] };
    expect(parseQuery(input)).toEqual(expected);
  });

  it("should ignore prototype pollution keys", () => {
    const input = "__proto__=polluted&constructor=polluted&safe=value";
    const expected = { safe: "value" };
    expect(parseQuery(input)).toEqual(expected);
  });
});

describe("encodeQueryItem", () => {
  it("should encode keys and values properly", () => {
    const cases = [
      { key: "message", value: "Hello World", expected: "message=Hello+World" },
      { key: "count", value: 42, expected: "count=42" },
      { key: "active", value: true, expected: "active=true" },
      { key: "empty", value: "", expected: "empty" },
      { key: "nil", value: undefined, expected: "nil" },
      {
        key: "tags",
        value: ["javascript", "web"],
        expected: "tags=javascript&tags=web",
      },
    ];

    for (const { key, value, expected } of cases) {
      expect(encodeQueryItem(key, value as any)).toBe(expected);
    }
  });
});

describe("stringifyQuery", () => {
  it("should stringify and encode a query object", () => {
    const cases = [
      {
        input: { foo: "bar", baz: "qux" },
        expected: "foo=bar&baz=qux",
      },
      {
        input: { foo: "bar", baz: undefined },
        expected: "foo=bar",
      },
      {
        input: { tags: ["javascript", "web", "dev"] },
        expected: "tags=javascript&tags=web&tags=dev",
      },
      {
        input: {},
        expected: "",
      },
    ];

    for (const { input, expected } of cases) {
      expect(stringifyQuery(input)).toBe(expected);
    }
  });
});
