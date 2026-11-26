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
  it("should parse standard absolute URLs", () => {
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

  it("should parse relative URLs without default protocol", () => {
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

  it("should parse URLs with authentication", () => {
    const result = parseURL("https://user:pass@example.com/path");
    expect(result).toMatchObject({
      protocol: "https:",
      auth: "user:pass",
      host: "example.com",
      pathname: "/path",
      search: "",
      hash: ""
    });
  });

  it("should parse special protocol URLs", () => {
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
  it("should parse paths with search and hash", () => {
    const result = parsePath("http://foo.com/foo?test=123#token");
    expect(result).toEqual({
      pathname: "http://foo.com/foo",
      search: "?test=123",
      hash: "#token"
    });
  });

  it("should handle empty path input", () => {
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

  it("should handle empty auth input", () => {
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

  it("should handle empty host input", () => {
    const result = parseHost("");
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

  it("should handle partial parsed objects", () => {
    const result = stringifyParsedURL({
      protocol: "https:",
      host: "bar.com",
      pathname: "/path"
    });
    expect(result).toBe("https://bar.com/path");
  });

  it("should handle empty parsed object", () => {
    const result = stringifyParsedURL({});
    expect(result).toBe("");
  });
});

describe("parseFilename", () => {
  it("should return the last segment of the path", () => {
    const result = parseFilename("http://example.com/path/to/filename.ext");
    expect(result).toBe("filename.ext");
  });

  it("should return undefined in strict mode for files without extension", () => {
    const result = parseFilename("/path/to/.hidden-file", { strict: true });
    expect(result).toBeUndefined();
  });

  it("should return filename in strict mode when extension exists", () => {
    const result = parseFilename("/path/to/file.txt", { strict: true });
    expect(result).toBe("file.txt");
  });

  it("should handle empty input", () => {
    const result = parseFilename("");
    expect(result).toBeUndefined();
  });
});
