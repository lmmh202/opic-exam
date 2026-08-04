"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Youtube } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExamSetupPanel } from "@/components/exam-setup-panel";
import { useExamStore } from "@/lib/store";
import { getMockExamTitle, listMockExams, toExamQuestions } from "@/lib/mock-exams";
import { examPath } from "@/lib/exam-mode";
import { useTranslation } from "@/components/i18n-provider";

export default function RealSetupPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { switchExamMode, setExamQuestions, setMockExamId, resetExam } = useExamStore();

  const mockExams = listMockExams();
  const [selectedExamId, setSelectedExamId] = useState(mockExams[0]?.id ?? "");
  const selectedExam = mockExams.find((exam) => exam.id === selectedExamId);

  const handleStartExam = async () => {
    if (!selectedExam) return;

    // `switchExamMode` clears the active exam, so the id is set after it resolves.
    await switchExamMode("real");
    setMockExamId(selectedExam.id);
    setExamQuestions(toExamQuestions(selectedExam, locale));
    resetExam();
    router.push(examPath("real"));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center pb-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 w-fit mx-auto mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("홈으로 돌아가기")}
          </Link>
          <Badge variant="outline" className="w-fit mx-auto mb-2 border-blue-200 text-blue-700 bg-blue-50">
            {t("실전 모의고사 모드")}
          </Badge>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">{t("시험 설정")}</CardTitle>
          <CardDescription className="text-slate-600">
            {t("15문항 시험을 시작하기 전에 마이크 점검과 설정을 완료하세요.")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ExamSetupPanel
            survey={selectedExam?.survey}
            startDisabled={!selectedExam}
            startDisabledReason={t("모의고사를 선택하세요.")}
            startLabel={
              <>
                {t("시험 시작")} <ArrowRight className="ml-2 w-5 h-5" />
              </>
            }
            onStart={handleStartExam}
          >
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">{t("모의고사 선택")}</h3>
              <div className="space-y-2">
                {mockExams.map((exam) => {
                  const isSelected = exam.id === selectedExamId;
                  return (
                    <div
                      key={exam.id}
                      className={`rounded-lg border p-4 transition-colors ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedExamId(exam.id)}
                        className="w-full flex items-start justify-between gap-3 text-left"
                      >
                        <div className="space-y-1">
                          <span className="font-medium text-slate-900 block">{getMockExamTitle(exam, locale)}</span>
                          <span className="text-xs text-slate-500">
                            {t("{count}문항", { count: exam.questions.length })}
                          </span>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
                      </button>

                      {exam.source.url && (
                        <a
                          href={exam.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors"
                        >
                          <Youtube className="w-3.5 h-3.5" />
                          {exam.source.channel.name || t("출처 영상")}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </ExamSetupPanel>
        </CardContent>
      </Card>
    </div>
  );
}
