import opicConstants from "@/data/opic-constants.json";
import type { Locale } from "@/lib/i18n/config";

export type LocalizedLabel = {
  ko: string;
  en: string;
};

export type TopicConstant = {
  id: string;
  label: LocalizedLabel;
};

export type QuestionTypeConstant = {
  id: string;
  label: LocalizedLabel;
};

export type ComboStage = 1 | 2 | 3;
export type RoleplayStage = 1 | 2 | 3;
export type ComparisonStage = 1 | 2;
export type DifficultyId = "standard" | "challenging";

export type DifficultyConstant = {
  id: DifficultyId;
  label: LocalizedLabel;
  guide: LocalizedLabel;
};

export const SURVEY_TOPICS = opicConstants.surveyTopics as TopicConstant[];
export const SURPRISE_TOPICS = opicConstants.surpriseTopics as TopicConstant[];
export const ROLEPLAY_TOPICS = opicConstants.roleplayTopics as TopicConstant[];
export const COMPARISON_TOPICS =
  opicConstants.comparisonTopics as TopicConstant[];
export const INTRO_QUESTION_TYPES =
  opicConstants.introQuestionTypes as QuestionTypeConstant[];
export const COMBO_QUESTION_TYPES =
  opicConstants.comboQuestionTypes as QuestionTypeConstant[];
export const COMBO_STAGES = opicConstants.comboStages as Record<
  "1" | "2" | "3",
  string[]
>;
export const EXPERIENCE_ENDING_TYPES =
  opicConstants.experienceEndingTypes as string[];
export const ROLEPLAY_QUESTION_TYPES =
  opicConstants.roleplayQuestionTypes as QuestionTypeConstant[];
export const ROLEPLAY_STAGES = opicConstants.roleplayStages as Record<
  "1" | "2" | "3",
  string[]
>;
export const ADVANCED_QUESTION_TYPES =
  opicConstants.advancedQuestionTypes as QuestionTypeConstant[];
export const COMPARISON_STAGES = opicConstants.comparisonStages as Record<
  "1" | "2",
  string[]
>;
export const DIFFICULTIES =
  opicConstants.difficulties as DifficultyConstant[];
export const EXAM_COMPOSITION = opicConstants.examComposition;

export const DIFFICULTY_IDS = DIFFICULTIES.map((d) => d.id);
export const DEFAULT_DIFFICULTY: DifficultyId = "standard";

export const ALL_QUESTION_TYPES: QuestionTypeConstant[] = [
  ...INTRO_QUESTION_TYPES,
  ...COMBO_QUESTION_TYPES,
  ...ROLEPLAY_QUESTION_TYPES,
  ...ADVANCED_QUESTION_TYPES,
];

export const SURVEY_TOPIC_IDS = SURVEY_TOPICS.map((topic) => topic.id);
export const SURPRISE_TOPIC_IDS = SURPRISE_TOPICS.map((topic) => topic.id);
export const ROLEPLAY_TOPIC_IDS = ROLEPLAY_TOPICS.map((topic) => topic.id);
export const COMPARISON_TOPIC_IDS = COMPARISON_TOPICS.map((topic) => topic.id);
export const COMBO_QUESTION_TYPE_IDS = COMBO_QUESTION_TYPES.map(
  (type) => type.id,
);

const QUESTION_TYPE_BY_ID = new Map(
  ALL_QUESTION_TYPES.map((type) => [type.id, type]),
);

const ALL_TOPICS = [
  ...SURVEY_TOPICS,
  ...SURPRISE_TOPICS,
  ...ROLEPLAY_TOPICS,
  ...COMPARISON_TOPICS,
];

const TOPIC_BY_ID = new Map(ALL_TOPICS.map((topic) => [topic.id, topic]));

const TOPIC_BY_LABEL = new Map<string, TopicConstant>();
for (const topic of ALL_TOPICS) {
  TOPIC_BY_LABEL.set(topic.label.en.toLowerCase(), topic);
  TOPIC_BY_LABEL.set(topic.label.ko.toLowerCase(), topic);
}

const COMBO_TYPE_TO_STAGE = new Map<string, ComboStage>();
for (const stage of [1, 2, 3] as const) {
  for (const typeId of COMBO_STAGES[String(stage) as "1" | "2" | "3"]) {
    COMBO_TYPE_TO_STAGE.set(typeId, stage);
  }
}

const ROLEPLAY_TYPE_TO_STAGE = new Map<string, RoleplayStage>();
for (const stage of [1, 2, 3] as const) {
  for (const typeId of ROLEPLAY_STAGES[String(stage) as "1" | "2" | "3"]) {
    ROLEPLAY_TYPE_TO_STAGE.set(typeId, stage);
  }
}

const COMPARISON_TYPE_TO_STAGE = new Map<string, ComparisonStage>();
for (const stage of [1, 2] as const) {
  for (const typeId of COMPARISON_STAGES[String(stage) as "1" | "2"]) {
    COMPARISON_TYPE_TO_STAGE.set(typeId, stage);
  }
}

export function isSurpriseTopic(topicId: string): boolean {
  return SURPRISE_TOPIC_IDS.includes(topicId);
}

export function isSurveyTopic(topicId: string): boolean {
  return SURVEY_TOPIC_IDS.includes(topicId);
}

function findTopicConstant(
  topicId?: string,
  fallbackLabel?: string,
): TopicConstant | undefined {
  if (topicId) {
    const byId = TOPIC_BY_ID.get(topicId);
    if (byId) return byId;
  }
  if (fallbackLabel) {
    return TOPIC_BY_LABEL.get(fallbackLabel.toLowerCase());
  }
  return undefined;
}

export function getTopicLabel(
  topicId: string | undefined,
  locale: Locale = "ko",
  fallback?: string,
): string {
  const topic = findTopicConstant(topicId, fallback);
  if (!topic) return fallback ?? topicId ?? "";
  return topic.label[locale] ?? topic.label.ko ?? fallback ?? topicId ?? "";
}

export function getQuestionTypeLabel(
  typeId: string,
  locale: Locale = "ko",
): string {
  const type = QUESTION_TYPE_BY_ID.get(typeId);
  if (!type) return typeId;
  return type.label[locale] ?? type.label.ko ?? typeId;
}

export function isDifficultyId(value: string | undefined | null): value is DifficultyId {
  return value === "standard" || value === "challenging";
}

export function getDifficultyLabel(
  difficultyId: DifficultyId,
  locale: Locale = "ko",
): string {
  const difficulty = DIFFICULTIES.find((d) => d.id === difficultyId);
  if (!difficulty) return difficultyId;
  return difficulty.label[locale] ?? difficulty.label.ko ?? difficultyId;
}

export function getDifficultyGuide(
  difficultyId: DifficultyId,
  locale: Locale = "ko",
): string {
  const difficulty = DIFFICULTIES.find((d) => d.id === difficultyId);
  if (!difficulty) return "";
  return difficulty.guide[locale] ?? difficulty.guide.ko ?? "";
}

export function getComboStage(typeId: string): ComboStage | undefined {
  return COMBO_TYPE_TO_STAGE.get(typeId);
}

export function getRoleplayStage(typeId: string): RoleplayStage | undefined {
  return ROLEPLAY_TYPE_TO_STAGE.get(typeId);
}

export function getComparisonStage(
  typeId: string,
): ComparisonStage | undefined {
  return COMPARISON_TYPE_TO_STAGE.get(typeId);
}

export function isComboTypeForStage(
  typeId: string,
  stage: ComboStage,
): boolean {
  return COMBO_STAGES[String(stage) as "1" | "2" | "3"].includes(typeId);
}

export function isRoleplayTypeForStage(
  typeId: string,
  stage: RoleplayStage,
): boolean {
  return ROLEPLAY_STAGES[String(stage) as "1" | "2" | "3"].includes(typeId);
}

export function isComparisonTypeForStage(
  typeId: string,
  stage: ComparisonStage,
): boolean {
  return COMPARISON_STAGES[String(stage) as "1" | "2"].includes(typeId);
}

export function isValidComboTypeSequence(types: string[]): boolean {
  if (types.length !== 3) return false;
  return (
    isComboTypeForStage(types[0], 1) &&
    isComboTypeForStage(types[1], 2) &&
    isComboTypeForStage(types[2], 3)
  );
}

export function isValidRoleplayTypeSequence(types: string[]): boolean {
  if (types.length !== 3) return false;
  return (
    isRoleplayTypeForStage(types[0], 1) &&
    isRoleplayTypeForStage(types[1], 2) &&
    isRoleplayTypeForStage(types[2], 3)
  );
}

export function isValidComparisonTypeSequence(types: string[]): boolean {
  if (types.length !== 2) return false;
  return (
    isComparisonTypeForStage(types[0], 1) &&
    isComparisonTypeForStage(types[1], 2)
  );
}
