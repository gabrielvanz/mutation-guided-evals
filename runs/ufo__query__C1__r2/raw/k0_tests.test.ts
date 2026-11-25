import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("query", () => {
  describe("parseQuery", () => {
    it("parses empty or missing strings", () => {
      expect(parseQuery()).toEqual({});
      expect(parseQuery("")).toEqual({});
    });

    it("parses query string with or without leading question mark", () => {
      expect(parseQuery("?foo=bar")).toEqual({ foo: "bar" });
      expect(parseQuery("foo=bar")).toEqual({ foo: "bar" });
    });

    it("parses multiple parameters and duplicate keys into arrays", () => {
      expect(parseQuery("foo=bar&baz=qux")).toEqual({ foo: "bar", baz: "qux" });
      expect(parseQuery("tags=js&tags=web&tags=dev")).toEqual({
        tags: ["js", "web", "dev"],
      });
    });

    it("ignores __proto__ and constructor keys to prevent prototype pollution", () => {
      const result = parseQuery("__proto__.foo=bar&constructor=baz&normal=val");
      expect(result).toHaveProperty("normal", "val");
      expect(result).not.toHaveProperty("__proto__");
      expect(result).not.toHaveProperty("constructor");
    });
  });

  describe("encodeQueryItem", () => {
    it("encodes primitive types", () => {
      expect(encodeQueryItem("message", "Hello World")).toBe("message=Hello+World");
      expect(encodeQueryItem("count", 42)).toBe("count=42");
      expect(encodeQueryItem("active", true)).toBe("active=true");
    });

    it("encodes arrays as multiple key-value pairs", () => {
      expect(encodeQueryItem("tags", ["javascript", "web"])).toBe(
        "tags=javascript&tags=web",
      );
    });

    it("handles falsy values", () => {
      expect(encodeQueryItem("empty", "")).toBe("empty");
    });
  });

  describe("stringifyQuery", () => {
    it("stringifies and encodes a query object", () => {
      expect(stringifyQuery({ foo: "bar", baz: "qux" })).toBe("foo=bar&baz=qux");
    });

    it("filters out undefined values", () => {
      expect(stringifyQuery({ foo: "bar", baz: undefined })).toBe("foo=bar");
    });

    it("handles arrays and multiple item types", () => {
      expect(
        stringifyQuery({
          tags: ["js", "ts"],
          page: 1,
        }),
      ).toBe("tags=js&tags=ts&page=1");
    });
  });
});
