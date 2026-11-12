# PrepMind AI — Security Architecture & Threat Mitigations

## 1. Authentication & Session Security
- **Password Hashing**: `bcrypt` with cost factor 12 (`User.passwordHash` has `select: false` at the Mongoose schema level).
- **Token Architecture**: Short-lived JWT Access Tokens (`15m`) + rotating Refresh Tokens (`7d`, SHA-256 hashed in `RefreshToken` collection) stored in `HttpOnly`, `SameSite=Lax` (or `Secure` in production) cookies.
- **CSRF Defense**: Double-submit cookie pattern (`pm_csrf` cookie + `x-csrf-token` header) enforced on all state-mutating requests (`POST`, `PATCH`, `PUT`, `DELETE`) along with strict `Origin` header validation against `CLIENT_ORIGIN`.

## 2. Authorization & Multi-Tenant Student Isolation
- **Role-Based Access Control (RBAC)**: `requireAuth` and `requireRole('admin')` middleware protect all `/api/admin/*` routes (`401 Unauthorized` / `403 Forbidden`).
- **Cross-Student Ownership Guards**: Every student resource query (`AssessmentSession`, `KnowledgeState`, `AdaptiveSession`, `LearningRoadmap`, `TutorConversation`, `CodingSubmission`, `InterviewSession`, `InterviewReport`) filters by `{ _id, userId: req.user._id }` to prevent horizontal privilege escalation (IDOR).

## 3. Input Validation & Anti-Cheating Controls
- **Strict Zod Schemas**: All request bodies are validated via `.strict()` or typed Zod schemas before controller execution.
- **Hidden Answer & Test Case Protection**:
  - `Question.correctAnswer` and `explanation` are excluded from active practice/assessment queries and revealed only after server-side submission.
  - `CodingTestCase` records with `visibility: 'hidden'` are never serialized to the client.
- **Sandboxed Code Execution**: Student code is never executed on the Express host; it is dispatched over HTTPS to an isolated Judge0 execution container with strict CPU time (`timeLimitMs`) and memory (`memoryLimitMb`) caps.
- **AI Prompt Injection Resilience**: Student inputs to the AI Tutor and Mock Interviewer are wrapped in delimited user blocks with system instructions enforcing pedagogical/rubric boundaries and Zod JSON output parsing with deterministic fallbacks.

