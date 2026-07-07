export type ExamMode = "real" | "practice";

export interface ExamModeConfig {
  label: string;
  totalTimeSeconds: number | null;
  maxQuestionReplays: number;
  showQuestionText: boolean;
  enforceMinRecording: boolean;
  allowBackNavigation: boolean;
  allowReRecord: boolean;
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
    resultsPath: "/results",
    setupPath: "/practice",
  },
};

export function parseExamMode(value: string | null): ExamMode {
  return value === "practice" ? "practice" : "real";
}

export function examPath(mode: ExamMode): string {
  return `/exam?mode=${mode}`;
}
