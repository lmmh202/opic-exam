"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { useTranslation } from "@/components/i18n-provider";

const MAX_LENGTH = 500;

export default function PronunciationPracticePage() {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis({
    onError: (message) => toast.error(message),
  });

  const handleSpeak = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error(t("문장을 입력해 주세요."));
      return;
    }

    if (isSpeaking) {
      stop();
      return;
    }

    speak(trimmed.replace(/\s+/g, " "));
  };

  const handleClear = () => {
    stop();
    setText("");
  };

  const handleChange = (value: string) => {
    if (value.length <= MAX_LENGTH) {
      setText(value);
    }
  };

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

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="practice-sentence"
              className="text-sm font-medium text-slate-900"
            >
              {t("영어 문장을 입력하세요")}
            </label>
            <Textarea
              id="practice-sentence"
              value={text}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={t("여기에 문장을 입력하거나 붙여넣으세요...")}
              className="min-h-[120px] resize-none"
              maxLength={MAX_LENGTH}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSpeak();
                }
              }}
            />
            <p className="text-xs text-slate-500 text-right tabular-nums">
              {t("{count} / {max}자", { count: text.length, max: MAX_LENGTH })}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSpeak}
              disabled={!isSupported}
              className="flex-1 sm:flex-none"
            >
              {isSpeaking ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  {t("정지")}
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 mr-2" />
                  {t("말하기")}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={!text && !isSpeaking}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {t("지우기")}
            </Button>
          </div>

          {isSpeaking && (
            <p className="text-sm text-blue-600 text-center animate-pulse">
              {t("발음 재생 중...")}
            </p>
          )}

          {!isSupported && (
            <p className="text-sm text-red-600 text-center">
              {t("이 브라우저는 음성 합성(TTS)을 지원하지 않습니다.")}
            </p>
          )}

          <p className="text-xs text-slate-400 text-center">
            {t("팁: Cmd/Ctrl + Enter로 말하기")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
