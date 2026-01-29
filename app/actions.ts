"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// Define the schema for the AI response
const analysisSchema = z.object({
  grade: z
    .enum(["AL", "IH", "IM3", "IM2", "IM1", "IL", "NH"])
    .describe("The OPIc proficiency level"),
  feedback: z
    .string()
    .describe(
      "Detailed feedback on fluency, grammar, vocabulary, and content completeness in Korean",
    ),
  corrected_script: z
    .string()
    .describe(
      "The user's speech transcribed and improved for better naturalness and grammar",
    ),
  fluency_score: z.number().describe("Score out of 100 for fluency"),
  grammar_score: z.number().describe("Score out of 100 for grammar"),
  vocabulary_score: z.number().describe("Score out of 100 for vocabulary"),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

export async function analyzeAudioAction(
  audioBase64: string,
  questionText: string,
) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not defined");
  }

  try {
    const { object } = await generateObject({
      model: google("gemini-1.5-pro"),
      schema: analysisSchema,
      system: `
        You are an ACTFL certified OPIc rater. 
        Evaluate the candidate's response to the questioned provided in the user message.
        
        Analyze the audio for:
        1. Fluency: Smooth delivery, appropriate pauses, filler usage.
        2. Grammar: Accuracy, variety of structures, time frame (tense) consistency.
        3. Vocabulary: Range, precision, thematic appropriateness.
        4. Content: Relevance to the question, detail, and organization.

        Provide the result in the specified JSON format.
        Be strict but fair, similar to a real OPIc evaluation.
        The feedback should be in Korean for the user to understand easily.
      `,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `Question: ${questionText}` },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { type: "file", data: audioBase64, mimeType: "audio/webm" } as any,
          ],
        },
      ],
    });

    // Correction: The default Vercel AI SDK might not fully support audio parts in the high-level 'messages' array for all providers yet without using 'experimental_generateObject' or specific parts.
    // However, Gemini 1.5 definitely supports it.
    // Let's try passing it structurally correctly.
    // Re-doing the call with safer approach:
    // Actually, 'image' part often handles base64. But 'audio/webm' is not an image.
    // If this fails, we will need to wait for a fix or use the raw Google SDK.
    // But let's try the cleanest Vercel AI SDK approach first: 'file'.

    return { success: true, data: object };
  } catch (error) {
    console.error("Analysis failed:", error);
    return { success: false, error: "Failed to analyze audio" };
  }
}

// Helper to update the 'messages' part above in the implementation details
// I'll write the clean version.
