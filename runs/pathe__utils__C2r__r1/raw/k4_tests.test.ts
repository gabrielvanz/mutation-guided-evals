import { describe, it, expect } from "vitest";
import { normalizeAliases, resolveAlias, reverseResolveAlias, filename } from "../../src/utils";

describe("normalizeAliases", () => {
  it("should sort aliases by specificity and resolve nested aliases", () => {
    const input = {
      "@foo": "/src/foo",
      "@foo/bar": "/src/foo/bar-impl",
    };
    const result = normalizeAliases(input);
    expect(result).toEqual({
      "@foo/bar": "/src/foo/bar-impl",
      "@foo": "/src/foo",
    });
  });

  it("should return the same object if already normalized", () => {
    const input = {
      "@foo": "/src/foo",
    };
    const normalized = normalizeAliases(input);
    const reNormalized = normalizeAliases(normalized);
    expect(reNormalized).toBe(normalized);
  });

  it("should handle empty aliases record", () => {
    const result = normalizeAliases({});
    expect(result).toEqual({});
  });

  it("should resolve alias values referencing other aliases", () => {
    const input = {
      "~": "/root",
      "~/components": "~/comp",
    };
    const result = normalizeAliases(input);
    expect(result).toEqual({
      "~": "/root",
      "~/components": "~/comp",
    });
  });
});

describe("resolveAlias", () => {
  const aliases = {
    "@app": "/project/src",
    "@components": "/project/src/components",
  };

  const testCases = [
    { path: "@app/index.ts", expected: "/project/src/index.ts" },
    { path: "@components/Button.tsx", expected: "/project/src/components/Button.tsx" },
    { path: "@app-other/file.ts", expected: "@app-other/file.ts" },
    { path: "/absolute/path.ts", expected: "/absolute/path.ts" },
    { path: "C:\\project\\src\\index.ts", expected: "C:/project/src/index.ts" },
    { path: "", expected: "" },
  ];

  for (const { path, expected } of testCases) {
    it(`should resolve ${path} to ${expected}`, () => {
      expect(resolveAlias(path, aliases)).toBe(expected);
    });
  }
});

describe("reverseResolveAlias", () => {
  it("should return reverse resolved aliases sorted by specificity", () => {
    const aliases = {
      "~": "/project/src",
      "~/components": "/project/src/components",
    };

    const result = reverseResolveAlias("/project/src/components/Button.tsx", aliases);
    expect(result).toEqual([
      "~/components/Button.tsx",
      "~/components/Button.tsx",
    ]);
  });

  it("should return an empty array when no alias matches", () => {
    const aliases = {
      "@app": "/project/src",
    };
    const result = reverseResolveAlias("/other/path/file.ts", aliases);
    expect(result).toEqual([]);
  });
});

describe("filename", () => {
  const testCases = [
    { input: "/path/to/file.ts", expected: "file" },
    { input: "file.min.js", expected: "file.min" },
    { input: "README", expected: "README" },
    { input: ".gitignore", expected: ".gitignore" },
    { input: "/path/to/", expected: undefined },
    { input: "", expected: undefined },
    { input: "C:\\dir\\file.txt", expected: "file" },
  ];

  for (const { input, expected } of testCases) {
    it(`should extract filename from ${JSON.stringify(input)}`, () => {
      expect(filename(input)).toBe(expected);
    });
  }
});
