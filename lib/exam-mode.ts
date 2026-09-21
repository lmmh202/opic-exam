import { type ExamType, DEFAULT_EXAM_TYPE, isExamType } from "@/lib/exam-type";

export type ExamMode = "real" | "practice";

export interface ExamModeConfig {
  label: string;
  totalTimeSeconds: number | null;
  maxQuestionReplays: number;
  showQuestionText: boolean;
  enforceMinRecording: boolean;
  allowBackNavigation: boolean;
  allowReRecord: boolean;
  perQuestionFeedback: boolean;
  resultsPath: string;
  setupPath: string;
}

export const EXAM_MODE_CONFIG: Record<ExamMode, ExamModeConfig> = {
  real: {
    label: "Real Exam",
    totalTimeSeconds: 40 * 60,
    maxQuestionReplays: 2,
    showQuestionText: false,
    enforceMinRecording: true,
    allowBackNavigation: false,
    allowReRecord: false,
    perQuestionFeedback: false,
    resultsPath: "/results",
    setupPath: "/real/setup",
  },
  practice: {
    label: "Practice",
    totalTimeSeconds: null,
    maxQuestionReplays: Infinity,
    showQuestionText: true,
    enforceMinRecording: false,
    allowBackNavigation: true,
    allowReRecord: true,
    perQuestionFeedback: true,
    resultsPath: "/results",
    setupPath: "/practice",
  },
};

export function parseExamMode(value: string | null): ExamMode {
  return value === "practice" ? "practice" : "real";
}

// Parses exam type from URL search param with fallback to default.
export function parseExamType(value: string | null): ExamType {
  return isExamType(value) ? value : DEFAULT_EXAM_TYPE;
}

export function examPath(mode: ExamMode, examType?: ExamType): string {
  const params = new URLSearchParams({ mode });
  if (examType && examType !== DEFAULT_EXAM_TYPE) {
    params.set("examType", examType);
  }
  return `/exam?${params.toString()}`;
}
