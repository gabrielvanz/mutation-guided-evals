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

  it("should handle empty string as current directory", () => {
    expect(normalize("")).toBe(".");
  });

  it("should handle Windows style paths", () => {
    expect(normalize("foo\\bar\\baz")).toBe("foo/bar/baz");
    expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
  });

  it("should handle parent directories and current directories", () => {
    expect(normalize("foo/../bar")).toBe("bar");
    expect(normalize("foo/./bar")).toBe("foo/bar");
  });

  it("should handle trailing slashes", () => {
    expect(normalize("foo/bar/")).toBe("foo/bar/");
  });
});

describe("join", () => {
  it("should join path segments", () => {
    expect(join("/foo", "bar", "baz/asdf", "quux", "..")).toBe("/foo/bar/baz/asdf");
  });

  it("should ignore empty segments", () => {
    expect(join("foo", "", "bar")).toBe("foo/bar");
  });

  it("should return dot for empty arguments", () => {
    expect(join()).toBe(".");
  });
});

describe("resolve", () => {
  it("should resolve absolute path from segments", () => {
    expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
  });

  it("should handle multiple absolute paths", () => {
    expect(resolve("/foo/bar", "/baz")).toBe("/baz");
  });
});

describe("normalizeString", () => {
  it("should normalize a path string with allowAboveRoot true", () => {
    expect(normalizeString("/foo/../bar", true)).toBe("bar");
  });

  it("should normalize a path string with allowAboveRoot false", () => {
    expect(normalizeString("/foo/../../bar", false)).toBe("bar");
  });
});

describe("isAbsolute", () => {
  it("should identify absolute paths", () => {
    expect(isAbsolute("/foo/bar")).toBe(true);
    expect(isAbsolute("C:/foo/bar")).toBe(true);
    expect(isAbsolute("foo/bar")).toBe(false);
  });
});

describe("toNamespacedPath", () => {
  it("should normalize windows path for namespaced path", () => {
    expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
  });
});

describe("extname", () => {
  it("should return the extension of a file path", () => {
    expect(extname("index.html")).toBe(".html");
    expect(extname("index.coffee.md")).toBe(".md");
    expect(extname("index.")).toBe(".");
    expect(extname("index")).toBe("");
    expect(extname("..")).toBe("");
  });
});

describe("relative", () => {
  it("should compute relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });
});

describe("dirname", () => {
  it("should return the directory name of a path", () => {
    expect(dirname("/foo/bar/baz/asdf")).toBe("/foo/bar/baz");
    expect(dirname("/foo/bar/")).toBe("/foo");
    expect(dirname("foo")).toBe(".");
  });
});

describe("format", () => {
  it("should format a path object into a string", () => {
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
      name: "file"
    });
  });
});

describe("matchesGlob", () => {
  it("should match path against glob pattern", () => {
    expect(matchesGlob("foo/bar.js", "*.js")).toBe(false);
    expect(matchesGlob("foo/bar.js", "**/bar.js")).toBe(true);
  });
});
