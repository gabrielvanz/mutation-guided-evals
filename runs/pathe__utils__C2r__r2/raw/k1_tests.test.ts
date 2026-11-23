import { describe, it, expect } from "vitest";
import {
  normalizeAliases,
  resolveAlias,
  reverseResolveAlias,
  filename,
} from "../../src/utils";

describe("normalizeAliases", () => {
  it("should return the same object if already normalized", () => {
    const aliases = { "@app": "/src/app" };
    const normalized1 = normalizeAliases(aliases);
    const normalized2 = normalizeAliases(normalized1);
    expect(normalized2).toBe(normalized1);
  });

  it("should sort aliases from specific to general and resolve nested aliases", () => {
    const aliases = {
      "~/components": "/root/src/components",
      "~": "/root",
    };
    const result = normalizeAliases(aliases);
    expect(result).toEqual({
      "~/components": "/root/src/components",
      "~": "/root",
    });
  });

  it("should handle empty alias records", () => {
    const result = normalizeAliases({});
    expect(result).toEqual({});
  });
});

describe("resolveAlias", () => {
  const cases = [
    {
      path: "@app/index.ts",
      aliases: { "@app": "/src/app" },
      expected: "/src/app/index.ts",
    },
    {
      path: "@app/",
      aliases: { "@app": "/src/app" },
      expected: "/src/app/",
    },
    {
      path: "~components/button",
      aliases: { "~": "/root", "~components": "/root/components" },
      expected: "/root/components/button",
    },
    {
      path: "C:\\projects\\app\\file.ts",
      aliases: { "C:/projects/app": "/app" },
      expected: "/app/file.ts",
    },
    {
      path: "other/path",
      aliases: { "@app": "/src/app" },
      expected: "other/path",
    },
    {
      path: "",
      aliases: {},
      expected: "",
    },
  ];

  for (const { path, aliases, expected } of cases) {
    it(`should resolve path "${path}"`, () => {
      expect(resolveAlias(path, aliases)).toBe(expected);
    });
  }
});

describe("reverseResolveAlias", () => {
  it("should return sorted array of possible alias resolutions longest first", () => {
    const aliases = {
      "~": "/root",
      "~components": "/root/components",
    };
    const result = reverseResolveAlias("/root/components/button", aliases);
    expect(result).toEqual(["~/components/button", "~components/button"]);
  });

  it("should return empty array when no alias matches", () => {
    const aliases = { "@app": "/src/app" };
    const result = reverseResolveAlias("/other/path", aliases);
    expect(result).toEqual([]);
  });

  it("should handle empty path and aliases", () => {
    const result = reverseResolveAlias("", {});
    expect(result).toEqual([]);
  });
});

describe("filename", () => {
  const cases = [
    { input: "/path/to/file.ts", expected: "file" },
    { input: "file.spec.ts", expected: "file.spec" },
    { input: "C:\\path\\to\\image.png", expected: "image" },
    { input: "README", expected: "README" },
    { input: ".gitignore", expected: ".gitignore" },
    { input: "/path/to/", expected: undefined },
    { input: "", expected: undefined },
    { input: "a/b/c.d.e.js", expected: "a/b/c.d.e".split("/").pop() },
  ];

  for (const { input, expected } of cases) {
    it(`should extract filename from "${input}"`, () => {
      expect(filename(input)).toBe(expected);
    });
  }
});
