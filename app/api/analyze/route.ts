import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type as SchemaType } from "@google/genai";

export interface AnalysisResult {
  grade: "AL" | "IH" | "IM3" | "IM2" | "IM1" | "IL" | "NH";
  feedback: string;
  corrected_script: string;
  fluency_score: number;
  grammar_score: number;
  vocabulary_score: number;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "API key not configured" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob | null;
    const questionText = formData.get("questionText") as string;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Convert Blob to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const client = new GoogleGenAI({ apiKey });

    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            grade: {
              type: SchemaType.STRING,
              enum: ["AL", "IH", "IM3", "IM2", "IM1", "IL", "NH"],
              description: "The OPIc proficiency level",
            },
            feedback: {
              type: SchemaType.STRING,
              description:
                "Detailed feedback on fluency, grammar, vocabulary, and content completeness in Korean",
            },
            corrected_script: {
              type: SchemaType.STRING,
              description:
                "The user's speech transcribed and improved for better naturalness and grammar",
            },
            fluency_score: {
              type: SchemaType.NUMBER,
              description: "Score out of 100 for fluency",
            },
            grammar_score: {
              type: SchemaType.NUMBER,
              description: "Score out of 100 for grammar",
            },
            vocabulary_score: {
              type: SchemaType.NUMBER,
              description: "Score out of 100 for vocabulary",
            },
          },
          required: [
            "grade",
            "feedback",
            "corrected_script",
            "fluency_score",
            "grammar_score",
            "vocabulary_score",
          ],
        },
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Question: ${questionText}. Evaluate the audio response as an ACTFL OPIc rater.`,
            },
            {
              inlineData: {
                data: base64Data,
                mimeType: "audio/webm",
              },
            },
          ],
        },
      ],
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini");
    }

    const result = JSON.parse(resultText) as AnalysisResult;
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Analysis failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to analyze audio" },
      { status: 500 }
    );
  }
}
