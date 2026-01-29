"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useExamStore } from "@/lib/store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { saveAudio } from "@/lib/db";
import questionsData from "@/public/questions.json";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, ChevronRight, Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export default function ExamPage() {
  const router = useRouter();
  const {
    currentQuestionIndex,
    nextQuestion,
    submitAnswer,
    timeLeft,
    decrementTime,
    isRecording: isStoreRecording,
    setIsRecording,
  } = useExamStore();

  const { startRecording, stopRecording, visualizerData } = useAudioRecorder({
    onStop: async (blob) => {
      await saveAudio(questionsData[currentQuestionIndex].id, blob);
      submitAnswer(questionsData[currentQuestionIndex].id);
    },
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentQuestion = questionsData[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= questionsData.length - 1;

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      decrementTime();
    }, 1000);
    return () => clearInterval(timer);
  }, [decrementTime]);

  // Recording Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStoreRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStoreRecording]);

  // Handle Question Change
  useEffect(() => {
    if (!currentQuestion) {
      // Exam finished?
      router.push("/results");
      return;
    }

    const u = new SpeechSynthesisUtterance(currentQuestion.text);
    u.lang = "en-US";
    u.rate = 1.0;
    u.onend = () => {
      setIsPlaying(false);
    };
    speechRef.current = u;

    // Cleanup recording if moving fast
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [currentQuestionIndex, router, currentQuestion]);

  const togglePlayQuestion = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      if (playCount >= 2) return; // Prevent playing if limit reached

      if (speechRef.current) {
        window.speechSynthesis.speak(speechRef.current);
        setIsPlaying(true);
        setPlayCount((prev) => prev + 1);
      }
    }
  };

  const handleNext = async () => {
    if (isStoreRecording) {
      if (currentQuestionIndex > 0 && recordingDuration < 60) {
        toast.error("You must record for at least 1 minute.");
        return;
      }
      stopRecording();
      setIsRecording(false);
    } else {
      if (currentQuestionIndex > 0 && recordingDuration < 60) {
        toast.error("Please complete the recording. (Min 1 minute)");
        return;
      }
    }

    if (isLastQuestion) {
      router.push("/results");
    } else {
      setPlayCount(0); // Reset for next question
      setRecordingDuration(0);
      nextQuestion();
    }
  };

  const handleToggleRecord = async () => {
    if (isStoreRecording) {
      // Trying to stop
      if (currentQuestionIndex > 0 && recordingDuration < 60) {
        toast.error("You must record for at least 1 minute.");
        return;
      }
      stopRecording();
      setIsRecording(false);
    } else {
      // Start
      await startRecording();
      setIsRecording(true);
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-between p-4">
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4">
        <div className="text-xl font-bold text-slate-700">OPIc Exam</div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-base px-3 py-1">
            {Math.floor(timeLeft / 60)}:
            {(timeLeft % 60).toString().padStart(2, "0")}
          </Badge>
          <div className="text-sm font-medium text-slate-500">
            {currentQuestionIndex + 1} / {questionsData.length}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Card className="w-full max-w-4xl flex-1 flex flex-col shadow-lg mb-4">
        <CardContent className="flex-1 flex flex-col p-6 gap-8">
          {/* Eva / Audio Player */}
          <div className="flex flex-col items-center justify-center gap-4 py-8 bg-slate-50 rounded-xl border border-slate-200">
            <Avatar className="w-32 h-32 border-4 border-white shadow-md">
              <AvatarImage src="/eva-placeholder.png" alt="Eva" />
              {/* Fallback to initials if no image */}
              <AvatarFallback className="bg-blue-100 text-blue-600 text-3xl font-bold">
                EVA
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col items-center gap-2">
              <Button
                onClick={togglePlayQuestion}
                variant={isPlaying ? "outline" : "default"}
                className="rounded-full w-14 h-14"
                disabled={!isPlaying && playCount >= 2}
              >
                {isPlaying ? (
                  <Pause className="fill-current" />
                ) : (
                  <Play className="fill-current ml-1" />
                )}
              </Button>
              <span className="text-sm text-slate-500">
                {isPlaying
                  ? "Eva is speaking..."
                  : playCount >= 2
                    ? "No replays left"
                    : "Click to listen"}
                <span className="block text-xs text-slate-400 mt-1">
                  ({playCount}/2 played)
                </span>
              </span>
            </div>
          </div>

          {/* Question Text (Hidden in real OPIc, usually shown in Simulator for practice?) 
              Real OPIc does NOT show text. 
              Let's show it or hide it? 
              Simulator usually shows it for practice mode. 
              Let's hide it by default or show it since we don't have real audio.
              "Real OPIc color and layout mimic" -> Real layout doesn't show text.
              But using TTS without text might be hard if TTS is robotic.
              I will show the topic at least.
           */}
          <div className="text-center">
            <Badge variant="outline" className="mb-2">
              {currentQuestion.topic}
            </Badge>
            <h2 className="text-2xl font-medium text-slate-800 transition-opacity duration-300">
              {/* Visual cue for question play */}
              {isPlaying ? "Listening..." : "Your Turn"}
            </h2>
          </div>

          {/* Recording Area */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            {/* Visualizer */}
            <div className="h-24 flex items-end justify-center gap-1 w-full max-w-md">
              {visualizerData.map((val, i) => (
                <div
                  key={i}
                  className={`w-2 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-sm transition-all duration-75`}
                  style={{
                    height: isStoreRecording ? `${Math.max(5, val)}%` : "5%",
                    opacity: isStoreRecording ? 1 : 0.2,
                  }}
                />
              ))}
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-2">
                <Button
                  size="lg"
                  variant={isStoreRecording ? "destructive" : "default"}
                  className={`h-16 px-8 rounded-full text-lg shadow-xl transition-all ${isStoreRecording ? "animate-pulse" : ""}`}
                  onClick={handleToggleRecord}
                >
                  <Mic className="mr-2 w-6 h-6" />
                  {isStoreRecording ? "Stop Recording" : "Start Recording"}
                </Button>
                {isStoreRecording && (
                  <span
                    className={`text-sm font-medium ${recordingDuration < 60 && currentQuestionIndex > 0 ? "text-red-500" : "text-green-600"}`}
                  >
                    {Math.floor(recordingDuration / 60)}:
                    {(recordingDuration % 60).toString().padStart(2, "0")}
                    {currentQuestionIndex > 0 &&
                      recordingDuration < 60 &&
                      " (Min 1:00)"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="w-full max-w-4xl flex justify-end">
        <Button
          onClick={handleNext}
          disabled={
            isStoreRecording &&
            currentQuestionIndex > 0 &&
            recordingDuration < 60
          }
          size="lg"
          className="text-lg px-8"
        >
          Next <ChevronRight className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
