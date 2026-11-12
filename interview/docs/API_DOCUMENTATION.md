# PrepMind AI — REST API Documentation

All endpoints are prefixed with `/api`. Mutating requests (`POST`, `PATCH`, `PUT`, `DELETE`) require the `x-csrf-token` header matching the `pm_csrf` cookie. Authenticated endpoints require a valid `pm_access` `HttpOnly` JWT cookie.

## 1. Health & Authentication (`/api/auth`, `/api/users`)
- `GET /api/health` — Returns server and MongoDB connection status.
- `POST /api/auth/register` — Registers a student account and sets auth/CSRF cookies.
- `POST /api/auth/login` — Authenticates user and sets rotating tokens.
- `POST /api/auth/refresh` — Rotates refresh token and issues new access token.
- `POST /api/auth/logout` — Revokes refresh token and clears cookies.
- `GET /api/auth/me` — Returns current authenticated user.
- `GET /api/users/profile` / `PATCH /api/users/profile` — Reads or updates student academic & onboarding profile.
- `PATCH /api/users/password` — Changes user password after verifying `currentPassword`.

## 2. Content Taxonomy, Practice & External Problems (`/api/categories`, `/api/subjects`, `/api/topics`, `/api/questions`, `/api/practice`, `/api/external-problems`)
- `GET /api/categories`, `GET /api/categories/:slug`
- `GET /api/subjects`, `GET /api/subjects/:id`
- `GET /api/topics`, `GET /api/topics/:id`
- `GET /api/questions`, `GET /api/questions/:id` (never exposes `correctAnswer` before submission)
- `POST /api/practice/attempts` — Evaluates answer server-side and triggers BKT update.
- `GET /api/practice/history`, `GET /api/practice/stats`, `GET /api/practice/topics/:topicId/stats`
- `GET /api/external-problems`, `GET /api/external-problems/progress/me`, `PATCH /api/external-problems/:id/progress`

## 3. Timed Assessments & Skill Profile (`/api/assessments`, `/api/assessment-sessions`, `/api/skill-profiles`)
- `GET /api/assessments`, `GET /api/assessments/:templateId`
- `POST /api/assessments/:templateId/start` — Starts or resumes a timed assessment session.
- `GET /api/assessment-sessions/:sessionId` — Returns sanitized questions and remaining server time.
- `PATCH /api/assessment-sessions/:sessionId/answers` — Autosaves answers with optimistic revision checking.
- `POST /api/assessment-sessions/:sessionId/submit` — Scores session, updates `SkillProfile`, and records BKT observations.
- `GET /api/assessment-sessions/:sessionId/result`, `GET /api/assessment-sessions/:sessionId/review`
- `GET /api/assessment-history`, `GET /api/skill-profiles/me`

## 4. Adaptive Learning & Bayesian Knowledge Tracing (`/api/adaptive`)
- `GET /api/adaptive/mastery`, `GET /api/adaptive/mastery/:topicId`, `GET /api/adaptive/mastery/:topicId/history`
- `POST /api/adaptive/sessions` — Starts adaptive practice targeting `categoryId`, `subjectId`, or `topicId`.
- `GET /api/adaptive/sessions/:sessionId`, `GET /api/adaptive/sessions/:sessionId/next`
- `POST /api/adaptive/sessions/:sessionId/answer` — Evaluates answer, updates BKT `P(L_n)`, and selects next optimal difficulty.
- `POST /api/adaptive/sessions/:sessionId/complete`, `GET /api/adaptive/sessions/:sessionId/results`
- `GET /api/adaptive/recommendations`, `GET /api/adaptive/weak-topics`, `GET /api/adaptive/analytics`

## 5. Personalized Learning Roadmaps & Spaced Revision (`/api/roadmaps`, `/api/roadmap-tasks`, `/api/revisions`)
- `POST /api/roadmaps/generate`, `GET /api/roadmaps/active`, `GET /api/roadmaps/:roadmapId`
- `PATCH /api/roadmaps/:roadmapId/settings`, `POST /api/roadmaps/:roadmapId/replan`
- `POST /api/roadmaps/:roadmapId/pause`, `POST /api/roadmaps/:roadmapId/resume`
- `GET /api/roadmaps/:roadmapId/tasks`, `GET /api/roadmaps/:roadmapId/tasks/today`, `GET /api/roadmaps/:roadmapId/tasks/week`
- `GET /api/roadmaps/:roadmapId/progress`, `GET /api/roadmaps/:roadmapId/milestones`, `GET /api/roadmaps/:roadmapId/analytics`
- `POST /api/roadmap-tasks/:taskId/complete`, `POST /api/roadmap-tasks/:taskId/skip`, `POST /api/roadmap-tasks/:taskId/reschedule`
- `GET /api/revisions/due`, `GET /api/revisions/upcoming`, `POST /api/revisions/:revisionId/complete`

## 6. Gemini AI Tutor (`/api/tutor`)
- `GET /api/tutor/quota` — Returns daily used/remaining AI Tutor requests.
- `GET /api/tutor/conversations`, `POST /api/tutor/conversations`, `POST /api/tutor/quick-context`
- `GET /api/tutor/conversations/:id`, `DELETE /api/tutor/conversations/:id`
- `POST /api/tutor/conversations/:id/messages` — Sends student prompt with pedagogical `mode` and `hintLevel`.

## 7. Online Coding Platform (`/api/coding`)
- `GET /api/coding/problems`, `GET /api/coding/problems/:id` (returns sample test cases only; hidden test cases are never exposed)
- `POST /api/coding/problems/:id/run` — Runs code against sample test cases via sandboxed execution provider.
- `POST /api/coding/problems/:id/submit` — Evaluates code against sample + hidden test cases, updates `CodingProgress`, and triggers BKT on first Accepted solve.
- `GET /api/coding/problems/:id/draft`, `PUT /api/coding/problems/:id/draft`
- `GET /api/coding/submissions`, `GET /api/coding/submissions/:id`, `GET /api/coding/analytics`

## 8. AI Mock Interviews (`/api/interviews`)
- `GET /api/interviews/config` — Returns supported interview types, difficulties, durations, and limits.
- `POST /api/interviews`, `GET /api/interviews`, `GET /api/interviews/analytics`
- `GET /api/interviews/:sessionId`, `POST /api/interviews/:sessionId/start`, `GET /api/interviews/:sessionId/current-question`
- `POST /api/interviews/:sessionId/answer` — Evaluates answer against rubric, checks adaptive follow-up, or advances session.
- `POST /api/interviews/:sessionId/complete`, `POST /api/interviews/:sessionId/abandon`
- `GET /api/interviews/:sessionId/report`, `GET /api/interviews/:sessionId/review`

## 9. Administrator Endpoints (`/api/admin/*` — Requires `admin` Role)
- Taxonomy & Question Bank: `/api/admin/categories`, `/api/admin/subjects`, `/api/admin/topics`, `/api/admin/questions`, `/api/admin/questions/generate`, `/api/admin/questions/review`, `/api/admin/questions/import`, `/api/admin/external-problems/import`
- Assessments: `/api/admin/assessments`, `/api/admin/assessment-results`, `/api/admin/assessment-stats`
- Adaptive & Roadmap Config: `/api/admin/adaptive/config`, `/api/admin/roadmap/prerequisites`, `/api/admin/roadmap/config`
- AI Tutor & Coding Management: `/api/admin/tutor/config`, `/api/admin/tutor/analytics`, `/api/admin/coding/problems`, `/api/admin/coding/problems/:id/testcases`

