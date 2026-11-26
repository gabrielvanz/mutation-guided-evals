import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("parseQuery", () => {
  it.each([
    { input: "", expected: {} },
    { input: "?foo=bar&baz=qux", expected: { foo: "bar", baz: "qux" } },
    { input: "foo=bar&baz=qux", expected: { foo: "bar", baz: "qux" } },
    { input: "tags=javascript&tags=web&tags=dev", expected: { tags: ["javascript", "web", "dev"] } },
    { input: "foo", expected: { foo: "" } },
    { input: "foo=", expected: { foo: "" } },
    { input: "?", expected: {} },
    { input: "foo=bar&__proto__=polluted&constructor=bad", expected: { foo: "bar" } },
  ])("should parse $input correctly", ({ input, expected }) => {
    const result = parseQuery(input);
    expect(result).toEqual(expected);
  });

  it("should handle default parameter string when omitted", () => {
    const result = parseQuery();
    expect(result).toEqual({});
  });

  it("should ignore invalid query parameters that do not contain an assignment or key", () => {
    const result = parseQuery("foo=bar&&baz=qux");
    expect(result).toEqual({ foo: "bar", baz: "qux" });
  });
});

describe("encodeQueryItem", () => {
  it.each([
    { key: "message", value: "Hello World", expected: "message=Hello+World" },
    { key: "tags", value: ["javascript", "web", "dev"], expected: "tags=javascript&tags=web&tags=dev" },
    { key: "count", value: 42, expected: "count=42" },
    { key: "active", value: true, expected: "active=true" },
    { key: "empty", value: "", expected: "empty" },
    { key: "missing", value: undefined, expected: "missing" },
  ])("should encode query item for key $key", ({ key, value, expected }) => {
    const result = encodeQueryItem(key, value);
    expect(result).toBe(expected);
  });

  it("should correctly encode number values including zero", () => {
    const result = encodeQueryItem("score", 0);
    expect(result).toBe("score=0");
  });

  it("should correctly encode boolean false values", () => {
    const result = encodeQueryItem("active", false);
    expect(result).toBe("active=false");
  });
});

describe("stringifyQuery", () => {
  it.each([
    { input: { foo: "bar", baz: "qux" }, expected: "foo=bar&baz=qux" },
    { input: { foo: "bar", baz: undefined }, expected: "foo=bar" },
    { input: { tags: ["javascript", "web", "dev"] }, expected: "tags=javascript&tags=web&tags=dev" },
    { input: {}, expected: "" },
  ])("should stringify query object correctly", ({ input, expected }) => {
    const result = stringifyQuery(input);
    expect(result).toBe(expected);
  });

  it("should filter out falsy stringified items from query string", () => {
    const result = stringifyQuery({ foo: "", bar: undefined });
    expect(result).toBe("foo");
  });
});
