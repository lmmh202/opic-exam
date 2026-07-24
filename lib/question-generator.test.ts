import { describe, expect, it } from "vitest";
import {
  countPracticeQuestionsByType,
  countPracticeSets,
  generateExam,
  generatePracticeExam,
  generateTypePracticeExam,
  listPracticeQuestionSets,
  listPracticeStages,
  listPracticeTopics,
  listPracticeTypesForStage,
} from "@/lib/question-generator";
import {
  getComboStage,
  getComparisonStage,
  getRoleplayStage,
  isValidComboTypeSequence,
  isValidComparisonTypeSequence,
  isValidRoleplayTypeSequence,
} from "@/lib/opic-constants";

describe("generateExam", () => {
  it("returns exactly 15 questions with the OPIc structure", () => {
    const exam = generateExam();

    expect(exam).toHaveLength(15);
    expect(exam.map((q) => q.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

    expect(exam[0].topic).toBe("Self-Introduction");
    expect(exam[0].type).toBeTruthy();
    expect(exam[0].text.length).toBeGreaterThan(0);

    const combo = exam.slice(1, 10);
    expect(combo).toHaveLength(9);
    for (let i = 0; i < 3; i += 1) {
      const types = combo.slice(i * 3, i * 3 + 3).map((q) => q.type);
      expect(isValidComboTypeSequence(types)).toBe(true);
      const topicIds = new Set(combo.slice(i * 3, i * 3 + 3).map((q) => q.topicId));
      expect(topicIds.size).toBe(1);
    }

    const roleplay = exam.slice(10, 13);
    expect(isValidRoleplayTypeSequence(roleplay.map((q) => q.type))).toBe(true);
    expect(new Set(roleplay.map((q) => q.topicId)).size).toBe(1);

    const comparison = exam.slice(13, 15);
    expect(isValidComparisonTypeSequence(comparison.map((q) => q.type))).toBe(true);
    expect(new Set(comparison.map((q) => q.topicId)).size).toBe(1);
  });

  it("keeps the structure across multiple random draws", () => {
    for (let i = 0; i < 8; i += 1) {
      const exam = generateExam();
      expect(exam).toHaveLength(15);
      expect(isValidComboTypeSequence(exam.slice(1, 4).map((q) => q.type))).toBe(true);
      expect(isValidRoleplayTypeSequence(exam.slice(10, 13).map((q) => q.type))).toBe(true);
      expect(isValidComparisonTypeSequence(exam.slice(13, 15).map((q) => q.type))).toBe(true);
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

    const furnitureKo = listPracticeQuestionSets("combo", "furniture", "standard", "ko");
    const furnitureEn = listPracticeQuestionSets("combo", "furniture", "standard", "en");
    expect(furnitureKo[0]?.label).toMatch(/[가-힣]/);
    expect(furnitureEn[0]?.label).toMatch(/[A-Za-z]/);
    expect(furnitureKo[0]?.label).not.toBe(furnitureEn[0]?.label);
  });
});

describe("type practice helpers", () => {
  it("lists stages for each category", () => {
    expect(listPracticeStages("combo").map((s) => s.stage)).toEqual([1, 2, 3]);
    expect(listPracticeStages("roleplay").map((s) => s.stage)).toEqual([1, 2, 3]);
    expect(listPracticeStages("comparison").map((s) => s.stage)).toEqual([1, 2]);
  });

  it("lists only types that exist in the bank for a stage", () => {
    const types = listPracticeTypesForStage("combo", 2, "standard", "ko");
    expect(types.length).toBeGreaterThan(0);
    expect(types.every((item) => item.count > 0)).toBe(true);
    expect(types.every((item) => getComboStage(item.id) === 2)).toBe(true);
  });

  it("counts questions for a stage and optional type filter", () => {
    const allStage2 = countPracticeQuestionsByType({
      category: "combo",
      stage: 2,
      typeId: "all",
      difficulty: "standard",
    });
    expect(allStage2).toBeGreaterThan(0);

    const types = listPracticeTypesForStage("combo", 2, "standard");
    const firstType = types[0];
    expect(firstType).toBeDefined();
    if (!firstType) return;

    const filtered = countPracticeQuestionsByType({
      category: "combo",
      stage: 2,
      typeId: firstType.id,
      difficulty: "standard",
    });
    expect(filtered).toBe(firstType.count);
    expect(filtered).toBeLessThanOrEqual(allStage2);
  });

  it("samples cross-topic questions for a stage without duplicates", () => {
    const exam = generateTypePracticeExam({
      category: "combo",
      stage: 2,
      typeId: "all",
      difficulty: "standard",
      count: 5,
    });

    expect(exam.length).toBeGreaterThan(0);
    expect(exam.length).toBeLessThanOrEqual(5);
    expect(exam.every((q) => getComboStage(q.type) === 2)).toBe(true);
    expect(exam.every((q) => q.difficulty === "standard")).toBe(true);

    const keys = exam.map((q) => `${q.topicId}|${q.type}|${q.text}`);
    expect(new Set(keys).size).toBe(exam.length);
  });

  it("caps count when the pool is smaller than requested", () => {
    const types = listPracticeTypesForStage("comparison", 2, "standard");
    const firstType = types[0];
    expect(firstType).toBeDefined();
    if (!firstType) return;

    const exam = generateTypePracticeExam({
      category: "comparison",
      stage: 2,
      typeId: firstType.id,
      difficulty: "standard",
      count: 50,
    });

    expect(exam).toHaveLength(firstType.count);
    expect(exam.every((q) => q.type === firstType.id)).toBe(true);
    expect(exam.every((q) => getComparisonStage(q.type) === 2)).toBe(true);
  });

  it("throws when the type pool is empty", () => {
    expect(() =>
      generateTypePracticeExam({
        category: "roleplay",
        stage: 1,
        difficulty: "challenging",
        count: 3,
      }),
    ).toThrow(/No practice questions available/);
  });

  it("keeps roleplay stage filtering consistent", () => {
    const exam = generateTypePracticeExam({
      category: "roleplay",
      stage: 1,
      difficulty: "standard",
      count: 3,
    });
    expect(exam.every((q) => getRoleplayStage(q.type) === 1)).toBe(true);
  });
});
