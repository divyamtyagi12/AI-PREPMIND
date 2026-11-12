# PrepMind AI — AI-Powered Adaptive Learning & Placement Preparation System

PrepMind AI is a full-stack MERN + TypeScript adaptive placement preparation platform combining **Bayesian Knowledge Tracing (BKT)**, **Timed Diagnostic Assessments**, **Prerequisite-Aware Personalized Roadmaps**, **Context-Aware Gemini AI Tutoring**, **Sandboxed Online Coding Evaluation (Judge0 + Monaco Editor)**, and **AI Mock Interviews with Multi-Criteria Rubric Scoring**.

---

## 1. Complete Feature Matrix (Phases 1–9.1)

| Phase | Module | Key Capabilities |
|---|---|---|
| **Phase 1** | Foundation & Auth | JWT Access + Rotating Refresh Tokens (`HttpOnly` cookies, `User`, `Session`), Double-Submit CSRF protection, Student Onboarding, RBAC (`student` / `admin`) |
| **Phase 2** | Automated Question Bank | Hierarchical Taxonomy (`Category -> Subject -> Topic -> Question`), LeetCode/CodeChef external problem tracking, Gemini AI question generation, Admin review queue & bulk import |
| **Phase 3** | Diagnostic & Timed Assessments | Server-authoritative timed sessions, optimistic concurrency answer autosave, instant scoring, attempt/cooldown limits, and `InitialSkillProfile` |
| **Phase 4** | Adaptive Learning & BKT | Mathematical Bayesian Knowledge Tracing ($P(L_0), P(T), P(S), P(G)$) across `KnowledgeState`, `LearningObservation`, and `MasteryHistory`, adaptive difficulty selection, weak-topic detection, and mastery learning curves |
| **Phase 5** | Learning Roadmaps & Spaced Revision | Prerequisite DAG cycle detection (`TopicPrerequisite`), priority-aware topological scheduling, daily/weekly study plans, `[1, 3, 7, 14, 30]`-day spaced repetition, and dynamic replanning |
| **Phase 6** | Gemini AI Tutor | 6 Pedagogical Modes (`explain`, `hint` L1–L4, `guided`, `solution`, `quiz`, `review`), bounded student context, spoiler prevention, and daily token/request quotas |
| **Phase 7** | Online Coding Platform | Monaco Editor (`cpp`, `java`, `python`, `javascript`), isolated Judge0 sandbox execution, sample vs. hidden test cases, draft autosave, and first-solve BKT updates |
| **Phase 8** | AI Mock Interviews | Technical, DSA, HR, Behavioral, Project & Mixed tracks, adaptive follow-up questions, weighted rubric scoring (0–5 scale), and speech-to-text voice support |
| **Phase 9 & 9.1** | Unified Analytics, Hardening & E2E Verification | Multi-pillar Placement Readiness Index (`/analytics`), `React.lazy()` route code splitting (82.6% entry bundle reduction), NoSQL/Regex sanitization, 41 Mongoose models, 202 backend tests, 31 frontend tests, and 10 Playwright E2E browser test specs |
| **Phase 9.2** | External Integration Verification & Resilience | Gemini & Judge0 credential verification, fail-closed `503 Service Unavailable` on missing provider, transparent demonstration labeling (`Mock Execution`, `Mock Response`, `Mock Evaluation`), Data Completeness & Insufficient Evidence guardrails (<40%), 205 backend tests, and 11 Playwright E2E browser test specs (17 tests) |

---

## 2. Technology Stack

- **Frontend (`interview/client`)**: React 19, Vite 8, React Router 7 (61 route entries), Tailwind CSS 4, Radix UI, Lucide React, Recharts, `@monaco-editor/react`, Axios, Vitest + React Testing Library, Playwright E2E
- **Backend (`interview/server`)**: Node.js, Express 4 (136 REST endpoint routes), TypeScript (Strict), MongoDB + Mongoose 9 (41 Models), Zod 4, `@google/genai` (Gemini 2.5 Flash), Judge0 Execution Provider, JWT + Bcrypt + Helmet + Express Rate Limit

---

## 3. Quick Start & Local Setup

### Prerequisites
- Node.js 20+
- MongoDB 7.0+ (local or MongoDB Atlas)

### 1. Configure Environment Variables
```bash
cp interview/.env.example interview/.env
cp interview/server/.env.example interview/server/.env
cp interview/client/.env.example interview/client/.env
```
Edit `interview/server/.env` and set your `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GEMINI_API_KEY`, and `CODE_EXECUTION_API_KEY`.

### 2. Install Dependencies
```bash
npm --prefix interview/server install
npm --prefix interview/client install
```

### 3. Seed Taxonomy, External Problems & Diagnostic Assessments
```bash
npm --prefix interview/server run seed:taxonomy
npm --prefix interview/server run seed:external
npm --prefix interview/server run seed:assessments
```

### 4. Start Development Servers
```bash
# Terminal 1 — Backend API (http://localhost:4000)
npm --prefix interview/server run dev

# Terminal 2 — Frontend Client (http://localhost:5173)
npm --prefix interview/client run dev
```

---

## 4. Verification, Testing & Final-Year Demo Commands

```bash
# Production build verification (Server TypeScript + Client Vite Bundle)
npm --prefix interview/server run build
npm --prefix interview/client run build

# Run all 22 Backend Integration & Unit Test Suites (205 tests)
npm --prefix interview/server test

# Run Frontend Component & Unit Test Suite (31 tests)
npm --prefix interview/client test

# Run all 11 Playwright E2E Browser Test Specs (17 tests)
npm --prefix interview/client run test:e2e

# Run 9-Stage Final-Year Project Demonstration Script
npm --prefix interview/server run demo
```

---

## 5. Documentation Index (`interview/docs/`)

- [ARCHITECTURE.md](file:///c:/Users/divyam/Desktop/interview-agent/interview/docs/ARCHITECTURE.md) — System architecture & subsystem boundaries
- [DATABASE_SCHEMA.md](file:///c:/Users/divyam/Desktop/interview-agent/interview/docs/DATABASE_SCHEMA.md) — All 41 Mongoose models & compound indexes
- [API_DOCUMENTATION.md](file:///c:/Users/divyam/Desktop/interview-agent/interview/docs/API_DOCUMENTATION.md) — Complete REST endpoint catalog
- [BKT_ALGORITHM.md](file:///c:/Users/divyam/Desktop/interview-agent/interview/docs/BKT_ALGORITHM.md) — Bayesian Knowledge Tracing mathematics & invariants
- [ROADMAP_ENGINE.md](file:///c:/Users/divyam/Desktop/interview-agent/interview/docs/ROADMAP_ENGINE.md) — Prerequisite DAG, priority formula & spaced revision
- [AI_TUTOR.md](file:///c:/Users/divyam/Desktop/interview-agent/interview/docs/AI_TUTOR.md) — 6 pedagogical modes, progressive hints & quotas
- [CODING_EXECUTION.md](file:///c:/Users/divyam/Desktop/interview-agent/interview/docs/CODING_EXECUTION.md) — Judge0 sandbox provider & hidden test case security
- [MOCK_INTERVIEWS.md](file:///c:/Users/divyam/Desktop/interview-agent/interview/docs/MOCK_INTERVIEWS.md) — Adaptive follow-up logic & rubric evaluation
- [SECURITY.md](file:///c:/Users/divyam/Desktop/interview-agent/interview/docs/SECURITY.md) — Auth, CSRF, RBAC, IDOR & anti-cheating controls
- [DEPLOYMENT.md](file:///c:/Users/divyam/Desktop/interview-agent/interview/docs/DEPLOYMENT.md) — Production deployment checklist
- [TESTING.md](file:///c:/Users/divyam/Desktop/interview-agent/interview/docs/TESTING.md) — Automated unit, integration & E2E test suite breakdown
- [DEMO_GUIDE.md](file:///c:/Users/divyam/Desktop/interview-agent/interview/docs/DEMO_GUIDE.md) — Viva & final-year project demonstration script

---

## 6. Known Limitations & Engineering Trade-offs

1. **External Code Execution Dependency**: Live code compilation (`cpp`, `java`, `python`, `javascript`) requires a reachable Judge0 CE or RapidAPI endpoint (`CODE_EXECUTION_BASE_URL` / `CODE_EXECUTION_API_KEY`). If unconfigured, the backend fails safely with `503 Service Unavailable` rather than executing untrusted code on the host.
2. **Browser Speech-to-Text Support**: Voice mode in AI Mock Interviews uses the browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`), which is supported natively in Chromium-based browsers (Chrome/Edge) and automatically falls back to text input in unsupported browsers.
3. **LLM Evaluation Determinism**: While rubric weights and overall scores are computed deterministically on the backend, individual criterion scores (0–5) in AI Mock Interviews are generated by Gemini (`temperature: 0.3`) with Zod schema validation and deterministic fallback handling.
