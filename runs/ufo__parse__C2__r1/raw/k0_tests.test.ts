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
  it("should parse absolute URLs with protocol, host, pathname, search and hash", () => {
    const result = parseURL("http://foo.com/foo?test=123#token");
    expect(result).toMatchObject({
      protocol: "http:",
      auth: "",
      host: "foo.com",
      pathname: "/foo",
      search: "?test=123",
      hash: "#token"
    });
  });

  it("should parse relative URLs without protocol", () => {
    const result = parseURL("foo.com/foo?test=123#token");
    expect(result).toEqual({
      pathname: "foo.com/foo",
      search: "?test=123",
      hash: "#token"
    });
  });

  it("should parse relative URLs with default protocol", () => {
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

  it("should handle empty input", () => {
    const result = parseURL("");
    expect(result).toEqual({
      pathname: "",
      search: "",
      hash: ""
    });
  });

  it("should handle special protocols like blob, data, javascript, vbscript", () => {
    const result = parseURL("blob:http://example.com/123-456");
    expect(result).toEqual({
      protocol: "blob:",
      pathname: "http://example.com/123-456",
      href: "blob:http://example.com/123-456",
      auth: "",
      host: "",
      search: "",
      hash: ""
    });
  });

  it("should handle auth in URL", () => {
    const result = parseURL("http://user:pass@foo.com/path");
    expect(result).toMatchObject({
      protocol: "http:",
      auth: "user:pass",
      host: "foo.com",
      pathname: "/path",
      search: "",
      hash: ""
    });
  });

  it("should handle file protocol paths correctly", () => {
    const result = parseURL("file:///C:/path/to/file");
    expect(result).toMatchObject({
      protocol: "file:",
      auth: "",
      host: "",
      pathname: "C:/path/to/file",
      search: "",
      hash: ""
    });
  });
});

describe("parsePath", () => {
  it("should parse pathname, search and hash from input", () => {
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
  it("should parse username and password", () => {
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
  it("should parse hostname and port", () => {
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
  it("should stringify parsed URL object back to string", () => {
    const parsed = parseURL("http://foo.com/foo?test=123#token");
    parsed.host = "bar.com";
    const result = stringifyParsedURL(parsed);
    expect(result).toBe("http://bar.com/foo?test=123#token");
  });

  it("should handle partial parsed objects", () => {
    const result = stringifyParsedURL({ pathname: "/foo" });
    expect(result).toBe("/foo");
  });
});

describe("parseFilename", () => {
  it("should return the last segment in path as filename", () => {
    const result = parseFilename("http://example.com/path/to/filename.ext");
    expect(result).toBe("filename.ext");
  });

  it("should return undefined for strict mode when filename has no extension", () => {
    const result = parseFilename("/path/to/.hidden-file", { strict: true });
    expect(result).toBeUndefined();
  });

  it("should return filename in strict mode when extension exists", () => {
    const result = parseFilename("/path/to/filename.ext", { strict: true });
    expect(result).toBe("filename.ext");
  });

  it("should handle empty input", () => {
    const result = parseFilename("");
    expect(result).toBeUndefined();
  });
});
