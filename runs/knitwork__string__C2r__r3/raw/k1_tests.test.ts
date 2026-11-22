import { describe, it, expect } from "vitest";
import { genString, escapeString, genSafeVariableName } from "../../src/string";

describe("genString", () => {
  it("should generate a double quoted string by default", () => {
    const input = "hello world";
    const result = genString(input);
    expect(result).toBe("\"hello world\"");
  });

  it("should generate a single quoted string when singleQuotes is true", () => {
    const input = "hello world";
    const result = genString(input, { singleQuotes: true });
    expect(result).toBe("'hello world'");
  });

  it("should escape double quotes when using double quotes", () => {
    const input = 'hello "world"';
    const result = genString(input);
    expect(result).toBe("\"hello \\\"world\\\"\"");
  });

  it("should escape single quotes and unescape inner quotes when using single quotes", () => {
    const input = "hello 'world'";
    const result = genString(input, { singleQuotes: true });
    expect(result).toBe("'hello \\'world\\''");
  });

  it("should handle empty strings", () => {
    const result = genString("");
    expect(result).toBe("\"\"");
  });
});

describe("escapeString", () => {
  it("should return the original string if no escapes are needed", () => {
    const input = "hello world";
    const result = escapeString(input);
    expect(result).toBe("hello world");
  });

  it("should escape backslashes", () => {
    const input = "C:\\path\\to\\file";
    const result = escapeString(input);
    expect(result).toBe("C:\\\\path\\\\to\\\\file");
  });

  it("should escape newlines and carriage returns", () => {
    const input = "line1\nline2\rline3";
    const result = escapeString(input);
    expect(result).toBe("line1\\\nline2\\\rline3");
  });

  it("should escape single and double quotes", () => {
    const input = "it's \"quoted\"";
    const result = escapeString(input);
    expect(result).toBe("it\\'s \"quoted\"");
  });
});

describe("genSafeVariableName", () => {
  it("should return the same name if it is safe", () => {
    const result = genSafeVariableName("myVariable");
    expect(result).toBe("myVariable");
  });

  it("should prepend an underscore if the name is a reserved keyword", () => {
    const result = genSafeVariableName("class");
    expect(result).toBe("_class");
  });

  it("should prepend an underscore if the name starts with a digit", () => {
    const result = genSafeVariableName("123var");
    expect(result).toBe("_123var");
  });

  it("should replace non-word characters with their char code", () => {
    const result = genSafeVariableName("foo-bar.baz");
    expect(result).toBe("foo_45bar_46baz");
  });
});
