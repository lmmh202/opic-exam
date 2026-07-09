# OPIc Exam Simulator

> 🎯 Real-time OPIc mock exam simulator powered by Gemini AI

## ✨ Features

- **Realistic Exam Environment** - 15 randomized questions, timer, audio recording
- **Survey-Based Questions** - Customized questions based on your background survey
- **AI Feedback Analysis** - Batch analysis of all responses with Gemini AI (1 API call)
- **Score Visualization** - Radar chart for Fluency, Grammar, Vocabulary
- **Local Storage** - Audio saved to IndexedDB, no server required

## 🔒 Privacy

> **⚠️ Your voice recordings are NOT stored on any server.**

- All audio recordings are saved **only in your browser's IndexedDB**
- No external database or cloud storage is used
- Clear your browser data to delete all recordings
- AI analysis is processed once and voice data is not retained by Gemini

## 🚀 Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Add your Gemini API key to `.env`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Set your API key
export GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here

# Build and run
docker compose up -d
```

### Using Docker Directly

```bash
# Build the image
docker build -t opic-exam .

# Run the container
docker run -d -p 3000:3000 \
  -e GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here \
  opic-exam
```

Access the application at [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
opic-exam/
├── app/
│   ├── api/analyze/       # Gemini AI analysis API
│   ├── exam/              # Exam page
│   ├── results/           # Results & analysis page
│   └── page.tsx           # Home (start page)
├── components/ui/         # shadcn/ui components
├── hooks/
│   └── useAudioRecorder.ts # Audio recording hook
├── lib/
│   ├── question-generator.ts # Question generation logic
│   ├── store.ts           # Zustand state management
│   └── db.ts              # IndexedDB utilities
├── data/
│   ├── survey.json        # Background survey Q&A (i18n)
│   └── opic-constants.json # Survey/surprise topics + question types
└── public/
    └── question-bank.json # Question bank (combo/roleplay/comparison)
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16, React 19 |
| Styling | Tailwind CSS 4, shadcn/ui |
| State | Zustand (persist) |
| AI | Google Gemini API |
| Storage | IndexedDB (idb-keyval) |
| Charts | Recharts |

## 📋 Exam Structure

The exam consists of **15 questions**:

| Question | Type |
|----------|------|
| 1 | Self-Introduction (fixed) |
| 2-10 | Set Questions (3 random sets) |
| 11-12 | Roleplay (asking questions, problem solving) |
| 13 | Similar Experience |
| 14 | Past vs Present Comparison |
| 15 | Issues/Problems Description |

## 📄 License

MIT License
