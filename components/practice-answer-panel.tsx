"use client";

import type { QuestionAnalysis } from "@/lib/analyze-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pause, Play, Sparkles } from "lucide-react";
import { useTranslation } from "@/components/i18n-provider";

interface PracticeAnswerPanelProps {
  hasRecording: boolean;
  isPlayingAnswer: boolean;
  isAnalyzing: boolean;
  analysis: QuestionAnalysis | null;
  onPlayAnswer: () => void;
  onAnalyze: () => void;
}

export function PracticeAnswerPanel({
  hasRecording,
  isPlayingAnswer,
  isAnalyzing,
  analysis,
  onPlayAnswer,
  onAnalyze,
}: PracticeAnswerPanelProps) {
  const { t } = useTranslation();
  if (!hasRecording) return null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="secondary" onClick={onPlayAnswer}>
          {isPlayingAnswer ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              {t("내 답변 정지")}
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              {t("내 답변 듣기")}
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("분석 중...")}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {analysis ? t("다시 분석") : t("피드백 받기")}
            </>
          )}
        </Button>
      </div>

      {analysis && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900">{t("AI 피드백")}</h3>
            <Badge className="bg-emerald-600 hover:bg-emerald-700">{analysis.grade}</Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="bg-slate-100 p-2 rounded">
              <div className="font-semibold text-slate-700">{t("유창성")}</div>
              <div>{analysis.fluency_score}</div>
            </div>
            <div className="bg-slate-100 p-2 rounded">
              <div className="font-semibold text-slate-700">{t("문법")}</div>
              <div>{analysis.grammar_score}</div>
            </div>
            <div className="bg-slate-100 p-2 rounded">
              <div className="font-semibold text-slate-700">{t("어휘")}</div>
              <div>{analysis.vocabulary_score}</div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="font-semibold text-blue-900 mb-2">{t("피드백")}</h4>
            <p className="text-sm text-blue-800 whitespace-pre-wrap">{analysis.feedback}</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <h4 className="font-semibold text-green-900 mb-2">{t("교정된 스크립트")}</h4>
            <p className="text-sm text-green-800">{analysis.corrected_script}</p>
          </div>
        </div>
      )}
    </div>
  );
}
