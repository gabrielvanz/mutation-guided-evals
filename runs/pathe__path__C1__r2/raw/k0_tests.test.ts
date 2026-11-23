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
  it("should have sep equal to '/'", () => {
    expect(sep).toBe("/");
  });

  describe("normalize", () => {
    it("should handle empty paths", () => {
      expect(normalize("")).toBe(".");
    });

    it("should normalize regular paths", () => {
      expect(normalize("/foo/bar//baz/..")).toBe("/foo/bar");
      expect(normalize("foo/bar/")).toBe("foo/bar/");
    });

    it("should normalize windows paths", () => {
      expect(normalize("C:\\foo\\bar\\..\\baz")).toBe("C:/foo/baz");
    });

    it("should handle UNC paths", () => {
      expect(normalize("\\\\server\\share\\foo")).toBe("//server/share/foo");
    });
  });

  describe("join", () => {
    it("should join path segments", () => {
      expect(join("/foo", "bar", "baz/asdf")).toBe("/foo/bar/baz/asdf");
      expect(join("")).toBe(".");
      expect(join("/foo", "", "bar")).toBe("/foo/bar");
    });
  });

  describe("resolve", () => {
    it("should resolve absolute paths", () => {
      expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
      expect(resolve("/foo/bar", "/tmp/file")).toBe("/tmp/file");
    });
  });

  describe("normalizeString", () => {
    it("should normalize string paths with allowAboveRoot true", () => {
      expect(normalizeString("/foo/../bar", true)).toBe("bar");
      expect(normalizeString("..", true)).toBe("..");
    });

    it("should normalize string paths with allowAboveRoot false", () => {
      expect(normalizeString("/foo/../../bar", false)).toBe("bar");
    });
  });

  describe("isAbsolute", () => {
    it("should correctly identify absolute paths", () => {
      expect(isAbsolute("/foo/bar")).toBe(true);
      expect(isAbsolute("C:/foo")).toBe(true);
      expect(isAbsolute("foo/bar")).toBe(false);
      expect(isAbsolute("//server/share")).toBe(true);
    });
  });

  describe("toNamespacedPath", () => {
    it("should normalize windows path for namespacing", () => {
      expect(toNamespacedPath("foo\\bar")).toBe("foo/bar");
    });
  });

  describe("extname", () => {
    it("should extract file extensions", () => {
      expect(extname("index.html")).toBe(".html");
      expect(extname("index.coffee.md")).toBe(".md");
      expect(extname("index.")).toBe(".");
      expect(extname("index")).toBe("");
      expect(extname("..")).toBe("");
    });
  });

  describe("relative", () => {
    it("should compute relative path between two paths", () => {
      expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe(
        "../../impl/bbb"
      );
      expect(relative("C:/foo/bar", "D:/foo/bar")).toBe("D:/foo/bar");
    });
  });

  describe("dirname", () => {
    it("should return the directory name", () => {
      expect(dirname("/foo/bar/baz/asdf")).toBe("/foo/bar/baz");
      expect(dirname("/foo")).toBe("/");
      expect(dirname("bar")).toBe(".");
    });
  });

  describe("format", () => {
    it("should format a path object into a path string", () => {
      expect(
        format({
          root: "/",
          dir: "/foo/bar",
          base: "baz.html",
          ext: ".html",
          name: "baz",
        })
      ).toBe("/foo/bar/baz.html");
    });
  });

  describe("basename", () => {
    it("should return the last portion of a path", () => {
      expect(basename("/foo/bar/baz/asdf.html")).toBe("asdf.html");
      expect(basename("/foo/bar/baz/asdf.html", ".html")).toBe("asdf");
    });
  });

  describe("parse", () => {
    it("should parse a path into an object", () => {
      expect(parse("/home/user/dir/file.txt")).toEqual({
        root: "/",
        dir: "/home/user/dir",
        base: "file.txt",
        ext: ".txt",
        name: "file",
      });
    });
  });

  describe("matchesGlob", () => {
    it("should match path against glob patterns", () => {
      expect(matchesGlob("/foo/bar.js", "*.js")).toBe(false);
      expect(matchesGlob("/foo/bar.js", "**/bar.js")).toBe(true);
    });
  });
});
