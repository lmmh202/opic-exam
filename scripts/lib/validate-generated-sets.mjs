const VALID_DIFFICULTIES = new Set(["standard", "challenging"]);

export function normalize(text) {
  return String(text).toLowerCase().replace(/\s+/g, " ").trim();
}

export function collectExistingTexts(bank) {
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

function stageCount(stages) {
  return Object.keys(stages).length;
}

export function validateStagedSet(
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

export function validateComboSet(set, context) {
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

export function validateRoleplaySet(set, context) {
  return validateStagedSet(set, {
    stages: context.roleplayStages,
    existingQuestionTexts: context.existingQuestionTexts,
    topicIds: context.roleplayTopicIds,
    expectedDifficulty: context.expectedDifficulty ?? "standard",
  });
}

export function validateComparisonSet(set, context) {
  return validateStagedSet(set, {
    stages: context.comparisonStages,
    existingQuestionTexts: context.existingQuestionTexts,
    topicIds: context.comparisonTopicIds,
    expectedDifficulty: context.expectedDifficulty ?? "standard",
  });
}

export { VALID_DIFFICULTIES };
