"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useExamStore } from "@/lib/store";
import { getAudio } from "@/lib/db";
import type { QuestionAnalysis, BatchAnalysisResult } from "@/app/api/analyze/route";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  EXAM_MODE_CONFIG,
  parseExamMode,
  type ExamMode,
} from "@/lib/exam-mode";
import { useTranslation } from "@/components/i18n-provider";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

function ResultsPageContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const mode: ExamMode = parseExamMode(searchParams.get("mode"));
  const config = EXAM_MODE_CONFIG[mode];

  const { answers, examQuestions, examMode } = useExamStore();
  const [analyzedData, setAnalyzedData] = useState<Record<number, QuestionAnalysis>>({});
  const [overallGrade, setOverallGrade] = useState<string | null>(null);
  const [overallFeedback, setOverallFeedback] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const answeredIds = Object.keys(answers).map(Number);

  const calculateAverageScores = () => {
    const results = Object.values(analyzedData);
    if (results.length === 0)
      return [
        { subject: t("유창성"), A: 0, fullMark: 100 },
        { subject: t("문법"), A: 0, fullMark: 100 },
        { subject: t("어휘"), A: 0, fullMark: 100 },
        { subject: t("내용"), A: 0, fullMark: 100 },
      ];

    const sum = results.reduce(
      (acc, curr) => ({
        fluency: acc.fluency + (curr.fluency_score || 0),
        grammar: acc.grammar + (curr.grammar_score || 0),
        vocabs: acc.vocabs + (curr.vocabulary_score || 0),
        content: acc.content + 80,
      }),
      { fluency: 0, grammar: 0, vocabs: 0, content: 0 },
    );

    const count = results.length;
    return [
      { subject: t("유창성"), A: Math.round(sum.fluency / count), fullMark: 100 },
      { subject: t("문법"), A: Math.round(sum.grammar / count), fullMark: 100 },
      {
        subject: t("어휘"),
        A: Math.round(sum.vocabs / count),
        fullMark: 100,
      },
      { subject: t("내용"), A: 85, fullMark: 100 },
    ];
  };

  const analyzeAllQuestions = useCallback(async () => {
    const questionIds = Object.keys(answers).map(Number);
    if (questionIds.length === 0) {
      toast.error(t("답변한 문항이 없습니다."));
      return;
    }

    setIsAnalyzing(true);
    try {
      const formData = new FormData();

      for (const questionId of questionIds) {
        const blob = await getAudio(mode, questionId);
        if (blob) {
          const questionText =
            examQuestions.find((q) => q.id === questionId)?.text || "";
          formData.append(`audio_${questionId}`, blob, `recording_${questionId}.webm`);
          formData.append(`questionText_${questionId}`, questionText);
        }
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        const batchResult = result.data as BatchAnalysisResult;

        const questionAnalysis: Record<number, QuestionAnalysis> = {};
        for (const item of batchResult.questions) {
          questionAnalysis[Number(item.question_id)] = item;
        }

        setAnalyzedData(questionAnalysis);
        setOverallGrade(batchResult.overall_grade);
        setOverallFeedback(batchResult.overall_feedback);
        setAnalysisComplete(true);
        toast.success(t("모든 문항 분석이 완료되었습니다!"));
      } else {
        toast.error(
          t(
            (result.error as TranslationKey) ||
              "분석에 실패했습니다",
          ),
        );
      }
    } catch (e) {
      console.error(e);
      toast.error(t("오디오 분석 중 오류가 발생했습니다"));
    } finally {
      setIsAnalyzing(false);
    }
  }, [answers, examQuestions, mode, t]);

  useEffect(() => {
    if (examMode !== mode) return;
    if (answeredIds.length > 0 && !analysisComplete && !isAnalyzing) {
      analyzeAllQuestions();
    }
  }, [answeredIds.length, analysisComplete, isAnalyzing, analyzeAllQuestions, examMode, mode]);

  const backPath = mode === "practice" ? "/practice" : "/real/setup";
  const pageTitle = mode === "practice" ? t("연습 결과") : t("시험 결과");

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-slate-900">{pageTitle}</h1>
              <Badge variant="outline">
                {t(mode === "practice" ? "연습" : "실전 모의고사")}
              </Badge>
            </div>
            <p className="text-slate-500">
              {isAnalyzing
                ? t("AI로 모든 답변을 분석하는 중...")
                : t("성적과 AI 피드백을 확인하세요.")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={analyzeAllQuestions}
              disabled={isAnalyzing || analysisComplete}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("분석 중...")}
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("다시 분석")}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = backPath)}
            >
              {mode === "practice" ? t("연습으로 돌아가기") : t("설정으로 돌아가기")}
            </Button>
          </div>
        </div>

        {isAnalyzing && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-blue-900">
                    {t("{count}개 답변을 분석하는 중...", {
                      count: answeredIds.length,
                    })}
                  </p>
                  <p className="text-sm text-blue-700">
                    {t("잠시 시간이 걸릴 수 있습니다. 기다려 주세요.")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isAnalyzing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("성적 개요")}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        data={calculateAverageScores()}
                      >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name={t("내 점수")}
                          dataKey="A"
                          stroke="#2563eb"
                          fill="#3b82f6"
                          fillOpacity={0.6}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-sm text-slate-500 mb-1">
                      {t("예상 등급")}
                    </p>
                    <Badge className="text-2xl px-4 py-2 bg-blue-600 hover:bg-blue-700">
                      {overallGrade || "—"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {overallFeedback && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("종합 피드백")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {overallFeedback}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{t("문항 분석")}</CardTitle>
                  <CardDescription>
                    {analysisComplete
                      ? t("각 문항을 클릭하면 상세 피드백을 볼 수 있습니다.")
                      : t("분석 결과가 여기에 표시됩니다.")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <Accordion type="single" collapsible className="w-full">
                      {examQuestions.map((q) => {
                        const isAnswered = answeredIds.includes(q.id);
                        if (!isAnswered) return null;

                        const analysis = analyzedData[q.id];

                        return (
                          <AccordionItem key={q.id} value={`item-${q.id}`}>
                            <AccordionTrigger>
                              <span className="text-left font-medium line-clamp-1 flex-1 mr-4">
                                {q.id}. {q.topic}
                              </span>
                              {analysis && (
                                <Badge variant="outline" className="mr-2">
                                  {analysis.grade}
                                </Badge>
                              )}
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2">
                              <p className="text-sm text-slate-600 italic">
                                &quot;{q.text}&quot;
                              </p>

                              {analysis ? (
                                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div className="bg-slate-100 p-2 rounded">
                                      <div className="font-semibold text-slate-700">
                                        {t("유창성")}
                                      </div>
                                      <div>{analysis.fluency_score}</div>
                                    </div>
                                    <div className="bg-slate-100 p-2 rounded">
                                      <div className="font-semibold text-slate-700">
                                        {t("문법")}
                                      </div>
                                      <div>{analysis.grammar_score}</div>
                                    </div>
                                    <div className="bg-slate-100 p-2 rounded">
                                      <div className="font-semibold text-slate-700">
                                        {t("어휘")}
                                      </div>
                                      <div>{analysis.vocabulary_score}</div>
                                    </div>
                                  </div>

                                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h4 className="font-semibold text-blue-900 mb-2">
                                      {t("피드백")}
                                    </h4>
                                    <p className="text-sm text-blue-800 whitespace-pre-wrap">
                                      {analysis.feedback}
                                    </p>
                                  </div>

                                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                    <h4 className="font-semibold text-green-900 mb-2">
                                      {t("교정된 스크립트")}
                                    </h4>
                                    <p className="text-sm text-green-800">
                                      {analysis.corrected_script}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4 text-slate-500">
                                  {isAnalyzing
                                    ? t("분석 중...")
                                    : t("분석 결과가 없습니다")}
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsPageContent />
    </Suspense>
  );
}
