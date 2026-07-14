import type { QuestionAnalysis } from "@/lib/analyze-types";
import type { OpicGrade } from "@/lib/analysis-cache";
import { deriveOverallGrade } from "@/lib/analysis-cache";
import type { SpeechMetrics } from "@/lib/speech-metrics";

// Longest continuous silence at or above this demotes grade to IM3 max.
export const LONG_SILENCE_CAP_SECONDS = 5;
export const LONG_SILENCE_GRADE_CAP: OpicGrade = "IM3";

const GRADE_RANK: OpicGrade[] = ["NH", "IL", "IM1", "IM2", "IM3", "IH", "AL"];

export type AnalyzeLocale = "ko" | "en";

export interface RubricResult {
  analysis: QuestionAnalysis;
  triggeredRules: string[];
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function gradeIndex(grade: OpicGrade) {
  return GRADE_RANK.indexOf(grade);
}

function minGrade(a: OpicGrade, b: OpicGrade): OpicGrade {
  return gradeIndex(a) <= gradeIndex(b) ? a : b;
}

function fluencyScoreFromMetrics(m: SpeechMetrics): number {
  // Reward speech density and penalize long silences.
  let score = 40 + m.speechDensity * 55 - Math.max(0, m.longestSilenceSec - 1) * 6;
  if (m.durationSec < 20) score -= 15;
  if (m.durationSec >= 30 && m.speechRatio >= 0.55) score += 8;
  if (m.longestSilenceSec >= LONG_SILENCE_CAP_SECONDS) score -= 12;
  return Math.round(clamp(score, 0, 100));
}

function provisionalGrade(fluency: number, durationSec: number): OpicGrade {
  if (durationSec < 15 || fluency < 35) return "NH";
  if (fluency < 45) return "IL";
  if (fluency < 55) return "IM1";
  if (fluency < 65) return "IM2";
  if (fluency < 78) return "IM3";
  if (fluency < 88) return "IH";
  return "AL";
}

function templates(locale: AnalyzeLocale) {
  if (locale === "en") {
    return {
      base: "This score is a heuristic fluency estimate from speech/silence patterns (not an official OPIc rating). Content and grammar will improve once transcription rules are added.",
      short: "The recording is relatively short for a full response. Try speaking longer with more detail.",
      longSilence: `A pause of ${LONG_SILENCE_CAP_SECONDS}+ seconds was detected, so the grade was capped at ${LONG_SILENCE_GRADE_CAP} for fluency.`,
      lowSpeech: "A large share of the recording is silence. Aim for steadier speech with fewer long gaps.",
      solid: "Speech density looks solid. Keep building longer, connected answers.",
      noScript: "Corrected script is unavailable until speech-to-text is enabled.",
      overall:
        "Overall band is derived from per-question fluency heuristics (speech ratio and pauses). Not an official OPIc result.",
    };
  }
  return {
    base: "이 점수는 말소리·침묵 패턴으로 추정한 유창성 휴리스틱이며, 공식 OPIc 등급이 아닙니다. 내용·문법 평가는 전사(STT) 규칙 단계에서 보강됩니다.",
    short: "답변 길이가 다소 짧습니다. 구체적인 설명을 더해 더 길게 말해 보세요.",
    longSilence: `${LONG_SILENCE_CAP_SECONDS}초 이상 긴 공백이 감지되어 유창성 등급을 ${LONG_SILENCE_GRADE_CAP} 이하로 제한했습니다.`,
    lowSpeech: "녹음 중 침묵 비중이 큽니다. 긴 멈춤을 줄이고 더 꾸준히 말해 보세요.",
    solid: "발화 밀도는 양호합니다. 문장을 연결해 더 풍부한 답변을 이어가 보세요.",
    noScript: "교정 스크립트는 음성→텍스트(STT) 연동 후 제공됩니다.",
    overall: "종합 등급은 문항별 유창성 휴리스틱(발화 비율·공백)을 모아 산출한 참고값이며, 공식 OPIc 결과가 아닙니다.",
  };
}

export function analyzeWithRubric(
  questionId: string,
  metrics: SpeechMetrics,
  locale: AnalyzeLocale = "ko",
): RubricResult {
  const t = templates(locale);
  const triggered: string[] = [];
  const fluency = fluencyScoreFromMetrics(metrics);
  let grade = provisionalGrade(fluency, metrics.durationSec);

  if (metrics.durationSec < 25) triggered.push("short");
  if (metrics.speechRatio < 0.4) triggered.push("lowSpeech");
  if (metrics.longestSilenceSec >= LONG_SILENCE_CAP_SECONDS) {
    triggered.push("longSilence");
    grade = minGrade(grade, LONG_SILENCE_GRADE_CAP);
  }
  if (triggered.length === 0) triggered.push("solid");

  const parts = [t.base];
  for (const rule of triggered) {
    if (rule === "short") parts.push(t.short);
    if (rule === "lowSpeech") parts.push(t.lowSpeech);
    if (rule === "longSilence") parts.push(t.longSilence);
    if (rule === "solid") parts.push(t.solid);
  }

  // Phase 1: grammar/vocab are neutral placeholders until STT rules exist.
  const grammar = 50;
  const vocabulary = 50;

  const analysis: QuestionAnalysis = {
    question_id: String(questionId),
    grade,
    feedback: parts.join("\n\n"),
    corrected_script: t.noScript,
    fluency_score: fluency,
    grammar_score: grammar,
    vocabulary_score: vocabulary,
    metrics,
  };

  return { analysis, triggeredRules: triggered };
}

export function buildBatchFromRubrics(analyses: QuestionAnalysis[], locale: AnalyzeLocale = "ko") {
  const t = templates(locale);
  const overall = deriveOverallGrade(analyses) ?? "NH";
  return {
    questions: analyses,
    overall_grade: overall,
    overall_feedback: t.overall,
  };
}
