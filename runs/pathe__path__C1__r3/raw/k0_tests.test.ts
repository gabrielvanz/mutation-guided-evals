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
    it("should handle empty path", () => {
      expect(normalize("")).toBe(".");
    });

    it("should normalize backslashes and relative paths", () => {
      expect(normalize("foo\\bar\\..\\baz")).toBe("foo/baz");
    });

    it("should handle absolute paths", () => {
      expect(normalize("/foo/bar/..")).toBe("/foo");
    });

    it("should handle drive letters", () => {
      expect(normalize("C:")).toBe("C:/");
    });

    it("should handle UNC paths", () => {
      expect(normalize("\\\\server\\share")).toBe("//server/share");
      expect(normalize("\\\\server")).toBe("//server");
    });
  });

  describe("join", () => {
    it("should join path segments", () => {
      expect(join("foo", "bar", "baz")).toBe("foo/bar/baz");
      expect(join("/foo", "bar", "../baz")).toBe("/foo/baz");
    });

    it("should ignore empty segments", () => {
      expect(join("foo", "", "bar")).toBe("foo/bar");
    });
  });

  describe("resolve", () => {
    it("should resolve absolute paths", () => {
      expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
    });

    it("should resolve with multiple absolute paths", () => {
      expect(resolve("/foo/bar", "/baz")).toBe("/baz");
    });
  });

  describe("normalizeString", () => {
    it("should normalize string paths correctly", () => {
      expect(normalizeString("a/b/../c", false)).toBe("a/c");
      expect(normalizeString("../a", true)).toBe("../a");
    });
  });

  describe("isAbsolute", () => {
    it("should correctly identify absolute paths", () => {
      expect(isAbsolute("/foo/bar")).toBe(true);
      expect(isAbsolute("C:/foo")).toBe(true);
      expect(isAbsolute("foo/bar")).toBe(false);
    });
  });

  describe("toNamespacedPath", () => {
    it("should normalize windows path for namespaced path", () => {
      expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
    });
  });

  describe("extname", () => {
    it("should return the extension of a file", () => {
      expect(extname("index.html")).toBe(".html");
      expect(extname("index.d.ts")).toBe(".ts");
      expect(extname("file")).toBe("");
      expect(extname("..")).toBe("");
    });
  });

  describe("relative", () => {
    it("should calculate relative path between two paths", () => {
      expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
    });

    it("should return absolute path if drive letters differ", () => {
      expect(relative("C:/foo", "D:/bar")).toBe("D:/bar");
    });
  });

  describe("dirname", () => {
    it("should return the directory name of a path", () => {
      expect(dirname("/foo/bar/baz.js")).toBe("/foo/bar");
      expect(dirname("foo/bar")).toBe("foo");
      expect(dirname("/foo")).toBe("/");
      expect(dirname("foo")).toBe(".");
    });
  });

  describe("format", () => {
    it("should format a path object into a path string", () => {
      expect(format({ root: "/", dir: "/foo/bar", base: "baz.js" })).toBe("/foo/bar/baz.js");
      expect(format({ name: "baz", ext: "js" })).toBe("baz.js");
    });
  });

  describe("basename", () => {
    it("should return the last portion of a path", () => {
      expect(basename("/foo/bar/baz.js")).toBe("baz.js");
      expect(basename("/foo/bar/baz.js", ".js")).toBe("baz");
    });
  });

  describe("parse", () => {
    it("should parse a path into an object", () => {
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
    it("should match path against glob pattern", () => {
      expect(matchesGlob("/foo/bar.js", "*.js")).toBe(false);
      expect(matchesGlob("/foo/bar.js", "/*/bar.js")).toBe(true);
      expect(matchesGlob("/foo/bar.js", ["/*.js", "/foo/*.js"])).toBe(true);
    });
  });
});
