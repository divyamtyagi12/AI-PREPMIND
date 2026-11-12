# PrepMind AI — Automated Testing & Verification Guide

## 1. Test Architecture
- **Backend Unit & Integration Test Runner**: `Vitest` + `Supertest` + `mongodb-memory-server` (22 suites, 205 tests; isolated in-memory MongoDB replica instance per suite; deterministic mocks for Gemini and Judge0).
- **Frontend Component & Unit Test Runner**: `Vitest` + `jsdom` + `@testing-library/react` + `@testing-library/user-event` (31 tests covering routes, components, Placement Readiness Index formula, and Data Completeness thresholds).
- **End-to-End Browser Test Runner**: `@playwright/test` driving Google Chrome against `startE2EServer.ts` (`http://localhost:4000`) and Vite (`http://localhost:5173`) across 11 E2E browser spec files (`interview/client/e2e/*.spec.js`, 17 tests).

## 2. Running the Test Suites
```bash
# Run all 22 backend test suites (205 tests)
npm --prefix interview/server test

# Run frontend component & unit test suite (31 tests)
npm --prefix interview/client test

# Run all 11 Playwright E2E browser test specs (17 tests)
npm --prefix interview/client run test:e2e

# Run the 9-stage Final-Year Project CLI demonstration
npm --prefix interview/server run demo
```

## 3. Backend Test Suite Inventory (22 Suites — 205 Tests)
1. `auth.test.ts` — Registration, login, token rotation, logout, CSRF, RBAC
2. `profile.test.ts` — Academic profile onboarding, validation, password change
3. `practice.test.ts` — Topic browsing, MCQ evaluation, practice history
4. `automatedQuestionBank.test.ts` — External DSA import, Gemini generation, review queue, bulk import
5. `assessment.test.ts` — Timed assessments, autosave concurrency, expiration, scoring, attempt limits
6. `seedAssessments.test.ts` — Diagnostic blueprint seeding & idempotency
7. `diagnosticIntegration.test.ts` — Diagnostic assessment to BKT prior initialization
8. `bkt.test.ts` — Bayesian posterior & transition mathematics, monotonicity, parameter bounds
9. `adaptiveSelection.test.ts` — Difficulty targeting, cooldown deduplication, weak-topic prioritization
10. `adaptiveSessions.test.ts` — Adaptive session lifecycle and real-time BKT updates
11. `roadmapGeneration.test.ts` — Prerequisite DAG cycle detection, priority-aware topological scheduling, workload caps
12. `roadmapAdjustment.test.ts` — Dynamic replanning, pause/resume, adjustment audit logs
13. `revisionScheduling.test.ts` — Spaced repetition `[1, 3, 7, 14, 30]` day scheduling
14. `tutorPrompts.test.ts` — Pedagogical mode prompt assembly & anti-spoiler constraints
15. `tutor.test.ts` — AI Tutor conversations, 6 modes, progressive hints, daily quota enforcement
16. `codingProblems.test.ts` — Coding problem catalog, hidden test case protection, admin CRUD
17. `codingExecution.test.ts` — Sandboxed sample run, full submission verdicts, BKT first-solve integration
18. `codingProgress.test.ts` — Draft autosave, submission history, coding analytics
19. `interview.test.ts` — Mock interview lifecycle, adaptive follow-ups, expiration/duplicate guards, cross-student isolation
20. `interviewEvaluation.test.ts` — Weighted rubric scoring, malformed JSON fallback, timeout/out-of-bounds rejection, BKT immutability invariant (8 tests)
21. `fullJourney.test.ts` — End-to-end 9-stage Student & Admin platform journey across Phases 1–8
22. `phase91Verification.test.ts` — Multi-student BKT + priority-aware roadmap personalization, interview-BKT separation, and security/CastError/NoSQL sanitization hardening

## 4. Playwright E2E Browser Test Suite Inventory (11 Spec Files — 17 Tests)
1. `e2e/auth.spec.js` — Unauthenticated redirect, invalid login alert, registration, logout, and re-login
2. `e2e/onboarding.spec.js` — 2-step academic + placement goals onboarding wizard and `/profile` persistence
3. `e2e/assessments.spec.js` — Timed diagnostic assessment runner, countdown timer, answer autosave, submission, and skill profile
4. `e2e/adaptivePractice.spec.js` — BKT mastery dashboard, adaptive session setup, question submission, and mastery delta display
5. `e2e/roadmap.spec.js` — 4-step roadmap wizard, prerequisite-aware daily plan generation, and task completion
6. `e2e/aiTutor.spec.js` — AI Tutor mode switching (`Explain` / `Hint`), prompt submission, and guided response rendering
7. `e2e/codingPractice.spec.js` — Coding problem library, `Two Sum` workspace, sample `Run`, and `Submit` (`Accepted` verdict)
8. `e2e/mockInterviews.spec.js` — Mock interview configuration, technical response submission, and rubric report view
9. `e2e/admin.spec.js` — Student `/admin` access denial, Admin Overview metrics, and Admin Coding Problem creation
10. `e2e/fullStudentJourney.spec.js` — Complete 9-stage browser journey from student registration through unified Readiness Index analytics
11. `e2e/edgeCasesAndFailures.spec.js` — Phase 9.2 resilience: Insufficient Evidence warning for partial profiles, code draft preservation across reload, active interview question recovery across reload, and execution failure handling
