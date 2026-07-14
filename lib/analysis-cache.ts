import type { QuestionAnalysis } from "@/lib/analyze-types";

const GRADE_RANK = ["NH", "IL", "IM1", "IM2", "IM3", "IH", "AL"] as const;

export type OpicGrade = (typeof GRADE_RANK)[number];

export function isOpicGrade(value: string): value is OpicGrade {
  return (GRADE_RANK as readonly string[]).includes(value);
}

// Conservative overall grade: most frequent, ties go to the lower level.
export function deriveOverallGrade(analyses: QuestionAnalysis[]): OpicGrade | null {
  if (analyses.length === 0) return null;

  const counts = new Map<OpicGrade, number>();
  for (const item of analyses) {
    if (!isOpicGrade(item.grade)) continue;
    counts.set(item.grade, (counts.get(item.grade) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let best: OpicGrade | null = null;
  let bestCount = -1;
  for (const grade of GRADE_RANK) {
    const count = counts.get(grade) ?? 0;
    if (count > bestCount) {
      best = grade;
      bestCount = count;
    }
  }
  return best;
}
