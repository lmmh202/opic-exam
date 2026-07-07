import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Question } from "./question-generator";
import type { ExamMode } from "./exam-mode";
import { clearModeAudio } from "./db";

interface ExamState {
  examMode: ExamMode;
  currentQuestionIndex: number;
  timeLeft: number;
  isRecording: boolean;
  answers: Record<number, { submitted: boolean }>;
  skipEnabled: boolean;
  minRecordingDuration: number;
  examQuestions: Question[];

  setExamMode: (mode: ExamMode) => void;
  switchExamMode: (mode: ExamMode) => Promise<void>;
  setQuestionIndex: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  setTimeLeft: (seconds: number) => void;
  decrementTime: () => void;
  setIsRecording: (isRecording: boolean) => void;
  submitAnswer: (questionId: number) => void;
  clearAnswer: (questionId: number) => void;
  setSkipSettings: (skipEnabled: boolean, duration: number) => void;
  setExamQuestions: (questions: Question[]) => void;
  resetExam: () => void;
}

const REAL_TOTAL_TIME = 40 * 60;

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      examMode: "real",
      currentQuestionIndex: 0,
      timeLeft: REAL_TOTAL_TIME,
      isRecording: false,
      answers: {},
      skipEnabled: false,
      minRecordingDuration: 30,
      examQuestions: [],

      setExamMode: (mode) => set({ examMode: mode }),

      switchExamMode: async (mode) => {
        const { examMode, examQuestions } = get();
        if (examQuestions.length > 0) {
          await clearModeAudio(
            examMode,
            examQuestions.map((q) => q.id),
          );
        }
        set({
          examMode: mode,
          currentQuestionIndex: 0,
          timeLeft: REAL_TOTAL_TIME,
          isRecording: false,
          answers: {},
          examQuestions: [],
        });
      },

      setQuestionIndex: (index) => set({ currentQuestionIndex: index }),

      nextQuestion: () =>
        set((state) => ({
          currentQuestionIndex: state.currentQuestionIndex + 1,
          isRecording: false,
        })),

      prevQuestion: () =>
        set((state) => ({
          currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1),
          isRecording: false,
        })),

      setTimeLeft: (seconds) => set({ timeLeft: seconds }),

      decrementTime: () =>
        set((state) => ({ timeLeft: Math.max(0, state.timeLeft - 1) })),

      setIsRecording: (isRecording) => set({ isRecording }),

      submitAnswer: (questionId) =>
        set((state) => ({
          answers: {
            ...state.answers,
            [questionId]: { submitted: true },
          },
        })),

      clearAnswer: (questionId) =>
        set((state) => {
          const answers = { ...state.answers };
          delete answers[questionId];
          return { answers };
        }),

      setSkipSettings: (skipEnabled, duration) =>
        set({ skipEnabled, minRecordingDuration: duration }),

      setExamQuestions: (questions) => set({ examQuestions: questions }),

      resetExam: () =>
        set({
          currentQuestionIndex: 0,
          timeLeft: REAL_TOTAL_TIME,
          isRecording: false,
          answers: {},
        }),
    }),
    {
      name: "opic-exam-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        examMode: state.examMode,
        currentQuestionIndex: state.currentQuestionIndex,
        timeLeft: state.timeLeft,
        answers: state.answers,
        skipEnabled: state.skipEnabled,
        minRecordingDuration: state.minRecordingDuration,
        examQuestions: state.examQuestions,
      }),
    },
  ),
);
