import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { GoogleGenAI, Type as SchemaType } from "@google/genai";

const ROOT = process.cwd();
const QUESTION_BANK_PATH = path.join(ROOT, "public", "question-bank.json");
const CONSTANTS_PATH = path.join(ROOT, "data", "opic-constants.json");

const DAILY_SET_COUNT = Number(process.env.DAILY_SET_COUNT ?? 5);
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function normalize(text) {
  return String(text).toLowerCase().replace(/\s+/g, " ").trim();
}

function randomPick(array, count) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function splitByRatio(total, [surveyRatio, surpriseRatio]) {
  const parts = surveyRatio + surpriseRatio;
  const surpriseCount = Math.max(1, Math.round((total * surpriseRatio) / parts));
  const surveyCount = Math.max(1, total - surpriseCount);
  return { surveyCount, surpriseCount };
}

function makePrompt({
  surveyCount,
  surpriseCount,
  surveyTopics,
  surpriseTopics,
  comboQuestionTypes,
  comboStages,
}) {
  return [
    "You are generating OPIc combo question sets for an English speaking exam.",
    "",
    "Composition rules:",
    `- Generate exactly ${surveyCount} survey sets and ${surpriseCount} surprise sets.`,
    "- Each set has exactly 3 questions in a fixed progression:",
    "  Q1 (Stage 1): present-tense description or routine",
    "  Q2 (Stage 2): past experience OR how the topic has changed from past to present",
    "  Q3 (Stage 3): memorable or unexpected incident with storytelling",
    "- Survey sets: targetTopicId MUST be from survey topics. Topic-level surprise is false.",
    "- Surprise sets: targetTopicId MUST be from surprise topics. Topic-level surprise is true.",
    "- Never use a survey topic as a surprise topic.",
    "- Never use a surprise topic as a survey topic.",
    `- Q1 type MUST be one of: ${comboStages["1"].join(", ")}`,
    `- Q2 type MUST be one of: ${comboStages["2"].join(", ")}`,
    `- Q3 type MUST be one of: ${comboStages["3"].join(", ")}`,
    "",
    "Question writing rules:",
    "- Write natural OPIc-style English questions.",
    "- Stage 1 should check present-tense description/routine vocabulary.",
    "- Stage 2 should either (a) ask about a first/recent past experience, or (b) ask how habits, preferences, or the topic have changed compared to the past (past_present_change).",
    "- Stage 3 should ask for a memorable/unexpected episode with what happened and how it was resolved.",
    "- For surprise sets, the questions must be about the surprise topic itself.",
    "- Example: if type=routine and topic=furniture, ask about the process of buying furniture.",
    "- Prefer multi-part questions with follow-ups when natural.",
    "",
    "Output JSON fields:",
    "- sets[].targetTopicId",
    "- sets[].label (short English label)",
    "- sets[].isSurprise (boolean: true only for surprise topics)",
    "- sets[].questions[0..2]: {type, text}",
    "",
    "Survey topics:",
    JSON.stringify(surveyTopics, null, 2),
    "",
    "Surprise topics:",
    JSON.stringify(surpriseTopics, null, 2),
    "",
    "Combo question types:",
    JSON.stringify(comboQuestionTypes, null, 2),
    "",
    "Combo stages:",
    JSON.stringify(comboStages, null, 2),
  ].join("\n");
}

function validateGeneratedSet(set, {
  surveyTopicIds,
  surpriseTopicIds,
  comboStages,
  existingQuestionTexts,
}) {
  if (!set || typeof set !== "object") return false;
  if (!set.targetTopicId || typeof set.targetTopicId !== "string") return false;
  if (typeof set.isSurprise !== "boolean") return false;
  if (!Array.isArray(set.questions) || set.questions.length !== 3) return false;

  if (set.isSurprise) {
    if (!surpriseTopicIds.includes(set.targetTopicId)) return false;
  } else if (!surveyTopicIds.includes(set.targetTopicId)) {
    return false;
  }

  for (let i = 0; i < 3; i += 1) {
    const q = set.questions[i];
    const stageKey = String(i + 1);
    if (!q || typeof q.text !== "string" || typeof q.type !== "string") {
      return false;
    }
    if (!comboStages[stageKey].includes(q.type)) return false;
    if (q.text.length < 30) return false;
    if (existingQuestionTexts.has(normalize(q.text))) return false;
  }

  return true;
}

function ensureTopicExists(bank, topicConstant, isSurprise) {
  let topic = bank.combo.find((item) => item.id === topicConstant.id);
  if (topic) {
    if (isSurprise) topic.surprise = true;
    return topic;
  }

  topic = {
    id: topicConstant.id,
    label: topicConstant.label.en,
    keywords: [topicConstant.id, topicConstant.label.en.toLowerCase()],
    ...(isSurprise ? { surprise: true } : {}),
    sets: [],
  };
  bank.combo.push(topic);
  return topic;
}

async function main() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required.");
  }

  const [bankRaw, constantsRaw] = await Promise.all([
    fs.readFile(QUESTION_BANK_PATH, "utf8"),
    fs.readFile(CONSTANTS_PATH, "utf8"),
  ]);
  const bank = JSON.parse(bankRaw);
  const constants = JSON.parse(constantsRaw);

  const surveyTopics = constants.surveyTopics;
  const surpriseTopics = constants.surpriseTopics;
  const comboQuestionTypes = constants.comboQuestionTypes;
  const comboStages = constants.comboStages;
  const surveyTopicIds = surveyTopics.map((topic) => topic.id);
  const surpriseTopicIds = surpriseTopics.map((topic) => topic.id);

  const { surveyCount, surpriseCount } = splitByRatio(
    DAILY_SET_COUNT,
    constants.examComposition.surveyToSurpriseRatio,
  );

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
                isSurprise: { type: SchemaType.BOOLEAN },
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
              required: ["targetTopicId", "label", "isSurprise", "questions"],
            },
          },
        },
        required: ["sets"],
      },
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: makePrompt({
              surveyCount,
              surpriseCount,
              surveyTopics: randomPick(surveyTopics, Math.max(surveyCount, 4)),
              surpriseTopics: randomPick(
                surpriseTopics,
                Math.max(surpriseCount, 4),
              ),
              comboQuestionTypes,
              comboStages,
            }),
          },
        ],
      },
    ],
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned empty response.");
  const parsed = JSON.parse(text);
  const sets = Array.isArray(parsed?.sets) ? parsed.sets : [];

  const validationContext = {
    surveyTopicIds,
    surpriseTopicIds,
    comboStages,
    existingQuestionTexts,
  };

  const validSets = sets.filter((set) =>
    validateGeneratedSet(set, validationContext),
  );

  if (validSets.length === 0) {
    console.log("No valid sets generated. Skipping update.");
    return;
  }

  const now = new Date().toISOString().slice(0, 10);
  let added = 0;

  for (const generatedSet of validSets) {
    const topicConstant = generatedSet.isSurprise
      ? surpriseTopics.find((topic) => topic.id === generatedSet.targetTopicId)
      : surveyTopics.find((topic) => topic.id === generatedSet.targetTopicId);
    if (!topicConstant) continue;

    const topic = ensureTopicExists(
      bank,
      topicConstant,
      generatedSet.isSurprise,
    );
    const idSeed = normalize(generatedSet.label).replace(/[^a-z0-9]+/g, "-");
    const newSetId = `${topic.id}-auto-${now}-${idSeed || "set"}`.slice(0, 80);
    const uniqueId = topic.sets.some((s) => s.id === newSetId)
      ? `${newSetId}-${Math.random().toString(36).slice(2, 7)}`
      : newSetId;

    topic.sets.push({
      id: uniqueId,
      label: generatedSet.label,
      questions: generatedSet.questions,
    });

    for (const q of generatedSet.questions) {
      existingQuestionTexts.add(normalize(q.text));
    }
    added += 1;
  }

  await fs.writeFile(QUESTION_BANK_PATH, `${JSON.stringify(bank, null, 2)}\n`);
  console.log(
    `Added ${added} generated combo sets (target ratio survey:surprise ~= ${surveyCount}:${surpriseCount}).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
