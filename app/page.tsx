"use client";

import { useRouter } from "next/navigation";
import { Target, BookOpen, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  const router = useRouter();

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
            Choose a mode to get started
          </CardDescription>
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
              <h3 className="font-semibold text-lg text-slate-900">
                Real Exam
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Full 15-question OPIc simulation with 40-minute timer and
                strict exam rules.
              </p>
            </div>
            <span className="inline-flex items-center text-sm font-medium text-blue-600">
              Start setup <ArrowRight className="w-4 h-4 ml-1" />
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
              <h3 className="font-semibold text-lg text-slate-900">Practice</h3>
              <p className="text-sm text-slate-600 mt-1">
                Topic-based sessions, pronunciation drills, and relaxed rules
                with instant feedback.
              </p>
            </div>
            <span className="inline-flex items-center text-sm font-medium text-emerald-600">
              Open practice hub <ArrowRight className="w-4 h-4 ml-1" />
            </span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
