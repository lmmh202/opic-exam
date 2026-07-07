"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExamStore } from "@/lib/store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { saveAudio, deleteAudio } from "@/lib/db";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  EXAM_MODE_CONFIG,
  parseExamMode,
  type ExamMode,
} from "@/lib/exam-mode";

function ExamPageContent() {
  const router = useRouter();
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

  const { startRecording, stopRecording, visualizerData } = useAudioRecorder({
    onStop: async (blob) => {
      const currentQuestion = examQuestions[currentQuestionIndex];
      if (currentQuestion) {
        await saveAudio(mode, currentQuestion.id, blob);
        submitAnswer(currentQuestion.id);
      }
    },
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

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
      return;
    }

    const u = new SpeechSynthesisUtterance(currentQuestion.text);
    u.lang = "en-US";
    u.rate = 1.0;
    u.onend = () => setIsPlaying(false);
    speechRef.current = u;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [currentQuestionIndex, router, currentQuestion, config.resultsPath, mode]);

  const needsMinRecording = () => {
    if (!config.enforceMinRecording) return false;
    return currentQuestionIndex > 0 && recordingDuration < minRecordingDuration;
  };

  const togglePlayQuestion = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      if (replaysExhausted) return;

      if (speechRef.current) {
        window.speechSynthesis.speak(speechRef.current);
        setIsPlaying(true);
        setPlayCount((prev) => prev + 1);
      }
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
          `You must record for at least ${minRecordingDuration} seconds.`,
        );
        return;
      }
    }

    if (isStoreRecording) {
      stopRecording();
      setIsRecording(false);
    } else if (needsMinRecording() && !skipEnabled) {
      toast.error(
        `Please complete the recording. (Min ${minRecordingDuration} seconds)`,
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
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setPlayCount(0);
    setRecordingDuration(0);
    prevQuestion();
  };

  const handleToggleRecord = async () => {
    if (isStoreRecording) {
      if (needsMinRecording() && !skipEnabled) {
        toast.error(
          `You must record for at least ${minRecordingDuration} seconds.`,
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
    setRecordingDuration(0);
    toast.success("Recording cleared. You can record again.");
  };

  if (!currentQuestion || examMode !== mode) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-between p-4">
      <div className="w-full max-w-4xl flex justify-between items-center mb-4">
        <div className="text-xl font-bold text-slate-700">
          {config.label}
          {mode === "practice" && (
            <Badge variant="outline" className="ml-2 text-xs font-normal">
              Practice
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
                variant={isPlaying ? "outline" : "default"}
                className="rounded-full w-14 h-14"
                disabled={!isPlaying && replaysExhausted}
              >
                {isPlaying ? (
                  <Pause className="fill-current" />
                ) : (
                  <Play className="fill-current ml-1" />
                )}
              </Button>
              <span className="text-sm text-slate-500 text-center">
                {isPlaying
                  ? "Eva is speaking..."
                  : replaysExhausted
                    ? "No replays left"
                    : "Click to listen"}
                {Number.isFinite(maxReplays) && (
                  <span className="block text-xs text-slate-400 mt-1">
                    ({playCount}/{maxReplays} played)
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="text-center space-y-3">
            <Badge variant="outline" className="mb-2">
              {currentQuestion.topic}
            </Badge>
            {config.showQuestionText ? (
              <p className="text-lg text-slate-700 leading-relaxed max-w-2xl mx-auto">
                {currentQuestion.text}
              </p>
            ) : (
              <h2 className="text-2xl font-medium text-slate-800 transition-opacity duration-300">
                {isPlaying ? "Listening..." : "Your Turn"}
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
                  {isStoreRecording ? "Stop Recording" : "Start Recording"}
                </Button>

                {config.allowReRecord && hasRecording && !isStoreRecording && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-6 rounded-full"
                    onClick={handleReRecord}
                  >
                    <RotateCcw className="mr-2 w-5 h-5" />
                    Re-record
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
                    ` (Min ${minRecordingDuration}s)`}
                </span>
              )}

              {hasRecording && !isStoreRecording && (
                <span className="text-sm text-green-600 font-medium">
                  Answer recorded
                </span>
              )}
            </div>
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
            <ChevronLeft className="mr-2" /> Previous
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
          {isLastQuestion ? "Finish" : "Next"} <ChevronRight className="ml-2" />
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
