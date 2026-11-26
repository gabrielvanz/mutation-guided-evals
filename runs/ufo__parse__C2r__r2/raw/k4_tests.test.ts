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
    expect(result.protocol).toBe("http:");
    expect(result.auth).toBe("user:pass");
    expect(result.host).toBe("foo.com");
    expect(result.pathname).toBe("/foo");
    expect(result.search).toBe("?test=123");
    expect(result.hash).toBe("#token");
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
    expect(result.protocol).toBe("https:");
    expect(result.host).toBe("foo.com");
    expect(result.pathname).toBe("/foo");
    expect(result.search).toBe("?test=123");
    expect(result.hash).toBe("#token");
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

  it("should normalize backslashes to forward slashes", () => {
    const result = parseURL("http://foo.com\\foo\\bar");
    expect(result.pathname).toBe("/foo/bar");
  });

  it("should handle file protocols correctly", () => {
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

  it("should handle empty path input", () => {
    const result = parsePath("");
    expect(result).toEqual({
      pathname: "",
      search: "",
      hash: ""
    });
  });

  it("should parse paths with only search and hash", () => {
    const result = parsePath("?foo=bar#baz");
    expect(result).toEqual({
      pathname: "",
      search: "?foo=bar",
      hash: "#baz"
    });
  });
});

describe("parseAuth", () => {
  it("should parse and decode username and password", () => {
    const result = parseAuth("user%40name:pass%40word");
    expect(result).toEqual({
      username: "user@name",
      password: "pass@word"
    });
  });

  it("should handle empty auth string", () => {
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
  it("should stringify a fully parsed URL object", () => {
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

  it("should stringify a partial URL object without protocol or host", () => {
    const parsed = {
      pathname: "foo/bar",
      search: "test=123",
      hash: "#token"
    };
    const result = stringifyParsedURL(parsed);
    expect(result).toBe("foo/bar?test=123#token");
  });

  it("should handle empty parsed object", () => {
    const result = stringifyParsedURL({});
    expect(result).toBe("");
  });
});

describe("parseFilename", () => {
  it("should return the last segment as filename", () => {
    const filename = parseFilename("http://example.com/path/to/filename.ext");
    expect(filename).toBe("filename.ext");
  });

  it("should return undefined when no filename is present", () => {
    const filename = parseFilename("http://example.com/path/to/");
    expect(filename).toBe(undefined);
  });

  it("should respect strict mode requiring a file extension", () => {
    const filenameNoExt = parseFilename("/path/to/filename", { strict: true });
    expect(filenameNoExt).toBe(undefined);

    const filenameWithExt = parseFilename("/path/to/filename.ext", { strict: true });
    expect(filenameWithExt).toBe("filename.ext");
  });

  it("should handle empty input", () => {
    const filename = parseFilename("");
    expect(filename).toBe(undefined);
  });
});
