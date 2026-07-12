import { describe, expect, it } from "vitest";
import { deriveOverallGrade, type OpicGrade } from "./analysis-cache";
import type { QuestionAnalysis } from "@/app/api/analyze/route";

function analysis(grade: OpicGrade): QuestionAnalysis {
  return {
    question_id: "1",
    grade,
    fluency_score: 70,
    grammar_score: 70,
    vocabulary_score: 70,
    feedback: "",
    corrected_script: "",
  };
}

describe("deriveOverallGrade", () => {
  it("returns null for an empty list", () => {
    expect(deriveOverallGrade([])).toBeNull();
  });

  it("picks the most frequent grade", () => {
    expect(deriveOverallGrade([analysis("IM2"), analysis("IM2"), analysis("IM3")])).toBe("IM2");
  });

  it("breaks ties toward the lower level", () => {
    expect(deriveOverallGrade([analysis("IM2"), analysis("IM3")])).toBe("IM2");
  });
});
