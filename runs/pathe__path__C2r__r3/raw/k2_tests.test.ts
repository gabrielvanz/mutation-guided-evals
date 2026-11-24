import { describe, it, expect } from "vitest";
import {
  sep,
  normalize,
  join,
  resolve,
  normalizeString,
  isAbsolute,
  toNamespacedPath,
  extname,
  relative,
  dirname,
  format,
  basename,
  parse,
  matchesGlob
} from "../../src/_path";

describe("sep", () => {
  it("should be equal to '/'", () => {
    expect(sep).toBe("/");
  });
});

describe("normalize", () => {
  it.each([
    { input: "", expected: "." },
    { input: "foo/bar//baz", expected: "foo/bar/baz" },
    { input: "foo/./bar", expected: "foo/bar" },
    { input: "foo/../bar", expected: "bar" },
    { input: "C:\\foo\\bar", expected: "C:/foo/bar" },
    { input: "C:", expected: "C:/" },
    { input: "/foo/bar/", expected: "/foo/bar/" },
    { input: "", expected: "." }
  ])("should normalize $input to $expected", ({ input, expected }) => {
    expect(normalize(input)).toBe(expected);
  });
});

describe("join", () => {
  it.each([
    { input: ["foo", "bar", "baz"], expected: "foo/bar/baz" },
    { input: ["/foo", "bar"], expected: "/foo/bar" },
    { input: ["foo/", "/bar"], expected: "foo/bar" },
    { input: ["", "foo"], expected: "foo" }
  ])("should join segments correctly", ({ input, expected }) => {
    expect(join(...input)).toBe(expected);
  });
});

describe("resolve", () => {
  it("should resolve absolute paths", () => {
    expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
  });

  it("should handle empty or omitted segments", () => {
    expect(resolve()).not.toBe("");
  });
});

describe("normalizeString", () => {
  it.each([
    { path: "foo/../bar", allowAboveRoot: false, expected: "bar" },
    { path: "../foo", allowAboveRoot: true, expected: "../foo" },
    { path: "../foo", allowAboveRoot: false, expected: "foo" }
  ])("should normalize string path for $path", ({ path, allowAboveRoot, expected }) => {
    expect(normalizeString(path, allowAboveRoot)).toBe(expected);
  });
});

describe("isAbsolute", () => {
  it.each([
    { input: "/foo/bar", expected: true },
    { input: "C:/foo/bar", expected: true },
    { input: "C:\\foo\\bar", expected: true },
    { input: "foo/bar", expected: false },
    { input: "//server/share", expected: true }
  ])("should determine if $input is absolute", ({ input, expected }) => {
    expect(isAbsolute(input)).toBe(expected);
  });
});

describe("toNamespacedPath", () => {
  it("should normalize windows path for namespaced path", () => {
    expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
  });
});

describe("extname", () => {
  it.each([
    { input: "index.html", expected: ".html" },
    { input: "index.coffee.md", expected: ".md" },
    { input: "index.", expected: "." },
    { input: "index", expected: "" },
    { input: "..", expected: "" }
  ])("should return extension for $input", ({ input, expected }) => {
    expect(extname(input)).toBe(expected);
  });
});

describe("relative", () => {
  it("should compute relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });

  it("should return absolute path if drive letters differ", () => {
    expect(relative("C:/foo", "D:/bar")).toBe("D:/bar");
  });
});

describe("dirname", () => {
  it.each([
    { input: "/foo/bar/baz", expected: "/foo/bar" },
    { input: "/foo/bar/", expected: "/foo" },
    { input: "foo", expected: "." },
    { input: "C:/foo", expected: "C:/" }
  ])("should return dirname for $input", ({ input, expected }) => {
    expect(dirname(input)).toBe(expected);
  });
});

describe("format", () => {
  it("should format path object into a path string", () => {
    expect(format({ root: "/", dir: "/foo/bar", base: "baz.html" })).toBe("/foo/bar/baz.html");
    expect(format({ name: "baz", ext: ".html" })).toBe("baz.html");
  });
});

describe("basename", () => {
  it.each([
    { input: "/foo/bar/baz.html", extension: undefined, expected: "baz.html" },
    { input: "/foo/bar/baz.html", extension: ".html", expected: "baz" },
    { input: "/foo/bar/", extension: undefined, expected: "bar" }
  ])("should return basename for $input", ({ input, extension, expected }) => {
    expect(basename(input, extension)).toBe(expected);
  });
});

describe("parse", () => {
  it("should parse path into an object", () => {
    expect(parse("/home/user/dir/file.txt")).toEqual({
      root: "/",
      dir: "/home/user/dir",
      base: "file.txt",
      ext: ".txt",
      name: "file"
    });
  });
});

describe("matchesGlob", () => {
  it("should match path against glob pattern", () => {
    expect(matchesGlob("/foo/bar.js", "*.js")).toBe(false);
    expect(matchesGlob("/foo/bar.js", "**/bar.js")).toBe(true);
  });
});
