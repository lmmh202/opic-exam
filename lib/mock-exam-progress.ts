import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// One pass through a mock exam.
// `completedAt` stays null while the attempt is still open.
export interface MockExamAttempt {
  attemptNumber: number;
  startedAt: string;
  completedAt: string | null;
}

// Append-only attempt history for a single mock exam.
// Attempts are only ever appended or stamped with `completedAt`, never renumbered,
// so this shape maps onto a server table row-for-row if progress later moves off-device.
export interface MockExamRecord {
  examId: string;
  attempts: MockExamAttempt[];
}

export type MockExamProgressRecords = Record<string, MockExamRecord>;

interface MockExamProgressState {
  records: MockExamProgressRecords;

  startAttempt: (examId: string) => number;
  completeAttempt: (examId: string) => void;
  discardOpenAttempt: (examId: string) => void;
  resetExamProgress: (examId: string) => void;
  resetAllProgress: () => void;
}

// Kept separate from `opic-exam-storage` because that store is session scoped:
// `resetExam()` and `switchExamMode()` clear it, and this history must survive both.
const STORAGE_KEY = "opic-mock-exam-progress";
const STORAGE_VERSION = 1;

function emptyRecord(examId: string): MockExamRecord {
  return { examId, attempts: [] };
}

// The attempt currently in progress, if any.
// At most one attempt per exam is open at a time.
export function getOpenAttempt(records: MockExamProgressRecords, examId: string): MockExamAttempt | undefined {
  return records[examId]?.attempts.find((attempt) => attempt.completedAt === null);
}

// How many times the exam has been finished end to end.
// An attempt in progress is deliberately not counted.
export function getCompletedCount(records: MockExamProgressRecords, examId: string): number {
  return records[examId]?.attempts.filter((attempt) => attempt.completedAt !== null).length ?? 0;
}

export function getLastCompletedAt(records: MockExamProgressRecords, examId: string): string | null {
  const completed = records[examId]?.attempts.filter((attempt) => attempt.completedAt !== null) ?? [];
  return completed.at(-1)?.completedAt ?? null;
}

export const useMockExamProgress = create<MockExamProgressState>()(
  persist(
    (set, get) => ({
      records: {},

      // Reuses the open attempt when one exists so that reloading or re-entering
      // an exam does not pile up orphan attempts.
      startAttempt: (examId) => {
        const record = get().records[examId] ?? emptyRecord(examId);
        const open = record.attempts.find((attempt) => attempt.completedAt === null);
        if (open) return open.attemptNumber;

        const attempt: MockExamAttempt = {
          attemptNumber: record.attempts.length + 1,
          startedAt: new Date().toISOString(),
          completedAt: null,
        };

        set((state) => ({
          records: {
            ...state.records,
            [examId]: { ...record, attempts: [...record.attempts, attempt] },
          },
        }));

        return attempt.attemptNumber;
      },

      completeAttempt: (examId) =>
        set((state) => {
          const record = state.records[examId];
          if (!record) return state;

          const openIndex = record.attempts.findIndex((attempt) => attempt.completedAt === null);
          if (openIndex === -1) return state;

          const attempts = [...record.attempts];
          attempts[openIndex] = { ...attempts[openIndex], completedAt: new Date().toISOString() };

          return { records: { ...state.records, [examId]: { ...record, attempts } } };
        }),

      // Drops an attempt that was started but abandoned, freeing its number for reuse.
      discardOpenAttempt: (examId) =>
        set((state) => {
          const record = state.records[examId];
          if (!record) return state;

          const attempts = record.attempts.filter((attempt) => attempt.completedAt !== null);
          if (attempts.length === record.attempts.length) return state;

          return { records: { ...state.records, [examId]: { ...record, attempts } } };
        }),

      resetExamProgress: (examId) =>
        set((state) => {
          const records = { ...state.records };
          delete records[examId];
          return { records };
        }),

      resetAllProgress: () => set({ records: {} }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: STORAGE_VERSION,
      // Payloads written before versioning have no guaranteed shape, so they are dropped
      // rather than risk feeding malformed attempts into the UI.
      migrate: (persisted, version) => {
        if (version < STORAGE_VERSION) return { records: {} };
        return persisted as { records: MockExamProgressRecords };
      },
      partialize: (state) => ({ records: state.records }),
    },
  ),
);
