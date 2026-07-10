import { describe, expect, it } from "vitest";
import {
  isValidComboTypeSequence,
  isValidComparisonTypeSequence,
  isValidRoleplayTypeSequence,
  isDifficultyId,
  isSurveyTopic,
  isSurpriseTopic,
  SURVEY_TOPIC_IDS,
  SURPRISE_TOPIC_IDS,
} from "@/lib/opic-constants";

describe("isValidComboTypeSequence", () => {
  it("accepts a valid stage 1→2→3 sequence", () => {
    expect(
      isValidComboTypeSequence([
        "activity_description",
        "first_experience",
        "memorable_experience",
      ]),
    ).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidComboTypeSequence(["routine", "first_experience"])).toBe(
      false,
    );
  });

  it("rejects out-of-order stages", () => {
    expect(
      isValidComboTypeSequence([
        "memorable_experience",
        "first_experience",
        "routine",
      ]),
    ).toBe(false);
  });

  it("rejects unknown types", () => {
    expect(
      isValidComboTypeSequence([
        "not_a_type",
        "first_experience",
        "memorable_experience",
      ]),
    ).toBe(false);
  });
});

describe("isValidRoleplayTypeSequence", () => {
  it("accepts the fixed roleplay progression", () => {
    expect(
      isValidRoleplayTypeSequence([
        "situation_questions",
        "problem_solving",
        "similar_experience",
      ]),
    ).toBe(true);
  });

  it("rejects shuffled roleplay types", () => {
    expect(
      isValidRoleplayTypeSequence([
        "problem_solving",
        "situation_questions",
        "similar_experience",
      ]),
    ).toBe(false);
  });
});

describe("isValidComparisonTypeSequence", () => {
  it("accepts a valid two-stage comparison sequence", () => {
    expect(
      isValidComparisonTypeSequence([
        "past_present_comparison",
        "issue_discussion",
      ]),
    ).toBe(true);
  });

  it("rejects wrong length or stage mismatch", () => {
    expect(isValidComparisonTypeSequence(["issue_discussion"])).toBe(false);
    expect(
      isValidComparisonTypeSequence([
        "issue_discussion",
        "past_present_comparison",
      ]),
    ).toBe(false);
  });
});

describe("topic and difficulty helpers", () => {
  it("classifies survey and surprise topics without overlap", () => {
    for (const id of SURVEY_TOPIC_IDS) {
      expect(isSurveyTopic(id)).toBe(true);
      expect(isSurpriseTopic(id)).toBe(false);
    }
    for (const id of SURPRISE_TOPIC_IDS) {
      expect(isSurpriseTopic(id)).toBe(true);
      expect(isSurveyTopic(id)).toBe(false);
    }
  });

  it("narrows difficulty ids", () => {
    expect(isDifficultyId("standard")).toBe(true);
    expect(isDifficultyId("challenging")).toBe(true);
    expect(isDifficultyId("hard")).toBe(false);
    expect(isDifficultyId(undefined)).toBe(false);
  });
});
