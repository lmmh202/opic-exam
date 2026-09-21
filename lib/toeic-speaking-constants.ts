import toeicSpeakingConstants from "@/data/toeic-speaking-constants.json";
import type { Locale } from "@/lib/i18n/config";

export type LocalizedLabel = {
  ko: string;
  en: string;
};

export type ToeicSpeakingPart = {
  id: string;
  label: LocalizedLabel;
  questionRange: [number, number];
  prepSeconds: number | number[];
  responseSeconds: number | number[];
};

export type ToeicSpeakingLevel = {
  level: number;
  name: string;
  minScore: number;
};

export type QuestionTypeConstant = {
  id: string;
  label: LocalizedLabel;
};

export const TOEIC_SPEAKING_PARTS = toeicSpeakingConstants.parts as ToeicSpeakingPart[];
export const TOEIC_SPEAKING_QUESTION_TYPES = toeicSpeakingConstants.questionTypes as QuestionTypeConstant[];
export const TOEIC_SPEAKING_LEVELS = toeicSpeakingConstants.grading.levels as ToeicSpeakingLevel[];

const PART_BY_ID = new Map(TOEIC_SPEAKING_PARTS.map((part) => [part.id, part]));

export function getToeicSpeakingPartById(partId: string): ToeicSpeakingPart | undefined {
  return PART_BY_ID.get(partId);
}

export function getToeicSpeakingPartLabel(partId: string, locale: Locale = "ko"): string {
  const part = getToeicSpeakingPartById(partId);
  if (!part) return partId;
  return part.label[locale] ?? part.label.ko ?? partId;
}

export function getToeicSpeakingPartForQuestion(questionNumber: number): ToeicSpeakingPart | undefined {
  return TOEIC_SPEAKING_PARTS.find(
    (part) => questionNumber >= part.questionRange[0] && questionNumber <= part.questionRange[1],
  );
}

export function getToeicSpeakingPrepSeconds(partId: string): number {
  const part = getToeicSpeakingPartById(partId);
  if (!part) return 0;
  return Array.isArray(part.prepSeconds) ? part.prepSeconds[0] : part.prepSeconds;
}

export function getToeicSpeakingResponseSeconds(partId: string, questionIndex: number): number {
  const part = getToeicSpeakingPartById(partId);
  if (!part) return 0;
  if (Array.isArray(part.responseSeconds)) {
    return part.responseSeconds[questionIndex] ?? part.responseSeconds[part.responseSeconds.length - 1] ?? 0;
  }
  return part.responseSeconds;
}

export function getToeicSpeakingLevelForScore(score: number): ToeicSpeakingLevel | undefined {
  // Levels are sorted descending by score in the JSON
  return TOEIC_SPEAKING_LEVELS.find((level) => score >= level.minScore);
}
