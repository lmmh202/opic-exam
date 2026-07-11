"use client";

import { useEffect, useId, useState } from "react";
import { RotateCcw, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { useTranslation } from "@/components/i18n-provider";

const MAX_LENGTH = 500;

interface PronunciationPracticePanelProps {
  /** Prefill / reset text when this value changes (e.g. question or corrected script). */
  seedText?: string;
  className?: string;
}

export function PronunciationPracticePanel({ seedText = "", className }: PronunciationPracticePanelProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const clippedSeed = seedText.slice(0, MAX_LENGTH);
  const [text, setText] = useState(clippedSeed);
  const [seedSnapshot, setSeedSnapshot] = useState(clippedSeed);
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis({
    onError: (message) => toast.error(message),
  });

  if (clippedSeed !== seedSnapshot) {
    setSeedSnapshot(clippedSeed);
    setText(clippedSeed);
  }

  useEffect(() => {
    stop();
  }, [clippedSeed, stop]);

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
    <div className={className}>
      <div className="space-y-2">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-900">
          {t("영어 문장을 입력하세요")}
        </label>
        <Textarea
          id={inputId}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t("여기에 문장을 입력하거나 붙여넣으세요...")}
          className="min-h-[120px] resize-none bg-white"
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

      <div className="flex flex-wrap gap-3 mt-4">
        <Button onClick={handleSpeak} disabled={!isSupported} className="flex-1 sm:flex-none">
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
        <Button variant="outline" onClick={handleClear} disabled={!text && !isSpeaking}>
          <RotateCcw className="w-4 h-4 mr-2" />
          {t("지우기")}
        </Button>
      </div>

      {isSpeaking && <p className="text-sm text-blue-600 text-center animate-pulse mt-4">{t("발음 재생 중...")}</p>}

      {!isSupported && (
        <p className="text-sm text-red-600 text-center mt-4">
          {t("이 브라우저는 음성 합성(TTS)을 지원하지 않습니다.")}
        </p>
      )}

      <p className="text-xs text-slate-400 text-center mt-4">{t("팁: Cmd/Ctrl + Enter로 말하기")}</p>
    </div>
  );
}
