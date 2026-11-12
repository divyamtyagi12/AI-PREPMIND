# ABTalks AI Interview Agent

An AI-powered technical interview backend that conducts **personalized, adaptive mock interviews** for ABTalks AI Cohort graduates — grounded in each candidate's real mission history.

---

## Quick Start

### 1. Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| npm | 9+ |
| Gemini API key | Free tier or paid |

### 2. Install

```bash
git clone <repo-url>
cd interview
npm install
```

### 3. Configure

```bash
cp .env.example .env
# Open .env and set your Gemini API key:
# GEMINI_API_KEY=AIzaSy...
```

### 4. Run

```bash
npm run dev
# Server starts at http://localhost:3000
```

### 5. Open the Demo UI

Visit **http://localhost:3000** in your browser — the interview UI loads automatically.

### 6. Verify Health

```bash
curl http://localhost:3000/health
# → { "success": true, "status": "ok", ... }
```

---

## Architecture

```
interview/
├── public/
│   └── index.html          # Single-page demo frontend (no build step)
├── data/
│   ├── curriculum.json     # 31 curriculum days across 8 modules (loaded at startup)
│   └── candidates.json     # 20 candidate profiles with mission histories
├── src/
│   ├── index.ts            # Express server entry point
│   ├── store.ts            # In-memory data loader (curriculum + candidates)
│   ├── sessionStore.ts     # In-memory session Map<sessionId, SessionState>
│   ├── types.ts            # All TypeScript interfaces
│   ├── llm.ts              # Gemini API client with 429-retry + bearer auth
│   ├── questionBank.ts     # buildTopicPool → selectInterviewDays → getDayContext
│   ├── interviewOrchestrator.ts  # LLM-driven state machine (the core logic)
│   ├── prompts.ts          # All prompt templates + JSON parser + quality checker
│   ├── routes/
│   │   ├── health.ts       # GET /health
│   │   └── interview.ts    # POST /api/interview
│   └── middleware/
│       └── errorHandler.ts # Central 500 handler
├── scripts/
│   ├── test-phase5-acceptance.ts  # 96-test acceptance suite (PRD §9)
│   ├── test-feedback-parser.ts    # 33-test feedback parser unit tests
│   └── test-llm-interview.ts      # Full 15-turn live LLM simulation
├── demo/
│   └── sample-transcript.json     # Pre-recorded full interview (fallback demo)
└── .env.example
```

### Request Flow

```
POST /api/interview
      │
      ▼
  route/interview.ts
      │  validate shape (isStartRequest / isTurnRequest)
      ▼
  sessionStore  ──────────────────────────────────────────┐
  (get/create)                                            │
      │                                                   │ Map<sessionId, SessionState>
      ▼                                                   │ (pure in-memory, no DB)
  interviewOrchestrator.ts                               └──────────────────────────
      │
      ├─ processOpeningTurn()
      │     buildTopicPool(candidate)           ← classifies missions: aced/struggled/gap
      │     selectInterviewDays(pool)           ← picks 4-6 days, ≥2 modules
      │     LLM: buildOpeningPrompt()           ← first question grounded in Day 1's context
      │
      ├─ processTurn() [mid-turns]
      │     buildTurnPrompt(state)              ← feeds: day context, coverage, history
      │     LLM: → { reply, decision }
      │     decision = "follow_up" | "advance" | "close"
      │     Enforces: min 8 questions + 4 topics before allowing close
      │     Enforces: hard cap at 15 turns
      │
      └─ handleClose()
            LLM: buildClosingPrompt()           ← warm wrap-up message
            LLM: buildFeedbackPrompt()          ← full transcript + mission evidence
            parseFeedbackOutput()               ← validates 6 hard quality rules
            [retry once if quality fails]
            → { reply, done: true, feedback }
```

---

## Model & Provider

| | |
|---|---|
| **Provider** | Google Gemini |
| **Model** | `gemini-2.0-flash` |
| **Auth** | API key (`AIza...`) or OAuth2 bearer token (`AQ...`) — auto-detected |
| **Rate limiting** | Exponential backoff with jitter; reads `retryDelay` from 429 response body |
| **Temperature** | 0.7 for conversation turns, 0.4 for feedback generation |

---

## What Makes This Personalized

> The interview isn't just "AI asking generic ML questions." Before the first question is sent, the system reads the candidate's full mission history — every day they attempted, how many tries it took, and what they skipped. It classifies each mission as **aced** (passed first try), **struggled** (passed after 3+ attempts), or **gap** (skipped entirely). From this evidence, it selects 4–6 curriculum days that span at least 2 curriculum modules — deliberately mixing strengths and weaknesses. The interviewer persona is seniority-aware: a 28-year Distinguished Engineer gets architectural trade-off questions while a 0-year intern gets concept-first probing. During the conversation, the LLM decides turn-by-turn whether to follow up (shallow answer), advance (solid answer), or close (sufficient coverage) — all grounded in that specific candidate's real cohort data. The final feedback cites exact things the candidate said and specific curriculum day titles from their missed areas — not generic praise.

---

## API Reference

### `POST /api/interview`

**Start session (first call):**
```json
{
  "sessionId": "unique-session-id",
  "candidate": { ...candidate profile from candidates.json... }
}
```

**Send message (subsequent calls):**
```json
{
  "sessionId": "unique-session-id",
  "message": "The candidate's answer..."
}
```

**Mid-turn response:**
```json
{ "reply": "...", "done": false }
```

**Final response:**
```json
{
  "reply": "Thank you, that completes our session...",
  "done": true,
  "feedback": {
    "summary": "...",
    "strengths": ["..."],
    "gaps": ["..."],
    "next": ["..."]
  }
}
```

**Error codes:**
| Code | Meaning |
|------|---------|
| 400 | Malformed request (missing fields, invalid candidate) |
| 404 | Unknown sessionId on mid-turn |
| 409 | Duplicate sessionId on start |
| 410 | Session already completed |
| 500 | Internal error (logged, safe fallback returned) |

### `GET /health`

```json
{
  "success": true,
  "status": "ok",
  "timestamp": "...",
  "uptime": 12.3,
  "environment": "development",
  "data": { "curriculumTopics": 31, "candidates": 20 }
}
```

---

## Running Tests

```bash
# Phase 5: full acceptance suite (96 tests, offline + HTTP)
npx ts-node --transpile-only scripts/test-phase5-acceptance.ts

# Phase 4: feedback parser unit tests (33 tests, no API needed)
npx ts-node --transpile-only scripts/test-feedback-parser.ts

# Phase 3: live LLM simulation (needs Gemini API quota)
npx ts-node --transpile-only scripts/test-llm-interview.ts
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | Runtime environment |
| `GEMINI_API_KEY` | — | **Required** — Gemini API key or OAuth token |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Model name |
| `CURRICULUM_PATH` | `./data/curriculum.json` | Path to curriculum file |
| `CANDIDATES_PATH` | `./data/candidates.json` | Path to candidates file |

> **Security**: Never commit `.env`. The `.gitignore` excludes it automatically.

---

## Demo Fallback

If live LLM calls are unavailable during judging, a pre-recorded full interview transcript is available at:

```
demo/sample-transcript.json
```

This shows a complete session with Sarah Johnson (Senior Data Engineer) — from the opening question through 10 turns of adaptive conversation to the final feedback block.
