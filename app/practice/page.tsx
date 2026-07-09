"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Layers,
  Volume2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExamSetupPanel } from "@/components/exam-setup-panel";
import { useExamStore } from "@/lib/store";
import {
  countPracticeSets,
  generatePracticeExam,
  listPracticeQuestionSets,
  listPracticeTopics,
  type PracticeCategory,
  type PracticeTopic,
} from "@/lib/question-generator";
import { examPath } from "@/lib/exam-mode";
import {
  DIFFICULTIES,
  getDifficultyGuide,
  getDifficultyLabel,
  type DifficultyId,
  getTopicLabel,
} from "@/lib/opic-constants";
import { useTranslation } from "@/components/i18n-provider";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

const CATEGORY_LABEL_KEY: Record<PracticeCategory, TranslationKey> = {
  combo: "주제 세트",
  roleplay: "롤플레이",
  comparison: "비교",
};

function TopicMenuItem({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem onClick={onSelect} className="gap-2">
      <Check
        className={`size-4 shrink-0 ${selected ? "opacity-100" : "opacity-0"}`}
      />
      <span className="truncate">{label}</span>
    </DropdownMenuItem>
  );
}

function TopicGroup({
  label,
  topics: groupTopics,
  topicId,
  onSelect,
  locale,
}: {
  label: string;
  topics: PracticeTopic[];
  topicId: string;
  onSelect: (value: string) => void;
  locale: "ko" | "en";
}) {
  if (groupTopics.length === 0) return null;

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      {groupTopics.map((topic) => (
        <TopicMenuItem
          key={topic.id}
          label={getTopicLabel(topic.id, locale, topic.topic)}
          selected={topicId === topic.id}
          onSelect={() => onSelect(topic.id)}
        />
      ))}
    </DropdownMenuGroup>
  );
}

export default function PracticeHubPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { switchExamMode, setExamQuestions, resetExam } = useExamStore();
  const [category, setCategory] = useState<PracticeCategory>("combo");
  const [difficulty, setDifficulty] = useState<DifficultyId>("standard");
  const [topicId, setTopicId] = useState<string>("random");
  const [setId, setSetId] = useState<string>("random");

  const topics = listPracticeTopics(difficulty);
  const filteredTopics = topics.filter((item) => item.category === category);
  const matchingSetCount = countPracticeSets(category, difficulty);
  const surveyTopics = filteredTopics.filter((item) => !item.surprise);
  const surpriseTopics = filteredTopics.filter((item) => item.surprise);
  const selectedTopic = filteredTopics.find((item) => item.id === topicId);
  const questionSets =
    topicId !== "random"
      ? listPracticeQuestionSets(category, topicId, difficulty)
      : [];
  const selectedSet = questionSets.find((s) => s.id === setId);
  const noMatchingSets = matchingSetCount === 0;

  const topicLabel =
    topicId === "random"
      ? t("랜덤 주제")
      : selectedTopic
        ? getTopicLabel(selectedTopic.id, locale, selectedTopic.topic)
        : t("주제를 선택하세요");

  const difficultyHelper =
    difficulty === "challenging"
      ? t("도전 난이도는 기출형 다층 질문입니다.")
      : getDifficultyGuide("standard", locale);

  const handleCategoryChange = (value: PracticeCategory) => {
    setCategory(value);
    setTopicId("random");
    setSetId("random");
  };

  const handleDifficultyChange = (value: DifficultyId) => {
    setDifficulty(value);
    setTopicId("random");
    setSetId("random");
  };

  const handleTopicChange = (value: string) => {
    setTopicId(value);
    setSetId("random");
  };

  const handleStartSession = async () => {
    await switchExamMode("practice");
    const questions = generatePracticeExam({
      category,
      topicId: topicId === "random" ? "random" : topicId,
      setId: topicId === "random" ? undefined : setId,
      difficulty,
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
            {t("홈으로 돌아가기")}
          </Link>
          <Badge
            variant="outline"
            className="w-fit mb-2 border-emerald-200 text-emerald-700 bg-emerald-50"
          >
            {t("연습 모드")}
          </Badge>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            {t("연습 허브")}
          </CardTitle>
          <CardDescription className="text-slate-600">
            {t(
              "연습 활동을 선택하세요. 주제 세션은 문제 은행의 설문 기반 문항을 사용합니다.",
            )}
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
                {t("발음 연습")}
              </h3>
              <p className="text-sm text-slate-600">
                {t("문장을 입력하고 브라우저 TTS 발음을 들어보세요.")}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
          </Link>

          <div className="border-t border-slate-200 pt-8">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-900">{t("주제 세션")}</h3>
            </div>

            <ExamSetupPanel
              startLabel={
                <>
                  {t("연습 세션 시작")} <ArrowRight className="ml-2 w-5 h-5" />
                </>
              }
              onStart={handleStartSession}
              startDisabled={noMatchingSets}
              startDisabledReason={
                noMatchingSets
                  ? t("선택한 난이도에 맞는 문항 세트가 없습니다.")
                  : t("연습할 주제가 없습니다.")
              }
              showRecordingSettings={false}
            >
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="practice-difficulty">{t("난이도")}</Label>
                  <select
                    id="practice-difficulty"
                    value={difficulty}
                    onChange={(e) =>
                      handleDifficultyChange(e.target.value as DifficultyId)
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    {DIFFICULTIES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getDifficultyLabel(item.id, locale)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">{difficultyHelper}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="practice-category">{t("문제 유형")}</Label>
                  <select
                    id="practice-category"
                    value={category}
                    onChange={(e) =>
                      handleCategoryChange(e.target.value as PracticeCategory)
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    <option value="combo">{t("주제 세트 (3문항)")}</option>
                    <option value="roleplay">{t("롤플레이 (3문항)")}</option>
                    <option value="comparison">{t("비교 (2문항)")}</option>
                  </select>
                  {category === "combo" ? (
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 space-y-2.5">
                      <p className="text-xs font-medium text-slate-700">
                        {t("주제 세트는 3문항이 단계적으로 이어집니다.")}
                      </p>
                      <ol className="space-y-2 text-xs text-slate-600">
                        <li>
                          <span className="font-medium text-slate-800">
                            {t("1단계 · 현재 묘사 / 루틴")}
                          </span>
                          <span className="mt-0.5 block text-slate-500">
                            {t(
                              "장소·활동·평소 습관을 현재 시제로 설명합니다.",
                            )}
                          </span>
                        </li>
                        <li>
                          <span className="font-medium text-slate-800">
                            {t("2단계 · 과거 경험 / 변화")}
                          </span>
                          <span className="mt-0.5 block text-slate-500">
                            {t(
                              "처음·최근 경험이나, 예전과 달라진 점을 이야기합니다.",
                            )}
                          </span>
                        </li>
                        <li>
                          <span className="font-medium text-slate-800">
                            {t("3단계 · 기억에 남는 사건")}
                          </span>
                          <span className="mt-0.5 block text-slate-500">
                            {t(
                              "특별하거나 예상치 못한 일을 스토리로 풀어냅니다.",
                            )}
                          </span>
                        </li>
                      </ol>
                    </div>
                  ) : category === "roleplay" ? (
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 space-y-2.5">
                      <p className="text-xs font-medium text-slate-700">
                        {t("롤플레이는 3문항이 단계적으로 이어집니다.")}
                      </p>
                      <ol className="space-y-2 text-xs text-slate-600">
                        <li>
                          <span className="font-medium text-slate-800">
                            {t("1단계 · 상황 질문")}
                          </span>
                          <span className="mt-0.5 block text-slate-500">
                            {t(
                              "주어진 상황에서 필요한 정보 3~4가지를 질문합니다.",
                            )}
                          </span>
                        </li>
                        <li>
                          <span className="font-medium text-slate-800">
                            {t("2단계 · 문제와 대안")}
                          </span>
                          <span className="mt-0.5 block text-slate-500">
                            {t(
                              "문제가 생기면 상황을 설명하고 대안 2~3가지를 제시합니다.",
                            )}
                          </span>
                        </li>
                        <li>
                          <span className="font-medium text-slate-800">
                            {t("3단계 · 유사 경험")}
                          </span>
                          <span className="mt-0.5 block text-slate-500">
                            {t(
                              "앞에서와 비슷한 실제 경험을 과거 시제로 이야기합니다.",
                            )}
                          </span>
                        </li>
                      </ol>
                    </div>
                  ) : (
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 space-y-2.5">
                      <p className="text-xs font-medium text-slate-700">
                        {t("비교는 2문항이 단계적으로 이어집니다.")}
                      </p>
                      <ol className="space-y-2 text-xs text-slate-600">
                        <li>
                          <span className="font-medium text-slate-800">
                            {t("1단계 · 비교와 대조")}
                          </span>
                          <span className="mt-0.5 block text-slate-500">
                            {t(
                              "두 대상 또는 과거와 현재의 공통점·차이점을 말합니다.",
                            )}
                          </span>
                        </li>
                        <li>
                          <span className="font-medium text-slate-800">
                            {t("2단계 · 사회 이슈")}
                          </span>
                          <span className="mt-0.5 block text-slate-500">
                            {t(
                              "같은 주제의 최신 사회 문제나 트렌드에 대해 이야기합니다.",
                            )}
                          </span>
                        </li>
                      </ol>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label id="practice-topic-label">{t("주제")}</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal"
                        aria-labelledby="practice-topic-label"
                      >
                        <span className="truncate">{topicLabel}</span>
                        <ChevronDown className="size-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-(--radix-dropdown-menu-trigger-width) max-h-72"
                    >
                      <DropdownMenuGroup>
                        <TopicMenuItem
                          label={t("랜덤 주제")}
                          selected={topicId === "random"}
                          onSelect={() => handleTopicChange("random")}
                        />
                      </DropdownMenuGroup>
                      {surveyTopics.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <TopicGroup
                            label={t("Survey 주제")}
                            topics={surveyTopics}
                            topicId={topicId}
                            onSelect={handleTopicChange}
                            locale={locale}
                          />
                        </>
                      )}
                      {surpriseTopics.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <TopicGroup
                            label={t("돌발 주제")}
                            topics={surpriseTopics}
                            topicId={topicId}
                            onSelect={handleTopicChange}
                            locale={locale}
                          />
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {topicId !== "random" && (
                  <div className="space-y-2">
                    <Label htmlFor="practice-set">{t("문항 세트")}</Label>
                    <select
                      id="practice-set"
                      value={setId}
                      onChange={(e) => setSetId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    >
                      <option value="random">{t("랜덤 세트")}</option>
                      {questionSets.map((set) => (
                        <option key={set.id} value={set.id}>
                          {t("{name} ({count}문항)", {
                            name: set.label,
                            count: set.questionCount,
                          })}
                          {` · ${getDifficultyLabel(set.difficulty, locale)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  {t("카테고리")}: {t(CATEGORY_LABEL_KEY[category])}
                  {selectedSet
                    ? ` · ${t("{name} ({count}문항)", {
                        name: selectedSet.label,
                        count: selectedSet.questionCount,
                      })}`
                    : selectedTopic
                      ? ` · ${t("{count}개 문항", { count: selectedTopic.questionCount })}`
                      : topicId === "random"
                        ? ` · ${t("랜덤 선택")}`
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
