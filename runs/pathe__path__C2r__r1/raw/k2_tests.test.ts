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
  it("should normalize paths correctly", () => {
    const cases = [
      { input: "", expected: "." },
      { input: "foo/bar//baz/..", expected: "foo/bar" },
      { input: "C:\\foo\\bar\\", expected: "C:/foo/bar/" },
      { input: "/foo/../bar", expected: "/bar" },
      { input: ".", expected: "." },
      { input: "..", expected: ".." }
    ];

    for (const { input, expected } of cases) {
      expect(normalize(input)).toBe(expected);
    }
  });
});

describe("join", () => {
  it("should join path segments", () => {
    expect(join("/foo", "bar", "baz/asdf")).toBe("/foo/bar/baz/asdf");
    expect(join("foo", "", "bar")).toBe("foo/bar");
    expect(join()).toBe(".");
  });
});

describe("resolve", () => {
  it("should resolve absolute paths", () => {
    expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
    expect(resolve("/foo/bar", "/baz")).toBe("/baz");
  });
});

describe("normalizeString", () => {
  it("should normalize string paths with allowAboveRoot", () => {
    expect(normalizeString("foo/../bar", false)).toBe("bar");
    expect(normalizeString("../foo", true)).toBe("../foo");
    expect(normalizeString("../foo", false)).toBe("foo");
  });
});

describe("isAbsolute", () => {
  it("should identify absolute paths", () => {
    expect(isAbsolute("/foo/bar")).toBe(true);
    expect(isAbsolute("C:/foo/bar")).toBe(true);
    expect(isAbsolute("foo/bar")).toBe(false);
    expect(isAbsolute("")).toBe(false);
  });
});

describe("toNamespacedPath", () => {
  it("should return normalized windows paths", () => {
    expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
    expect(toNamespacedPath("/foo/bar")).toBe("/foo/bar");
  });
});

describe("extname", () => {
  it("should return the file extension", () => {
    expect(extname("index.html")).toBe(".html");
    expect(extname("index.coffee.md")).toBe(".md");
    expect(extname("index.")).toBe(".");
    expect(extname("index")).toBe("");
    expect(extname(".gitignore")).toBe("");
  });
});

describe("relative", () => {
  it("should calculate relative path from one to another", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
    expect(relative("C:/foo/bar", "C:/foo/baz")).toBe("../baz");
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
        dir: "/foo/bar",
        base: "baz.html"
      })
    ).toBe("/foo/bar/baz.html");

    expect(
      format({
        name: "baz",
        ext: ".html"
      })
    ).toBe("baz.html");
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
      name: "file"
    });

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
  it("should match path against a glob pattern", () => {
    expect(matchesGlob("/foo/bar.js", "*.js")).toBe(false);
    expect(matchesGlob("/foo/bar.js", "**/bar.js")).toBe(true);
    expect(matchesGlob("/foo/bar.js", ["**/bar.js", "**/baz.js"])).toBe(true);
  });
});
