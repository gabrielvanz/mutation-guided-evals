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
    expect(normalize("foo/bar//baz/asdf")).toBe("foo/bar/baz/asdf");
  });

  it("should handle empty string as dot", () => {
    expect(normalize("")).toBe(".");
  });

  it("should normalize windows paths", () => {
    expect(normalize("foo\\bar\\baz")).toBe("foo/bar/baz");
  });

  it("should handle absolute paths", () => {
    expect(normalize("/foo/bar//baz")).toBe("/foo/bar/baz");
  });

  it("should handle trailing slashes", () => {
    expect(normalize("foo/bar/")).toBe("foo/bar/");
  });

  it("should handle drive letters", () => {
    expect(normalize("C:\\foo")).toBe("C:/foo");
    expect(normalize("C:")).toBe("C:/");
  });
});

describe("join", () => {
  it("should join multiple segments", () => {
    expect(join("foo", "bar", "baz")).toBe("foo/bar/baz");
  });

  it("should ignore empty segments", () => {
    expect(join("foo", "", "bar")).toBe("foo/bar");
  });

  it("should handle slashes correctly", () => {
    expect(join("/foo", "bar")).toBe("/foo/bar");
    expect(join("foo/", "/bar")).toBe("foo/bar");
  });
});

describe("resolve", () => {
  it("should resolve relative paths to absolute", () => {
    const resolved = resolve("foo/bar");
    expect(isAbsolute(resolved)).toBe(true);
    expect(resolved.endsWith("foo/bar")).toBe(true);
  });

  it("should handle absolute paths in arguments", () => {
    expect(resolve("/foo/bar", "/baz")).toBe("/baz");
  });

  it("should handle empty arguments", () => {
    const resolved = resolve("", "foo");
    expect(isAbsolute(resolved)).toBe(true);
    expect(resolved.endsWith("foo")).toBe(true);
  });
});

describe("normalizeString", () => {
  it("should normalize segments like . and ..", () => {
    expect(normalizeString("foo/./bar/../baz", false)).toBe("foo/baz");
  });

  it("should allow above root when specified", () => {
    expect(normalizeString("../foo", true)).toBe("../foo");
  });

  it("should not allow above root when false", () => {
    expect(normalizeString("/../../foo", false)).toBe("foo");
  });
});

describe("isAbsolute", () => {
  it("should identify absolute posix paths", () => {
    expect(isAbsolute("/foo/bar")).toBe(true);
  });

  it("should identify absolute windows paths", () => {
    expect(isAbsolute("C:\\foo")).toBe(true);
    expect(isAbsolute("C:/foo")).toBe(true);
  });

  it("should identify relative paths as not absolute", () => {
    expect(isAbsolute("foo/bar")).toBe(false);
    expect(isAbsolute("./foo")).toBe(false);
  });
});

describe("toNamespacedPath", () => {
  it("should normalize windows paths", () => {
    expect(toNamespacedPath("foo\\bar")).toBe("foo/bar");
  });
});

describe("extname", () => {
  it("should return the extension of a file", () => {
    expect(extname("index.html")).toBe(".html");
    expect(extname("index.coffee.md")).toBe(".md");
  });

  it("should return empty string if no extension", () => {
    expect(extname("index")).toBe("");
    expect(extname(".gitignore")).toBe("");
  });

  it("should handle special cases", () => {
    expect(extname("..")).toBe("");
    expect(extname("dir/file.txt")).toBe(".txt");
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
  it("should return the directory name of a path", () => {
    expect(dirname("/foo/bar/baz/asdf")).toBe("/foo/bar/baz");
    expect(dirname("foo/bar")).toBe("foo");
    expect(dirname("/foo")).toBe("/");
  });

  it("should handle trailing slashes", () => {
    expect(dirname("/foo/bar/")).toBe("/foo");
  });

  it("should return dot for simple filenames", () => {
    expect(dirname("foo")).toBe(".");
  });
});

describe("format", () => {
  it("should format a path object into a string", () => {
    expect(
      format({
        root: "/",
        dir: "/home/user/dir",
        base: "file.txt"
      })
    ).toBe("/home/user/dir/file.txt");
  });

  it("should handle name and ext when base is missing", () => {
    expect(
      format({
        root: "/",
        name: "file",
        ext: ".txt"
      })
    ).toBe("/file.txt");
  });
});

describe("basename", () => {
  it("should return the last portion of a path", () => {
    expect(basename("/foo/bar/baz/asdf.html")).toBe("asdf.html");
    expect(basename("/foo/bar/baz/asdf")).toBe("asdf");
  });

  it("should strip extension if provided", () => {
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
      name: "file"
    });
  });

  it("should parse relative paths", () => {
    expect(parse("file.txt")).toEqual({
      root: "",
      dir: "",
      base: "file.txt",
      ext: ".txt",
      name: "file"
    });
  });
});

describe("matchesGlob", () => {
  it("should match path against glob pattern", () => {
    expect(matchesGlob("src/index.ts", "src/*.ts")).toBe(true);
    expect(matchesGlob("src/index.js", "src/*.ts")).toBe(false);
  });

  it("should match against array of patterns", () => {
    expect(matchesGlob("src/index.ts", ["src/*.js", "src/*.ts"])).toBe(true);
  });
});
