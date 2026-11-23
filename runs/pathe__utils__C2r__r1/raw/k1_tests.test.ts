import { describe, it, expect } from "vitest";
import { normalizeAliases, resolveAlias, reverseResolveAlias, filename } from "../../src/utils";

describe("normalizeAliases", () => {
  it("should sort aliases from specific to general and resolve nested aliases", () => {
    const input = {
      "@app": "/src/app",
      "@app/components": "/src/app/components",
    };
    const result = normalizeAliases(input);
    expect(result).toEqual({
      "@app/components": "/src/app/components",
      "@app": "/src/app",
    });
  });

  it("should return the same object if already normalized", () => {
    const input = { "@app": "/src/app" };
    const normalized = normalizeAliases(input);
    const reNormalized = normalizeAliases(normalized);
    expect(reNormalized).toBe(normalized);
  });

  it("should resolve alias values in relation to each other when path separator matches", () => {
    const input = {
      "~": "/root",
      "~/src": "/root/components",
    };
    const result = normalizeAliases(input);
    expect(result["~/src"]).toBe("/root/components");
  });
});

describe("resolveAlias", () => {
  it("should resolve path matching an alias", () => {
    const aliases = {
      "@components": "/src/components",
    };
    const result = resolveAlias("@components/Button.ts", aliases);
    expect(result).toBe("/src/components/Button.ts");
  });

  it("should return original path normalized when no alias matches", () => {
    const aliases = {
      "@components": "/src/components",
    };
    const result = resolveAlias("C:\\utils\\index.ts", aliases);
    expect(result).toBe("C:/utils/index.ts");
  });

  it("should handle Windows paths in aliases and input", () => {
    const aliases = {
      "~": "C:\\project",
    };
    const result = resolveAlias("~/src/index.ts", aliases);
    expect(result).toBe("C:/project/src/index.ts");
  });
});

describe("reverseResolveAlias", () => {
  it("should return an array of possible alias resolutions sorted by specificity", () => {
    const aliases = {
      "src": "/src",
      "src/components": "/src/components",
    };
    const result = reverseResolveAlias("/src/components/Button.ts", aliases);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return an empty array if no reverse alias matches", () => {
    const aliases = {
      "@app": "/app",
    };
    const result = reverseResolveAlias("/other/file.ts", aliases);
    expect(result).toEqual([]);
  });
});

describe("filename", () => {
  const cases = [
    { input: "/path/to/file.ts", expected: "file" },
    { input: "file.tar.gz", expected: "file.tar" },
    { input: "/path/to/.gitignore", expected: ".gitignore" },
    { input: "no-extension", expected: "no-extension" },
    { input: "", expected: undefined },
    { input: "/", expected: undefined },
    { input: "C:\\path\\to\\file.js", expected: "file" },
  ];

  for (const { input, expected } of cases) {
    it(`should extract filename for ${JSON.stringify(input)}`, () => {
      expect(filename(input)).toBe(expected);
    });
  }
});
