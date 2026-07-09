import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { GoogleGenAI, Type as SchemaType } from "@google/genai";

const ROOT = process.cwd();
const QUESTION_BANK_PATH = path.join(ROOT, "public", "question-bank.json");
const CONSTANTS_PATH = path.join(ROOT, "data", "opic-constants.json");

const DAILY_COMBO_STANDARD_COUNT = Number(
  process.env.DAILY_COMBO_STANDARD_COUNT ?? 3,
);
const DAILY_COMBO_CHALLENGING_COUNT = Number(
  process.env.DAILY_COMBO_CHALLENGING_COUNT ?? 3,
);
const DAILY_ROLEPLAY_SET_COUNT = Number(
  process.env.DAILY_ROLEPLAY_SET_COUNT ?? 2,
);
const DAILY_COMPARISON_SET_COUNT = Number(
  process.env.DAILY_COMPARISON_SET_COUNT ?? 1,
);
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const VALID_DIFFICULTIES = new Set(["standard", "challenging"]);

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

function collectExistingTexts(bank) {
  const texts = new Set();
  for (const category of ["combo", "roleplay", "comparison"]) {
    for (const topic of bank[category] ?? []) {
      for (const set of topic.sets ?? []) {
        for (const q of set.questions ?? []) {
          texts.add(normalize(q.text));
        }
      }
    }
  }
  return texts;
}

function difficultyWritingRules(difficulty, difficulties) {
  const meta = (difficulties ?? []).find((d) => d.id === difficulty);
  const guide = meta?.guide?.en ?? "";
  if (difficulty === "challenging") {
    return [
      `Difficulty for ALL sets in this response: challenging.`,
      guide ? `- Guide: ${guide}` : "",
      "- Write exam-like prompts with multiple follow-up clauses in one question.",
      "- Add concrete situations, constraints, or twists (who/when/where/what went wrong).",
      "- Often end with requests like \"Provide as many details as possible\" or \"Tell me everything about that incident in detail.\"",
      "- Example tone: \"I'd like to know about the bar you often go to. Where is your favorite bar? What does it look like? Please describe everything about that bar in detail.\"",
    ].filter(Boolean);
  }
  return [
    `Difficulty for ALL sets in this response: standard.`,
    guide ? `- Guide: ${guide}` : "",
    "- Write clear, focused OPIc prompts with light follow-ups.",
    "- Keep wording natural but not overly stacked with constraints.",
  ].filter(Boolean);
}

function makeComboPrompt({
  surveyCount,
  surpriseCount,
  surveyTopics,
  surpriseTopics,
  comboQuestionTypes,
  comboStages,
  difficulty,
  difficulties,
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
    `- Every set MUST set difficulty to \"${difficulty}\".`,
    "",
    "Difficulty writing rules:",
    ...difficultyWritingRules(difficulty, difficulties).map((line) =>
      line.startsWith("-") || line.startsWith("Difficulty")
        ? line
        : `- ${line}`,
    ),
    "",
    "Question writing rules:",
    "- Write natural OPIc-style English questions.",
    "- Stage 1 should check present-tense description/routine vocabulary.",
    "- Stage 2 should either (a) ask about a first/recent past experience, or (b) ask how habits, preferences, or the topic have changed compared to the past (past_present_change).",
    "- Stage 3 should ask for a memorable/unexpected episode with what happened and how it was resolved.",
    "- For surprise sets, the questions must be about the surprise topic itself.",
    "- Example: if type=routine and topic=furniture, ask about the process of buying furniture.",
    "",
    "Output JSON fields:",
    "- sets[].targetTopicId",
    "- sets[].label (short English label)",
    "- sets[].isSurprise (boolean: true only for surprise topics)",
    `- sets[].difficulty (must be \"${difficulty}\")`,
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

function makeRoleplayPrompt({
  setCount,
  roleplayTopics,
  roleplayQuestionTypes,
  roleplayStages,
  difficulty = "standard",
  difficulties,
}) {
  return [
    "You are generating OPIc roleplay question sets for an English speaking exam (Q11–Q13).",
    "",
    "Composition rules:",
    `- Generate exactly ${setCount} roleplay sets.`,
    "- Each set has exactly 3 questions in a fixed progression:",
    "  Q1 (Stage 1 / Q11): situation_questions — understand a scenario and ask 3–4 purposeful questions",
    "  Q2 (Stage 2 / Q12): problem_solving — an intentional problem appears; explain it and suggest 2–3 realistic alternatives",
    "  Q3 (Stage 3 / Q13): similar_experience — ask about a real past experience similar to the Q12 problem",
    "- targetTopicId MUST be from the provided roleplay topics.",
    `- Q1 type MUST be: ${roleplayStages["1"].join(", ")}`,
    `- Q2 type MUST be: ${roleplayStages["2"].join(", ")}`,
    `- Q3 type MUST be: ${roleplayStages["3"].join(", ")}`,
    `- Every set MUST set difficulty to \"${difficulty}\".`,
    "",
    "Difficulty writing rules:",
    ...difficultyWritingRules(difficulty, difficulties),
    "",
    "Question writing rules:",
    "- Write natural OPIc-style English roleplay prompts.",
    "- Q1 should set a clear situation (call a store/hotel/friend/etc.) and ask the examinee to inquire about 3–4 relevant details.",
    "- Q2 must introduce a problem that breaks the Q1 plan, require explaining the situation politely, and ask for 2–3 alternatives.",
    "- Q3 must leave the roleplay and ask about a real-life experience related to the Q2 problem (canceling, rescheduling, returns, lost items, etc.).",
    "- Keep Q1–Q3 on the same topic and storyline so Q3 clearly mirrors Q12.",
    "",
    "Output JSON fields:",
    "- sets[].targetTopicId",
    "- sets[].label (short English label)",
    `- sets[].difficulty (must be \"${difficulty}\")`,
    "- sets[].questions[0..2]: {type, text}",
    "",
    "Roleplay topics:",
    JSON.stringify(roleplayTopics, null, 2),
    "",
    "Roleplay question types:",
    JSON.stringify(roleplayQuestionTypes, null, 2),
    "",
    "Roleplay stages:",
    JSON.stringify(roleplayStages, null, 2),
  ].join("\n");
}

function makeComparisonPrompt({
  setCount,
  comparisonTopics,
  advancedQuestionTypes,
  comparisonStages,
  difficulty = "standard",
  difficulties,
}) {
  return [
    "You are generating OPIc advanced/comparison question sets for an English speaking exam (Q14–Q15).",
    "",
    "Composition rules:",
    `- Generate exactly ${setCount} comparison sets.`,
    "- Each set has exactly 2 questions in a fixed progression:",
    "  Q1 (Stage 1 / Q14): comparison — contrast two subjects OR past vs present; ask for similarities and differences with logical connectors",
    "  Q2 (Stage 2 / Q15): issue_discussion — a current social issue/trend related to the same topic (not just personal routine)",
    "- targetTopicId MUST be from the provided comparison topics.",
    `- Q1 type MUST be one of: ${comparisonStages["1"].join(", ")}`,
    `- Q2 type MUST be: ${comparisonStages["2"].join(", ")}`,
    `- Every set MUST set difficulty to \"${difficulty}\".`,
    "",
    "Difficulty writing rules:",
    ...difficultyWritingRules(difficulty, difficulties),
    "",
    "Question writing rules:",
    "- Write natural OPIc-style English advanced prompts.",
    "- Q14 with past_present_comparison: compare how the topic was in the past vs now (habits, tools, attitudes).",
    "- Q14 with two_subject_comparison: compare two contemporaneous subjects (e.g. your country vs a neighboring country; old phones vs smartphones as products).",
    "- Q15 must ask about a recent social problem, news trend, or side effect related to the topic, including why it matters and how people respond.",
    "- Keep Q14 and Q15 on the same topic so the issue discussion follows naturally from the comparison.",
    "",
    "Output JSON fields:",
    "- sets[].targetTopicId",
    "- sets[].label (short English label)",
    `- sets[].difficulty (must be \"${difficulty}\")`,
    "- sets[].questions[0..1]: {type, text}",
    "",
    "Comparison topics:",
    JSON.stringify(comparisonTopics, null, 2),
    "",
    "Advanced question types:",
    JSON.stringify(advancedQuestionTypes, null, 2),
    "",
    "Comparison stages:",
    JSON.stringify(comparisonStages, null, 2),
  ].join("\n");
}

const setItemSchema = {
  type: SchemaType.OBJECT,
  properties: {
    targetTopicId: { type: SchemaType.STRING },
    label: { type: SchemaType.STRING },
    isSurprise: { type: SchemaType.BOOLEAN },
    difficulty: { type: SchemaType.STRING },
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
  required: ["targetTopicId", "label", "difficulty", "questions"],
};

function stageCount(stages) {
  return Object.keys(stages).length;
}

function validateStagedSet(
  set,
  { stages, existingQuestionTexts, topicIds, expectedDifficulty },
) {
  const expectedCount = stageCount(stages);
  if (!set || typeof set !== "object") return false;
  if (!set.targetTopicId || typeof set.targetTopicId !== "string") return false;
  if (!topicIds.includes(set.targetTopicId)) return false;
  if (!VALID_DIFFICULTIES.has(set.difficulty)) return false;
  if (expectedDifficulty && set.difficulty !== expectedDifficulty) return false;
  if (!Array.isArray(set.questions) || set.questions.length !== expectedCount) {
    return false;
  }

  for (let i = 0; i < expectedCount; i += 1) {
    const q = set.questions[i];
    const stageKey = String(i + 1);
    if (!q || typeof q.text !== "string" || typeof q.type !== "string") {
      return false;
    }
    if (!stages[stageKey].includes(q.type)) return false;
    if (q.text.length < 30) return false;
    if (existingQuestionTexts.has(normalize(q.text))) return false;
  }

  return true;
}

function validateComboSet(set, context) {
  if (typeof set.isSurprise !== "boolean") return false;
  if (set.isSurprise) {
    if (!context.surpriseTopicIds.includes(set.targetTopicId)) return false;
  } else if (!context.surveyTopicIds.includes(set.targetTopicId)) {
    return false;
  }
  return validateStagedSet(set, {
    stages: context.comboStages,
    existingQuestionTexts: context.existingQuestionTexts,
    topicIds: set.isSurprise
      ? context.surpriseTopicIds
      : context.surveyTopicIds,
    expectedDifficulty: context.expectedDifficulty,
  });
}

function validateRoleplaySet(set, context) {
  return validateStagedSet(set, {
    stages: context.roleplayStages,
    existingQuestionTexts: context.existingQuestionTexts,
    topicIds: context.roleplayTopicIds,
    expectedDifficulty: context.expectedDifficulty ?? "standard",
  });
}

function validateComparisonSet(set, context) {
  return validateStagedSet(set, {
    stages: context.comparisonStages,
    existingQuestionTexts: context.existingQuestionTexts,
    topicIds: context.comparisonTopicIds,
    expectedDifficulty: context.expectedDifficulty ?? "standard",
  });
}

function ensureTopicExists(bank, category, topicConstant, options = {}) {
  const list = bank[category];
  let topic = list.find((item) => item.id === topicConstant.id);
  if (topic) {
    if (options.isSurprise) topic.surprise = true;
    return topic;
  }

  topic = {
    id: topicConstant.id,
    label: topicConstant.label.en,
    keywords: [topicConstant.id, topicConstant.label.en.toLowerCase()],
    ...(options.isSurprise ? { surprise: true } : {}),
    sets: [],
  };
  list.push(topic);
  return topic;
}

function appendGeneratedSets({
  bank,
  category,
  validSets,
  topicLookup,
  existingQuestionTexts,
  now,
}) {
  let added = 0;

  for (const generatedSet of validSets) {
    const topicConstant = topicLookup(generatedSet);
    if (!topicConstant) continue;

    const topic = ensureTopicExists(
      bank,
      category,
      topicConstant,
      category === "combo" ? { isSurprise: generatedSet.isSurprise } : {},
    );
    const idSeed = normalize(generatedSet.label).replace(/[^a-z0-9]+/g, "-");
    const newSetId = `${topic.id}-auto-${now}-${idSeed || "set"}`.slice(0, 80);
    const uniqueId = topic.sets.some((s) => s.id === newSetId)
      ? `${newSetId}-${Math.random().toString(36).slice(2, 7)}`
      : newSetId;

    topic.sets.push({
      id: uniqueId,
      label: generatedSet.label,
      difficulty: VALID_DIFFICULTIES.has(generatedSet.difficulty)
        ? generatedSet.difficulty
        : "standard",
      questions: generatedSet.questions,
    });

    for (const q of generatedSet.questions) {
      existingQuestionTexts.add(normalize(q.text));
    }
    added += 1;
  }

  return added;
}

async function generateSets(client, prompt, { requireIsSurprise = false } = {}) {
  const itemSchema = requireIsSurprise
    ? {
        ...setItemSchema,
        required: [
          "targetTopicId",
          "label",
          "isSurprise",
          "difficulty",
          "questions",
        ],
      }
    : setItemSchema;

  const response = await client.models.generateContent({
    model: MODEL,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          sets: {
            type: SchemaType.ARRAY,
            items: itemSchema,
          },
        },
        required: ["sets"],
      },
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned empty response.");
  const parsed = JSON.parse(text);
  return Array.isArray(parsed?.sets) ? parsed.sets : [];
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
  const roleplayTopics = constants.roleplayTopics ?? [];
  const comparisonTopics = constants.comparisonTopics ?? [];
  const comboQuestionTypes = constants.comboQuestionTypes;
  const comboStages = constants.comboStages;
  const roleplayQuestionTypes = constants.roleplayQuestionTypes;
  const roleplayStages = constants.roleplayStages;
  const advancedQuestionTypes = constants.advancedQuestionTypes;
  const comparisonStages = constants.comparisonStages;
  const surveyTopicIds = surveyTopics.map((topic) => topic.id);
  const surpriseTopicIds = surpriseTopics.map((topic) => topic.id);
  const roleplayTopicIds = roleplayTopics.map((topic) => topic.id);
  const comparisonTopicIds = comparisonTopics.map((topic) => topic.id);

  const difficulties = constants.difficulties ?? [];
  const existingQuestionTexts = collectExistingTexts(bank);
  const client = new GoogleGenAI({ apiKey });
  const now = new Date().toISOString().slice(0, 10);

  let comboAdded = 0;
  let comboStandardAdded = 0;
  let comboChallengingAdded = 0;
  let roleplayAdded = 0;
  let comparisonAdded = 0;
  const comboRatioParts = [];

  async function generateComboPass(difficulty, setCount) {
    if (setCount <= 0) return 0;

    const { surveyCount, surpriseCount } = splitByRatio(
      setCount,
      constants.examComposition.surveyToSurpriseRatio,
    );
    comboRatioParts.push(`${difficulty} ${surveyCount}:${surpriseCount}`);

    const comboSets = await generateSets(
      client,
      makeComboPrompt({
        surveyCount,
        surpriseCount,
        surveyTopics: randomPick(surveyTopics, Math.max(surveyCount, 4)),
        surpriseTopics: randomPick(
          surpriseTopics,
          Math.max(surpriseCount, 4),
        ),
        comboQuestionTypes,
        comboStages,
        difficulty,
        difficulties,
      }),
      { requireIsSurprise: true },
    );

    const validComboSets = comboSets.filter((set) =>
      validateComboSet(set, {
        surveyTopicIds,
        surpriseTopicIds,
        comboStages,
        existingQuestionTexts,
        expectedDifficulty: difficulty,
      }),
    );

    return appendGeneratedSets({
      bank,
      category: "combo",
      validSets: validComboSets,
      topicLookup: (generatedSet) =>
        generatedSet.isSurprise
          ? surpriseTopics.find(
              (topic) => topic.id === generatedSet.targetTopicId,
            )
          : surveyTopics.find(
              (topic) => topic.id === generatedSet.targetTopicId,
            ),
      existingQuestionTexts,
      now,
    });
  }

  comboStandardAdded = await generateComboPass(
    "standard",
    DAILY_COMBO_STANDARD_COUNT,
  );
  comboChallengingAdded = await generateComboPass(
    "challenging",
    DAILY_COMBO_CHALLENGING_COUNT,
  );
  comboAdded = comboStandardAdded + comboChallengingAdded;

  if (DAILY_ROLEPLAY_SET_COUNT > 0 && roleplayTopics.length > 0) {
    const roleplaySets = await generateSets(
      client,
      makeRoleplayPrompt({
        setCount: DAILY_ROLEPLAY_SET_COUNT,
        roleplayTopics: randomPick(
          roleplayTopics,
          Math.max(DAILY_ROLEPLAY_SET_COUNT, 4),
        ),
        roleplayQuestionTypes,
        roleplayStages,
        difficulty: "standard",
        difficulties,
      }),
    );

    const validRoleplaySets = roleplaySets.filter((set) =>
      validateRoleplaySet(set, {
        roleplayTopicIds,
        roleplayStages,
        existingQuestionTexts,
        expectedDifficulty: "standard",
      }),
    );

    roleplayAdded = appendGeneratedSets({
      bank,
      category: "roleplay",
      validSets: validRoleplaySets,
      topicLookup: (generatedSet) =>
        roleplayTopics.find((topic) => topic.id === generatedSet.targetTopicId),
      existingQuestionTexts,
      now,
    });
  }

  if (DAILY_COMPARISON_SET_COUNT > 0 && comparisonTopics.length > 0) {
    const comparisonSets = await generateSets(
      client,
      makeComparisonPrompt({
        setCount: DAILY_COMPARISON_SET_COUNT,
        comparisonTopics: randomPick(
          comparisonTopics,
          Math.max(DAILY_COMPARISON_SET_COUNT, 4),
        ),
        advancedQuestionTypes,
        comparisonStages,
        difficulty: "standard",
        difficulties,
      }),
    );

    const validComparisonSets = comparisonSets.filter((set) =>
      validateComparisonSet(set, {
        comparisonTopicIds,
        comparisonStages,
        existingQuestionTexts,
        expectedDifficulty: "standard",
      }),
    );

    comparisonAdded = appendGeneratedSets({
      bank,
      category: "comparison",
      validSets: validComparisonSets,
      topicLookup: (generatedSet) =>
        comparisonTopics.find(
          (topic) => topic.id === generatedSet.targetTopicId,
        ),
      existingQuestionTexts,
      now,
    });
  }

  if (comboAdded === 0 && roleplayAdded === 0 && comparisonAdded === 0) {
    console.log("No valid sets generated. Skipping update.");
    return;
  }

  await fs.writeFile(QUESTION_BANK_PATH, `${JSON.stringify(bank, null, 2)}\n`);
  console.log(
    `Added ${comboAdded} combo sets (standard ${comboStandardAdded} + challenging ${comboChallengingAdded}; survey:surprise per pass ~= ${comboRatioParts.join(", ") || "n/a"}), ${roleplayAdded} roleplay sets, and ${comparisonAdded} comparison sets.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
