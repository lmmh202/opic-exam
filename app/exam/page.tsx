"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExamStore } from "@/lib/store";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { saveAudio, deleteAudio, getAudio } from "@/lib/db";
import type {
  BatchAnalysisResult,
  QuestionAnalysis,
} from "@/app/api/analyze/route";
import { PracticeAnswerPanel } from "@/components/practice-answer-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Mic,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  EXAM_MODE_CONFIG,
  parseExamMode,
  type ExamMode,
} from "@/lib/exam-mode";
import { useTranslation } from "@/components/i18n-provider";

function ExamPageContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const urlMode = parseExamMode(searchParams.get("mode"));

  const {
    examMode,
    currentQuestionIndex,
    nextQuestion,
    prevQuestion,
    submitAnswer,
    clearAnswer,
    timeLeft,
    decrementTime,
    isRecording: isStoreRecording,
    setIsRecording,
    skipEnabled,
    minRecordingDuration,
    examQuestions,
    answers,
  } = useExamStore();

  const mode: ExamMode = urlMode;
  const config = EXAM_MODE_CONFIG[mode];

  const [playCount, setPlayCount] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [questionFeedback, setQuestionFeedback] = useState<
    Record<number, QuestionAnalysis>
  >({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlayingAnswer, setIsPlayingAnswer] = useState(false);
  const answerAudioRef = useRef<HTMLAudioElement | null>(null);

  const { startRecording, stopRecording, visualizerData } = useAudioRecorder({
    onStop: async (blob) => {
      const currentQuestion = examQuestions[currentQuestionIndex];
      if (currentQuestion) {
        await saveAudio(mode, currentQuestion.id, blob);
        submitAnswer(currentQuestion.id);
        if (config.perQuestionFeedback) {
          setQuestionFeedback((prev) => {
            const next = { ...prev };
            delete next[currentQuestion.id];
            return next;
          });
        }
      }
    },
  });

  const { speak, stop, isSpeaking } = useSpeechSynthesis();

  const currentQuestion = examQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= examQuestions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;
  const hasRecording = !!currentAnswer?.submitted;

  const maxReplays =
    config.maxQuestionReplays === Infinity
      ? Number.POSITIVE_INFINITY
      : config.maxQuestionReplays;
  const replaysExhausted =
    Number.isFinite(maxReplays) && playCount >= maxReplays;

  const currentAnalysis = currentQuestion
    ? questionFeedback[currentQuestion.id]
    : undefined;

  const stopAnswerPlayback = useCallback(() => {
    answerAudioRef.current?.pause();
    answerAudioRef.current = null;
    setIsPlayingAnswer(false);
  }, []);

  useEffect(() => {
    if (examMode !== mode) {
      router.replace(config.setupPath);
    }
  }, [examMode, mode, router, config.setupPath]);

  useEffect(() => {
    if (examQuestions.length === 0) {
      router.replace(config.setupPath);
    }
  }, [examQuestions.length, router, config.setupPath]);

  useEffect(() => {
    if (config.totalTimeSeconds === null) return;

    const timer = setInterval(() => {
      decrementTime();
    }, 1000);
    return () => clearInterval(timer);
  }, [decrementTime, config.totalTimeSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStoreRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStoreRecording]);

  useEffect(() => {
    if (!currentQuestion) {
      router.push(`${config.resultsPath}?mode=${mode}`);
    }
  }, [currentQuestion, router, config.resultsPath, mode]);

  useEffect(() => {
    stop();
    stopAnswerPlayback();
  }, [currentQuestionIndex, stop, stopAnswerPlayback]);

  useEffect(() => {
    return () => {
      stopAnswerPlayback();
    };
  }, [stopAnswerPlayback]);

  const needsMinRecording = () => {
    if (!config.enforceMinRecording) return false;
    return currentQuestionIndex > 0 && recordingDuration < minRecordingDuration;
  };

  const togglePlayQuestion = () => {
    if (isSpeaking) {
      stop();
    } else {
      if (replaysExhausted || !currentQuestion) return;

      stopAnswerPlayback();
      speak(currentQuestion.text);
      setPlayCount((prev) => prev + 1);
    }
  };

  const handlePlayMyAnswer = async () => {
    if (!currentQuestion || !hasRecording) return;

    if (isPlayingAnswer) {
      stopAnswerPlayback();
      return;
    }

    stop();

    const blob = await getAudio(mode, currentQuestion.id);
    if (!blob) {
      toast.error("No recording found for this question.");
      return;
    }

    const audio = new Audio(URL.createObjectURL(blob));
    answerAudioRef.current = audio;
    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
      setIsPlayingAnswer(false);
      answerAudioRef.current = null;
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      toast.error("Failed to play your recording.");
      setIsPlayingAnswer(false);
      answerAudioRef.current = null;
    };

    try {
      await audio.play();
      setIsPlayingAnswer(true);
    } catch {
      URL.revokeObjectURL(audio.src);
      toast.error("Failed to play your recording.");
    }
  };

  const handleAnalyzeQuestion = async () => {
    if (!currentQuestion || !hasRecording || isAnalyzing) return;

    stopAnswerPlayback();
    setIsAnalyzing(true);

    try {
      const blob = await getAudio(mode, currentQuestion.id);
      if (!blob) {
        toast.error(t("이 문항에 대한 녹음을 찾을 수 없습니다."));
        return;
      }

      const formData = new FormData();
      formData.append(
        `audio_${currentQuestion.id}`,
        blob,
        `recording_${currentQuestion.id}.webm`,
      );
      formData.append(`questionText_${currentQuestion.id}`, currentQuestion.text);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (result.success && result.data) {
        const batchResult = result.data as BatchAnalysisResult;
        const analysis = batchResult.questions.find(
          (item) => Number(item.question_id) === currentQuestion.id,
        );

        if (analysis) {
          setQuestionFeedback((prev) => ({
            ...prev,
            [currentQuestion.id]: analysis,
          }));
          toast.success(t("피드백이 준비되었습니다!"));
        } else {
          toast.error(t("분석 결과를 찾을 수 없습니다."));
        }
      } else {
        toast.error(result.error || t("분석에 실패했습니다"));
      }
    } catch (error) {
      console.error(error);
      toast.error(t("답변 분석 중 오류가 발생했습니다"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const finishOrNext = () => {
    if (isLastQuestion) {
      router.push(`${config.resultsPath}?mode=${mode}`);
    } else {
      setPlayCount(0);
      setRecordingDuration(0);
      nextQuestion();
    }
  };

  const handleNext = async () => {
    if (needsMinRecording()) {
      if (!skipEnabled) {
        toast.error(
          t("최소 {seconds}초 이상 녹음해야 합니다.", {
            seconds: minRecordingDuration,
          }),
        );
        return;
      }
    }

    if (isStoreRecording) {
      stopRecording();
      setIsRecording(false);
    } else if (needsMinRecording() && !skipEnabled) {
      toast.error(
        t("녹음을 완료해 주세요. (최소 {seconds}초)", {
          seconds: minRecordingDuration,
        }),
      );
      return;
    }

    finishOrNext();
  };

  const handlePrev = () => {
    if (!config.allowBackNavigation || isFirstQuestion) return;

    if (isStoreRecording) {
      stopRecording();
      setIsRecording(false);
    }
    stop();
    setPlayCount(0);
    setRecordingDuration(0);
    prevQuestion();
  };

  const handleToggleRecord = async () => {
    if (isStoreRecording) {
      if (needsMinRecording() && !skipEnabled) {
        toast.error(
          t("최소 {seconds}초 이상 녹음해야 합니다.", {
            seconds: minRecordingDuration,
          }),
        );
        return;
      }
      stopRecording();
      setIsRecording(false);
    } else {
      await startRecording();
      setIsRecording(true);
    }
  };

  const handleReRecord = async () => {
    if (!config.allowReRecord || !currentQuestion) return;

    if (isStoreRecording) {
      stopRecording();
      setIsRecording(false);
    }

    await deleteAudio(mode, currentQuestion.id);
    clearAnswer(currentQuestion.id);
    setQuestionFeedback((prev) => {
      const next = { ...prev };
      delete next[currentQuestion.id];
      return next;
    });
    setRecordingDuration(0);
    toast.success(t("녹음이 삭제되었습니다. 다시 녹음할 수 있습니다."));
  };

  if (!currentQuestion || examMode !== mode) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-between p-4">
      <div className="w-full max-w-4xl flex justify-between items-center mb-4">
        <div className="text-xl font-bold text-slate-700">
          {t(mode === "practice" ? "연습" : "실전 모의고사")}
          {mode === "practice" && (
            <Badge variant="outline" className="ml-2 text-xs font-normal">
              {t("연습")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          {config.totalTimeSeconds !== null && (
            <Badge variant="secondary" className="text-base px-3 py-1">
              {Math.floor(timeLeft / 60)}:
              {(timeLeft % 60).toString().padStart(2, "0")}
            </Badge>
          )}
          <div className="text-sm font-medium text-slate-500">
            {currentQuestionIndex + 1} / {examQuestions.length}
          </div>
        </div>
      </div>

      <Card className="w-full max-w-4xl flex-1 flex flex-col shadow-lg mb-4">
        <CardContent className="flex-1 flex flex-col p-6 gap-8">
          <div className="flex flex-col items-center justify-center gap-4 py-8 bg-slate-50 rounded-xl border border-slate-200">
            <Avatar className="w-32 h-32 border-4 border-white shadow-md">
              <AvatarImage src="/eva-placeholder.png" alt="Eva" />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-3xl font-bold">
                EVA
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col items-center gap-2">
              <Button
                onClick={togglePlayQuestion}
                variant={isSpeaking ? "outline" : "default"}
                className="rounded-full w-14 h-14"
                disabled={!isSpeaking && replaysExhausted}
              >
                {isSpeaking ? (
                  <Pause className="fill-current" />
                ) : (
                  <Play className="fill-current ml-1" />
                )}
              </Button>
              <span className="text-sm text-slate-500 text-center">
                {isSpeaking
                  ? t("Eva가 말하고 있어요...")
                  : replaysExhausted
                    ? t("재생 횟수가 없습니다")
                    : t("눌러서 듣기")}
                {Number.isFinite(maxReplays) && (
                  <span className="block text-xs text-slate-400 mt-1">
                    {t("({count}/{max}회 재생)", {
                      count: playCount,
                      max: maxReplays,
                    })}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
              <Badge variant="outline">{currentQuestion.topic}</Badge>
              {currentQuestion.surprise && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="destructive"
                      className="cursor-help"
                      tabIndex={0}
                    >
                      {t("돌발")}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    {t(
                      "오픽 시험은 Survey에서 선택한 문항을 제외하고 돌발 문제가 추가로 출제된다",
                    )}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {config.showQuestionText ? (
              <p className="text-lg text-slate-700 leading-relaxed max-w-2xl mx-auto">
                {currentQuestion.text}
              </p>
            ) : (
              <h2 className="text-2xl font-medium text-slate-800 transition-opacity duration-300">
                {isSpeaking ? t("듣는 중...") : t("답변하세요")}
              </h2>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="h-24 flex items-end justify-center gap-1 w-full max-w-md">
              {visualizerData.map((val, i) => (
                <div
                  key={i}
                  className="w-2 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-sm transition-all duration-75"
                  style={{
                    height: isStoreRecording ? `${Math.max(5, val)}%` : "5%",
                    opacity: isStoreRecording ? 1 : 0.2,
                  }}
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="lg"
                  variant={isStoreRecording ? "destructive" : "default"}
                  className={`h-14 px-8 rounded-full text-lg shadow-xl transition-all ${isStoreRecording ? "animate-pulse" : ""}`}
                  onClick={handleToggleRecord}
                >
                  <Mic className="mr-2 w-6 h-6" />
                  {isStoreRecording ? t("녹음 중지") : t("녹음 시작")}
                </Button>

                {config.allowReRecord && hasRecording && !isStoreRecording && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-6 rounded-full"
                    onClick={handleReRecord}
                  >
                    <RotateCcw className="mr-2 w-5 h-5" />
                    {t("다시 녹음")}
                  </Button>
                )}
              </div>

              {isStoreRecording && config.enforceMinRecording && (
                <span
                  className={`text-sm font-medium ${needsMinRecording() && !skipEnabled ? "text-red-500" : "text-green-600"}`}
                >
                  {Math.floor(recordingDuration / 60)}:
                  {(recordingDuration % 60).toString().padStart(2, "0")}
                  {needsMinRecording() &&
                    !skipEnabled &&
                    ` ${t("(최소 {seconds}초)", { seconds: minRecordingDuration })}`}
                </span>
              )}

              {hasRecording && !isStoreRecording && (
                <span className="text-sm text-green-600 font-medium">
                  {t("답변이 녹음되었습니다")}
                </span>
              )}
            </div>

            {config.perQuestionFeedback && (
              <PracticeAnswerPanel
                hasRecording={hasRecording && !isStoreRecording}
                isPlayingAnswer={isPlayingAnswer}
                isAnalyzing={isAnalyzing}
                analysis={currentAnalysis ?? null}
                onPlayAnswer={handlePlayMyAnswer}
                onAnalyze={handleAnalyzeQuestion}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="w-full max-w-4xl flex justify-between">
        {config.allowBackNavigation ? (
          <Button
            onClick={handlePrev}
            disabled={isFirstQuestion}
            variant="outline"
            size="lg"
            className="text-lg px-8"
          >
            <ChevronLeft className="mr-2" /> {t("이전")}
          </Button>
        ) : (
          <div />
        )}

        <Button
          onClick={handleNext}
          disabled={
            config.enforceMinRecording &&
            !skipEnabled &&
            isStoreRecording &&
            needsMinRecording()
          }
          size="lg"
          className="text-lg px-8"
        >
          {isLastQuestion ? t("완료") : t("다음")}{" "}
          <ChevronRight className="ml-2" />
        </Button>
      </div>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={null}>
      <ExamPageContent />
    </Suspense>
  );
}
