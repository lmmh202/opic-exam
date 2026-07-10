import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type as SchemaType } from "@google/genai";

export interface QuestionAnalysis {
  question_id: string;
  grade: "AL" | "IH" | "IM3" | "IM2" | "IM1" | "IL" | "NH";
  feedback: string;
  corrected_script: string;
  fluency_score: number;
  grammar_score: number;
  vocabulary_score: number;
}

export interface BatchAnalysisResult {
  questions: QuestionAnalysis[];
  overall_grade: "AL" | "IH" | "IM3" | "IM2" | "IM1" | "IL" | "NH";
  overall_feedback: string;
}

export type AnalyzeErrorCode =
  | "UNAVAILABLE"
  | "RATE_LIMITED"
  | "ANALYZE_FAILED";

const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | undefined {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return undefined;
}

function isRetryableError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|try again later/i.test(
    message,
  );
}

function classifyAnalyzeError(error: unknown): {
  status: number;
  code: AnalyzeErrorCode;
  error: string;
} {
  const status = getErrorStatus(error);
  const message = error instanceof Error ? error.message : String(error);

  if (
    status === 503 ||
    /UNAVAILABLE|high demand|try again later/i.test(message)
  ) {
    return {
      status: 503,
      code: "UNAVAILABLE",
      error:
        "AI 서버가 일시적으로 혼잡합니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  if (status === 429 || /RESOURCE_EXHAUSTED|rate limit/i.test(message)) {
    return {
      status: 429,
      code: "RATE_LIMITED",
      error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  return {
    status: 500,
    code: "ANALYZE_FAILED",
    error: "분석에 실패했습니다",
  };
}

async function generateWithRetry(
  client: GoogleGenAI,
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await client.models.generateContent(params);
    } catch (error) {
      lastError = error;
      const shouldRetry = isRetryableError(error) && attempt < RETRY_ATTEMPTS;
      if (!shouldRetry) break;

      const delay =
        RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) +
        Math.floor(Math.random() * 250);
      console.warn(
        `Gemini analyze attempt ${attempt}/${RETRY_ATTEMPTS} failed; retrying in ${delay}ms`,
        error,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "API key not configured" },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();

    const audioEntries: Array<{
      id: string;
      blob: Blob;
      questionText: string;
    }> = [];

    const entries = Array.from(formData.entries());
    const audioFiles = entries.filter(([key]) => key.startsWith("audio_"));

    for (const [key, value] of audioFiles) {
      const id = key.replace("audio_", "");
      const questionText = formData.get(`questionText_${id}`) as string;
      if (value instanceof Blob && questionText) {
        audioEntries.push({ id, blob: value, questionText });
      }
    }

    if (audioEntries.length === 0) {
      return NextResponse.json(
        { success: false, error: "No audio files provided" },
        { status: 400 },
      );
    }

    const audioParts = await Promise.all(
      audioEntries.map(async (entry) => {
        const arrayBuffer = await entry.blob.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");
        return {
          id: entry.id,
          questionText: entry.questionText,
          base64Data,
        };
      }),
    );

    const questionsPrompt = audioParts
      .map((p) => `Question ID "${p.id}": ${p.questionText}`)
      .join("\n\n");

    const client = new GoogleGenAI({ apiKey });

    const contentParts: Array<
      { text: string } | { inlineData: { data: string; mimeType: string } }
    > = [
      {
        text: `You are an ACTFL OPIc evaluator. Evaluate all the following audio responses.

${questionsPrompt}

For each question, provide an object in the "questions" array with:
- question_id: The exact question ID provided (e.g., "1", "2", etc.)
- grade: OPIc level (AL, IH, IM3, IM2, IM1, IL, NH)
- feedback: Detailed feedback in Korean
- corrected_script: Improved version of what they said
- fluency_score: 0-100
- grammar_score: 0-100
- vocabulary_score: 0-100

Also provide:
- overall_grade: The overall OPIc level
- overall_feedback: Summary in Korean

The question IDs to evaluate are: ${audioParts.map((p) => `"${p.id}"`).join(", ")}`,
      },
    ];

    for (const part of audioParts) {
      contentParts.push({
        inlineData: {
          data: part.base64Data,
          mimeType: "audio/webm",
        },
      });
    }

    const response = await generateWithRetry(client, {
      model: "gemini-3-flash-preview",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            questions: {
              type: SchemaType.ARRAY,
              description: "Analysis for each question",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  question_id: {
                    type: SchemaType.STRING,
                    description: "The question ID",
                  },
                  grade: {
                    type: SchemaType.STRING,
                    enum: ["AL", "IH", "IM3", "IM2", "IM1", "IL", "NH"],
                  },
                  feedback: { type: SchemaType.STRING },
                  corrected_script: { type: SchemaType.STRING },
                  fluency_score: { type: SchemaType.NUMBER },
                  grammar_score: { type: SchemaType.NUMBER },
                  vocabulary_score: { type: SchemaType.NUMBER },
                },
                required: [
                  "question_id",
                  "grade",
                  "feedback",
                  "corrected_script",
                  "fluency_score",
                  "grammar_score",
                  "vocabulary_score",
                ],
              },
            },
            overall_grade: {
              type: SchemaType.STRING,
              enum: ["AL", "IH", "IM3", "IM2", "IM1", "IL", "NH"],
            },
            overall_feedback: {
              type: SchemaType.STRING,
              description: "Overall exam performance summary in Korean",
            },
          },
          required: ["questions", "overall_grade", "overall_feedback"],
        },
      },
      contents: [
        {
          role: "user",
          parts: contentParts,
        },
      ],
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini");
    }

    const result = JSON.parse(resultText) as BatchAnalysisResult;
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Batch analysis failed:", error);
    const classified = classifyAnalyzeError(error);
    return NextResponse.json(
      {
        success: false,
        error: classified.error,
        code: classified.code,
      },
      { status: classified.status },
    );
  }
}
