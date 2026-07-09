# OPIc Exam Simulator — Agent Context

이 문서는 에이전트가 OPIc 시험 도메인과 이 프로젝트의 데이터 구조를 이해하도록 돕기 위한 참고 자료입니다.

## 프로젝트 개요

Next.js 기반 OPIc 모의시험 시뮬레이터. 사용자는 배경 설문(Survey)을 확인한 뒤 15문항 시험을 치르고, 음성 녹음 후 Gemini AI로 피드백을 받습니다.

- 패키지 매니저: `pnpm`
- i18n: 쿠키 기반 (`NEXT_LOCALE`), URL prefix 없음 (`/ko`, `/en` 없음)
- 번역: `t("한글키")` + `lib/i18n/locales/{ko,en}.json`

---

## OPIc 시험 구조 (15문항)

| 문항 | 유형 | 설명 |
|------|------|------|
| Q1 | 자기소개 (Self-Introduction) | 고정 문항 |
| Q2–Q10 | 주제 세트 (Combo) | 3개 주제 × 주제당 3문항 = 9문항 |
| Q11–Q13 | 롤플레이 (Roleplay) | 1개 주제 × 3문항 |
| Q14–Q15 | 심화 (Comparison) | 1개 주제 × 2문항 |

구현: `lib/question-generator.ts` → `generateExam()`

---

## Survey vs 돌발 (Surprise)

OPIc의 핵심 구분입니다.

### Survey 주제 (배경 설문에서 선택한 주제)

사용자가 사전 설문에서 고른 활동/관심사에 기반한 문항입니다. `data/opic-constants.json`의 `surveyTopics`에 정의되어 있습니다.

| id | 한글 | English |
|----|------|---------|
| `movies` | 영화보기 | Watching Movies |
| `performances` | 공연보기 | Watching Performances |
| `concerts` | 콘서트보기 | Going to Concerts |
| `park` | 공원가기 | Going to Parks |
| `beach` | 해변가기 | Going to the Beach |
| `cafe` | 카페가기 | Going to Cafes |
| `music` | 음악 감상 | Listening to Music |
| `jogging` | 조깅 | Jogging |
| `walking` | 걷기 | Walking |
| `staycation` | 집에서 보내는 휴가 | Staycation |
| `domestic_travel` | 국내여행 | Domestic Travel |
| `housing` | 주거 | Housing |

설문 매핑: `data/survey.json`의 각 항목 `topicIds`가 위 id와 연결됩니다.

### 돌발 주제 (Surprise)

설문에서 **선택하지 않은** 주제에서 추가 출제되는 문항입니다. `surpriseTopics`에 정의됩니다.

| id | 한글 | English |
|----|------|---------|
| `geography` | 지형 | Geography |
| `gathering` | 모임 | Gatherings |
| `free_time` | 자유시간 | Free Time |
| `hotel` | 호텔 | Hotel |
| `weather` | 날씨 | Weather |
| `holiday` | 명절 | Holidays |
| `health` | 건강 | Health |
| `internet` | 인터넷 | Internet |
| `phone` | 전화 | Phone |
| `restaurant` | 식당 | Restaurant |
| `furniture` | 가구 | Furniture |
| `appliances` | 가전 | Home Appliances |
| `technology` | 기술 | Technology |
| `fashion` | 패션 | Fashion |
| `neighborhood` | 동네 | Neighborhood |
| `bank` | 은행 | Bank |
| `reservation` | 예약 | Reservations |

- Survey 주제와 돌발 주제는 **겹치지 않음**
- `question-bank.json`에서 돌발 주제는 Topic 레벨 `surprise: true`로 표시
- UI: 시험 화면에 빨간 "돌발" 배지 + 툴팁 표시

### 출제 비율

`examComposition.surveyToSurpriseRatio: [3, 2]` — Survey : 돌발 = 3 : 2

일일 문제 생성 스크립트(`scripts/generate-question-bank.mjs`)에서 이 비율을 사용합니다. 실제 `generateExam()`은 아직 전체 combo 풀에서 무작위 3주제를 뽑으며, survey/돌발 비율 로직은 미구현입니다.

---

## 문항 유형 (Question Types)

### Combo (Q2–Q10, 주제당 3문항)

각 세트는 정확히 3문항이며, **1→2→3 단계 고정 구조**를 따릅니다. `comboStages`에 슬롯별 허용 type이 정의되어 있습니다.

| 단계 | 의도 | 허용 type (`comboStages`) |
|------|------|---------------------------|
| 1 | 현재 상태 묘사 / 평소 루틴 (Description · Routine) | `place_description`, `routine`, `activity_description`, `object_description`, `person_description`, `person_introduction`, `preference_description`, `preparation` |
| 2 | 과거 경험 · 최초/최근 기억 · 과거와 현재의 변화 | `first_experience`, `recent_experience`, `first_motivation`, `experience_description`, `past_present_change` |
| 3 | 특별·인상적·돌발 사건 (Memorable / Unexpected) | `memorable_experience`, `problem_experience` |

**3단계 허용 타입**은 `experienceEndingTypes`와 동일합니다 (`memorable_experience`, `problem_experience`).

카페 토픽 예시:
1. "자주 가는 카페를 묘사해 주세요…" (Description) / "카페에 가면 보통 무엇을 하나요…" (Routine)
2. "최초의 카페 방문은…" (First) / "가장 최근에 카페에 갔을 때…" (Recent) / "예전에 비해 카페 가는 습관이 어떻게 달라졌나요…" (Past–Present Change)
3. "카페에서 황당했던 경험이 있나요? 상황을 설명하고 어떻게 해결했는지…" (Memorable / Unexpected)

일일 생성 스크립트(`scripts/generate-question-bank.mjs`)는 Q1/Q2/Q3 type이 각 stage 허용 목록에 있는지 검증합니다.

돌발 세트 작성 시: 문항 내용이 돌발 주제 자체에 관한 것이어야 함 (예: `routine` + `furniture` → 가구 구매 과정)

### Roleplay (Q11–Q13)

각 세트는 정확히 3문항이며, **1→2→3 단계 고정 구조**입니다. `roleplayStages`에 정의됩니다.

| 단계 (시험 문항) | 의도 | 허용 type |
|------------------|------|-----------|
| 1 (Q11) | 상황 인식 및 정보 조사 — 3~4가지 질문 | `situation_questions` |
| 2 (Q12) | 위기 관리 및 대안 제시 — 문제 설명 + 대안 2~3가지 | `problem_solving` |
| 3 (Q13) | 실제 유사 경험 회상 — Q12와 관련된 과거 경험 | `similar_experience` |

카페 토픽 예시:
1. 새 카페에 전화해 위치·영업시간·주차 등 3~4가지 문의
2. 급한 일로 못 가게 됨 → 친구에게 설명하고 시간/날짜 변경 등 대안 제시
3. 실제로 약속을 취소·변경했던 경험 이야기

주제 목록: `roleplayTopics`. 일일 생성 스크립트는 roleplay set도 이 구조를 검증합니다.

### Comparison / Advanced (Q14–Q15)

`advancedQuestionTypes` — 주제당 2문항

| id | 한글 | English |
|----|------|---------|
| `past_present_comparison` | 차이점 비교하기 | Compare differences |
| `issue_discussion` | 이슈 설명 | Discuss an issue |

---

## Question Bank 데이터 구조

파일: `public/question-bank.json`

```json
{
  "intro": { "questions": [...] },
  "combo": [/* BankTopic[] */],
  "roleplay": [/* BankTopic[] */],
  "comparison": [/* BankTopic[] */]
}
```

### Topic vs Set (중요)

```
combo[] (Topic)
  └── id: "housing"          ← Topic 식별자 (짧은 id)
      label: "Housing"
      surprise?: true         ← 돌발 주제만 true
      keywords?: [...]
      sets[] (Set)
        ├── id: "housing-default"              ← 수동 작성 set
        └── id: "housing-auto-2026-07-09-..."  ← Actions 자동 생성 set
```

- **Topic 매칭**: `topic.id` (예: `housing`)
- **Set 식별**: `sets[].id` — `-auto-{날짜}-{label}` 패턴은 자동 생성 set 표시용
- 앱은 수동/자동 set을 구분하지 않고 Topic 내 set을 랜덤 선택

### 일일 자동 생성

- 스크립트: `scripts/generate-question-bank.mjs`
- 워크플로: `.github/workflows/daily-question-bank.yml` (매일 cron + 수동 실행)
- Gemini API로 **combo** + **roleplay** set 생성 → 기존 Topic에 `sets.push()` 또는 Topic 신규 생성
- Env: `DAILY_SET_COUNT` (combo, default 5), `DAILY_ROLEPLAY_SET_COUNT` (default 2)
- Secret: `GOOGLE_GENERATIVE_AI_API_KEY`

---

## 핵심 파일 맵

| 경로 | 역할 |
|------|------|
| `data/opic-constants.json` | Survey/돌발/roleplay 주제, comboStages/roleplayStages, 문항 유형 |
| `data/survey.json` | 배경 설문 Q&A (ko/en), `topicIds` 매핑 |
| `lib/opic-constants.ts` | constants JSON의 TS export |
| `lib/question-generator.ts` | 시험/연습 문항 생성 |
| `public/question-bank.json` | 실제 문항 은행 |
| `scripts/generate-question-bank.mjs` | Gemini 일일 combo + roleplay set 생성 |
| `components/exam-setup-panel.tsx` | 설문 표시 + 마이크 설정 |
| `app/exam/page.tsx` | 시험 UI (돌발 배지 포함) |
| `app/practice/page.tsx` | 유형별 연습 모드 |
| `lib/i18n/` | i18n 코어 (config, translate, locales) |

---

## 구현 시 주의사항

1. **Topic id는 constants와 bank에서 일치**해야 합니다. 자동 생성은 Gemini의 `targetTopicId`로 Topic을 찾습니다.
2. **Survey/돌발은 Topic 레벨** `surprise` 플래그로 구분합니다. Set 레벨이 아닙니다.
3. **같은 id가 category마다 존재할 수 있음** (예: `housing`이 `combo`와 `comparison`에 각각 있음). category별로 별도 배열입니다.
4. **i18n**: UI 문자열은 `t()`, 설문/은행 영문 문항은 JSON의 locale 필드를 직접 사용합니다.
5. **최소 변경 원칙**: 이 프로젝트는 도메인 지식이 코드 여러 곳에 분산되어 있으므로, 주제/유형 추가 시 `opic-constants.json` (`comboStages` 포함) → `question-bank.json` → 필요 시 `survey.json` 순으로 일관되게 반영하세요.
6. **Combo 세트는 1→2→3 단계**를 지켜야 합니다. Q1=현재 묘사/루틴, Q2=과거 경험·변화, Q3=기억에 남는/돌발 사건.
7. **Roleplay 세트는 1→2→3 단계**를 지켜야 합니다. Q11=`situation_questions`, Q12=`problem_solving`, Q13=`similar_experience` (Q12와 연결된 실제 경험).
