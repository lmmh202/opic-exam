"use client";

import { useState, useEffect } from "react";
import { useExamStore } from "@/lib/store";
import { getAudio } from "@/lib/db";
import type { QuestionAnalysis, BatchAnalysisResult } from "@/app/api/analyze/route";
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
import { Loader2, RefreshCw } from "lucide-react";
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
  const [analyzedData, setAnalyzedData] = useState<Record<number, QuestionAnalysis>>({});
  const [overallGrade, setOverallGrade] = useState<string | null>(null);
  const [overallFeedback, setOverallFeedback] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

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
        content: acc.content + 80,
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
      { subject: "Content", A: 85, fullMark: 100 },
    ];
  };

  // Batch analyze all questions on page load
  const analyzeAllQuestions = async () => {
    if (answeredIds.length === 0) {
      toast.error("No answered questions found.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const formData = new FormData();

      // Gather all audio files from IndexedDB
      for (const questionId of answeredIds) {
        const blob = await getAudio(questionId);
        if (blob) {
          const questionText =
            examQuestions.find((q) => q.id === questionId)?.text || "";
          formData.append(`audio_${questionId}`, blob, `recording_${questionId}.webm`);
          formData.append(`questionText_${questionId}`, questionText);
        }
      }

      // Send all at once to batch API
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        const batchResult = result.data as BatchAnalysisResult;
        
        // Convert array to Record using question_id
        const questionAnalysis: Record<number, QuestionAnalysis> = {};
        for (const item of batchResult.questions) {
          questionAnalysis[Number(item.question_id)] = item;
        }
        
        setAnalyzedData(questionAnalysis);
        setOverallGrade(batchResult.overall_grade);
        setOverallFeedback(batchResult.overall_feedback);
        setAnalysisComplete(true);
        toast.success("All questions analyzed!");
      } else {
        toast.error(result.error || "Analysis failed");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error analyzing audio");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-analyze on page load
  useEffect(() => {
    if (answeredIds.length > 0 && !analysisComplete && !isAnalyzing) {
      analyzeAllQuestions();
    }
  }, [answeredIds.length]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Exam Results</h1>
            <p className="text-slate-500">
              {isAnalyzing 
                ? "Analyzing all responses with AI..." 
                : "Review your performance and AI feedback."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={analyzeAllQuestions}
              disabled={isAnalyzing || analysisComplete}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-analyze
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
            >
              Back to Home
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isAnalyzing && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-blue-900">
                    Analyzing {answeredIds.length} responses...
                  </p>
                  <p className="text-sm text-blue-700">
                    This may take a minute. Please wait.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isAnalyzing && (
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

                  {/* Overall Grade */}
                  <div className="mt-4 text-center">
                    <p className="text-sm text-slate-500 mb-1">Estimated Level</p>
                    <Badge className="text-2xl px-4 py-2 bg-blue-600 hover:bg-blue-700">
                      {overallGrade || "—"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Feedback Card */}
              {overallFeedback && (
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Feedback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {overallFeedback}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Question List & Analysis */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Question Analysis</CardTitle>
                  <CardDescription>
                    {analysisComplete
                      ? "Click on each question to see detailed feedback."
                      : "Analysis results will appear here."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <Accordion type="single" collapsible className="w-full">
                      {examQuestions.map((q) => {
                        const isAnswered = answeredIds.includes(q.id);
                        if (!isAnswered) return null;

                        const analysis = analyzedData[q.id];

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

                              {analysis ? (
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
                              ) : (
                                <div className="text-center py-4 text-slate-500">
                                  {isAnalyzing ? "Analyzing..." : "No analysis available"}
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
        )}
      </div>
    </div>
  );
}
