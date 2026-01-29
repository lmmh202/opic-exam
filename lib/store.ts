import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ExamState {
  currentQuestionIndex: number;
  timeLeft: number; // in seconds, detailed management in components
  isRecording: boolean;
  answers: Record<number, { audioUrl?: string; submitted: boolean }>; // questionId -> status

  // Actions
  setQuestionIndex: (index: number) => void;
  nextQuestion: () => void;
  setTimeLeft: (seconds: number) => void;
  decrementTime: () => void;
  setIsRecording: (isRecording: boolean) => void;
  submitAnswer: (questionId: number) => void;
  resetExam: () => void;
}

const TOTAL_TIME = 40 * 60; // 40 minutes

export const useExamStore = create<ExamState>()(
  persist(
    (set) => ({
      currentQuestionIndex: 0,
      timeLeft: TOTAL_TIME,
      isRecording: false,
      answers: {},

      setQuestionIndex: (index) => set({ currentQuestionIndex: index }),

      nextQuestion: () =>
        set((state) => ({
          currentQuestionIndex: state.currentQuestionIndex + 1,
          isRecording: false, // Ensure recording stops on navigation
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

      resetExam: () =>
        set({
          currentQuestionIndex: 0,
          timeLeft: TOTAL_TIME,
          isRecording: false,
          answers: {},
        }),
    }),
    {
      name: "opic-exam-storage", // unique name
      storage: createJSONStorage(() => localStorage), // use localStorage for state
      partialize: (state) => ({
        currentQuestionIndex: state.currentQuestionIndex,
        timeLeft: state.timeLeft,
        answers: state.answers,
        // Don't persist isRecording, better to reset on reload
      }),
    },
  ),
);
