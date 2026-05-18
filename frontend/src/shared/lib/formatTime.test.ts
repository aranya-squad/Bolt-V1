import { describe, it, expect } from "vitest";

// Placeholder test — real utilities added with features
function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

describe("formatSeconds", () => {
  it("formats zero", () => expect(formatSeconds(0)).toBe("0:00"));
  it("formats 90 seconds", () => expect(formatSeconds(90)).toBe("1:30"));
  it("formats 600 seconds", () => expect(formatSeconds(600)).toBe("10:00"));
});
