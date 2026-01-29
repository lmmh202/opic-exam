"use server";

import { GoogleGenAI, Type as SchemaType } from "@google/genai";

export interface AnalysisResult {
  grade: "AL" | "IH" | "IM3" | "IM2" | "IM1" | "IL" | "NH";
  feedback: string;
  corrected_script: string;
  fluency_score: number;
  grammar_score: number;
  vocabulary_score: number;
}

export async function analyzeAudioAction(
  audioBase64: string,
  questionText: string,
) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not defined");
  }

  const client = new GoogleGenAI({ apiKey });

  // Remove data URI prefix if present (e.g., "data:audio/webm;base64,...")
  const base64Data = audioBase64.split(",")[1] || audioBase64;

  try {
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
    return { success: true, data: result };
  } catch (error) {
    console.error("Analysis failed:", error);
    return { success: false, error: "Failed to analyze audio" };
  }
}

// Helper to update the 'messages' part above in the implementation details
// I'll write the clean version.
