"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, ArrowRight, CheckCircle2 } from "lucide-react";
import { useExamStore } from "@/lib/store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export default function Home() {
  const router = useRouter();
  const resetExam = useExamStore((state) => state.resetExam);
  const { startRecording, stopRecording, isRecording, visualizerData } =
    useAudioRecorder();
  const [micStatus, setMicStatus] = useState<"idle" | "testing" | "success">(
    "idle",
  );

  const handleStartExam = () => {
    resetExam();
    router.push("/exam");
  };

  const handleMicTest = async () => {
    if (isRecording) {
      stopRecording();
      setMicStatus("success");
    } else {
      setMicStatus("testing");
      await startRecording();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center pb-2">
          <Badge
            variant="outline"
            className="w-fit mx-auto mb-2 border-blue-200 text-blue-700 bg-blue-50"
          >
            AI OPIc Simulator
          </Badge>
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome to Opic Exam
          </CardTitle>
          <CardDescription className="text-lg text-slate-600 mt-2">
            Real-time, serverless OPIc simulation powered by Gemini AI
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Survey Info */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Applied Survey Settings (Hardcoded)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
              <div className="space-y-1">
                <span className="font-medium text-slate-900 block">
                  Housing
                </span>
                Alone in Apartment
              </div>
              <div className="space-y-1">
                <span className="font-medium text-slate-900 block">
                  Hobbies
                </span>
                Music, Movies, Parks
              </div>
              <div className="space-y-1">
                <span className="font-medium text-slate-900 block">Sports</span>
                Jogging, Walking, Cycling
              </div>
              <div className="space-y-1">
                <span className="font-medium text-slate-900 block">Travel</span>
                Domestic/Overseas, Staycation
              </div>
            </div>
          </div>

          {/* Mic Test Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-slate-900">Microphone Check</h3>
              {micStatus === "success" && (
                <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Ready to go
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 bg-slate-100 p-4 rounded-xl">
              <Button
                variant={isRecording ? "destructive" : "secondary"}
                size="icon"
                className="h-12 w-12 rounded-full shrink-0 transition-all shadow-sm"
                onClick={handleMicTest}
              >
                {isRecording ? (
                  <div className="w-4 h-4 bg-white rounded-sm" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>

              <div className="flex-1 h-12 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-end justify-center gap-[2px] pb-2 px-4 shadow-inner">
                {visualizerData.map((value, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-blue-500 rounded-t-sm transition-all duration-75"
                    style={{
                      height: `${Math.max(10, value / 2.5)}%`,
                      opacity: isRecording ? 1 : 0.3,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <Button
            className="w-full text-lg h-14 font-semibold shadow-lg shadow-blue-500/20"
            onClick={handleStartExam}
            disabled={micStatus === "idle" && false} // Optional: enforce mic test
          >
            Start Exam <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
