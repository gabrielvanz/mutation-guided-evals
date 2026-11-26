import { describe, it, expect } from "vitest";
import {
  parseURL,
  parsePath,
  parseAuth,
  parseHost,
  stringifyParsedURL,
  parseFilename
} from "../../src/parse";

describe("parseURL", () => {
  it("should parse absolute URLs with protocol, auth, host, pathname, search, and hash", () => {
    const result = parseURL("http://user:pass@foo.com/foo?test=123#token");
    expect(result).toMatchObject({
      protocol: "http:",
      auth: "user:pass",
      host: "foo.com",
      pathname: "/foo",
      search: "?test=123",
      hash: "#token"
    });
  });

  it("should parse relative paths when no protocol is present", () => {
    const result = parseURL("foo.com/foo?test=123#token");
    expect(result).toEqual({
      pathname: "foo.com/foo",
      search: "?test=123",
      hash: "#token"
    });
  });

  it("should use default protocol when input lacks one", () => {
    const result = parseURL("foo.com/foo?test=123#token", "https://");
    expect(result).toMatchObject({
      protocol: "https:",
      auth: "",
      host: "foo.com",
      pathname: "/foo",
      search: "?test=123",
      hash: "#token"
    });
  });

  it("should handle special protocols like blob:", () => {
    const result = parseURL("blob:https://example.com/uuid");
    expect(result).toEqual({
      protocol: "blob:",
      pathname: "https://example.com/uuid",
      href: "blob:https://example.com/uuid",
      auth: "",
      host: "",
      search: "",
      hash: ""
    });
  });

  it("should handle empty input", () => {
    const result = parseURL("");
    expect(result).toEqual({
      pathname: "",
      search: "",
      hash: ""
    });
  });

  it("should handle file protocol paths correctly", () => {
    const result = parseURL("file:///C:/path/to/file");
    expect(result.protocol).toBe("file:");
    expect(result.pathname).toBe("C:/path/to/file");
  });
});

describe("parsePath", () => {
  it("should split path into pathname, search, and hash", () => {
    const result = parsePath("http://foo.com/foo?test=123#token");
    expect(result).toEqual({
      pathname: "http://foo.com/foo",
      search: "?test=123",
      hash: "#token"
    });
  });

  it("should handle empty input", () => {
    const result = parsePath("");
    expect(result).toEqual({
      pathname: "",
      search: "",
      hash: ""
    });
  });
});

describe("parseAuth", () => {
  it("should decode username and password", () => {
    const result = parseAuth("user:pass");
    expect(result).toEqual({
      username: "user",
      password: "pass"
    });
  });

  it("should handle empty input", () => {
    const result = parseAuth("");
    expect(result).toEqual({
      username: "",
      password: ""
    });
  });
});

describe("parseHost", () => {
  it("should extract hostname and port", () => {
    const result = parseHost("foo.com:8080");
    expect(result).toEqual({
      hostname: "foo.com",
      port: "8080"
    });
  });

  it("should handle host without port", () => {
    const result = parseHost("foo.com");
    expect(result).toEqual({
      hostname: "foo.com",
      port: undefined
    });
  });

  it("should handle empty input", () => {
    const result = parseHost("");
    expect(result).toEqual({
      hostname: "",
      port: undefined
    });
  });
});

describe("stringifyParsedURL", () => {
  it("should stringify a parsed URL object back to a string", () => {
    const obj = parseURL("http://foo.com/foo?test=123#token");
    obj.host = "bar.com";
    const result = stringifyParsedURL(obj);
    expect(result).toBe("http://bar.com/foo?test=123#token");
  });

  it("should handle partial parsed objects", () => {
    const result = stringifyParsedURL({ pathname: "/foo", search: "test=123" });
    expect(result).toBe("/foo?test=123");
  });
});

describe("parseFilename", () => {
  it("should return the last segment in path as filename", () => {
    const filename = parseFilename("http://example.com/path/to/filename.ext");
    expect(filename).toBe("filename.ext");
  });

  it("should return undefined in strict mode if file has no extension", () => {
    const filename = parseFilename("/path/to/.hidden-file", { strict: true });
    expect(filename).toBeUndefined();
  });

  it("should return filename in strict mode if file has an extension", () => {
    const filename = parseFilename("/path/to/file.txt", { strict: true });
    expect(filename).toBe("file.txt");
  });

  it("should return undefined for empty input", () => {
    const filename = parseFilename("");
    expect(filename).toBeUndefined();
  });
});
