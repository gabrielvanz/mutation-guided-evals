import { describe, it, expect } from "vitest";
import {
  normalizeAliases,
  resolveAlias,
  reverseResolveAlias,
  filename
} from "../../src/utils";

describe("normalizeAliases", () => {
  it("should sort aliases from specific to general and resolve nested aliases", () => {
    const input = {
      "~/": "/home/user/",
      "~/src": "/home/user/src",
    };
    const result = normalizeAliases(input);
    expect(result).toEqual({
      "~/src": "/home/user/src",
      "~/": "/home/user/",
    });
  });

  it("should return the same object if already normalized", () => {
    const input = {
      "@": "/app",
    };
    const normalized = normalizeAliases(input);
    const reNormalized = normalizeAliases(normalized);
    expect(reNormalized).toBe(normalized);
  });
});

describe("resolveAlias", () => {
  it("should resolve a matching alias to its target path", () => {
    const aliases = {
      "@components": "/app/src/components",
    };
    const result = resolveAlias("@components/Button.ts", aliases);
    expect(result).toBe("/app/src/components/Button.ts");
  });

  it("should return normalized original path if no alias matches", () => {
    const aliases = {
      "@components": "/app/src/components",
    };
    const result = resolveAlias("C:\\utils\\file.ts", aliases);
    expect(result).toBe("C:/utils/file.ts");
  });

  it("should handle Windows paths correctly in aliases and input", () => {
    const aliases = {
      "~": "C:\\project\\src",
    };
    const result = resolveAlias("~/index.ts", aliases);
    expect(result).toBe("C:/project/src/index.ts");
  });
});

describe("reverseResolveAlias", () => {
  it("should return an array of possible alias resolutions sorted by specificity", () => {
    const aliases = {
      "src": "/app/src",
      "src/components": "/app/src/components",
    };
    const result = reverseResolveAlias("/app/src/components/Button.ts", aliases);
    expect(result).toEqual([
      "src/components/Button.ts",
      "src/components/Button.ts",
    ]);
  });

  it("should return an empty array when no alias matches", () => {
    const aliases = {
      "@": "/app",
    };
    const result = reverseResolveAlias("/other/path.ts", aliases);
    expect(result).toEqual([]);
  });
});

describe("filename", () => {
  const cases = [
    { input: "/path/to/file.ts", expected: "file" },
    { input: "C:\\path\\to\\file.d.ts", expected: "file.d" },
    { input: "file.txt", expected: "file" },
    { input: ".gitignore", expected: ".gitignore" },
    { input: "/path/to/", expected: undefined },
    { input: "", expected: undefined },
  ];

  for (const { input, expected } of cases) {
    it(`should extract filename for ${JSON.stringify(input)}`, () => {
      expect(filename(input)).toBe(expected);
    });
  }
});
