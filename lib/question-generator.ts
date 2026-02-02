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

interface ComboSet {
  id: string;
  topic: string;
  keywords: string[];
  combo: QuestionItem[];
}

interface RoleplaySet {
  id: string;
  topic: string;
  q11: QuestionItem;
  q12: QuestionItem;
  q13: QuestionItem;
}

interface ComparisonSet {
  id: string;
  topic: string;
  q14: QuestionItem;
  q15: QuestionItem;
}

interface QuestionBank {
  intro: {
    questions: Array<{ id: string; type: string; text: string }>;
  };
  sets: ComboSet[];
  roleplay: RoleplaySet[];
  comparison: ComparisonSet[];
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generates a randomized 15-question OPIc exam
 * 
 * Structure:
 * - Q1: Self-introduction (fixed)
 * - Q2-Q10: 3 random combo sets (3 questions each = 9 questions)
 * - Q11-Q13: 1 random roleplay set
 * - Q14-Q15: 1 random comparison set
 */
export function generateExam(): Question[] {
  const bank = questionBank as QuestionBank;
  const exam: Question[] = [];
  let questionId = 1;

  // 1. Add intro question (Q1)
  const intro = bank.intro.questions[0];
  exam.push({
    id: questionId++,
    type: intro.type,
    topic: "Self-Introduction",
    text: intro.text,
  });

  // 2. Select 3 random combo sets for Q2-Q10
  const shuffledSets = shuffle(bank.sets);
  const selectedSets = shuffledSets.slice(0, 3);

  for (const set of selectedSets) {
    for (const q of set.combo) {
      exam.push({
        id: questionId++,
        type: q.type,
        topic: set.topic,
        text: q.text,
      });
    }
  }

  // 3. Select 1 random roleplay set for Q11-Q13
  const roleplay = shuffle(bank.roleplay)[0];
  exam.push({
    id: questionId++,
    type: roleplay.q11.type,
    topic: `Roleplay: ${roleplay.topic}`,
    text: roleplay.q11.text,
  });
  exam.push({
    id: questionId++,
    type: roleplay.q12.type,
    topic: `Roleplay: ${roleplay.topic}`,
    text: roleplay.q12.text,
  });
  exam.push({
    id: questionId++,
    type: roleplay.q13.type,
    topic: `Roleplay: ${roleplay.topic}`,
    text: roleplay.q13.text,
  });

  // 4. Select 1 random comparison set for Q14-Q15
  const comparison = shuffle(bank.comparison)[0];
  exam.push({
    id: questionId++,
    type: comparison.q14.type,
    topic: comparison.topic,
    text: comparison.q14.text,
  });
  exam.push({
    id: questionId++,
    type: comparison.q15.type,
    topic: comparison.topic,
    text: comparison.q15.text,
  });

  return exam;
}
