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
  it("should be a POSIX separator", () => {
    expect(sep).toBe("/");
  });
});

describe("normalize", () => {
  it("should normalize empty string to dot", () => {
    expect(normalize("")).toBe(".");
  });

  it("should normalize simple paths", () => {
    expect(normalize("foo/bar//baz/..")).toBe("foo/bar");
  });

  it("should handle Windows paths", () => {
    expect(normalize("C:\\foo\\bar\\..\\baz")).toBe("C:/foo/baz");
  });

  it("should preserve trailing slash", () => {
    expect(normalize("foo/bar/")).toBe("foo/bar/");
  });
});

describe("join", () => {
  it("should join path segments", () => {
    expect(join("foo", "bar", "baz")).toBe("foo/bar/baz");
  });

  it("should handle empty segments", () => {
    expect(join("foo", "", "bar")).toBe("foo/bar");
  });

  it("should handle trailing and leading slashes", () => {
    expect(join("/foo/", "/bar")).toBe("/foo/bar");
  });
});

describe("resolve", () => {
  it("should resolve absolute paths", () => {
    expect(resolve("/foo", "bar")).toBe("/foo/bar");
  });

  it("should handle empty arguments", () => {
    expect(resolve("")).not.toBe("");
  });
});

describe("normalizeString", () => {
  it("should normalize string with dots and allow above root", () => {
    expect(normalizeString("foo/../bar", true)).toBe("bar");
  });

  it("should handle above root when allowed", () => {
    expect(normalizeString("../foo", true)).toBe("../foo");
  });
});

describe("isAbsolute", () => {
  it("should return true for absolute POSIX paths", () => {
    expect(isAbsolute("/foo/bar")).toBe(true);
  });

  it("should return true for absolute Windows paths", () => {
    expect(isAbsolute("C:\\foo/bar")).toBe(true);
  });

  it("should return false for relative paths", () => {
    expect(isAbsolute("foo/bar")).toBe(false);
  });
});

describe("toNamespacedPath", () => {
  it("should normalize windows path for namespaced path", () => {
    expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
  });
});

describe("extname", () => {
  it("should return file extension", () => {
    expect(extname("index.html")).toBe(".html");
  });

  it("should return empty string if no extension", () => {
    expect(extname("index")).toBe("");
  });

  it("should handle special cases like double dots", () => {
    expect(extname("file.tar.gz")).toBe(".gz");
  });
});

describe("relative", () => {
  it("should compute relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });

  it("should return target if drive letters differ on Windows", () => {
    expect(relative("C:/foo", "D:/bar")).toBe("D:/bar");
  });
});

describe("dirname", () => {
  it("should return directory name of a path", () => {
    expect(dirname("/foo/bar/baz.txt")).toBe("/foo/bar");
  });

  it("should handle root paths", () => {
    expect(dirname("/foo")).toBe("/");
  });

  it("should return dot for relative single file", () => {
    expect(dirname("foo.txt")).toBe(".");
  });
});

describe("format", () => {
  it("should format a path object into a string", () => {
    expect(format({ root: "/", dir: "/foo/bar", base: "baz.txt" })).toBe("/foo/bar/baz.txt");
  });

  it("should handle extension property if base is missing", () => {
    expect(format({ root: "/", dir: "/foo", name: "bar", ext: "txt" })).toBe("/foo/bar.txt");
  });
});

describe("basename", () => {
  it("should return the last portion of a path", () => {
    expect(basename("/foo/bar/baz.txt")).toBe("baz.txt");
  });

  it("should strip extension if provided", () => {
    expect(basename("/foo/bar/baz.txt", ".txt")).toBe("baz");
  });
});

describe("parse", () => {
  it("should parse path into object components", () => {
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
  it("should return true when path matches glob pattern", () => {
    expect(matchesGlob("/foo/bar.js", "*.js")).toBe(false);
    expect(matchesGlob("foo/bar.js", "**/bar.js")).toBe(true);
  });
});
