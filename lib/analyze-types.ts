import type { SpeechMetrics } from "@/lib/speech-metrics";

export type OpicGradeLabel = "AL" | "IH" | "IM3" | "IM2" | "IM1" | "IL" | "NH";

export interface QuestionAnalysis {
  question_id: string;
  grade: OpicGradeLabel;
  feedback: string;
  corrected_script: string;
  fluency_score: number;
  grammar_score: number;
  vocabulary_score: number;
  transcript?: string | null;
  metrics?: SpeechMetrics;
}

export interface BatchAnalysisResult {
  questions: QuestionAnalysis[];
  overall_grade: OpicGradeLabel;
  overall_feedback: string;
}

export type AnalyzeErrorCode = "UNAVAILABLE" | "RATE_LIMITED" | "ANALYZE_FAILED" | "INVALID_REQUEST";
