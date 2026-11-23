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
  it("should normalize empty string to dot", () => {
    expect(normalize("")).toBe(".");
  });

  it("should handle simple paths", () => {
    expect(normalize("foo/bar//baz/..")).toBe("foo/bar");
  });

  it("should normalize Windows paths with backslashes", () => {
    expect(normalize("foo\\bar\\baz")).toBe("foo/bar/baz");
  });

  it("should handle absolute paths and trailing separators", () => {
    expect(normalize("/foo/bar/")).toBe("/foo/bar/");
  });

  it("should handle drive letters", () => {
    expect(normalize("C:\\foo")).toBe("C:/foo");
    expect(normalize("C:")).toBe("C:/");
  });
});

describe("join", () => {
  it("should join path segments", () => {
    expect(join("foo", "bar", "baz")).toBe("foo/bar/baz");
  });

  it("should ignore empty segments", () => {
    expect(join("foo", "", "bar")).toBe("foo/bar");
  });

  it("should handle duplicate slashes between segments", () => {
    expect(join("foo/", "/bar")).toBe("foo/bar");
  });

  it("should return dot for empty segments", () => {
    expect(join("", "")).toBe(".");
  });
});

describe("resolve", () => {
  it("should resolve absolute paths", () => {
    expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
  });

  it("should resolve relative paths using cwd", () => {
    expect(resolve("foo/bar")).toContain("foo/bar");
  });

  it("should handle multiple arguments", () => {
    expect(resolve("/foo", "bar", "baz")).toBe("/foo/bar/baz");
  });
});

describe("normalizeString", () => {
  it("should normalize string allowing above root", () => {
    expect(normalizeString("/foo/../..", true)).toBe("..");
  });

  it("should normalize string not allowing above root", () => {
    expect(normalizeString("/foo/../../bar", false)).toBe("bar");
  });
});

describe("isAbsolute", () => {
  it("should identify absolute paths", () => {
    expect(isAbsolute("/foo/bar")).toBe(true);
    expect(isAbsolute("C:\\foo")).toBe(true);
    expect(isAbsolute("foo/bar")).toBe(false);
  });
});

describe("toNamespacedPath", () => {
  it("should normalize windows paths for namespacing", () => {
    expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
  });
});

describe("extname", () => {
  it("should return the file extension", () => {
    expect(extname("index.html")).toBe(".html");
    expect(extname("file.tar.gz")).toBe(".gz");
    expect(extname("noextension")).toBe("");
    expect(extname("..")).toBe("");
  });
});

describe("relative", () => {
  it("should calculate relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });

  it("should handle same path", () => {
    expect(relative("/foo/bar", "/foo/bar")).toBe("");
  });
});

describe("dirname", () => {
  it("should return the directory name of a path", () => {
    expect(dirname("/foo/bar/baz.txt")).toBe("/foo/bar");
    expect(dirname("/foo/bar/")).toBe("/foo");
    expect(dirname("foo")).toBe(".");
  });
});

describe("format", () => {
  it("should format a path object into a string", () => {
    expect(
      format({
        root: "/",
        dir: "/foo/bar",
        base: "baz.txt"
      })
    ).toBe("/foo/bar/baz.txt");
  });
});

describe("basename", () => {
  it("should return the last portion of a path", () => {
    expect(basename("/foo/bar/baz.txt")).toBe("baz.txt");
    expect(basename("/foo/bar/baz.txt", ".txt")).toBe("baz");
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
    expect(matchesGlob("/foo/bar.js", "*.js")).toBe(false);
    expect(matchesGlob("/foo/bar.js", "**/bar.js")).toBe(true);
  });
});
