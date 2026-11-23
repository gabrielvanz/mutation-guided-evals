import { describe, it, expect } from "vitest";
import { normalizeAliases, resolveAlias, reverseResolveAlias, filename } from "../../src/utils";

describe("normalizeAliases", () => {
  it("should sort aliases by specificity and resolve nested aliases", () => {
    const input = {
      "~/": "/root/",
      "~/components": "/root/src/components",
    };
    const result = normalizeAliases(input);
    expect(result["~/components"]).toBe("/root/src/components");
  });

  it("should return the same object if already normalized", () => {
    const input = { "~": "/root" };
    const normalized = normalizeAliases(input);
    const reNormalized = normalizeAliases(normalized);
    expect(reNormalized).toBe(normalized);
  });
});

describe("resolveAlias", () => {
  it("should resolve a matching alias path", () => {
    const aliases = {
      "@": "/src",
    };
    const result = resolveAlias("@/components/Button.ts", aliases);
    expect(result).toBe("/src/components/Button.ts");
  });

  it("should return the original path if no alias matches", () => {
    const aliases = {
      "@": "/src",
    };
    const result = resolveAlias("/other/path.ts", aliases);
    expect(result).toBe("/other/path.ts");
  });
});

describe("reverseResolveAlias", () => {
  it("should return possible alias resolutions sorted by length", () => {
    const aliases = {
      "@": "/src",
      "@components": "/src/components",
    };
    const result = reverseResolveAlias("/src/components/Button.ts", aliases);
    expect(result).toEqual([
      "@/components/Button.ts",
      "@components/Button.ts",
    ]);
  });

  it("should return an empty array if path does not match any alias target", () => {
    const aliases = {
      "@": "/src",
    };
    const result = reverseResolveAlias("/other/path.ts", aliases);
    expect(result).toEqual([]);
  });
});

describe("filename", () => {
  const cases = [
    { input: "/path/to/file.ts", expected: "file" },
    { input: "file.min.js", expected: "file.min" },
    { input: "/path/to/.gitignore", expected: ".gitignore" },
    { input: "README", expected: "README" },
    { input: "", expected: undefined },
    { input: "/", expected: undefined },
    { input: "C:\\path\\to\\file.txt", expected: "file" },
  ];

  for (const { input, expected } of cases) {
    it(`should extract filename from ${input ? JSON.stringify(input) : "empty string"}`, () => {
      expect(filename(input)).toBe(expected);
    });
  }
});
