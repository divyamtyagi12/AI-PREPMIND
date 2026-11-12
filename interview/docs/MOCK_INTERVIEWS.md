# PrepMind AI — AI-Powered Mock Interview System

## 1. Interview Types & Session State Machine
Supported interview tracks: `dsa`, `core_cs`, `hr`, `behavioral`, `project`, `technical`, and `mixed`.
- **Lifecycle States**: `created -> in_progress -> completed | abandoned`
- **State Guards**:
  - Duplicate `POST /start` calls on an `in_progress` session idempotently return the active question without generating duplicate questions.
  - Submissions to expired sessions (`now > session.expiresAt`) or already-answered `questionId`s are rejected with `400 Bad Request`.
  - Abandoned sessions cannot be restarted or completed.

## 2. Adaptive Follow-Up Engine & Rubric Evaluation
- After each primary answer (`isFollowUp: false`), `interviewFollowUp.service.ts` inspects the student's response depth and generates at most **1 targeted follow-up question** (`maxFollowUpsPerQuestion = 1`) before advancing to the next primary question.
- `interviewEvaluation.service.ts` evaluates each answer against weighted criteria (0–5 scale per criterion), computing the deterministic weighted average `overallQuestionScore` on the backend.
- Upon completion, `interviewReport.service.ts` aggregates domain sub-scores (`technicalKnowledgeScore`, `problemSolvingScore`, `communicationScore`, `answerStructureScore`), top strengths, critical weaknesses, and actionable recommendations into `InterviewReport`.
- **Strict BKT Separation**: Subjective AI interview rubric scores are stored in `InterviewEvaluation` / `InterviewReport` and **never** overwrite objective BKT `KnowledgeState` probabilities.

