import type { Locale } from "@/lib/i18n/config";

// Supported exam types in the application.
export type ExamType = "opic" | "toeic-speaking";

export type LocalizedLabel = {
  ko: string;
  en: string;
};

export interface ExamTypeConfig {
  id: ExamType;
  label: LocalizedLabel;
  totalTimeSeconds: number | null;
  questionCount: number;
  hasBackgroundSurvey: boolean;
  hasSurpriseTopics: boolean;
  perPartTimer: boolean;
  gradeSystem: "actfl" | "toeic-level";
}

export const EXAM_TYPE_CONFIGS: Record<ExamType, ExamTypeConfig> = {
  opic: {
    id: "opic",
    label: { ko: "OPIc", en: "OPIc" },
    totalTimeSeconds: 40 * 60,
    questionCount: 15,
    hasBackgroundSurvey: true,
    hasSurpriseTopics: true,
    perPartTimer: false,
    gradeSystem: "actfl",
  },
  "toeic-speaking": {
    id: "toeic-speaking",
    label: { ko: "TOEIC Speaking", en: "TOEIC Speaking" },
    totalTimeSeconds: null,
    questionCount: 11,
    hasBackgroundSurvey: false,
    hasSurpriseTopics: false,
    perPartTimer: true,
    gradeSystem: "toeic-level",
  },
};

export const EXAM_TYPES: ExamType[] = ["opic", "toeic-speaking"];

export const DEFAULT_EXAM_TYPE: ExamType = "opic";

export function isExamType(value: string | undefined | null): value is ExamType {
  return value === "opic" || value === "toeic-speaking";
}

export function getExamTypeConfig(examType: ExamType): ExamTypeConfig {
  return EXAM_TYPE_CONFIGS[examType];
}

export function getExamTypeLabel(examType: ExamType, locale: Locale = "ko"): string {
  const config = EXAM_TYPE_CONFIGS[examType];
  return config.label[locale] ?? config.label.ko;
}
