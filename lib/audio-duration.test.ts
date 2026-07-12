import { describe, expect, it } from "vitest";
import { isAnalyzeDurationTooShort, MIN_ANALYZE_DURATION_SECONDS } from "./audio-duration";

describe("isAnalyzeDurationTooShort", () => {
  it("treats null as not too short (duration unknown)", () => {
    expect(isAnalyzeDurationTooShort(null)).toBe(false);
  });

  it("rejects durations under the minimum", () => {
    expect(isAnalyzeDurationTooShort(0)).toBe(true);
    expect(isAnalyzeDurationTooShort(19.9)).toBe(true);
  });

  it("allows the minimum and above", () => {
    expect(isAnalyzeDurationTooShort(MIN_ANALYZE_DURATION_SECONDS)).toBe(false);
    expect(isAnalyzeDurationTooShort(30)).toBe(false);
  });
});
