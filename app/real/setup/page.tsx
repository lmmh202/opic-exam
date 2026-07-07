"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExamSetupPanel } from "@/components/exam-setup-panel";
import { useExamStore } from "@/lib/store";
import { generateExam } from "@/lib/question-generator";
import { examPath } from "@/lib/exam-mode";

export default function RealSetupPage() {
  const router = useRouter();
  const { switchExamMode, setExamQuestions, resetExam } = useExamStore();

  const handleStartExam = async () => {
    await switchExamMode("real");
    setExamQuestions(generateExam());
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
            Back to Home
          </Link>
          <Badge
            variant="outline"
            className="w-fit mx-auto mb-2 border-blue-200 text-blue-700 bg-blue-50"
          >
            Real Exam Mode
          </Badge>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Exam Setup
          </CardTitle>
          <CardDescription className="text-slate-600">
            Complete the microphone check and review settings before starting
            your 15-question exam.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ExamSetupPanel
            startLabel={
              <>
                Start Exam <ArrowRight className="ml-2 w-5 h-5" />
              </>
            }
            onStart={handleStartExam}
          />
        </CardContent>
      </Card>
    </div>
  );
}
