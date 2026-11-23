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
  it("should normalize simple paths", () => {
    expect(normalize("foo/bar//baz/..")).toBe("foo/bar");
  });

  it("should handle empty string", () => {
    expect(normalize("")).toBe(".");
  });

  it("should handle Windows style paths", () => {
    expect(normalize("foo\\bar\\baz")).toBe("foo/bar/baz");
    expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
  });

  it("should preserve absolute paths and trailing slashes", () => {
    expect(normalize("/foo/bar/")).toBe("/foo/bar/");
    expect(normalize("/")).toBe("/");
  });

  it("should handle UNC paths", () => {
    expect(normalize("\\\\server\\share\\foo")).toBe("//server/share/foo");
  });
});

describe("join", () => {
  it("should join multiple path segments", () => {
    expect(join("foo", "bar", "baz")).toBe("foo/bar/baz");
  });

  it("should handle empty or falsy segments", () => {
    expect(join("foo", "", "bar")).toBe("foo/bar");
    expect(join("")).toBe(".");
  });

  it("should handle Windows separators in segments", () => {
    expect(join("foo\\bar", "baz")).toBe("foo/bar/baz");
  });
});

describe("resolve", () => {
  it("should resolve relative paths to absolute paths", () => {
    expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
  });

  it("should resolve multiple segments", () => {
    expect(resolve("/foo", "bar", "baz")).toBe("/foo/bar/baz");
  });

  it("should handle empty paths by falling back to cwd", () => {
    expect(resolve("")).not.toBe("");
  });
});

describe("normalizeString", () => {
  it("should normalize a path string without allowing above root", () => {
    expect(normalizeString("foo/../bar", false)).toBe("bar");
  });

  it("should allow above root when specified", () => {
    expect(normalizeString("foo/../../bar", true)).toBe("../bar");
  });
});

describe("isAbsolute", () => {
  it("should correctly identify absolute paths", () => {
    expect(isAbsolute("/foo/bar")).toBe(true);
    expect(isAbsolute("C:/foo/bar")).toBe(true);
    expect(isAbsolute("C:\\foo\\bar")).toBe(true);
    expect(isAbsolute("//server/share")).toBe(true);
    expect(isAbsolute("foo/bar")).toBe(false);
  });
});

describe("toNamespacedPath", () => {
  it("should convert windows paths in namespaced paths", () => {
    expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
  });
});

describe("extname", () => {
  it("should return the file extension", () => {
    expect(extname("index.html")).toBe(".html");
    expect(extname("index.coffee.md")).toBe(".md");
    expect(extname("index.")).toBe(".");
    expect(extname("index")).toBe("");
    expect(extname(".gitignore")).toBe("");
    expect(extname("..")).toBe("");
  });
});

describe("relative", () => {
  it("should calculate relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });

  it("should handle same drive letters or absolute paths", () => {
    expect(relative("C:/foo/bar", "C:/foo/baz")).toBe("../baz");
  });

  it("should return absolute path if drive letters differ", () => {
    expect(relative("C:/foo", "D:/bar")).toBe("D:/bar");
  });
});

describe("dirname", () => {
  it("should return the directory name", () => {
    expect(dirname("/foo/bar/baz/asdf")).toBe("/foo/bar/baz");
    expect(dirname("/foo/bar/")).toBe("/foo");
    expect(dirname("foo")).toBe(".");
    expect(dirname("C:/foo")).toBe("C:/");
  });
});

describe("format", () => {
  it("should format path object into a path string", () => {
    expect(
      format({
        root: "/",
        dir: "/home/user/dir",
        base: "file.txt",
        ext: ".txt",
        name: "file",
      })
    ).toBe("/home/user/dir/file.txt");
  });

  it("should format with name and ext if base is missing", () => {
    expect(
      format({
        root: "",
        dir: "dir",
        name: "file",
        ext: "txt",
      })
    ).toBe("dir/file.txt");
  });
});

describe("basename", () => {
  it("should return the last portion of a path", () => {
    expect(basename("/foo/bar/baz/asdf.html")).toBe("asdf.html");
    expect(basename("/foo/bar/baz/asdf.html", ".html")).toBe("asdf");
    expect(basename("/foo/bar/baz/")).toBe("baz");
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

  it("should parse paths without directories", () => {
    expect(parse("file.txt")).toEqual({
      root: "",
      dir: "",
      base: "file.txt",
      ext: ".txt",
      name: "file",
    });
  });
});

describe("matchesGlob", () => {
  it("should match path against glob pattern", () => {
    expect(matchesGlob("foo/bar.js", "*.js")).toBe(false);
    expect(matchesGlob("foo/bar.js", "**/bar.js")).toBe(true);
    expect(matchesGlob("foo/bar.js", ["*.txt", "**/*.js"])).toBe(true);
  });
});
