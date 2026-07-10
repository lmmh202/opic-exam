import questionBank from "@/public/question-bank.json";
import {
  DEFAULT_DIFFICULTY,
  getLocalizedLabel,
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

const CATEGORY_BANK_KEY: Record<
  PracticeCategory,
  "combo" | "roleplay" | "comparison"
> = {
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

function filterSetsByDifficulty(
  sets: QuestionSet[],
  difficulty?: DifficultyId | "random",
): QuestionSet[] {
  if (!difficulty || difficulty === "random") return sets;
  return sets.filter((set) => normalizeDifficulty(set.difficulty) === difficulty);
}

function findQuestionSet(
  topic: BankTopic,
  setId?: string,
  difficulty?: DifficultyId | "random",
): QuestionSet {
  const candidates = filterSetsByDifficulty(topic.sets, difficulty);
  if (candidates.length === 0) {
    throw new Error(
      `No question sets found for topic ${topic.id}` +
        (difficulty && difficulty !== "random"
          ? ` with difficulty ${difficulty}`
          : ""),
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

/**
 * Generates a randomized 15-question OPIc exam
 *
 * Structure:
 * - Q1: Self-introduction (fixed)
 * - Q2-Q10: 3 random combo topics, one set each
 * - Q11-Q13: 1 random roleplay topic, one set
 * - Q14-Q15: 1 random comparison topic, one set
 */
export function generateExam(): Question[] {
  const bank = getBank();
  const exam: Question[] = [];
  const questionId = { value: 1 };

  const intro = bank.intro.questions[0];
  exam.push({
    id: questionId.value++,
    type: intro.type,
    topic: "Self-Introduction",
    text: intro.text,
  });

  const selectedComboTopics = shuffle(bank.combo).slice(0, 3);
  for (const topic of selectedComboTopics) {
    const set = pickRandom(topic.sets);
    pushSetQuestions(exam, "combo", topic, set, questionId);
  }

  const roleplayTopic = pickRandom(bank.roleplay);
  const roleplaySet = pickRandom(roleplayTopic.sets);
  pushSetQuestions(exam, "roleplay", roleplayTopic, roleplaySet, questionId);

  const comparisonTopic = pickRandom(bank.comparison);
  const comparisonSet = pickRandom(comparisonTopic.sets);
  pushSetQuestions(
    exam,
    "comparison",
    comparisonTopic,
    comparisonSet,
    questionId,
  );

  return exam;
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

export function listPracticeTopics(
  difficulty?: DifficultyId | "random",
): PracticeTopic[] {
  const topics: PracticeTopic[] = [];

  const categories: PracticeCategory[] = ["combo", "roleplay", "comparison"];
  for (const category of categories) {
    for (const topic of getTopicsForCategory(category)) {
      const matchingSets = filterSetsByDifficulty(topic.sets, difficulty);
      if (matchingSets.length === 0) continue;

      const difficulties = [
        ...new Set(
          topic.sets.map((set) => normalizeDifficulty(set.difficulty)),
        ),
      ];
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

export function countPracticeSets(
  category: PracticeCategory,
  difficulty?: DifficultyId | "random",
): number {
  return getTopicsForCategory(category).reduce(
    (total, topic) =>
      total + filterSetsByDifficulty(topic.sets, difficulty).length,
    0,
  );
}

export interface GeneratePracticeExamOptions {
  category: PracticeCategory;
  topicId?: string;
  setId?: string;
  difficulty?: DifficultyId | "random";
}

export function generatePracticeExam(
  options: GeneratePracticeExamOptions,
): Question[] {
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
