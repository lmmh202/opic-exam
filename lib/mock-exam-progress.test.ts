import { beforeEach, describe, expect, it } from "vitest";
import { getCompletedCount, getLastCompletedAt, getOpenAttempt, useMockExamProgress } from "@/lib/mock-exam-progress";

const EXAM_ID = "mock-001-health-cafe-music";
const OTHER_EXAM_ID = "mock-002";

function records() {
  return useMockExamProgress.getState().records;
}

describe("mock exam progress", () => {
  beforeEach(() => {
    useMockExamProgress.getState().resetAllProgress();
  });

  it("numbers the first attempt as 1 and leaves it open", () => {
    const attemptNumber = useMockExamProgress.getState().startAttempt(EXAM_ID);

    expect(attemptNumber).toBe(1);
    expect(getOpenAttempt(records(), EXAM_ID)?.completedAt).toBeNull();
    expect(getCompletedCount(records(), EXAM_ID)).toBe(0);
  });

  it("reuses the open attempt instead of creating a duplicate", () => {
    const { startAttempt } = useMockExamProgress.getState();

    expect(startAttempt(EXAM_ID)).toBe(1);
    expect(startAttempt(EXAM_ID)).toBe(1);

    expect(records()[EXAM_ID].attempts).toHaveLength(1);
  });

  it("counts an exam as read once only after it is completed", () => {
    const { startAttempt, completeAttempt } = useMockExamProgress.getState();

    startAttempt(EXAM_ID);
    expect(getCompletedCount(records(), EXAM_ID)).toBe(0);

    completeAttempt(EXAM_ID);
    expect(getCompletedCount(records(), EXAM_ID)).toBe(1);
    expect(getOpenAttempt(records(), EXAM_ID)).toBeUndefined();
    expect(getLastCompletedAt(records(), EXAM_ID)).not.toBeNull();
  });

  it("increments the attempt number across repeated passes", () => {
    const { startAttempt, completeAttempt } = useMockExamProgress.getState();

    startAttempt(EXAM_ID);
    completeAttempt(EXAM_ID);
    const second = startAttempt(EXAM_ID);
    completeAttempt(EXAM_ID);

    expect(second).toBe(2);
    expect(getCompletedCount(records(), EXAM_ID)).toBe(2);
    expect(records()[EXAM_ID].attempts.map((a) => a.attemptNumber)).toEqual([1, 2]);
  });

  it("ignores completeAttempt when nothing is open", () => {
    const { startAttempt, completeAttempt } = useMockExamProgress.getState();

    startAttempt(EXAM_ID);
    completeAttempt(EXAM_ID);
    const completedAt = getLastCompletedAt(records(), EXAM_ID);

    completeAttempt(EXAM_ID);

    expect(getCompletedCount(records(), EXAM_ID)).toBe(1);
    expect(getLastCompletedAt(records(), EXAM_ID)).toBe(completedAt);
  });

  it("discards an abandoned attempt but keeps completed history", () => {
    const { startAttempt, completeAttempt, discardOpenAttempt } = useMockExamProgress.getState();

    startAttempt(EXAM_ID);
    completeAttempt(EXAM_ID);
    startAttempt(EXAM_ID);
    discardOpenAttempt(EXAM_ID);

    expect(getOpenAttempt(records(), EXAM_ID)).toBeUndefined();
    expect(getCompletedCount(records(), EXAM_ID)).toBe(1);
    expect(startAttempt(EXAM_ID)).toBe(2);
  });

  it("tracks each exam independently", () => {
    const { startAttempt, completeAttempt, resetExamProgress } = useMockExamProgress.getState();

    startAttempt(EXAM_ID);
    completeAttempt(EXAM_ID);
    startAttempt(OTHER_EXAM_ID);
    completeAttempt(OTHER_EXAM_ID);

    expect(getCompletedCount(records(), EXAM_ID)).toBe(1);
    expect(getCompletedCount(records(), OTHER_EXAM_ID)).toBe(1);

    resetExamProgress(EXAM_ID);

    expect(records()[EXAM_ID]).toBeUndefined();
    expect(getCompletedCount(records(), EXAM_ID)).toBe(0);
    expect(getCompletedCount(records(), OTHER_EXAM_ID)).toBe(1);
  });

  it("reports zero for an exam that was never started", () => {
    expect(getCompletedCount(records(), "unknown-exam")).toBe(0);
    expect(getOpenAttempt(records(), "unknown-exam")).toBeUndefined();
    expect(getLastCompletedAt(records(), "unknown-exam")).toBeNull();
  });
});
