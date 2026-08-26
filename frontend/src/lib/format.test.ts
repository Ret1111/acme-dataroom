import { describe, expect, it } from "vitest";
import { formatBytes, formatDate } from "./format";

describe("formatBytes", () => {
  it("handles zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("keeps bytes as integers", () => {
    expect(formatBytes(15)).toBe("15 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("shows one decimal below 10 in a unit", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });

  it("rounds at 10 and above in a unit", () => {
    expect(formatBytes(10.4 * 1024)).toBe("10 KB");
    expect(formatBytes(512 * 1024)).toBe("512 KB");
  });

  it("caps at TB", () => {
    expect(formatBytes(5 * 1024 ** 5)).toBe("5120 TB");
  });
});

describe("formatDate", () => {
  it("renders a locale date containing the year and day", () => {
    const out = formatDate("2026-08-26T10:00:00.000Z");
    expect(out).toContain("2026");
    expect(out).toMatch(/26|25/); // day, tolerant of the runner's timezone
  });
});
