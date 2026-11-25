import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("query", () => {
  describe("parseQuery", () => {
    it("parses empty string", () => {
      expect(parseQuery("")).toEqual({});
    });

    it("parses query string with leading question mark", () => {
      expect(parseQuery("?foo=bar&baz=qux")).toEqual({
        foo: "bar",
        baz: "qux",
      });
    });

    it("parses query string without leading question mark", () => {
      expect(parseQuery("foo=bar&baz=qux")).toEqual({
        foo: "bar",
        baz: "qux",
      });
    });

    it("parses repeated keys into arrays", () => {
      expect(parseQuery("tags=javascript&tags=web&tags=dev")).toEqual({
        tags: ["javascript", "web", "dev"],
      });
    });

    it("ignores prototype pollution keys", () => {
      expect(parseQuery("__proto__=polluted&constructor=bad&safe=good")).toEqual({
        safe: "good",
      });
    });

    it("handles parameters without values", () => {
      expect(parseQuery("foo=&bar")).toEqual({
        foo: "",
        bar: "",
      });
    });
  });

  describe("encodeQueryItem", () => {
    it("encodes string values", () => {
      expect(encodeQueryItem("message", "Hello World")).toBe("message=Hello+World");
    });

    it("encodes number and boolean values", () => {
      expect(encodeQueryItem("count", 42)).toBe("count=42");
      expect(encodeQueryItem("active", true)).toBe("active=true");
    });

    it("encodes array values", () => {
      expect(encodeQueryItem("tags", ["javascript", "web"])).toBe("tags=javascript&tags=web");
    });

    it("encodes falsy values as key only", () => {
      expect(encodeQueryItem("flag", undefined)).toBe("flag");
      expect(encodeQueryItem("flag", null)).toBe("flag");
      expect(encodeQueryItem("flag", "")).toBe("flag");
    });
  });

  describe("stringifyQuery", () => {
    it("stringifies query objects", () => {
      expect(stringifyQuery({ foo: "bar", baz: "qux" })).toBe("foo=bar&baz=qux");
    });

    it("filters out undefined values", () => {
      expect(stringifyQuery({ foo: "bar", baz: undefined })).toBe("foo=bar");
    });

    it("handles array values in query object", () => {
      expect(stringifyQuery({ tags: ["a", "b"] })).toBe("tags=a&tags=b");
    });
  });
});
