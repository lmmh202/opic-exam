"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Layers, ListTree, Volume2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  countPracticeQuestionsByType,
  countPracticeSets,
  generatePracticeExam,
  generateTypePracticeExam,
  listPracticeQuestionSets,
  listPracticeStages,
  listPracticeTopics,
  listPracticeTypesForStage,
  type PracticeCategory,
  type PracticeStageNumber,
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

type PracticeTrack = "topic" | "type";

const CATEGORY_LABEL_KEY: Record<PracticeCategory, TranslationKey> = {
  combo: "주제 세트",
  roleplay: "롤플레이",
  comparison: "비교",
};

const CATEGORY_OPTION_KEY: Record<PracticeCategory, TranslationKey> = {
  combo: "주제 세트 (3문항)",
  roleplay: "롤플레이 (3문항)",
  comparison: "비교 (2문항)",
};

const PRACTICE_CATEGORIES: PracticeCategory[] = ["combo", "roleplay", "comparison"];
const TYPE_COUNTS = [3, 5] as const;

const STAGE_LABEL_KEY: Record<PracticeCategory, Partial<Record<PracticeStageNumber, TranslationKey>>> = {
  combo: {
    1: "현재·루틴 설명",
    2: "과거 경험·변화",
    3: "특별·문제 경험",
  },
  roleplay: {
    1: "상황 질문",
    2: "문제 해결",
    3: "유사 경험",
  },
  comparison: {
    1: "비교·대조",
    2: "이슈 토론",
  },
};

function SelectMenuItem({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <DropdownMenuItem onClick={onSelect} className="gap-2">
      <Check className={`size-4 shrink-0 ${selected ? "opacity-100" : "opacity-0"}`} />
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
        <SelectMenuItem
          key={topic.id}
          label={getTopicLabel(topic.id, locale, topic.topic)}
          selected={topicId === topic.id}
          onSelect={() => onSelect(topic.id)}
        />
      ))}
    </DropdownMenuGroup>
  );
}

function CategoryStageExplainer({ category, t }: { category: PracticeCategory; t: (key: TranslationKey) => string }) {
  if (category === "combo") {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 space-y-2.5">
        <p className="text-xs font-medium text-slate-700">{t("주제 세트는 3문항이 단계적으로 이어집니다.")}</p>
        <ol className="space-y-2 text-xs text-slate-600">
          <li>
            <span className="font-medium text-slate-800">{t("1단계 · 현재 묘사 / 루틴")}</span>
            <span className="mt-0.5 block text-slate-500">
              {t("장소·활동·평소 습관을 현재 시제로 설명합니다.")}
            </span>
          </li>
          <li>
            <span className="font-medium text-slate-800">{t("2단계 · 과거 경험 / 변화")}</span>
            <span className="mt-0.5 block text-slate-500">
              {t("처음·최근 경험이나, 예전과 달라진 점을 이야기합니다.")}
            </span>
          </li>
          <li>
            <span className="font-medium text-slate-800">{t("3단계 · 기억에 남는 사건")}</span>
            <span className="mt-0.5 block text-slate-500">
              {t("특별하거나 예상치 못한 일을 스토리로 풀어냅니다.")}
            </span>
          </li>
        </ol>
      </div>
    );
  }

  if (category === "roleplay") {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 space-y-2.5">
        <p className="text-xs font-medium text-slate-700">{t("롤플레이는 3문항이 단계적으로 이어집니다.")}</p>
        <ol className="space-y-2 text-xs text-slate-600">
          <li>
            <span className="font-medium text-slate-800">{t("1단계 · 상황 질문")}</span>
            <span className="mt-0.5 block text-slate-500">
              {t("주어진 상황에서 필요한 정보 3~4가지를 질문합니다.")}
            </span>
          </li>
          <li>
            <span className="font-medium text-slate-800">{t("2단계 · 문제와 대안")}</span>
            <span className="mt-0.5 block text-slate-500">
              {t("문제가 생기면 상황을 설명하고 대안 2~3가지를 제시합니다.")}
            </span>
          </li>
          <li>
            <span className="font-medium text-slate-800">{t("3단계 · 유사 경험")}</span>
            <span className="mt-0.5 block text-slate-500">
              {t("앞에서와 비슷한 실제 경험을 과거 시제로 이야기합니다.")}
            </span>
          </li>
        </ol>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 space-y-2.5">
      <p className="text-xs font-medium text-slate-700">{t("비교는 2문항이 단계적으로 이어집니다.")}</p>
      <ol className="space-y-2 text-xs text-slate-600">
        <li>
          <span className="font-medium text-slate-800">{t("1단계 · 비교와 대조")}</span>
          <span className="mt-0.5 block text-slate-500">
            {t("두 대상 또는 과거와 현재의 공통점·차이점을 말합니다.")}
          </span>
        </li>
        <li>
          <span className="font-medium text-slate-800">{t("2단계 · 사회 이슈")}</span>
          <span className="mt-0.5 block text-slate-500">
            {t("같은 주제의 최신 사회 문제나 트렌드에 대해 이야기합니다.")}
          </span>
        </li>
      </ol>
    </div>
  );
}

export default function PracticeHubPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { switchExamMode, setExamQuestions, setPracticeSession, resetExam } = useExamStore();
  const [track, setTrack] = useState<PracticeTrack>("topic");
  const [category, setCategory] = useState<PracticeCategory>("combo");
  const [difficulty, setDifficulty] = useState<DifficultyId>("standard");
  const [topicId, setTopicId] = useState<string>("random");
  const [setId, setSetId] = useState<string>("random");
  const [stage, setStage] = useState<PracticeStageNumber>(1);
  const [typeId, setTypeId] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState<(typeof TYPE_COUNTS)[number]>(3);

  const topics = listPracticeTopics(difficulty);
  const filteredTopics = topics.filter((item) => item.category === category);
  const matchingSetCount = countPracticeSets(category, difficulty);
  const surveyTopics = filteredTopics.filter((item) => !item.surprise);
  const surpriseTopics = filteredTopics.filter((item) => item.surprise);
  const selectedTopic = filteredTopics.find((item) => item.id === topicId);
  const questionSets = topicId !== "random" ? listPracticeQuestionSets(category, topicId, difficulty, locale) : [];
  const selectedSet = questionSets.find((s) => s.id === setId);
  const noMatchingSets = matchingSetCount === 0;

  const stages = useMemo(() => listPracticeStages(category), [category]);
  const typeOptions = useMemo(
    () => listPracticeTypesForStage(category, stage, difficulty, locale),
    [category, stage, difficulty, locale],
  );
  const availableTypeCount = useMemo(
    () => countPracticeQuestionsByType({ category, stage, typeId, difficulty }),
    [category, stage, typeId, difficulty],
  );
  const noMatchingTypeQuestions = availableTypeCount === 0;

  const topicLabel =
    topicId === "random"
      ? t("랜덤 주제")
      : selectedTopic
        ? getTopicLabel(selectedTopic.id, locale, selectedTopic.topic)
        : t("주제를 선택하세요");

  const setLabel =
    setId === "random"
      ? t("랜덤 세트")
      : selectedSet
        ? t("{name} ({count}문항)", {
            name: selectedSet.label,
            count: selectedSet.questionCount,
          })
        : t("랜덤 세트");

  const stageLabelKey = STAGE_LABEL_KEY[category][stage];
  const stageLabel = stageLabelKey ? t(stageLabelKey) : `${t("단계")} ${stage}`;
  const typeLabel =
    typeId === "all"
      ? t("해당 단계 전체")
      : (typeOptions.find((option) => option.id === typeId)?.label ?? typeId);

  const difficultyHelper =
    difficulty === "challenging" ? t("도전 난이도는 기출형 다층 질문입니다.") : getDifficultyGuide("standard", locale);

  const handleTrackChange = (value: PracticeTrack) => {
    setTrack(value);
  };

  const handleCategoryChange = (value: PracticeCategory) => {
    setCategory(value);
    setTopicId("random");
    setSetId("random");
    setStage(1);
    setTypeId("all");
  };

  const handleDifficultyChange = (value: DifficultyId) => {
    setDifficulty(value);
    setTopicId("random");
    setSetId("random");
    setTypeId("all");
  };

  const handleTopicChange = (value: string) => {
    setTopicId(value);
    setSetId("random");
  };

  const handleStageChange = (value: PracticeStageNumber) => {
    setStage(value);
    setTypeId("all");
  };

  const handleStartTopicSession = async () => {
    await switchExamMode("practice");
    const questions = generatePracticeExam({
      category,
      topicId: topicId === "random" ? "random" : topicId,
      setId: topicId === "random" ? undefined : setId,
      difficulty,
    });
    setPracticeSession({ kind: "topic" });
    setExamQuestions(questions);
    resetExam();
    router.push(examPath("practice"));
  };

  const handleStartTypeSession = async () => {
    await switchExamMode("practice");
    const count = Math.min(questionCount, availableTypeCount);
    const questions = generateTypePracticeExam({
      category,
      stage,
      typeId,
      difficulty,
      count,
    });
    setPracticeSession({ kind: "type" });
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
          <Badge variant="outline" className="w-fit mb-2 border-emerald-200 text-emerald-700 bg-emerald-50">
            {t("연습 모드")}
          </Badge>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">{t("연습 허브")}</CardTitle>
          <CardDescription className="text-slate-600">
            {t("연습 활동을 선택하세요. 주제 세션은 문제 은행의 설문 기반 문항을 사용합니다.")}
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
              <h3 className="font-semibold text-slate-900">{t("발음 연습")}</h3>
              <p className="text-sm text-slate-600">{t("문장을 입력하고 브라우저 TTS 발음을 들어보세요.")}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
          </Link>

          <div className="border-t border-slate-200 pt-8 space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100">
              <button
                type="button"
                onClick={() => handleTrackChange("topic")}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  track === "topic"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-4 h-4" />
                {t("주제별 연습")}
              </button>
              <button
                type="button"
                onClick={() => handleTrackChange("type")}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  track === "type"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ListTree className="w-4 h-4" />
                {t("유형별 학습")}
              </button>
            </div>

            <p className="text-sm text-slate-600">
              {track === "topic"
                ? t("한 주제의 문항 세트를 단계 순서대로 연습합니다")
                : t("같은 답변 유형을 여러 주제로 반복 연습합니다")}
            </p>

            {track === "topic" ? (
              <ExamSetupPanel
                startLabel={
                  <>
                    {t("연습 세션 시작")} <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                }
                onStart={handleStartTopicSession}
                startDisabled={noMatchingSets}
                startDisabledReason={
                  noMatchingSets ? t("선택한 난이도에 맞는 문항 세트가 없습니다.") : t("연습할 주제가 없습니다.")
                }
                showRecordingSettings={false}
              >
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                  <div className="space-y-2">
                    <Label id="practice-difficulty-label">{t("난이도")}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal"
                          aria-labelledby="practice-difficulty-label"
                        >
                          <span className="truncate">{getDifficultyLabel(difficulty, locale)}</span>
                          <ChevronDown className="size-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
                        {DIFFICULTIES.map((item) => (
                          <SelectMenuItem
                            key={item.id}
                            label={getDifficultyLabel(item.id, locale)}
                            selected={difficulty === item.id}
                            onSelect={() => handleDifficultyChange(item.id)}
                          />
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <p className="text-xs text-slate-500">{difficultyHelper}</p>
                  </div>

                  <div className="space-y-2">
                    <Label id="practice-category-label">{t("문제 유형")}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal"
                          aria-labelledby="practice-category-label"
                        >
                          <span className="truncate">{t(CATEGORY_OPTION_KEY[category])}</span>
                          <ChevronDown className="size-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
                        {PRACTICE_CATEGORIES.map((item) => (
                          <SelectMenuItem
                            key={item}
                            label={t(CATEGORY_OPTION_KEY[item])}
                            selected={category === item}
                            onSelect={() => handleCategoryChange(item)}
                          />
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <CategoryStageExplainer category={category} t={t} />
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
                      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width) max-h-72">
                        <DropdownMenuGroup>
                          <SelectMenuItem
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
                      <Label id="practice-set-label">{t("문항 세트")}</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between font-normal"
                            aria-labelledby="practice-set-label"
                          >
                            <span className="truncate">{setLabel}</span>
                            <ChevronDown className="size-4 shrink-0 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width) max-h-72">
                          <SelectMenuItem
                            label={t("랜덤 세트")}
                            selected={setId === "random"}
                            onSelect={() => setSetId("random")}
                          />
                          {questionSets.map((set) => (
                            <SelectMenuItem
                              key={set.id}
                              label={t("{name} ({count}문항)", {
                                name: set.label,
                                count: set.questionCount,
                              })}
                              selected={setId === set.id}
                              onSelect={() => setSetId(set.id)}
                            />
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            ) : (
              <ExamSetupPanel
                startLabel={
                  <>
                    {t("연습 세션 시작")} <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                }
                onStart={handleStartTypeSession}
                startDisabled={noMatchingTypeQuestions}
                startDisabledReason={t("선택한 조건에 맞는 문항이 없습니다.")}
                showRecordingSettings={false}
              >
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                  <div className="space-y-2">
                    <Label id="type-practice-difficulty-label">{t("난이도")}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal"
                          aria-labelledby="type-practice-difficulty-label"
                        >
                          <span className="truncate">{getDifficultyLabel(difficulty, locale)}</span>
                          <ChevronDown className="size-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
                        {DIFFICULTIES.map((item) => (
                          <SelectMenuItem
                            key={item.id}
                            label={getDifficultyLabel(item.id, locale)}
                            selected={difficulty === item.id}
                            onSelect={() => handleDifficultyChange(item.id)}
                          />
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <p className="text-xs text-slate-500">{difficultyHelper}</p>
                  </div>

                  <div className="space-y-2">
                    <Label id="type-practice-category-label">{t("카테고리")}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal"
                          aria-labelledby="type-practice-category-label"
                        >
                          <span className="truncate">{t(CATEGORY_LABEL_KEY[category])}</span>
                          <ChevronDown className="size-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
                        {PRACTICE_CATEGORIES.map((item) => (
                          <SelectMenuItem
                            key={item}
                            label={t(CATEGORY_LABEL_KEY[item])}
                            selected={category === item}
                            onSelect={() => handleCategoryChange(item)}
                          />
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <Label id="type-practice-stage-label">{t("단계")}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal"
                          aria-labelledby="type-practice-stage-label"
                        >
                          <span className="truncate">
                            {t("단계")} {stage} · {stageLabel}
                          </span>
                          <ChevronDown className="size-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
                        {stages.map((item) => {
                          const key = STAGE_LABEL_KEY[category][item.stage];
                          const label = key ? t(key) : `${t("단계")} ${item.stage}`;
                          return (
                            <SelectMenuItem
                              key={item.stage}
                              label={`${t("단계")} ${item.stage} · ${label}`}
                              selected={stage === item.stage}
                              onSelect={() => handleStageChange(item.stage)}
                            />
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <Label id="type-practice-type-label">{t("세부 유형")}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal"
                          aria-labelledby="type-practice-type-label"
                        >
                          <span className="truncate">{typeLabel}</span>
                          <ChevronDown className="size-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width) max-h-72">
                        <SelectMenuItem
                          label={t("해당 단계 전체")}
                          selected={typeId === "all"}
                          onSelect={() => setTypeId("all")}
                        />
                        {typeOptions.map((option) => (
                          <SelectMenuItem
                            key={option.id}
                            label={`${option.label} (${option.count})`}
                            selected={typeId === option.id}
                            onSelect={() => setTypeId(option.id)}
                          />
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <Label id="type-practice-count-label">{t("문항 수")}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal"
                          aria-labelledby="type-practice-count-label"
                        >
                          <span className="truncate">{t("{count}문항", { count: questionCount })}</span>
                          <ChevronDown className="size-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
                        {TYPE_COUNTS.map((count) => (
                          <SelectMenuItem
                            key={count}
                            label={t("{count}문항", { count })}
                            selected={questionCount === count}
                            onSelect={() => setQuestionCount(count)}
                          />
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="text-xs text-slate-500">
                    {t("카테고리")}: {t(CATEGORY_LABEL_KEY[category])} · {t("단계")} {stage}
                    {availableTypeCount > 0
                      ? ` · ${t("{count}문항 가능", { count: availableTypeCount })}`
                      : ` · ${t("선택한 조건에 맞는 문항이 없습니다.")}`}
                  </p>
                </div>
              </ExamSetupPanel>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
