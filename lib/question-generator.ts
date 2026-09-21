import questionBank from "@/public/question-bank.json";
import {
  COMBO_STAGES,
  COMPARISON_STAGES,
  DEFAULT_DIFFICULTY,
  ROLEPLAY_STAGES,
  getLocalizedLabel,
  getQuestionTypeLabel,
  type DifficultyId,
  type LocalizedLabel,
  isDifficultyId,
} from "@/lib/opic-constants";
import type { Locale } from "@/lib/i18n/config";

export interface Question {
  id: number;
  type: string;
  topic: string;
  topicId?: string;
  text: string;
  surprise?: boolean;
  difficulty?: DifficultyId;
  prepSeconds?: number;
  responseSeconds?: number;
}

interface QuestionItem {
  type: string;
  text: string;
}

interface QuestionSet {
  id: string;
  label?: LocalizedLabel | string;
  difficulty?: DifficultyId;
  questions: QuestionItem[];
}

interface BankTopic {
  id: string;
  label: string;
  keywords?: string[];
  surprise?: boolean;
  sets: QuestionSet[];
}

interface QuestionBank {
  intro: {
    questions: Array<{ id: string; type: string; text: string }>;
  };
  combo: BankTopic[];
  roleplay: BankTopic[];
  comparison: BankTopic[];
}

export type PracticeCategory = "combo" | "roleplay" | "comparison";

const CATEGORY_BANK_KEY: Record<PracticeCategory, "combo" | "roleplay" | "comparison"> = {
  combo: "combo",
  roleplay: "roleplay",
  comparison: "comparison",
};

const CATEGORY_LABELS: Record<PracticeCategory, string> = {
  combo: "Topic Set",
  roleplay: "Roleplay",
  comparison: "Comparison",
};

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickRandom<T>(array: T[]): T {
  return shuffle(array)[0];
}

function getBank(): QuestionBank {
  return questionBank as QuestionBank;
}

function getTopicsForCategory(category: PracticeCategory): BankTopic[] {
  return getBank()[CATEGORY_BANK_KEY[category]];
}

function findTopic(category: PracticeCategory, topicId: string): BankTopic {
  const topic = getTopicsForCategory(category).find((t) => t.id === topicId);
  if (!topic) throw new Error(`Topic not found: ${topicId}`);
  return topic;
}

function normalizeDifficulty(value?: string): DifficultyId {
  return isDifficultyId(value) ? value : DEFAULT_DIFFICULTY;
}

function filterSetsByDifficulty(sets: QuestionSet[], difficulty?: DifficultyId | "random"): QuestionSet[] {
  if (!difficulty || difficulty === "random") return sets;
  return sets.filter((set) => normalizeDifficulty(set.difficulty) === difficulty);
}

function findQuestionSet(topic: BankTopic, setId?: string, difficulty?: DifficultyId | "random"): QuestionSet {
  const candidates = filterSetsByDifficulty(topic.sets, difficulty);
  if (candidates.length === 0) {
    throw new Error(
      `No question sets found for topic ${topic.id}` +
        (difficulty && difficulty !== "random" ? ` with difficulty ${difficulty}` : ""),
    );
  }

  if (!setId || setId === "random") {
    return pickRandom(candidates);
  }

  const set = candidates.find((s) => s.id === setId);
  if (!set) throw new Error(`Question set not found: ${setId}`);
  return set;
}

function pushSetQuestions(
  exam: Question[],
  category: PracticeCategory,
  topic: BankTopic,
  set: QuestionSet,
  questionId: { value: number },
): void {
  const isSurprise = topic.surprise ?? false;
  const difficulty = normalizeDifficulty(set.difficulty);
  for (const q of set.questions) {
    exam.push({
      id: questionId.value++,
      type: q.type,
      topic: topic.label,
      topicId: topic.id,
      text: q.text,
      surprise: isSurprise,
      difficulty,
    });
  }
}

export interface PracticeTopic {
  id: string;
  category: PracticeCategory;
  topic: string;
  surprise: boolean;
  questionCount: number;
  setCount: number;
  difficulties: DifficultyId[];
}

export interface PracticeQuestionSet {
  id: string;
  topicId: string;
  label: string;
  questionCount: number;
  difficulty: DifficultyId;
}

export function getPracticeCategoryLabel(category: PracticeCategory): string {
  return CATEGORY_LABELS[category];
}

export function listPracticeTopics(difficulty?: DifficultyId | "random"): PracticeTopic[] {
  const topics: PracticeTopic[] = [];

  const categories: PracticeCategory[] = ["combo", "roleplay", "comparison"];
  for (const category of categories) {
    for (const topic of getTopicsForCategory(category)) {
      const matchingSets = filterSetsByDifficulty(topic.sets, difficulty);
      if (matchingSets.length === 0) continue;

      const difficulties = [...new Set(topic.sets.map((set) => normalizeDifficulty(set.difficulty)))];
      const firstSet = matchingSets[0];
      topics.push({
        id: topic.id,
        category,
        topic: topic.label,
        surprise: topic.surprise ?? false,
        questionCount: firstSet?.questions.length ?? 0,
        setCount: matchingSets.length,
        difficulties,
      });
    }
  }

  return topics;
}

export function listPracticeQuestionSets(
  category: PracticeCategory,
  topicId: string,
  difficulty?: DifficultyId | "random",
  locale: Locale = "ko",
): PracticeQuestionSet[] {
  const topic = findTopic(category, topicId);
  return filterSetsByDifficulty(topic.sets, difficulty).map((set, index) => ({
    id: set.id,
    topicId: topic.id,
    label: getLocalizedLabel(set.label, locale, `Set ${index + 1}`),
    questionCount: set.questions.length,
    difficulty: normalizeDifficulty(set.difficulty),
  }));
}

export function countPracticeSets(category: PracticeCategory, difficulty?: DifficultyId | "random"): number {
  return getTopicsForCategory(category).reduce(
    (total, topic) => total + filterSetsByDifficulty(topic.sets, difficulty).length,
    0,
  );
}

export interface GeneratePracticeExamOptions {
  category: PracticeCategory;
  topicId?: string;
  setId?: string;
  difficulty?: DifficultyId | "random";
}

export function generatePracticeExam(options: GeneratePracticeExamOptions): Question[] {
  const { category } = options;
  const difficulty = options.difficulty ?? "random";
  let topicId = options.topicId;
  const setId = options.setId;

  const topicsWithSets = getTopicsForCategory(category).filter(
    (topic) => filterSetsByDifficulty(topic.sets, difficulty).length > 0,
  );
  if (topicsWithSets.length === 0) {
    throw new Error(
      `No practice topics available for category ${category}` +
        (difficulty !== "random" ? ` with difficulty ${difficulty}` : ""),
    );
  }

  if (!topicId || topicId === "random") {
    topicId = pickRandom(topicsWithSets).id;
  }

  const topic = findTopic(category, topicId);
  const set = findQuestionSet(topic, setId, difficulty);

  const exam: Question[] = [];
  const questionId = { value: 1 };
  pushSetQuestions(exam, category, topic, set, questionId);
  return exam;
}

export type PracticeStageNumber = 1 | 2 | 3;

export interface PracticeStageInfo {
  stage: PracticeStageNumber;
  typeIds: string[];
}

export interface PracticeTypeOption {
  id: string;
  label: string;
  count: number;
}

interface PooledTypeQuestion {
  topic: BankTopic;
  set: QuestionSet;
  question: QuestionItem;
  questionIndex: number;
}

function getStageMap(category: PracticeCategory): Record<string, string[]> {
  if (category === "combo") return COMBO_STAGES;
  if (category === "roleplay") return ROLEPLAY_STAGES;
  return COMPARISON_STAGES;
}

export function listPracticeStages(category: PracticeCategory): PracticeStageInfo[] {
  const stageMap = getStageMap(category);
  return Object.keys(stageMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((stage) => ({
      stage: stage as PracticeStageNumber,
      typeIds: stageMap[String(stage)] ?? [],
    }));
}

function getAllowedTypeIds(category: PracticeCategory, stage: PracticeStageNumber, typeId?: string | "all"): string[] {
  const stageTypes = getStageMap(category)[String(stage)] ?? [];
  if (!typeId || typeId === "all") return stageTypes;
  if (!stageTypes.includes(typeId)) {
    throw new Error(`Type ${typeId} is not valid for ${category} stage ${stage}`);
  }
  return [typeId];
}

function collectTypePool(options: {
  category: PracticeCategory;
  stage: PracticeStageNumber;
  typeId?: string | "all";
  difficulty?: DifficultyId | "random";
}): PooledTypeQuestion[] {
  const { category, stage } = options;
  const difficulty = options.difficulty ?? "random";
  const allowedTypes = new Set(getAllowedTypeIds(category, stage, options.typeId));
  const pool: PooledTypeQuestion[] = [];

  for (const topic of getTopicsForCategory(category)) {
    for (const set of filterSetsByDifficulty(topic.sets, difficulty)) {
      set.questions.forEach((question, questionIndex) => {
        if (!allowedTypes.has(question.type)) return;
        pool.push({ topic, set, question, questionIndex });
      });
    }
  }

  return pool;
}

export function countPracticeQuestionsByType(options: {
  category: PracticeCategory;
  stage: PracticeStageNumber;
  typeId?: string | "all";
  difficulty?: DifficultyId | "random";
}): number {
  return collectTypePool(options).length;
}

export function listPracticeTypesForStage(
  category: PracticeCategory,
  stage: PracticeStageNumber,
  difficulty?: DifficultyId | "random",
  locale: Locale = "ko",
): PracticeTypeOption[] {
  const stageTypes = getStageMap(category)[String(stage)] ?? [];
  const counts = new Map<string, number>();

  for (const item of collectTypePool({ category, stage, typeId: "all", difficulty })) {
    counts.set(item.question.type, (counts.get(item.question.type) ?? 0) + 1);
  }

  return stageTypes
    .filter((typeId) => (counts.get(typeId) ?? 0) > 0)
    .map((typeId) => ({
      id: typeId,
      label: getQuestionTypeLabel(typeId, locale),
      count: counts.get(typeId) ?? 0,
    }));
}

export interface GenerateTypePracticeExamOptions {
  category: PracticeCategory;
  stage: PracticeStageNumber;
  typeId?: string | "all";
  difficulty?: DifficultyId | "random";
  count?: number;
}

export function generateTypePracticeExam(options: GenerateTypePracticeExamOptions): Question[] {
  const { category, stage } = options;
  const difficulty = options.difficulty ?? "random";
  const typeId = options.typeId ?? "all";
  const requestedCount = options.count ?? 3;

  if (requestedCount < 1) {
    throw new Error("Type practice count must be at least 1");
  }

  const pool = collectTypePool({ category, stage, typeId, difficulty });
  if (pool.length === 0) {
    throw new Error(
      `No practice questions available for ${category} stage ${stage}` +
        (typeId !== "all" ? ` type ${typeId}` : "") +
        (difficulty !== "random" ? ` with difficulty ${difficulty}` : ""),
    );
  }

  const selected = shuffle(pool).slice(0, Math.min(requestedCount, pool.length));
  const exam: Question[] = [];
  let questionId = 1;

  for (const item of selected) {
    exam.push({
      id: questionId++,
      type: item.question.type,
      topic: item.topic.label,
      topicId: item.topic.id,
      text: item.question.text,
      surprise: item.topic.surprise ?? false,
      difficulty: normalizeDifficulty(item.set.difficulty),
    });
  }

  return exam;
}
