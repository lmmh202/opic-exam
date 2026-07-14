import { describe, expect, it } from "vitest";
import {
  LONG_SILENCE_CAP_SECONDS,
  LONG_SILENCE_GRADE_CAP,
  analyzeWithRubric,
  buildBatchFromRubrics,
} from "./analyze-rubric";
import type { SpeechMetrics } from "./speech-metrics";

function metrics(partial: Partial<SpeechMetrics> = {}): SpeechMetrics {
  return {
    durationSec: 40,
    speechSec: 32,
    silenceSec: 8,
    speechRatio: 0.8,
    silenceRatio: 0.2,
    longestSilenceSec: 1,
    speechDensity: 0.85,
    ...partial,
  };
}

describe("analyzeWithRubric", () => {
  it("caps grade at IM3 when longest silence is 5+ seconds", () => {
    // Without the silence cap this profile lands at IH/AL.
    const strong = metrics({
      durationSec: 45,
      speechRatio: 0.95,
      speechDensity: 0.98,
      longestSilenceSec: 0.4,
    });
    const uncapped = analyzeWithRubric("1", strong).analysis.grade;
    expect(["IH", "AL"]).toContain(uncapped);

    const { analysis, triggeredRules } = analyzeWithRubric(
      "1",
      metrics({
        ...strong,
        longestSilenceSec: LONG_SILENCE_CAP_SECONDS,
      }),
    );
    expect(triggeredRules).toContain("longSilence");
    expect(analysis.grade).toBe(LONG_SILENCE_GRADE_CAP);
  });

  it("keeps grades already at or below IM3 when silence is long", () => {
    const { analysis } = analyzeWithRubric(
      "1",
      metrics({
        durationSec: 22,
        speechRatio: 0.5,
        speechDensity: 0.5,
        longestSilenceSec: LONG_SILENCE_CAP_SECONDS,
      }),
    );
    expect(gradeIndexAtMostIm3(analysis.grade)).toBe(true);
  });

  it("does not invent a corrected script in phase 1", () => {
    const { analysis } = analyzeWithRubric("2", metrics(), "ko");
    expect(analysis.corrected_script).toMatch(/STT|텍스트/);
  });
});

describe("buildBatchFromRubrics", () => {
  it("returns overall grade from analyses", () => {
    const a = analyzeWithRubric("1", metrics()).analysis;
    const batch = buildBatchFromRubrics([a], "ko");
    expect(batch.questions).toHaveLength(1);
    expect(batch.overall_grade).toBeTruthy();
    expect(batch.overall_feedback.length).toBeGreaterThan(0);
  });
});

function gradeIndexAtMostIm3(grade: string) {
  return ["NH", "IL", "IM1", "IM2", "IM3"].includes(grade);
}
