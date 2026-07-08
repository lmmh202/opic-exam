import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { GoogleGenAI, Type as SchemaType } from "@google/genai";

const ROOT = process.cwd();
const QUESTION_BANK_PATH = path.join(ROOT, "public", "question-bank.json");
const SURVEY_PATH = path.join(ROOT, "public", "survey.json");

const DAILY_SET_COUNT = Number(process.env.DAILY_SET_COUNT ?? 3);
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const ALLOWED_COMBO_TYPES = [
  "activity_description",
  "experience_description",
  "object_description",
  "person_introduction",
  "place_description",
  "routine",
  "first_motivation",
  "memorable_experience",
];

const EXPERIENCE_ENDING_TYPES = [
  "experience_description",
  "memorable_experience",
];

function normalize(text) {
  return String(text).toLowerCase().replace(/\s+/g, " ").trim();
}

function randomPick(array, count) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function inferSurveyTopicIds(bank, surveyText) {
  const text = surveyText.toLowerCase();
  const matched = bank.combo
    .filter((topic) =>
      (topic.keywords ?? []).some((keyword) =>
        text.includes(String(keyword).toLowerCase()),
      ),
    )
    .map((topic) => topic.id);

  return [...new Set(matched)];
}

function makePrompt({ surveyTopicIds, surpriseTopicIds, comboTopics }) {
  return [
    "You are generating OPIc combo question sets.",
    "",
    "Rules:",
    `- Generate ${DAILY_SET_COUNT} sets.`,
    "- Each set has exactly 3 questions.",
    "- Each set is surprise=true.",
    "- Use exactly 2 survey topics and 1 surprise topic in concept.",
    "- Last question MUST be an experience question.",
    `- Allowed question types: ${ALLOWED_COMBO_TYPES.join(", ")}`,
    `- Last question type must be one of: ${EXPERIENCE_ENDING_TYPES.join(", ")}`,
    "",
    "Output JSON fields:",
    "- sets[].targetTopicId: one topic id from combo topics list below",
    "- sets[].label: short label",
    "- sets[].surprise: true",
    "- sets[].questions[0..2]: {type, text}",
    "",
    `Survey topic ids: ${surveyTopicIds.join(", ") || "(none)"}`,
    `Surprise candidate topic ids: ${surpriseTopicIds.join(", ") || "(none)"}`,
    "",
    "Combo topics catalog:",
    JSON.stringify(
      comboTopics.map((t) => ({
        id: t.id,
        label: t.label,
        keywords: t.keywords ?? [],
      })),
      null,
      2,
    ),
  ].join("\n");
}

function validateGeneratedSet(set, bank, existingQuestionTexts) {
  if (!set || typeof set !== "object") return false;
  if (!set.targetTopicId || typeof set.targetTopicId !== "string") return false;
  if (!bank.combo.some((t) => t.id === set.targetTopicId)) return false;
  if (set.surprise !== true) return false;
  if (!Array.isArray(set.questions) || set.questions.length !== 3) return false;

  const last = set.questions[2];
  if (!EXPERIENCE_ENDING_TYPES.includes(last?.type)) return false;

  for (const q of set.questions) {
    if (!q || typeof q.text !== "string" || typeof q.type !== "string") {
      return false;
    }
    if (!ALLOWED_COMBO_TYPES.includes(q.type)) return false;
    if (q.text.length < 30) return false;
    if (existingQuestionTexts.has(normalize(q.text))) return false;
  }

  return true;
}

async function main() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required.");
  }

  const [bankRaw, surveyRaw] = await Promise.all([
    fs.readFile(QUESTION_BANK_PATH, "utf8"),
    fs.readFile(SURVEY_PATH, "utf8"),
  ]);
  const bank = JSON.parse(bankRaw);
  const survey = JSON.parse(surveyRaw);

  const surveyText = survey
    .map((item) => `${item.label}: ${item.value}`)
    .join("\n");
  const surveyTopicIds = inferSurveyTopicIds(bank, surveyText);

  const allTopicIds = bank.combo.map((t) => t.id);
  const surpriseTopicIds = allTopicIds.filter((id) => !surveyTopicIds.includes(id));
  const existingQuestionTexts = new Set(
    bank.combo.flatMap((topic) =>
      topic.sets.flatMap((set) => set.questions.map((q) => normalize(q.text))),
    ),
  );

  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: MODEL,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          sets: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                targetTopicId: { type: SchemaType.STRING },
                label: { type: SchemaType.STRING },
                surprise: { type: SchemaType.BOOLEAN },
                questions: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      type: { type: SchemaType.STRING },
                      text: { type: SchemaType.STRING },
                    },
                    required: ["type", "text"],
                  },
                },
              },
              required: ["targetTopicId", "label", "surprise", "questions"],
            },
          },
        },
        required: ["sets"],
      },
    },
    contents: [
      {
        role: "user",
        parts: [{ text: makePrompt({ surveyTopicIds, surpriseTopicIds, comboTopics: bank.combo }) }],
      },
    ],
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned empty response.");
  const parsed = JSON.parse(text);
  const sets = Array.isArray(parsed?.sets) ? parsed.sets : [];

  const validSets = sets.filter((set) =>
    validateGeneratedSet(set, bank, existingQuestionTexts),
  );

  if (validSets.length === 0) {
    console.log("No valid sets generated. Skipping update.");
    return;
  }

  const now = new Date().toISOString().slice(0, 10);
  for (const generatedSet of validSets) {
    const topic = bank.combo.find((t) => t.id === generatedSet.targetTopicId);
    if (!topic) continue;

    const idSeed = normalize(generatedSet.label).replace(/[^a-z0-9]+/g, "-");
    const newSetId = `${topic.id}-auto-${now}-${idSeed || "set"}`.slice(0, 80);
    const uniqueId =
      topic.sets.some((s) => s.id === newSetId)
        ? `${newSetId}-${Math.random().toString(36).slice(2, 7)}`
        : newSetId;

    topic.sets.push({
      id: uniqueId,
      label: generatedSet.label,
      surprise: true,
      questions: generatedSet.questions,
    });

    for (const q of generatedSet.questions) {
      existingQuestionTexts.add(normalize(q.text));
    }
  }

  await fs.writeFile(QUESTION_BANK_PATH, `${JSON.stringify(bank, null, 2)}\n`);
  console.log(`Added ${validSets.length} generated combo sets.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
