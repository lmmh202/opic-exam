import { describe, expect, it } from "vitest";
import constants from "@/data/opic-constants.json";
import {
  collectExistingTexts,
  normalize,
  validateComboSet,
  validateComparisonSet,
  validateRoleplaySet,
} from "./validate-generated-sets.mjs";

const LONG_TEXT =
  "Please describe this topic in detail with enough words for validation.";

function baseContext() {
  return {
    surveyTopicIds: constants.surveyTopics.map((topic) => topic.id),
    surpriseTopicIds: constants.surpriseTopics.map((topic) => topic.id),
    roleplayTopicIds: constants.roleplayTopics.map((topic) => topic.id),
    comparisonTopicIds: constants.comparisonTopics.map((topic) => topic.id),
    comboStages: constants.comboStages,
    roleplayStages: constants.roleplayStages,
    comparisonStages: constants.comparisonStages,
    existingQuestionTexts: new Set<string>(),
  };
}

describe("normalize / collectExistingTexts", () => {
  it("normalizes whitespace and case", () => {
    expect(normalize("  Hello   World ")).toBe("hello world");
  });

  it("collects existing question texts from a bank", () => {
    const texts = collectExistingTexts({
      combo: [
        {
          id: "park",
          sets: [
            {
              id: "a",
              questions: [{ type: "routine", text: "First question text" }],
            },
          ],
        },
      ],
      roleplay: [],
      comparison: [],
    });
    expect(texts.has("first question text")).toBe(true);
  });
});

describe("validateComboSet", () => {
  const validSurveySet = {
    targetTopicId: "park",
    label: "Park set",
    isSurprise: false,
    difficulty: "standard",
    questions: [
      { type: "activity_description", text: LONG_TEXT },
      { type: "first_experience", text: `${LONG_TEXT} two` },
      { type: "memorable_experience", text: `${LONG_TEXT} three` },
    ],
  };

  it("accepts a valid survey combo set", () => {
    expect(validateComboSet(validSurveySet, baseContext())).toBe(true);
  });

  it("accepts a valid surprise combo set", () => {
    expect(
      validateComboSet(
        {
          ...validSurveySet,
          targetTopicId: "weather",
          isSurprise: true,
        },
        baseContext(),
      ),
    ).toBe(true);
  });

  it("rejects mismatched surprise flags and topics", () => {
    expect(
      validateComboSet(
        { ...validSurveySet, targetTopicId: "weather", isSurprise: false },
        baseContext(),
      ),
    ).toBe(false);
    expect(
      validateComboSet(
        { ...validSurveySet, targetTopicId: "park", isSurprise: true },
        baseContext(),
      ),
    ).toBe(false);
  });

  it("rejects invalid stage order, short text, duplicates, and difficulty", () => {
    const context = baseContext();
    expect(
      validateComboSet(
        {
          ...validSurveySet,
          questions: [
            { type: "memorable_experience", text: LONG_TEXT },
            { type: "first_experience", text: `${LONG_TEXT} two` },
            { type: "activity_description", text: `${LONG_TEXT} three` },
          ],
        },
        context,
      ),
    ).toBe(false);

    expect(
      validateComboSet(
        {
          ...validSurveySet,
          questions: [
            { type: "activity_description", text: "too short" },
            { type: "first_experience", text: `${LONG_TEXT} two` },
            { type: "memorable_experience", text: `${LONG_TEXT} three` },
          ],
        },
        context,
      ),
    ).toBe(false);

    context.existingQuestionTexts.add(normalize(LONG_TEXT));
    expect(validateComboSet(validSurveySet, context)).toBe(false);

    expect(
      validateComboSet(
        { ...validSurveySet, difficulty: "hard" },
        baseContext(),
      ),
    ).toBe(false);

    expect(
      validateComboSet(validSurveySet, {
        ...baseContext(),
        expectedDifficulty: "challenging",
      }),
    ).toBe(false);
  });
});

describe("validateRoleplaySet", () => {
  const validSet = {
    targetTopicId: "cellphone",
    label: "Phone set",
    difficulty: "standard",
    questions: [
      { type: "situation_questions", text: LONG_TEXT },
      { type: "problem_solving", text: `${LONG_TEXT} two` },
      { type: "similar_experience", text: `${LONG_TEXT} three` },
    ],
  };

  it("accepts a valid roleplay set and rejects bad topics/stages", () => {
    expect(validateRoleplaySet(validSet, baseContext())).toBe(true);
    expect(
      validateRoleplaySet(
        { ...validSet, targetTopicId: "park" },
        baseContext(),
      ),
    ).toBe(false);
    expect(
      validateRoleplaySet(
        {
          ...validSet,
          questions: [
            { type: "problem_solving", text: LONG_TEXT },
            { type: "situation_questions", text: `${LONG_TEXT} two` },
            { type: "similar_experience", text: `${LONG_TEXT} three` },
          ],
        },
        baseContext(),
      ),
    ).toBe(false);
  });
});

describe("validateComparisonSet", () => {
  const validSet = {
    targetTopicId: "housing",
    label: "Housing set",
    difficulty: "standard",
    questions: [
      { type: "past_present_comparison", text: LONG_TEXT },
      { type: "issue_discussion", text: `${LONG_TEXT} two` },
    ],
  };

  it("accepts a valid comparison set and rejects wrong length", () => {
    expect(validateComparisonSet(validSet, baseContext())).toBe(true);
    expect(
      validateComparisonSet(
        {
          ...validSet,
          questions: [{ type: "past_present_comparison", text: LONG_TEXT }],
        },
        baseContext(),
      ),
    ).toBe(false);
  });
});
