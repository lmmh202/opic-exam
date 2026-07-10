"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PronunciationPracticePanel } from "@/components/pronunciation-practice-panel";
import { useTranslation } from "@/components/i18n-provider";

export default function PronunciationPracticePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="pb-2">
          <Link
            href="/practice"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 w-fit mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("연습 허브로 돌아가기")}
          </Link>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            {t("발음 연습")}
          </CardTitle>
          <CardDescription className="text-slate-600">
            {t("영어 문장을 입력하면 브라우저 TTS로 발음을 들려줍니다.")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <PronunciationPracticePanel />
        </CardContent>
      </Card>
    </div>
  );
}
