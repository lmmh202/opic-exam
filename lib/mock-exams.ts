import mockExamsData from "@/data/mock-exams.json";
import { getLocalizedLabel, getTopicLabel, type LocalizedLabel } from "@/lib/opic-constants";
import type { Question } from "@/lib/question-generator";
import type { Locale } from "@/lib/i18n/config";

export type MockExamSection = "intro" | "combo" | "roleplay" | "comparison";

// A single background survey answer as it was configured for one mock exam.
// Mirrors the shape of `data/survey.json` so both can feed the same UI.
export interface MockExamSurveyItem {
  id: string;
  number: string;
  question: LocalizedLabel;
  answer: LocalizedLabel;
  topicIds: string[];
}

// Set level metadata, declared once instead of repeated on every question.
// `topicLabel` is only needed for topics that are absent from `data/opic-constants.json`.
export interface MockExamSet {
  id: string;
  section: MockExamSection;
  topicId?: string;
  topicLabel?: LocalizedLabel;
  surprise?: boolean;
}

export interface MockExamQuestion {
  number: number;
  setId: string;
  stage?: number;
  type: string;
  text: string;
  startSeconds: number | null;
}

export interface MockExamSource {
  kind: string;
  videoId: string;
  url: string;
  channel: { name: string; handle: string; url: string };
  publishedAt: string | null;
  retrievedAt: string;
}

export interface MockExam {
  id: string;
  title: LocalizedLabel;
  source: MockExamSource;
  survey: MockExamSurveyItem[];
  sets: MockExamSet[];
  questions: MockExamQuestion[];
}

interface MockExamsFile {
  version: number;
  exams: MockExam[];
}

const INTRO_SET_ID = "intro";
const INTRO_TOPIC_LABEL = "Self-Introduction";

const file = mockExamsData as unknown as MockExamsFile;

export function listMockExams(): MockExam[] {
  return file.exams;
}

export function getMockExam(examId: string): MockExam | undefined {
  return file.exams.find((exam) => exam.id === examId);
}

export function findMockExam(examId: string): MockExam {
  const exam = getMockExam(examId);
  if (!exam) throw new Error(`Mock exam not found: ${examId}`);
  return exam;
}

export function getMockExamTitle(exam: MockExam, locale: Locale = "ko"): string {
  return getLocalizedLabel(exam.title, locale, exam.id);
}

// Topic ids the exam's survey selected, used to explain why a set counts as survey or 돌발.
export function getSurveyTopicIds(exam: MockExam): string[] {
  return [...new Set(exam.survey.flatMap((item) => item.topicIds))];
}

function findSet(exam: MockExam, setId: string): MockExamSet {
  const set = exam.sets.find((candidate) => candidate.id === setId);
  if (!set) throw new Error(`Mock exam ${exam.id} references unknown set: ${setId}`);
  return set;
}

// Resolves the label shown next to a question.
// Topics defined in constants win so the label follows the active locale;
// exam-local topics such as `hair_salon` fall back to their inline label.
function resolveTopicLabel(set: MockExamSet, locale: Locale): string {
  if (set.section === "intro") return INTRO_TOPIC_LABEL;
  const inline = set.topicLabel ? getLocalizedLabel(set.topicLabel, locale) : undefined;
  return getTopicLabel(set.topicId, locale, inline ?? set.topicId);
}

// Converts a stored mock exam into the flat `Question[]` the exam and results screens consume.
// Questions are ordered by their printed number so the paper is replayed exactly as recorded.
export function toExamQuestions(exam: MockExam, locale: Locale = "ko"): Question[] {
  return [...exam.questions]
    .sort((a, b) => a.number - b.number)
    .map((question) => {
      const set = findSet(exam, question.setId);
      return {
        id: question.number,
        type: question.type,
        topic: resolveTopicLabel(set, locale),
        topicId: set.section === "intro" ? undefined : set.topicId,
        text: question.text,
        surprise: set.surprise ?? false,
      };
    });
}

export function isIntroSet(set: MockExamSet): boolean {
  return set.id === INTRO_SET_ID || set.section === "intro";
}
