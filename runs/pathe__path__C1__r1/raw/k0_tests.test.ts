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

  describe("normalize", () => {
    it("should handle empty paths", () => {
      expect(normalize("")).toBe(".");
    });

    it("should normalize regular paths", () => {
      expect(normalize("/foo/bar//baz/..")).toBe("/foo/bar");
    });

    it("should handle windows paths", () => {
      expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
    });
  });

  describe("join", () => {
    it("should join path segments", () => {
      expect(join("/foo", "bar", "baz")).toBe("/foo/bar/baz");
    });

    it("should handle empty or falsy segments", () => {
      expect(join("/foo", "", "bar")).toBe("/foo/bar");
    });
  });

  describe("resolve", () => {
    it("should resolve absolute paths", () => {
      expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
    });

    it("should handle empty arguments by falling back to cwd", () => {
      const res = resolve("");
      expect(typeof res).toBe("string");
      expect(res.length).toBeGreaterThan(0);
    });
  });

  describe("normalizeString", () => {
    it("should normalize string paths allowing above root", () => {
      expect(normalizeString("/foo/../bar", true)).toBe("bar");
      expect(normalizeString("../foo", true)).toBe("../foo");
    });

    it("should normalize string paths not allowing above root", () => {
      expect(normalizeString("/foo/../../bar", false)).toBe("bar");
    });
  });

  describe("isAbsolute", () => {
    it("should correctly identify absolute paths", () => {
      expect(isAbsolute("/foo/bar")).toBe(true);
      expect(isAbsolute("C:/foo/bar")).toBe(true);
      expect(isAbsolute("foo/bar")).toBe(false);
    });
  });

  describe("toNamespacedPath", () => {
    it("should normalize windows paths for namespaced path", () => {
      expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
    });
  });

  describe("extname", () => {
    it("should return the extension of a file", () => {
      expect(extname("index.html")).toBe(".html");
      expect(extname("index")).toBe("");
      expect(extname("..")).toBe("");
    });
  });

  describe("relative", () => {
    it("should compute relative paths", () => {
      expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
    });
  });

  describe("dirname", () => {
    it("should return the directory name", () => {
      expect(dirname("/foo/bar/baz.txt")).toBe("/foo/bar");
      expect(dirname("foo.txt")).toBe(".");
    });
  });

  describe("format", () => {
    it("should format a path object", () => {
      expect(format({ root: "/", dir: "/foo/bar", base: "baz.txt" })).toBe("/foo/bar/baz.txt");
    });
  });

  describe("basename", () => {
    it("should return the base name", () => {
      expect(basename("/foo/bar/baz.txt")).toBe("baz.txt");
      expect(basename("/foo/bar/baz.txt", ".txt")).toBe("baz");
    });
  });

  describe("parse", () => {
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
  });

  describe("matchesGlob", () => {
    it("should match path against a glob pattern", () => {
      expect(matchesGlob("/foo/bar.js", "*.js")).toBe(false);
      expect(matchesGlob("/foo/bar.js", "**/bar.js")).toBe(true);
    });
  });
});
