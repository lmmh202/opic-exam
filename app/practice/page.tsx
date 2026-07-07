"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Volume2, Layers } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ExamSetupPanel } from "@/components/exam-setup-panel";
import { useExamStore } from "@/lib/store";
import {
  generatePracticeExam,
  getPracticeCategoryLabel,
  listPracticeTopics,
  type PracticeCategory,
} from "@/lib/question-generator";
import { examPath } from "@/lib/exam-mode";

const topics = listPracticeTopics();

export default function PracticeHubPage() {
  const router = useRouter();
  const { switchExamMode, setExamQuestions, resetExam } = useExamStore();
  const [category, setCategory] = useState<PracticeCategory>("combo");
  const [topicId, setTopicId] = useState<string>("random");

  const filteredTopics = topics.filter((t) => t.category === category);
  const selectedTopic = filteredTopics.find((t) => t.id === topicId);

  const handleCategoryChange = (value: PracticeCategory) => {
    setCategory(value);
    setTopicId("random");
  };

  const handleStartSession = async () => {
    await switchExamMode("practice");
    const questions = generatePracticeExam({
      category,
      topicId: topicId === "random" ? "random" : topicId,
    });
    setExamQuestions(questions);
    resetExam();
    router.push(examPath("practice"));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="pb-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 w-fit mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <Badge
            variant="outline"
            className="w-fit mb-2 border-emerald-200 text-emerald-700 bg-emerald-50"
          >
            Practice Mode
          </Badge>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Practice Hub
          </CardTitle>
          <CardDescription className="text-slate-600">
            Choose a practice activity. Topic sessions use survey-based
            questions from the question bank.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          <Link
            href="/practice/pronunciation"
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900">
                Pronunciation Practice
              </h3>
              <p className="text-sm text-slate-600">
                Type a sentence and listen to browser TTS pronunciation.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
          </Link>

          <div className="border-t border-slate-200 pt-8">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-900">Topic Session</h3>
            </div>

            <ExamSetupPanel
              startLabel={
                <>
                  Start Practice Session{" "}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              }
              onStart={handleStartSession}
              startDisabled={filteredTopics.length === 0}
            >
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="practice-category">Question Type</Label>
                  <select
                    id="practice-category"
                    value={category}
                    onChange={(e) =>
                      handleCategoryChange(e.target.value as PracticeCategory)
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    <option value="combo">Topic Set (3 questions)</option>
                    <option value="roleplay">Roleplay (3 questions)</option>
                    <option value="comparison">Comparison (2 questions)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="practice-topic">Topic</Label>
                  <select
                    id="practice-topic"
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    <option value="random">Random topic</option>
                    {filteredTopics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.topic} ({topic.questionCount} Q)
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-xs text-slate-500">
                  Category: {getPracticeCategoryLabel(category)}
                  {selectedTopic
                    ? ` · ${selectedTopic.questionCount} questions`
                    : topicId === "random"
                      ? " · Random selection"
                      : ""}
                </p>
              </div>
            </ExamSetupPanel>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
