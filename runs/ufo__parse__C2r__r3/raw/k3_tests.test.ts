import { describe, it, expect } from "vitest";
import {
  parseURL,
  parsePath,
  parseAuth,
  parseHost,
  stringifyParsedURL,
  parseFilename
} from "../../src/parse";

const protocolRelative = Symbol.for("ufo:protocolRelative");

describe("parseURL", () => {
  it("should parse absolute URL with protocol, auth, host, pathname, search, and hash", () => {
    const result = parseURL("http://user:pass@foo.com/foo?test=123#token");
    expect(result).toEqual({
      protocol: "http:",
      auth: "user:pass",
      host: "foo.com",
      pathname: "/foo",
      search: "?test=123",
      hash: "#token",
      [protocolRelative]: false
    });
  });

  it("should parse relative path without protocol", () => {
    const result = parseURL("foo.com/foo?test=123#token");
    expect(result).toEqual({
      pathname: "foo.com/foo",
      search: "?test=123",
      hash: "#token"
    });
  });

  it("should parse relative path with defaultProto", () => {
    const result = parseURL("foo.com/foo?test=123#token", "https://");
    expect(result).toEqual({
      protocol: "https:",
      auth: "",
      host: "foo.com",
      pathname: "/foo",
      search: "?test=123",
      hash: "#token",
      [protocolRelative]: false
    });
  });

  it("should handle special protocols like blob, data, javascript, vbscript", () => {
    const result = parseURL("data:text/plain;base64,SGVsbG8=");
    expect(result).toEqual({
      protocol: "data:",
      pathname: "text/plain;base64,SGVsbG8=",
      href: "data:text/plain;base64,SGVsbG8=",
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

  it("should handle file protocol correctly", () => {
    const result = parseURL("file:///C:/path/to/file");
    expect(result).toEqual({
      protocol: "file:",
      auth: "",
      host: "",
      pathname: "C:/path/to/file",
      search: "",
      hash: "",
      [protocolRelative]: false
    });
  });
});

describe("parsePath", () => {
  it("should split input into pathname, search, and hash", () => {
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
  it("should split username and password and decode them", () => {
    const result = parseAuth("john:secret%40123");
    expect(result).toEqual({
      username: "john",
      password: "secret@123"
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
  it("should return hostname and port", () => {
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
    const parsed = {
      protocol: "http:",
      auth: "user:pass",
      host: "bar.com",
      pathname: "/foo",
      search: "?test=123",
      hash: "#token"
    };
    const result = stringifyParsedURL(parsed);
    expect(result).toBe("http://user:pass@bar.com/foo?test=123#token");
  });

  it("should handle missing protocol or search prefix", () => {
    const parsed = {
      host: "bar.com",
      pathname: "/foo",
      search: "test=123"
    };
    const result = stringifyParsedURL(parsed);
    expect(result).toBe("bar.com/foo?test=123");
  });

  it("should handle empty object", () => {
    const result = stringifyParsedURL({});
    expect(result).toBe("");
  });
});

describe("parseFilename", () => {
  it("should return the last segment in path as filename", () => {
    const result = parseFilename("http://example.com/path/to/filename.ext");
    expect(result).toBe("filename.ext");
  });

  it("should return undefined in strict mode if file has no extension", () => {
    const result = parseFilename("/path/to/.hidden-file", { strict: true });
    expect(result).toBeUndefined();
  });

  it("should return filename in strict mode if file has an extension", () => {
    const result = parseFilename("/path/to/filename.ext", { strict: true });
    expect(result).toBe("filename.ext");
  });

  it("should handle empty input", () => {
    const result = parseFilename("");
    expect(result).toBeUndefined();
  });
});
