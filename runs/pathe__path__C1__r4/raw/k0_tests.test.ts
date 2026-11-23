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
  matchesGlob,
} from "../../src/_path";

describe("_path module", () => {
  it("should export sep as '/'", () => {
    expect(sep).toBe("/");
  });

  it("should normalize paths correctly", () => {
    expect(normalize("")).toBe(".");
    expect(normalize("foo/bar//baz")).toBe("foo/bar/baz");
    expect(normalize("foo/../bar")).toBe("bar");
    expect(normalize("/foo/bar/")).toBe("/foo/bar/");
    expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
  });

  it("should join paths correctly", () => {
    expect(join("foo", "bar", "baz")).toBe("foo/bar/baz");
    expect(join("", "foo", "", "bar")).toBe("foo/bar");
    expect(join("foo/", "/bar")).toBe("foo/bar");
  });

  it("should resolve paths correctly", () => {
    expect(resolve("/foo", "bar")).toBe("/foo/bar");
    expect(resolve("foo", "bar")).toContain("foo/bar");
  });

  it("should normalize string paths with or without allowAboveRoot", () => {
    expect(normalizeString("a/b/../c", false)).toBe("a/c");
    expect(normalizeString("../a", true)).toBe("../a");
    expect(normalizeString("../a", false)).toBe("a");
  });

  it("should check if a path is absolute", () => {
    expect(isAbsolute("/foo/bar")).toBe(true);
    expect(isAbsolute("C:/foo/bar")).toBe(true);
    expect(isAbsolute("foo/bar")).toBe(false);
  });

  it("should convert to namespaced path", () => {
    expect(toNamespacedPath("foo\\bar")).toBe("foo/bar");
  });

  it("should get the extname of a path", () => {
    expect(extname("index.html")).toBe(".html");
    expect(extname("index")).toBe("");
    expect(extname("..")).toBe("");
  });

  it("should compute relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
    expect(relative("C:/foo", "D:/bar")).toBe("D:/bar");
  });

  it("should get the dirname of a path", () => {
    expect(dirname("/foo/bar/baz")).toBe("/foo/bar");
    expect(dirname("foo")).toBe(".");
  });

  it("should format a path object", () => {
    expect(format({ root: "/", dir: "/foo/bar", base: "baz.txt" })).toBe("/foo/bar/baz.txt");
    expect(format({ name: "file", ext: ".txt" })).toBe("file.txt");
  });

  it("should get the basename of a path", () => {
    expect(basename("/foo/bar/baz.txt")).toBe("baz.txt");
    expect(basename("/foo/bar/baz.txt", ".txt")).toBe("baz");
  });

  it("should parse a path into components", () => {
    const parsed = parse("/home/user/dir/file.txt");
    expect(parsed).toEqual({
      root: "/",
      dir: "/home/user/dir",
      base: "file.txt",
      ext: ".txt",
      name: "file",
    });
  });

  it("should match glob patterns against a path", () => {
    expect(matchesGlob("foo/bar.js", "foo/*.js")).toBe(true);
    expect(matchesGlob("foo/bar.txt", "foo/*.js")).toBe(false);
  });
});
