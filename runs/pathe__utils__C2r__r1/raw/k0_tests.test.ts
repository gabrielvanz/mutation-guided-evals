import { describe, it, expect } from "vitest";
import { normalizeAliases, resolveAlias, reverseResolveAlias, filename } from "../../src/utils";

describe("normalizeAliases", () => {
  it("should sort aliases from specific to general and resolve nested aliases", () => {
    const input = {
      "~/": "/root/",
      "~/components": "/root/components/",
    };
    const result = normalizeAliases(input);
    expect(result).toEqual({
      "~/components": "/root/components/",
      "~/": "/root/",
    });
  });

  it("should return already normalized aliases when symbol is present", () => {
    const input = {
      "@": "/src",
    };
    const normalized = normalizeAliases(input);
    const reNormalized = normalizeAliases(normalized);
    expect(reNormalized).toBe(normalized);
  });
});

describe("resolveAlias", () => {
  it("should resolve a path matching an alias", () => {
    const aliases = {
      "@": "/src",
    };
    const result = resolveAlias("@/components/App.vue", aliases);
    expect(result).toBe("/src/components/App.vue");
  });

  it("should return the original normalized path if no alias matches", () => {
    const aliases = {
      "@": "/src",
    };
    const result = resolveAlias("C:\\other\\file.ts", aliases);
    expect(result).toBe("C:/other/file.ts");
  });
});

describe("reverseResolveAlias", () => {
  it("should return sorted array of possible alias resolutions", () => {
    const aliases = {
      "@": "/src",
      "@components": "/src/components",
    };
    const result = reverseResolveAlias("/src/components/Button.vue", aliases);
    expect(result).toEqual(["@/components/Button.vue", "@components/Button.vue"]);
  });

  it("should return an empty array when no alias matches", () => {
    const aliases = {
      "@": "/src",
    };
    const result = reverseResolveAlias("/unknown/path.ts", aliases);
    expect(result).toEqual([]);
  });
});

describe("filename", () => {
  const cases = [
    { input: "/path/to/file.ts", expected: "file" },
    { input: "file.min.js", expected: "file.min" },
    { input: "file", expected: "file" },
    { input: ".gitignore", expected: ".gitignore" },
    { input: "/path/to/", expected: undefined },
    { input: "", expected: undefined },
    { input: "C:\\path\\to\\image.png", expected: "image" },
  ];

  for (const { input, expected } of cases) {
    it(`should extract filename for ${JSON.stringify(input)}`, () => {
      expect(filename(input)).toBe(expected);
    });
  }
});
