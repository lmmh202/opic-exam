"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

const MAX_LENGTH = 500;

export default function PronunciationPracticePage() {
  const [text, setText] = useState("");
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis({
    onError: (message) => toast.error(message),
  });

  const handleSpeak = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Please enter a sentence.");
      return;
    }

    if (isSpeaking) {
      stop();
      return;
    }

    speak(trimmed.replace(/\s+/g, " "));
  };

  const handleClear = () => {
    stop();
    setText("");
  };

  const handleChange = (value: string) => {
    if (value.length <= MAX_LENGTH) {
      setText(value);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="pb-2">
          <Link
            href="/practice"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 w-fit mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Practice Hub
          </Link>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Pronunciation Practice
          </CardTitle>
          <CardDescription className="text-slate-600">
            Enter an English sentence and listen to its pronunciation using
            your browser&apos;s text-to-speech.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="practice-sentence"
              className="text-sm font-medium text-slate-900"
            >
              Enter a sentence in English
            </label>
            <Textarea
              id="practice-sentence"
              value={text}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Type or paste your sentence here..."
              className="min-h-[120px] resize-none"
              maxLength={MAX_LENGTH}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSpeak();
                }
              }}
            />
            <p className="text-xs text-slate-500 text-right tabular-nums">
              {text.length} / {MAX_LENGTH} characters
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSpeak}
              disabled={!isSupported}
              className="flex-1 sm:flex-none"
            >
              {isSpeaking ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 mr-2" />
                  Speak
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={!text && !isSpeaking}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>

          {isSpeaking && (
            <p className="text-sm text-blue-600 text-center animate-pulse">
              Playing pronunciation...
            </p>
          )}

          {!isSupported && (
            <p className="text-sm text-red-600 text-center">
              Your browser doesn&apos;t support text-to-speech.
            </p>
          )}

          <p className="text-xs text-slate-400 text-center">
            Tip: Press Cmd/Ctrl + Enter to speak
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
