import { describe, it, expect } from "vitest";
import {
  generateToeicSpeakingExam,
  generateToeicSpeakingPractice,
  listToeicSpeakingPracticeParts,
  TOEIC_SPEAKING_PART_IDS,
} from "@/lib/toeic-speaking-question-generator";
import {
  TOEIC_SPEAKING_PARTS,
  getToeicSpeakingPartById,
  getToeicSpeakingPartForQuestion,
  getToeicSpeakingLevelForScore,
} from "@/lib/toeic-speaking-constants";

describe("toeic-speaking-constants", () => {
  it("defines 6 parts", () => {
    expect(TOEIC_SPEAKING_PARTS).toHaveLength(6);
  });

  it("maps question numbers to parts correctly", () => {
    expect(getToeicSpeakingPartForQuestion(1)?.id).toBe("read_aloud");
    expect(getToeicSpeakingPartForQuestion(2)?.id).toBe("read_aloud");
    expect(getToeicSpeakingPartForQuestion(3)?.id).toBe("describe_picture");
    expect(getToeicSpeakingPartForQuestion(4)?.id).toBe("respond_questions");
    expect(getToeicSpeakingPartForQuestion(6)?.id).toBe("respond_questions");
    expect(getToeicSpeakingPartForQuestion(7)?.id).toBe("respond_with_info");
    expect(getToeicSpeakingPartForQuestion(9)?.id).toBe("respond_with_info");
    expect(getToeicSpeakingPartForQuestion(10)?.id).toBe("propose_solution");
    expect(getToeicSpeakingPartForQuestion(11)?.id).toBe("express_opinion");
  });

  it("returns correct level for score", () => {
    expect(getToeicSpeakingLevelForScore(200)?.level).toBe(8);
    expect(getToeicSpeakingLevelForScore(190)?.level).toBe(8);
    expect(getToeicSpeakingLevelForScore(160)?.level).toBe(7);
    expect(getToeicSpeakingLevelForScore(130)?.level).toBe(6);
    expect(getToeicSpeakingLevelForScore(50)?.level).toBe(2);
    expect(getToeicSpeakingLevelForScore(0)?.level).toBe(1);
  });

  it("finds parts by id", () => {
    const part = getToeicSpeakingPartById("express_opinion");
    expect(part).toBeDefined();
    expect(part!.prepSeconds).toBe(30);
    expect(part!.responseSeconds).toBe(60);
  });
});

describe("toeic-speaking-question-generator", () => {
  it("generates 11-question exam", () => {
    const exam = generateToeicSpeakingExam();
    expect(exam).toHaveLength(11);
    expect(exam[0].id).toBe(1);
    expect(exam[10].id).toBe(11);
  });

  it("assigns correct types to exam questions", () => {
    const exam = generateToeicSpeakingExam();
    expect(exam[0].type).toBe("read_aloud");
    expect(exam[1].type).toBe("read_aloud");
    expect(exam[2].type).toBe("describe_picture");
    expect(exam[3].type).toBe("respond_questions");
    expect(exam[6].type).toBe("respond_with_info");
    expect(exam[9].type).toBe("propose_solution");
    expect(exam[10].type).toBe("express_opinion");
  });

  it("assigns prep and response seconds to all questions", () => {
    const exam = generateToeicSpeakingExam();
    for (const q of exam) {
      expect(q.prepSeconds).toBeGreaterThanOrEqual(0);
      expect(q.responseSeconds).toBeGreaterThan(0);
    }
  });

  it("lists practice parts with correct counts", () => {
    const parts = listToeicSpeakingPracticeParts();
    expect(parts).toHaveLength(6);
    for (const part of parts) {
      expect(part.itemCount).toBeGreaterThan(0);
      expect(part.questionCount).toBeGreaterThan(0);
    }
  });

  it("generates practice for each part", () => {
    for (const partId of TOEIC_SPEAKING_PART_IDS) {
      const questions = generateToeicSpeakingPractice(partId);
      expect(questions.length).toBeGreaterThan(0);
      for (const q of questions) {
        expect(q.type).toBe(partId);
        expect(q.text).toBeTruthy();
      }
    }
  });
});
