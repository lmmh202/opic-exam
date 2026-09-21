import toeicQuestionBank from "@/public/toeic-speaking-question-bank.json";
import {
  TOEIC_SPEAKING_PARTS,
  getToeicSpeakingPartById,
  getToeicSpeakingPartLabel,
  type ToeicSpeakingPart,
} from "@/lib/toeic-speaking-constants";
import type { Question } from "@/lib/question-generator";
import type { Locale } from "@/lib/i18n/config";

// Part ids that the TOEIC Speaking question bank supports.
export type ToeicSpeakingPartId =
  | "read_aloud"
  | "describe_picture"
  | "respond_questions"
  | "respond_with_info"
  | "propose_solution"
  | "express_opinion";

export const TOEIC_SPEAKING_PART_IDS: ToeicSpeakingPartId[] = [
  "read_aloud",
  "describe_picture",
  "respond_questions",
  "respond_with_info",
  "propose_solution",
  "express_opinion",
];

interface ReadAloudItem {
  id: string;
  text: string;
}

interface DescribePictureItem {
  id: string;
  prompt: string;
  imageDescription: string;
}

interface RespondQuestionItem {
  type: string;
  text: string;
}

interface RespondQuestionsSet {
  id: string;
  topic: string;
  questions: RespondQuestionItem[];
}

interface RespondWithInfoSet {
  id: string;
  infoText: string;
  questions: RespondQuestionItem[];
}

interface ProposeSolutionItem {
  id: string;
  scenario: string;
  text: string;
}

interface ExpressOpinionItem {
  id: string;
  text: string;
}

interface ToeicSpeakingBank {
  read_aloud: ReadAloudItem[];
  describe_picture: DescribePictureItem[];
  respond_questions: RespondQuestionsSet[];
  respond_with_info: RespondWithInfoSet[];
  propose_solution: ProposeSolutionItem[];
  express_opinion: ExpressOpinionItem[];
}

function getBank(): ToeicSpeakingBank {
  return toeicQuestionBank as ToeicSpeakingBank;
}

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

// Resolves the response time in seconds for a specific question index within a part.
function resolveResponseSeconds(part: ToeicSpeakingPart, questionIndexInPart: number): number {
  if (Array.isArray(part.responseSeconds)) {
    return part.responseSeconds[questionIndexInPart] ?? part.responseSeconds[part.responseSeconds.length - 1] ?? 30;
  }
  return part.responseSeconds;
}

// Resolves prep time in seconds for a part.
function resolvePrepSeconds(part: ToeicSpeakingPart): number {
  if (Array.isArray(part.prepSeconds)) {
    return part.prepSeconds[0] ?? 3;
  }
  return part.prepSeconds;
}

// Generates a full 11-question TOEIC Speaking exam.
export function generateToeicSpeakingExam(locale: Locale = "ko"): Question[] {
  const bank = getBank();
  const questions: Question[] = [];
  let questionId = 1;

  // Q1-2: Read aloud (pick 2 random)
  const readAloudPart = getToeicSpeakingPartById("read_aloud")!;
  const readAloudItems = shuffle(bank.read_aloud).slice(0, 2);
  for (let i = 0; i < readAloudItems.length; i++) {
    questions.push({
      id: questionId++,
      type: "read_aloud",
      topic: getToeicSpeakingPartLabel("read_aloud", locale),
      text: readAloudItems[i].text,
      prepSeconds: resolvePrepSeconds(readAloudPart),
      responseSeconds: resolveResponseSeconds(readAloudPart, i),
    });
  }

  // Q3: Describe a picture (pick 1 random)
  const dpPart = getToeicSpeakingPartById("describe_picture")!;
  const dpItem = pickRandom(bank.describe_picture);
  questions.push({
    id: questionId++,
    type: "describe_picture",
    topic: getToeicSpeakingPartLabel("describe_picture", locale),
    text: `${dpItem.prompt}\n\n[${dpItem.imageDescription}]`,
    prepSeconds: resolvePrepSeconds(dpPart),
    responseSeconds: resolveResponseSeconds(dpPart, 0),
  });

  // Q4-6: Respond to questions (pick 1 random set of 3)
  const rqPart = getToeicSpeakingPartById("respond_questions")!;
  const rqSet = pickRandom(bank.respond_questions);
  for (let i = 0; i < rqSet.questions.length; i++) {
    const q = rqSet.questions[i];
    const prefix = i === 0 ? `${rqSet.topic}\n\n` : "";
    questions.push({
      id: questionId++,
      type: "respond_questions",
      topic: getToeicSpeakingPartLabel("respond_questions", locale),
      text: `${prefix}${q.text}`,
      prepSeconds: resolvePrepSeconds(rqPart),
      responseSeconds: resolveResponseSeconds(rqPart, i),
    });
  }

  // Q7-9: Respond with information (pick 1 random set of 3)
  const riPart = getToeicSpeakingPartById("respond_with_info")!;
  const riSet = pickRandom(bank.respond_with_info);
  for (let i = 0; i < riSet.questions.length; i++) {
    const q = riSet.questions[i];
    const prefix = i === 0 ? `${riSet.infoText}\n\n` : "";
    questions.push({
      id: questionId++,
      type: "respond_with_info",
      topic: getToeicSpeakingPartLabel("respond_with_info", locale),
      text: `${prefix}${q.text}`,
      prepSeconds: resolvePrepSeconds(riPart),
      responseSeconds: resolveResponseSeconds(riPart, i),
    });
  }

  // Q10: Propose a solution (pick 1 random)
  const psPart = getToeicSpeakingPartById("propose_solution")!;
  const psItem = pickRandom(bank.propose_solution);
  questions.push({
    id: questionId++,
    type: "propose_solution",
    topic: getToeicSpeakingPartLabel("propose_solution", locale),
    text: `${psItem.scenario}\n\n${psItem.text}`,
    prepSeconds: resolvePrepSeconds(psPart),
    responseSeconds: resolveResponseSeconds(psPart, 0),
  });

  // Q11: Express an opinion (pick 1 random)
  const eoPart = getToeicSpeakingPartById("express_opinion")!;
  const eoItem = pickRandom(bank.express_opinion);
  questions.push({
    id: questionId++,
    type: "express_opinion",
    topic: getToeicSpeakingPartLabel("express_opinion", locale),
    text: eoItem.text,
    prepSeconds: resolvePrepSeconds(eoPart),
    responseSeconds: resolveResponseSeconds(eoPart, 0),
  });

  return questions;
}

// Practice topic metadata for the practice hub UI.
export interface ToeicSpeakingPracticePart {
  id: ToeicSpeakingPartId;
  label: string;
  questionCount: number;
  itemCount: number;
}

// Lists available parts for practice, with item counts from the question bank.
export function listToeicSpeakingPracticeParts(locale: Locale = "ko"): ToeicSpeakingPracticePart[] {
  const bank = getBank();
  const partItemCounts: Record<string, number> = {
    read_aloud: bank.read_aloud.length,
    describe_picture: bank.describe_picture.length,
    respond_questions: bank.respond_questions.length,
    respond_with_info: bank.respond_with_info.length,
    propose_solution: bank.propose_solution.length,
    express_opinion: bank.express_opinion.length,
  };

  return TOEIC_SPEAKING_PARTS.map((part) => {
    const questionCount = part.questionRange[1] - part.questionRange[0] + 1;
    return {
      id: part.id as ToeicSpeakingPartId,
      label: getToeicSpeakingPartLabel(part.id, locale),
      questionCount,
      itemCount: partItemCounts[part.id] ?? 0,
    };
  });
}

// Generates practice questions for a specific TOEIC Speaking part.
export function generateToeicSpeakingPractice(partId: ToeicSpeakingPartId, locale: Locale = "ko"): Question[] {
  const bank = getBank();
  const part = getToeicSpeakingPartById(partId);
  if (!part) throw new Error(`Unknown TOEIC Speaking part: ${partId}`);

  const questions: Question[] = [];
  let questionId = 1;
  const partLabel = getToeicSpeakingPartLabel(partId, locale);

  switch (partId) {
    case "read_aloud": {
      const item = pickRandom(bank.read_aloud);
      questions.push({
        id: questionId++,
        type: "read_aloud",
        topic: partLabel,
        text: item.text,
        prepSeconds: resolvePrepSeconds(part),
        responseSeconds: resolveResponseSeconds(part, 0),
      });
      break;
    }
    case "describe_picture": {
      const item = pickRandom(bank.describe_picture);
      questions.push({
        id: questionId++,
        type: "describe_picture",
        topic: partLabel,
        text: `${item.prompt}\n\n[${item.imageDescription}]`,
        prepSeconds: resolvePrepSeconds(part),
        responseSeconds: resolveResponseSeconds(part, 0),
      });
      break;
    }
    case "respond_questions": {
      const set = pickRandom(bank.respond_questions);
      for (let i = 0; i < set.questions.length; i++) {
        const q = set.questions[i];
        const prefix = i === 0 ? `${set.topic}\n\n` : "";
        questions.push({
          id: questionId++,
          type: "respond_questions",
          topic: partLabel,
          text: `${prefix}${q.text}`,
          prepSeconds: resolvePrepSeconds(part),
          responseSeconds: resolveResponseSeconds(part, i),
        });
      }
      break;
    }
    case "respond_with_info": {
      const set = pickRandom(bank.respond_with_info);
      for (let i = 0; i < set.questions.length; i++) {
        const q = set.questions[i];
        const prefix = i === 0 ? `${set.infoText}\n\n` : "";
        questions.push({
          id: questionId++,
          type: "respond_with_info",
          topic: partLabel,
          text: `${prefix}${q.text}`,
          prepSeconds: resolvePrepSeconds(part),
          responseSeconds: resolveResponseSeconds(part, i),
        });
      }
      break;
    }
    case "propose_solution": {
      const item = pickRandom(bank.propose_solution);
      questions.push({
        id: questionId++,
        type: "propose_solution",
        topic: partLabel,
        text: `${item.scenario}\n\n${item.text}`,
        prepSeconds: resolvePrepSeconds(part),
        responseSeconds: resolveResponseSeconds(part, 0),
      });
      break;
    }
    case "express_opinion": {
      const item = pickRandom(bank.express_opinion);
      questions.push({
        id: questionId++,
        type: "express_opinion",
        topic: partLabel,
        text: item.text,
        prepSeconds: resolvePrepSeconds(part),
        responseSeconds: resolveResponseSeconds(part, 0),
      });
      break;
    }
  }

  return questions;
}
