import { NextRequest, NextResponse } from "next/server";
import { analyzeWithRubric, buildBatchFromRubrics, type AnalyzeLocale } from "@/lib/analyze-rubric";
import type { AnalyzeErrorCode, BatchAnalysisResult } from "@/lib/analyze-types";
import { isSpeechMetrics, type SpeechMetrics } from "@/lib/speech-metrics";

export type { AnalyzeErrorCode, BatchAnalysisResult, QuestionAnalysis } from "@/lib/analyze-types";

interface AnalyzeQuestionInput {
  questionId: string;
  questionText?: string;
  metrics: SpeechMetrics;
}

interface AnalyzeRequestBody {
  locale?: AnalyzeLocale;
  questions: AnalyzeQuestionInput[];
}

function parseLocale(value: unknown): AnalyzeLocale {
  return value === "en" ? "en" : "ko";
}

function parseBody(raw: unknown): AnalyzeRequestBody | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  if (!Array.isArray(body.questions)) return null;

  const questions: AnalyzeQuestionInput[] = [];
  for (const item of body.questions) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;
    const questionId = q.questionId ?? q.question_id;
    if (typeof questionId !== "string" && typeof questionId !== "number") continue;
    if (!isSpeechMetrics(q.metrics)) continue;
    questions.push({
      questionId: String(questionId),
      questionText: typeof q.questionText === "string" ? q.questionText : undefined,
      metrics: q.metrics,
    });
  }

  if (questions.length === 0) return null;
  return {
    locale: parseLocale(body.locale),
    questions,
  };
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const body = parseBody(raw);
    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: "유효한 분석 요청이 아닙니다",
          code: "INVALID_REQUEST" satisfies AnalyzeErrorCode,
        },
        { status: 400 },
      );
    }

    const analyses = body.questions.map((q) => analyzeWithRubric(q.questionId, q.metrics, body.locale).analysis);
    const data: BatchAnalysisResult = buildBatchFromRubrics(analyses, body.locale);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Batch analysis failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "분석에 실패했습니다",
        code: "ANALYZE_FAILED" satisfies AnalyzeErrorCode,
      },
      { status: 500 },
    );
  }
}
