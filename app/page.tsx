"use client";

import { useRouter } from "next/navigation";
import { Target, BookOpen, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/components/i18n-provider";

export default function HomePage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center pb-2">
          <Badge variant="outline" className="w-fit mx-auto mb-2 border-blue-200 text-blue-700 bg-blue-50">
            {t("AI OPIc 시뮬레이터")}
          </Badge>
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
            {t("OPIc 모의고사에 오신 것을 환영합니다")}
          </CardTitle>
          <CardDescription className="text-lg text-slate-600 mt-2">{t("시작할 모드를 선택하세요")}</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => router.push("/real/setup")}
            className="group text-left p-6 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">{t("실전 모의고사")}</h3>
              <p className="text-sm text-slate-600 mt-1">
                {t("40분 타이머와 엄격한 시험 규칙이 적용되는 15문항 전체 OPIc 시뮬레이션입니다.")}
              </p>
            </div>
            <span className="inline-flex items-center text-sm font-medium text-blue-600">
              {t("설정 시작")} <ArrowRight className="w-4 h-4 ml-1" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/practice")}
            className="group text-left p-6 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
              <BookOpen className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">{t("연습")}</h3>
              <p className="text-sm text-slate-600 mt-1">
                {t("주제별 세션, 발음 연습, 즉시 피드백이 제공되는 자유로운 연습 모드입니다.")}
              </p>
            </div>
            <span className="inline-flex items-center text-sm font-medium text-emerald-600">
              {t("연습 허브 열기")} <ArrowRight className="w-4 h-4 ml-1" />
            </span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
