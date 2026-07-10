import { describe, expect, it } from "vitest";
import questionBank from "@/public/question-bank.json";
import {
  COMPARISON_TOPIC_IDS,
  COMBO_STAGES,
  COMPARISON_STAGES,
  isDifficultyId,
  isValidComboTypeSequence,
  isValidComparisonTypeSequence,
  isValidRoleplayTypeSequence,
  ROLEPLAY_STAGES,
  ROLEPLAY_TOPIC_IDS,
  SURPRISE_TOPIC_IDS,
  SURVEY_TOPIC_IDS,
} from "@/lib/opic-constants";

type BankTopic = {
  id: string;
  label: string;
  surprise?: boolean;
  sets: Array<{
    id: string;
    label?: { ko: string; en: string };
    difficulty?: string;
    questions: Array<{ type: string; text: string }>;
  }>;
};

type QuestionBank = {
  intro: { questions: Array<{ id: string; type: string; text: string }> };
  combo: BankTopic[];
  roleplay: BankTopic[];
  comparison: BankTopic[];
};

const bank = questionBank as QuestionBank;
const surveyIds = new Set(SURVEY_TOPIC_IDS);
const surpriseIds = new Set(SURPRISE_TOPIC_IDS);
const roleplayIds = new Set(ROLEPLAY_TOPIC_IDS);
const comparisonIds = new Set(COMPARISON_TOPIC_IDS);

describe("question-bank integrity", () => {
  it("has a self-introduction question", () => {
    expect(bank.intro.questions.length).toBeGreaterThan(0);
    expect(bank.intro.questions[0].text.length).toBeGreaterThan(0);
  });

  it("keeps combo topics aligned with survey/surprise constants and stage rules", () => {
    expect(bank.combo.length).toBeGreaterThan(0);

    for (const topic of bank.combo) {
      const isSurprise = surpriseIds.has(topic.id);
      const isSurvey = surveyIds.has(topic.id);
      expect(isSurprise || isSurvey).toBe(true);
      expect(!!topic.surprise).toBe(isSurprise);
      expect(topic.sets.length).toBeGreaterThan(0);

      for (const set of topic.sets) {
        expect(set.questions).toHaveLength(Object.keys(COMBO_STAGES).length);
        expect(
          isValidComboTypeSequence(set.questions.map((q) => q.type)),
        ).toBe(true);
        if (set.difficulty !== undefined) {
          expect(isDifficultyId(set.difficulty)).toBe(true);
        }
        for (const question of set.questions) {
          expect(question.text.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("keeps roleplay topics and stage sequences valid", () => {
    expect(bank.roleplay.length).toBeGreaterThan(0);

    for (const topic of bank.roleplay) {
      expect(roleplayIds.has(topic.id)).toBe(true);
      for (const set of topic.sets) {
        expect(set.questions).toHaveLength(Object.keys(ROLEPLAY_STAGES).length);
        expect(
          isValidRoleplayTypeSequence(set.questions.map((q) => q.type)),
        ).toBe(true);
      }
    }
  });

  it("keeps comparison topics and stage sequences valid", () => {
    expect(bank.comparison.length).toBeGreaterThan(0);

    for (const topic of bank.comparison) {
      expect(comparisonIds.has(topic.id)).toBe(true);
      for (const set of topic.sets) {
        expect(set.questions).toHaveLength(
          Object.keys(COMPARISON_STAGES).length,
        );
        expect(
          isValidComparisonTypeSequence(set.questions.map((q) => q.type)),
        ).toBe(true);
      }
    }
  });

  it("does not duplicate question texts within the bank", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const category of ["combo", "roleplay", "comparison"] as const) {
      for (const topic of bank[category]) {
        for (const set of topic.sets) {
          for (const question of set.questions) {
            const key = question.text.toLowerCase().replace(/\s+/g, " ").trim();
            if (seen.has(key)) duplicates.push(`${topic.id}/${set.id}`);
            seen.add(key);
          }
        }
      }
    }

    expect(duplicates).toEqual([]);
  });

  it("keeps set labels localized with ko and en", () => {
    for (const category of ["combo", "roleplay", "comparison"] as const) {
      for (const topic of bank[category]) {
        for (const set of topic.sets) {
          expect(set.label).toEqual(
            expect.objectContaining({
              ko: expect.any(String),
              en: expect.any(String),
            }),
          );
          expect(set.label!.ko.trim().length).toBeGreaterThan(0);
          expect(set.label!.en.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});
