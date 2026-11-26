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

  it("should parse relative URLs with a default protocol", () => {
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
    const result = parseURL("blob:http://localhost/uuid");
    expect(result).toEqual({
      protocol: "blob:",
      pathname: "http://localhost/uuid",
      href: "blob:http://localhost/uuid",
      auth: "",
      host: "",
      search: "",
      hash: ""
    });
  });

  it("should handle file protocols correctly", () => {
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

  it("should handle empty input", () => {
    const result = parseURL();
    expect(result).toEqual({
      pathname: "",
      search: "",
      hash: ""
    });
  });

  it("should parse URLs with authentication", () => {
    const result = parseURL("http://user:pass@foo.com/foo");
    expect(result).toMatchObject({
      protocol: "http:",
      auth: "user:pass",
      host: "foo.com",
      pathname: "/foo",
      search: "",
      hash: ""
    });
  });
});

describe("parsePath", () => {
  it("should split path, search and hash", () => {
    const result = parsePath("http://foo.com/foo?test=123#token");
    expect(result).toEqual({
      pathname: "http://foo.com/foo",
      search: "?test=123",
      hash: "#token"
    });
  });

  it("should handle empty input", () => {
    const result = parsePath();
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
    const result = parseAuth();
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
    const result = parseHost();
    expect(result).toEqual({
      hostname: "",
      port: undefined
    });
  });
});

describe("stringifyParsedURL", () => {
  it("should stringify a parsed URL object back to string", () => {
    const parsed = parseURL("http://foo.com/foo?test=123#token");
    const result = stringifyParsedURL(parsed);
    expect(result).toBe("http://foo.com/foo?test=123#token");
  });

  it("should stringify with modified host", () => {
    const parsed = parseURL("http://foo.com/foo?test=123#token");
    parsed.host = "bar.com";
    const result = stringifyParsedURL(parsed);
    expect(result).toBe("http://bar.com/foo?test=123#token");
  });

  it("should handle partial parsed objects", () => {
    const result = stringifyParsedURL({
      pathname: "/foo",
      search: "test=123"
    });
    expect(result).toBe("/foo?test=123");
  });
});

describe("parseFilename", () => {
  it("should return the filename from a URL", () => {
    const result = parseFilename("http://example.com/path/to/filename.ext");
    expect(result).toBe("filename.ext");
  });

  it("should return undefined in strict mode for hidden files without extension", () => {
    const result = parseFilename("/path/to/.hidden-file", { strict: true });
    expect(result).toBeUndefined();
  });

  it("should return filename in strict mode when extension exists", () => {
    const result = parseFilename("/path/to/file.txt", { strict: true });
    expect(result).toBe("file.txt");
  });

  it("should return undefined for empty input", () => {
    const result = parseFilename();
    expect(result).toBeUndefined();
  });
});
