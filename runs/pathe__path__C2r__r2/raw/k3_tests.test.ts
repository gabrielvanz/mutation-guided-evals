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
  it("should be a forward slash", () => {
    expect(sep).toBe("/");
  });
});

describe("normalize", () => {
  it("should normalize simple paths and windows paths", () => {
    expect(normalize("foo/bar")).toBe("foo/bar");
    expect(normalize("foo\\bar")).toBe("foo/bar");
    expect(normalize("")).toBe(".");
    expect(normalize("foo//bar/../baz")).toBe("foo/baz");
    expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
  });

  it("should handle absolute paths and trailing slashes", () => {
    expect(normalize("/foo/bar/")).toBe("/foo/bar/");
    expect(normalize("/")).toBe("/");
  });
});

describe("join", () => {
  it("should join path segments correctly", () => {
    expect(join("foo", "bar", "baz")).toBe("foo/bar/baz");
    expect(join("/foo", "bar")).toBe("/foo/bar");
    expect(join("foo/", "/bar")).toBe("foo/bar");
    expect(join("")).toBe(".");
  });
});

describe("resolve", () => {
  it("should resolve absolute paths", () => {
    expect(resolve("/foo", "bar", "baz")).toBe("/foo/bar/baz");
    expect(resolve("/foo", "/bar")).toBe("/bar");
  });
});

describe("normalizeString", () => {
  it("should normalize string segments with allowAboveRoot flag", () => {
    expect(normalizeString("foo/../bar", false)).toBe("bar");
    expect(normalizeString("foo/../../bar", true)).toBe("../bar");
  });
});

describe("isAbsolute", () => {
  it("should correctly identify absolute paths", () => {
    expect(isAbsolute("/foo/bar")).toBe(true);
    expect(isAbsolute("C:/foo/bar")).toBe(true);
    expect(isAbsolute("C:\\foo\\bar")).toBe(true);
    expect(isAbsolute("foo/bar")).toBe(false);
    expect(isAbsolute("")).toBe(false);
  });
});

describe("toNamespacedPath", () => {
  it("should normalize windows paths for namespacing", () => {
    expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
  });
});

describe("extname", () => {
  it("should return the correct extension", () => {
    expect(extname("index.html")).toBe(".html");
    expect(extname("index.coffee.md")).toBe(".md");
    expect(extname("index.")).toBe(".");
    expect(extname("index")).toBe("");
    expect(extname(".gitignore")).toBe("");
  });
});

describe("relative", () => {
  it("should calculate relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
    expect(relative("C:/orandea/test/aaa", "D:/orandea/impl/bbb")).toBe("D:/orandea/impl/bbb");
  });
});

describe("dirname", () => {
  it("should return the directory name of a path", () => {
    expect(dirname("/foo/bar/baz/asdf")).toBe("/foo/bar/baz");
    expect(dirname("C:/foo/bar")).toBe("C:/foo");
    expect(dirname("/foo")).toBe("/");
    expect(dirname("foo")).toBe(".");
  });
});

describe("format", () => {
  it("should format a path object into a path string", () => {
    expect(
      format({
        root: "/",
        dir: "/home/user/dir",
        base: "file.txt",
        ext: ".txt",
        name: "file"
      })
    ).toBe("/home/user/dir/file.txt");
  });
});

describe("basename", () => {
  it("should return the last portion of a path", () => {
    expect(basename("/foo/bar/baz/asdf.html", ".html")).toBe("asdf");
    expect(basename("/foo/bar/baz/asdf.html")).toBe("asdf.html");
    expect(basename("")).toBe("");
  });
});

describe("parse", () => {
  it("should parse a path into an object", () => {
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
  it("should match path against glob patterns", () => {
    expect(matchesGlob("foo/bar.js", "*.js")).toBe(false);
    expect(matchesGlob("foo/bar.js", "**/bar.js")).toBe(true);
  });
});
