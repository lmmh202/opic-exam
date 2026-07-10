import { describe, expect, it } from "vitest";
import {
  countPracticeSets,
  generateExam,
  generatePracticeExam,
  listPracticeQuestionSets,
  listPracticeTopics,
} from "@/lib/question-generator";
import {
  isValidComboTypeSequence,
  isValidComparisonTypeSequence,
  isValidRoleplayTypeSequence,
} from "@/lib/opic-constants";

describe("generateExam", () => {
  it("returns exactly 15 questions with the OPIc structure", () => {
    const exam = generateExam();

    expect(exam).toHaveLength(15);
    expect(exam.map((q) => q.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);

    expect(exam[0].topic).toBe("Self-Introduction");
    expect(exam[0].type).toBeTruthy();
    expect(exam[0].text.length).toBeGreaterThan(0);

    const combo = exam.slice(1, 10);
    expect(combo).toHaveLength(9);
    for (let i = 0; i < 3; i += 1) {
      const types = combo.slice(i * 3, i * 3 + 3).map((q) => q.type);
      expect(isValidComboTypeSequence(types)).toBe(true);
      const topicIds = new Set(
        combo.slice(i * 3, i * 3 + 3).map((q) => q.topicId),
      );
      expect(topicIds.size).toBe(1);
    }

    const roleplay = exam.slice(10, 13);
    expect(
      isValidRoleplayTypeSequence(roleplay.map((q) => q.type)),
    ).toBe(true);
    expect(new Set(roleplay.map((q) => q.topicId)).size).toBe(1);

    const comparison = exam.slice(13, 15);
    expect(
      isValidComparisonTypeSequence(comparison.map((q) => q.type)),
    ).toBe(true);
    expect(new Set(comparison.map((q) => q.topicId)).size).toBe(1);
  });

  it("keeps the structure across multiple random draws", () => {
    for (let i = 0; i < 8; i += 1) {
      const exam = generateExam();
      expect(exam).toHaveLength(15);
      expect(
        isValidComboTypeSequence(exam.slice(1, 4).map((q) => q.type)),
      ).toBe(true);
      expect(
        isValidRoleplayTypeSequence(exam.slice(10, 13).map((q) => q.type)),
      ).toBe(true);
      expect(
        isValidComparisonTypeSequence(exam.slice(13, 15).map((q) => q.type)),
      ).toBe(true);
    }
  });
});

describe("generatePracticeExam", () => {
  it("builds a practice set for a specific topic and set", () => {
    const exam = generatePracticeExam({
      category: "combo",
      topicId: "park",
      setId: "park-default",
      difficulty: "standard",
    });

    expect(exam).toHaveLength(3);
    expect(exam.every((q) => q.topicId === "park")).toBe(true);
    expect(exam.every((q) => q.difficulty === "standard")).toBe(true);
    expect(isValidComboTypeSequence(exam.map((q) => q.type))).toBe(true);
  });

  it("filters by difficulty when requested", () => {
    const exam = generatePracticeExam({
      category: "combo",
      topicId: "park",
      difficulty: "standard",
    });
    expect(exam.every((q) => q.difficulty === "standard")).toBe(true);
  });

  it("throws when topic or set is missing", () => {
    expect(() =>
      generatePracticeExam({
        category: "combo",
        topicId: "not-a-real-topic",
      }),
    ).toThrow(/Topic not found/);

    expect(() =>
      generatePracticeExam({
        category: "combo",
        topicId: "park",
        setId: "missing-set",
        difficulty: "standard",
      }),
    ).toThrow(/Question set not found/);
  });
});

describe("practice listing helpers", () => {
  it("lists topics and sets with matching difficulty filters", () => {
    const topics = listPracticeTopics("standard");
    expect(topics.length).toBeGreaterThan(0);
    expect(topics.every((t) => t.setCount > 0)).toBe(true);

    const park = topics.find((t) => t.id === "park" && t.category === "combo");
    expect(park).toBeDefined();

    const sets = listPracticeQuestionSets("combo", "park", "standard");
    expect(sets.length).toBeGreaterThan(0);
    expect(sets.every((s) => s.difficulty === "standard")).toBe(true);
    expect(countPracticeSets("combo", "standard")).toBeGreaterThan(0);

    const furnitureKo = listPracticeQuestionSets(
      "combo",
      "furniture",
      "standard",
      "ko",
    );
    const furnitureEn = listPracticeQuestionSets(
      "combo",
      "furniture",
      "standard",
      "en",
    );
    expect(furnitureKo[0]?.label).toMatch(/[가-힣]/);
    expect(furnitureEn[0]?.label).toMatch(/[A-Za-z]/);
    expect(furnitureKo[0]?.label).not.toBe(furnitureEn[0]?.label);
  });
});
