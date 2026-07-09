import opicConstants from "@/data/opic-constants.json";

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
export const COMBO_QUESTION_TYPES =
  opicConstants.comboQuestionTypes as QuestionTypeConstant[];
export const EXPERIENCE_ENDING_TYPES =
  opicConstants.experienceEndingTypes as string[];
export const ROLEPLAY_QUESTION_TYPES =
  opicConstants.roleplayQuestionTypes as QuestionTypeConstant[];
export const ADVANCED_QUESTION_TYPES =
  opicConstants.advancedQuestionTypes as QuestionTypeConstant[];
export const EXAM_COMPOSITION = opicConstants.examComposition;

export const SURVEY_TOPIC_IDS = SURVEY_TOPICS.map((topic) => topic.id);
export const SURPRISE_TOPIC_IDS = SURPRISE_TOPICS.map((topic) => topic.id);
export const COMBO_QUESTION_TYPE_IDS = COMBO_QUESTION_TYPES.map(
  (type) => type.id,
);

export function isSurpriseTopic(topicId: string): boolean {
  return SURPRISE_TOPIC_IDS.includes(topicId);
}

export function isSurveyTopic(topicId: string): boolean {
  return SURVEY_TOPIC_IDS.includes(topicId);
}
