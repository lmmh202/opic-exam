"use client";

import { useState } from "react";
import { useExamStore } from "@/lib/store";
import { getAudio } from "@/lib/db";
import type { AnalysisResult } from "@/app/api/analyze/route";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

export default function ResultsPage() {
  const { answers, examQuestions } = useExamStore();
  const [analyzedData, setAnalyzedData] = useState<
    Record<number, AnalysisResult>
  >({});
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});

  // Convert answers to array
  const answeredIds = Object.keys(answers).map(Number);

  // Aggregate Scores for Chart
  const calculateAverageScores = () => {
    const results = Object.values(analyzedData);
    if (results.length === 0)
      return [
        { subject: "Fluency", A: 0, fullMark: 100 },
        { subject: "Grammar", A: 0, fullMark: 100 },
        { subject: "Vocabulary", A: 0, fullMark: 100 },
        { subject: "Content", A: 0, fullMark: 100 },
      ];

    const sum = results.reduce(
      (acc, curr) => ({
        fluency: acc.fluency + (curr.fluency_score || 0),
        grammar: acc.grammar + (curr.grammar_score || 0),
        vocabs: acc.vocabs + (curr.vocabulary_score || 0),
        content: acc.content + 80, // Mock content score if missing from some prompts
      }),
      { fluency: 0, grammar: 0, vocabs: 0, content: 0 },
    );

    const count = results.length;
    return [
      { subject: "Fluency", A: Math.round(sum.fluency / count), fullMark: 100 },
      { subject: "Grammar", A: Math.round(sum.grammar / count), fullMark: 100 },
      {
        subject: "Vocabulary",
        A: Math.round(sum.vocabs / count),
        fullMark: 100,
      },
      { subject: "Content", A: 85, fullMark: 100 }, // Static mock for now
    ];
  };

  const handleAnalyze = async (questionId: number) => {
    setLoadingMap((prev) => ({ ...prev, [questionId]: true }));
    try {
      const blob = await getAudio(questionId);
      if (!blob) {
        toast.error("Audio recording not found.");
        setLoadingMap((prev) => ({ ...prev, [questionId]: false }));
        return;
      }

      const questionText =
        examQuestions.find((q) => q.id === questionId)?.text || "";

      // Use FormData with API Route instead of Server Action
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("questionText", questionText);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        setAnalyzedData((prev) => ({ ...prev, [questionId]: result.data }));
        toast.success("Analysis Complete!");
      } else {
        toast.error(result.error || "Analysis failed");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error analyzing audio");
    } finally {
      setLoadingMap((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Exam Results</h1>
            <p className="text-slate-500">
              Review your performance and get AI feedback.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
            >
              Back to Home
            </Button>
            {/* Download/Share buttons placeholder */}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Summary & Chart */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      data={calculateAverageScores()}
                    >
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="My Score"
                        dataKey="A"
                        stroke="#2563eb"
                        fill="#3b82f6"
                        fillOpacity={0.6}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Overall Grade Estimate (Mock logic based on average) */}
                <div className="mt-4 text-center">
                  <p className="text-sm text-slate-500 mb-1">Estimated Level</p>
                  <Badge className="text-2xl px-4 py-2 bg-blue-600 hover:bg-blue-700">
                    IH
                  </Badge>
                  {/* Dynamic logic would go here */}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Question List & Analysis */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Question Analysis</CardTitle>
                <CardDescription>
                  Click &apos;Analyze&apos; on any question to get detailed
                  feedback.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <Accordion type="single" collapsible className="w-full">
                    {examQuestions.map((q) => {
                      const isAnswered = answeredIds.includes(q.id);
                      if (!isAnswered) return null; // Skip skipped questions if any

                      const analysis = analyzedData[q.id];
                      const isLoading = loadingMap[q.id];

                      return (
                        <AccordionItem key={q.id} value={`item-${q.id}`}>
                          <AccordionTrigger>
                            <span className="text-left font-medium line-clamp-1 flex-1 mr-4">
                              {q.id}. {q.topic}
                            </span>
                            {analysis && (
                              <Badge variant="outline" className="mr-2">
                                {analysis.grade}
                              </Badge>
                            )}
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 pt-2">
                            <p className="text-sm text-slate-600 italic">
                              &quot;{q.text}&quot;
                            </p>

                            {!analysis ? (
                              <Button
                                onClick={() => handleAnalyze(q.id)}
                                disabled={isLoading}
                                className="w-full"
                              >
                                {isLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                    Analyzing...
                                  </>
                                ) : (
                                  "Analyze Audio"
                                )}
                              </Button>
                            ) : (
                              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                  <div className="bg-slate-100 p-2 rounded">
                                    <div className="font-semibold text-slate-700">
                                      Fluency
                                    </div>
                                    <div>{analysis.fluency_score}</div>
                                  </div>
                                  <div className="bg-slate-100 p-2 rounded">
                                    <div className="font-semibold text-slate-700">
                                      Grammar
                                    </div>
                                    <div>{analysis.grammar_score}</div>
                                  </div>
                                  <div className="bg-slate-100 p-2 rounded">
                                    <div className="font-semibold text-slate-700">
                                      Vocab
                                    </div>
                                    <div>{analysis.vocabulary_score}</div>
                                  </div>
                                </div>

                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                  <h4 className="font-semibold text-blue-900 mb-2">
                                    Feedback
                                  </h4>
                                  <p className="text-sm text-blue-800 whitespace-pre-wrap">
                                    {analysis.feedback}
                                  </p>
                                </div>

                                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                  <h4 className="font-semibold text-green-900 mb-2">
                                    Corrected Script
                                  </h4>
                                  <p className="text-sm text-green-800">
                                    {analysis.corrected_script}
                                  </p>
                                </div>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
