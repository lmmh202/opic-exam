import { describe, expect, it } from "vitest";
import {
  findMockExam,
  getMockExamTitle,
  getSurveyTopicIds,
  listMockExams,
  toExamQuestions,
  type MockExam,
} from "@/lib/mock-exams";
import { isValidComparisonTypeSequence, isValidRoleplayTypeSequence } from "@/lib/opic-constants";

const exams = listMockExams();

function questionsForSet(exam: MockExam, setId: string) {
  return exam.questions.filter((question) => question.setId === setId).sort((a, b) => a.number - b.number);
}

describe("mock exam data", () => {
  it("ships at least one exam", () => {
    expect(exams.length).toBeGreaterThan(0);
  });

  it.each(exams.map((exam) => [exam.id, exam] as const))("%s is a complete 15-question paper", (_id, exam) => {
    expect(exam.questions).toHaveLength(15);
    expect(exam.questions.map((q) => q.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(exam.questions.every((q) => q.text.trim().length > 0)).toBe(true);
  });

  it.each(exams.map((exam) => [exam.id, exam] as const))("%s references only declared sets", (_id, exam) => {
    const setIds = new Set(exam.sets.map((set) => set.id));
    for (const question of exam.questions) {
      expect(setIds.has(question.setId)).toBe(true);
    }
  });

  it.each(exams.map((exam) => [exam.id, exam] as const))("%s keeps stage order within each set", (_id, exam) => {
    for (const set of exam.sets) {
      const stages = questionsForSet(exam, set.id).map((q) => q.stage ?? 0);

      if (set.section === "combo") {
        // Real papers pair two stage-1 prompts or skip stage 3, so only the ordering is enforced.
        expect(stages).toHaveLength(3);
        expect(stages.every((stage, i) => i === 0 || stage >= stages[i - 1])).toBe(true);
      }

      if (set.section === "roleplay") {
        expect(isValidRoleplayTypeSequence(questionsForSet(exam, set.id).map((q) => q.type))).toBe(true);
      }

      if (set.section === "comparison") {
        expect(isValidComparisonTypeSequence(questionsForSet(exam, set.id).map((q) => q.type))).toBe(true);
      }
    }
  });

  it.each(exams.map((exam) => [exam.id, exam] as const))("%s marks surprise sets consistently", (_id, exam) => {
    const surveyTopicIds = new Set(getSurveyTopicIds(exam));

    for (const set of exam.sets) {
      if (set.section !== "combo" || !set.topicId) continue;

      // A combo topic is 돌발 exactly when the exam's own survey did not select it.
      expect(set.surprise ?? false).toBe(!surveyTopicIds.has(set.topicId));
    }
  });

  it.each(exams.map((exam) => [exam.id, exam] as const))("%s carries a localized survey", (_id, exam) => {
    expect(exam.survey.length).toBeGreaterThan(0);
    for (const item of exam.survey) {
      expect(item.question.ko.trim().length).toBeGreaterThan(0);
      expect(item.question.en.trim().length).toBeGreaterThan(0);
      expect(item.answer.ko.trim().length).toBeGreaterThan(0);
      expect(item.answer.en.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("toExamQuestions", () => {
  const exam = exams[0];

  it("returns the paper in printed order with sequential ids", () => {
    const questions = toExamQuestions(exam, "ko");

    expect(questions).toHaveLength(15);
    expect(questions.map((q) => q.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(questions[0].topic).toBe("Self-Introduction");
    expect(questions[0].topicId).toBeUndefined();
  });

  it("localizes labels for topics defined in constants", () => {
    const ko = toExamQuestions(exam, "ko");
    const en = toExamQuestions(exam, "en");

    const koCafe = ko.find((q) => q.topicId === "cafe");
    const enCafe = en.find((q) => q.topicId === "cafe");

    expect(koCafe?.topic).toMatch(/[가-힣]/);
    expect(enCafe?.topic).toMatch(/[A-Za-z]/);
    expect(koCafe?.topic).not.toBe(enCafe?.topic);
  });

  it("falls back to the inline label for exam-local topics", () => {
    const ko = toExamQuestions(exam, "ko");
    const salon = ko.filter((q) => q.topicId === "hair_salon");

    expect(salon).toHaveLength(3);
    expect(salon.every((q) => q.topic === "미용실")).toBe(true);
  });

  it("propagates the surprise flag from the set to every question", () => {
    const questions = toExamQuestions(exam, "ko");
    const health = questions.filter((q) => q.topicId === "health");

    expect(health).toHaveLength(3);
    expect(health.every((q) => q.surprise)).toBe(true);
    expect(questions.filter((q) => q.topicId === "cafe").every((q) => !q.surprise)).toBe(true);
  });
});

describe("mock exam lookup", () => {
  it("finds an exam by id and localizes its title", () => {
    const exam = findMockExam(exams[0].id);

    expect(exam.id).toBe(exams[0].id);
    expect(getMockExamTitle(exam, "ko")).toMatch(/[가-힣]/);
    expect(getMockExamTitle(exam, "en")).toMatch(/[A-Za-z]/);
  });

  it("throws for an unknown exam id", () => {
    expect(() => findMockExam("not-a-real-exam")).toThrow(/Mock exam not found/);
  });
});
