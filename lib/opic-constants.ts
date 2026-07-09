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

export const SURVEY_TOPICS = opicConstants.surveyTopics as TopicConstant[];
export const SURPRISE_TOPICS = opicConstants.surpriseTopics as TopicConstant[];
export const INTRO_QUESTION_TYPES =
  opicConstants.introQuestionTypes as QuestionTypeConstant[];
export const COMBO_QUESTION_TYPES =
  opicConstants.comboQuestionTypes as QuestionTypeConstant[];
export const EXPERIENCE_ENDING_TYPES =
  opicConstants.experienceEndingTypes as string[];
export const ROLEPLAY_QUESTION_TYPES =
  opicConstants.roleplayQuestionTypes as QuestionTypeConstant[];
export const ADVANCED_QUESTION_TYPES =
  opicConstants.advancedQuestionTypes as QuestionTypeConstant[];
export const EXAM_COMPOSITION = opicConstants.examComposition;

export const ALL_QUESTION_TYPES: QuestionTypeConstant[] = [
  ...INTRO_QUESTION_TYPES,
  ...COMBO_QUESTION_TYPES,
  ...ROLEPLAY_QUESTION_TYPES,
  ...ADVANCED_QUESTION_TYPES,
];

export const SURVEY_TOPIC_IDS = SURVEY_TOPICS.map((topic) => topic.id);
export const SURPRISE_TOPIC_IDS = SURPRISE_TOPICS.map((topic) => topic.id);
export const COMBO_QUESTION_TYPE_IDS = COMBO_QUESTION_TYPES.map(
  (type) => type.id,
);

const QUESTION_TYPE_BY_ID = new Map(
  ALL_QUESTION_TYPES.map((type) => [type.id, type]),
);

const ALL_TOPICS = [...SURVEY_TOPICS, ...SURPRISE_TOPICS];

const TOPIC_BY_ID = new Map(ALL_TOPICS.map((topic) => [topic.id, topic]));

const TOPIC_BY_LABEL = new Map<string, TopicConstant>();
for (const topic of ALL_TOPICS) {
  TOPIC_BY_LABEL.set(topic.label.en.toLowerCase(), topic);
  TOPIC_BY_LABEL.set(topic.label.ko.toLowerCase(), topic);
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
