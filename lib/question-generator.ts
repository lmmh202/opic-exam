import questionBank from "@/public/question-bank.json";

export interface Question {
  id: number;
  type: string;
  topic: string;
  text: string;
}

interface QuestionItem {
  type: string;
  text: string;
}

interface QuestionSet {
  id: string;
  label?: string;
  questions: QuestionItem[];
}

interface BankTopic {
  id: string;
  label: string;
  keywords?: string[];
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

function findQuestionSet(topic: BankTopic, setId?: string): QuestionSet {
  if (!setId || setId === "random") {
    return pickRandom(topic.sets);
  }
  const set = topic.sets.find((s) => s.id === setId);
  if (!set) throw new Error(`Question set not found: ${setId}`);
  return set;
}

function getTopicDisplayLabel(
  category: PracticeCategory,
  label: string,
): string {
  if (category === "roleplay") return `Roleplay: ${label}`;
  return label;
}

function pushSetQuestions(
  exam: Question[],
  category: PracticeCategory,
  topicLabel: string,
  set: QuestionSet,
  questionId: { value: number },
): void {
  const displayLabel = getTopicDisplayLabel(category, topicLabel);
  for (const q of set.questions) {
    exam.push({
      id: questionId.value++,
      type: q.type,
      topic: displayLabel,
      text: q.text,
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
    pushSetQuestions(exam, "combo", topic.label, set, questionId);
  }

  const roleplayTopic = pickRandom(bank.roleplay);
  const roleplaySet = pickRandom(roleplayTopic.sets);
  pushSetQuestions(
    exam,
    "roleplay",
    roleplayTopic.label,
    roleplaySet,
    questionId,
  );

  const comparisonTopic = pickRandom(bank.comparison);
  const comparisonSet = pickRandom(comparisonTopic.sets);
  pushSetQuestions(
    exam,
    "comparison",
    comparisonTopic.label,
    comparisonSet,
    questionId,
  );

  return exam;
}

export interface PracticeTopic {
  id: string;
  category: PracticeCategory;
  topic: string;
  questionCount: number;
  setCount: number;
}

export interface PracticeQuestionSet {
  id: string;
  topicId: string;
  label: string;
  questionCount: number;
}

export function getPracticeCategoryLabel(category: PracticeCategory): string {
  return CATEGORY_LABELS[category];
}

export function listPracticeTopics(): PracticeTopic[] {
  const topics: PracticeTopic[] = [];

  const categories: PracticeCategory[] = ["combo", "roleplay", "comparison"];
  for (const category of categories) {
    for (const topic of getTopicsForCategory(category)) {
      const firstSet = topic.sets[0];
      topics.push({
        id: topic.id,
        category,
        topic: topic.label,
        questionCount: firstSet?.questions.length ?? 0,
        setCount: topic.sets.length,
      });
    }
  }

  return topics;
}

export function listPracticeQuestionSets(
  category: PracticeCategory,
  topicId: string,
): PracticeQuestionSet[] {
  const topic = findTopic(category, topicId);
  return topic.sets.map((set, index) => ({
    id: set.id,
    topicId: topic.id,
    label: set.label ?? `Set ${index + 1}`,
    questionCount: set.questions.length,
  }));
}

export interface GeneratePracticeExamOptions {
  category: PracticeCategory;
  topicId?: string;
  setId?: string;
}

export function generatePracticeExam(
  options: GeneratePracticeExamOptions,
): Question[] {
  const { category } = options;
  let topicId = options.topicId;
  let setId = options.setId;

  if (!topicId || topicId === "random") {
    topicId = pickRandom(getTopicsForCategory(category)).id;
  }

  const topic = findTopic(category, topicId);
  const set = findQuestionSet(topic, setId);

  const exam: Question[] = [];
  const questionId = { value: 1 };
  pushSetQuestions(exam, category, topic.label, set, questionId);
  return exam;
}
