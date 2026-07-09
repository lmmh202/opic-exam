"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mic,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useExamStore } from "@/lib/store";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useTranslation } from "@/components/i18n-provider";
import surveyData from "@/data/survey.json";

interface ExamSetupPanelProps {
  children?: React.ReactNode;
  startLabel: React.ReactNode;
  onStart: () => void;
  startDisabled?: boolean;
  startDisabledReason?: string;
  showRecordingSettings?: boolean;
}

export function ExamSetupPanel({
  children,
  startLabel,
  onStart,
  startDisabled = false,
  startDisabledReason,
  showRecordingSettings = true,
}: ExamSetupPanelProps) {
  const { t, locale } = useTranslation();
  const { skipEnabled, minRecordingDuration } = useExamStore();
  const [localSkipEnabled, setLocalSkipEnabled] = useState(skipEnabled);
  const [localDuration, setLocalDuration] = useState(minRecordingDuration);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [micStatus, setMicStatus] = useState<"idle" | "testing" | "success">(
    "idle",
  );

  const { startRecording, stopRecording, isRecording, visualizerData } =
    useAudioRecorder({
      onStop: (blob) => {
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setMicStatus("success");
      },
    });

  const { setSkipSettings } = useExamStore();

  const handleStart = () => {
    if (showRecordingSettings) {
      setSkipSettings(localSkipEnabled, localDuration);
    }
    onStart();
  };

  const handleMicToggle = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setMicStatus("testing");
      await startRecording();
    }
  };

  const handlePlayAudio = () => {
    if (!audioUrl) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleRetry = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setMicStatus("idle");
  };

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioRef.current) audioRef.current.pause();
    };
  }, [audioUrl]);

  const micReady = micStatus === "success" && !!audioUrl;
  const isStartDisabled = !micReady || startDisabled;
  const disabledReason = !micReady
    ? t("마이크 점검을 완료하세요.")
    : startDisabled
      ? (startDisabledReason ?? t("시작할 수 없습니다."))
      : null;

  return (
    <div className="space-y-8">
      {children}

      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          {t("적용된 설문 설정")}
        </h3>
        <div className="grid grid-cols-1 gap-4 text-sm text-slate-600">
          {surveyData.map((item) => (
            <div key={item.id} className="space-y-1">
              <span className="font-medium text-slate-900 block">
                {item.number}. {item.question[locale] ?? item.question.ko}
              </span>
              <span>{item.answer[locale] ?? item.answer.ko}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 text-lg">🔒</span>
          </div>
          <div>
            <h4 className="font-semibold text-green-900 mb-1">
              {t("개인정보가 보호됩니다")}
            </h4>
            <p className="text-sm text-green-800">
              {t(
                "모든 음성 녹음은 브라우저 안에만 저장됩니다 (IndexedDB). 어떤 오디오 데이터도 서버나 데이터베이스에 저장되지 않습니다.",
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-slate-900">{t("마이크 점검")}</h3>
          {micReady && (
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {t("소리 감지됨")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                className="text-slate-500 hover:text-slate-900 h-8 px-2 text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> {t("다시 시도")}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 bg-slate-100 p-4 rounded-xl">
          {audioUrl ? (
            <Button
              onClick={handlePlayAudio}
              variant={isPlaying ? "default" : "secondary"}
              size="icon"
              className="h-12 w-12 rounded-full shrink-0 transition-all shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-1" />
              )}
            </Button>
          ) : (
            <Button
              variant={isRecording ? "destructive" : "secondary"}
              size="icon"
              className="h-12 w-12 rounded-full shrink-0 transition-all shadow-sm"
              onClick={handleMicToggle}
            >
              {isRecording ? (
                <div className="w-4 h-4 bg-white rounded-sm" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
          )}

          <div className="flex-1 h-12 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-end justify-center gap-[2px] pb-2 px-4 shadow-inner">
            {visualizerData.map((value, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-t-sm transition-all duration-75 ${isRecording ? "bg-blue-500" : "bg-slate-300"}`}
                style={{
                  height: `${Math.max(10, value / 2.5)}%`,
                  opacity: isRecording ? 1 : audioUrl ? 0.5 : 0.3,
                }}
              />
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500 text-center">
          {isRecording
            ? t("듣는 중... 말해서 테스트하세요.")
            : audioUrl
              ? t("재생을 눌러 목소리를 확인하세요.")
              : t("마이크를 눌러 테스트를 시작하세요.")}
        </p>
      </div>

      {showRecordingSettings && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            {t("녹음 설정")}
          </h3>

          <div className="flex items-center justify-between">
            <Label
              htmlFor="skip-enabled"
              className="text-sm text-slate-700 cursor-pointer"
            >
              {t("건너뛰기 허용 (최소 녹음 시간 없음)")}
            </Label>
            <Switch
              id="skip-enabled"
              checked={localSkipEnabled}
              onCheckedChange={setLocalSkipEnabled}
            />
          </div>

          {!localSkipEnabled && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{t("최소 녹음 시간")}</span>
                <span className="font-medium text-blue-600 tabular-nums">
                  {t("{seconds}초", { seconds: localDuration })}
                </span>
              </div>
              <Slider
                value={[localDuration]}
                onValueChange={([value]) => setLocalDuration(value)}
                min={10}
                max={120}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>{t("10초")}</span>
                <span>{t("120초 (2분)")}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {isStartDisabled && disabledReason ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block w-full cursor-not-allowed">
              <Button
                className="w-full text-lg h-14 font-semibold shadow-lg shadow-blue-500/20 pointer-events-none"
                disabled
              >
                {startLabel}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {disabledReason}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button
          className="w-full text-lg h-14 font-semibold shadow-lg shadow-blue-500/20"
          onClick={handleStart}
        >
          {startLabel}
        </Button>
      )}
    </div>
  );
}
