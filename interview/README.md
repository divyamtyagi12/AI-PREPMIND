# PrepMind AI
> **AI-Powered Adaptive Learning & Placement Preparation System**
> Transformative MERN platform designed for college students preparing for technical placements.

---

## 1. Project Overview & Multi-Phase Architecture

**PrepMind AI** is an adaptive placement preparation platform. The codebase has progressed through:

- **Phase 1 (Foundation):** Clean MERN architecture, strict MongoDB Atlas persistence, JWT session rotation with HTTP-only cookies, student onboarding wizard, profile settings, and dashboard shell.
- **Phase 2 (Dynamic Taxonomy & Practice System):** Full administrative taxonomy and question management, student category/subject/topic exploration, interactive MCQ and conceptual question practice, deterministic backend evaluation, practice history, and real dashboard statistics.
- **Automated Question Bank System:**
  - **DSA Discovery (LeetCode & CodeChef):** Curated permitted problem metadata across 21 DSA topics with direct problem links and student self-completion tracking (`Not Started`, `In Progress`, `Solved`, `Revisit`). Complies with third-party copyright by never scraping copyrighted problem statements.
  - **AI Question Generation (Gemini):** Original single-choice, multiple-select, and short-conceptual question generation for Core CS & Aptitude referencing standard syllabi (e.g., GeeksforGeeks topic coverage). Strict structural validation via Zod schemas and automatic assignment to the `Draft` state.
  - **Administrative Review Queue:** All AI-generated and imported questions require explicit review and approval (`approve` / `reject`) before being published to students.
  - **Bulk Question Importer:** High-throughput JSON import with row-by-row error reporting, transactional safety, and duplicate detection.

| Feature Area | Implementation Details |
| :--- | :--- |
| **Taxonomy Storage** | Dynamic MongoDB collections (`categories`, `subjects`, `topics`) replacing any static files. |
| **Question Bank** | Versatile schema supporting single-choice MCQs, multiple-select MCQs, and short conceptual questions. Versioned, taggable, with draft/published/archived status. |
| **Answer Security** | Dual-serializer security model: correct answers and explanations are stripped at the database query level for student fetches and revealed strictly post-submission. |
| **Practice Engine** | Deterministic backend evaluation for MCQs; self-review workflow with model reference answer and evaluation criteria for conceptual questions. |
| **Admin System** | Strict role-based access (`requireRole('admin')`), taxonomy creation/deactivation, question authoring interface, and overall platform metrics. |

---

## 2. Technology Stack

### Frontend (`client/`)
- **React 19 & Vite**
- **React Router v7** with public, student-protected, and admin-protected route guards
- **Tailwind CSS v4** with deep navy, indigo, white, and violet design tokens
- **Radix UI & Lucide React** accessible UI components
- **Axios** with automatic token refresh, double-submit CSRF interceptors, and error normalization
- **Sonner** toast notifications

### Backend (`server/`)
- **Node.js, Express.js & TypeScript**
- **MongoDB & Mongoose** with strict models, compound indexes, and partial filter expressions
- **Zod v4** request schema validation
- **bcrypt** (12 rounds) salted hashing
- **jsonwebtoken** for short-lived access and revocable refresh tokens
- **Security Middleware**: Helmet, restricted CORS origins, double-submit CSRF checks, and IP-rate limiting

---

## 3. Phase 2 Features Implemented

### A. Dynamic Taxonomy (Categories, Subjects & Topics)
1. **Three Core Placement Categories**:
   - **DSA (Data Structures & Algorithms)**: Linear, Non-Linear, and Advanced Algorithms.
   - **Core Computer Science**: DBMS, Operating Systems, Computer Networks, and Object-Oriented Programming.
   - **Aptitude & Reasoning**: Quantitative Aptitude, Logical Reasoning, and Verbal Ability.
2. **Hierarchical Topics**:
   - Supports parent-topic relationships with validation preventing circular hierarchy loops.
   - Soft deactivation preserving referential integrity of past student submissions.
3. **Idempotent Seed Script**:
   - `npm run seed:taxonomy -w server` populates the complete initial educational taxonomy without overwriting existing changes or duplicating records.

### B. Comprehensive Question Bank
1. **Supported Question Types**:
   - `single_choice`: Radio-style MCQ with exactly one correct option.
   - `multiple_select`: Checkbox-style MCQ with set-based order-independent correctness.
   - `short_conceptual`: Free-text student answers with model reference answers and self-evaluation checklists (never falsely auto-scored with brittle string comparisons).
2. **Difficulty & Status**: Easy, Medium, Hard; Draft, Published, Archived.
3. **Strict Security**: Correct answers and private explanations are excluded from student-facing API responses using Mongoose projections (`select: false`).

### C. Student Practice Experience
1. **Interactive Practice Runner**:
   - Difficulty badge, hints disclosure toggle, accessible option selectors, and live timer.
   - Instant post-submission feedback card displaying correct/incorrect status, reference answers, and detailed explanations.
2. **Practice History**:
   - Paginated historical logs with status filters (Correct, Incorrect, Self-Review), timestamps, and time taken.
3. **Real Practice Analytics on Dashboard**:
   - Genuine metrics: Unique questions attempted, objective practice accuracy percentage, attempts by category, and recent activity logs.
   - Honest empty states when no attempts have been recorded yet.

### D. Administrator Interface (`/admin`)
1. **Admin Overview**: High-level platform statistics (categories, subjects, topics, question bank breakdown, total student submissions).
2. **Question Bank Management**: Filterable list of all questions with status toggles, editing capabilities, and archiving.
3. **Interactive Question Creator**: Cascading Category → Subject → Topic selectors, dynamic option rows, hint generators, and checklist builders.
4. **Taxonomy Manager**: Live topic creation and organization per subject.

---

## 4. API Endpoints

### Student Content & Practice Endpoints
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/categories` | Public / Student | List all active categories |
| `GET` | `/api/categories/:slug` | Public / Student | Category details with subjects & question counts |
| `GET` | `/api/subjects` | Public / Student | List subjects (supports `?categoryId=`) |
| `GET` | `/api/subjects/:id` | Public / Student | Subject details with active topics |
| `GET` | `/api/topics` | Public / Student | List topics (supports `?subjectId=`, `?categoryId=`) |
| `GET` | `/api/topics/:id` | Public / Student | Topic overview with practice entry point |
| `GET` | `/api/questions` | Public / Student | List published questions with filters & pagination |
| `GET` | `/api/questions/:id` | Public / Student | Fetch question (correct answers stripped) |
| `POST`| `/api/practice/attempts` | Authenticated | Submit answer, evaluate, and save attempt |
| `GET` | `/api/practice/history` | Authenticated | Paginated practice attempt logs for student |
| `GET` | `/api/practice/stats` | Authenticated | Real student practice accuracy & category metrics |
| `GET` | `/api/practice/topics/:topicId/stats`| Authenticated | Topic-specific attempt counts & accuracy |
| `GET` | `/api/external-problems` | Authenticated | List LeetCode & CodeChef DSA problems with filters |
| `GET` | `/api/external-problems/:id` | Authenticated | Fetch external problem metadata & student progress |
| `GET` | `/api/external-problems/progress/me` | Authenticated | Fetch student's progress across all external problems |
| `PATCH`| `/api/external-problems/:id/progress` | Authenticated | Update status (`Not Started`, `In Progress`, `Solved`, `Revisit`) |
| `GET` | `/api/assessments` | Authenticated | List published assessment templates & student attempt status |
| `GET` | `/api/assessments/:templateId` | Authenticated | Fetch assessment template details, rules, & past attempts |
| `POST`| `/api/assessments/:templateId/start` | Authenticated | Start new timed assessment session or resume active session |
| `GET` | `/api/assessment-sessions/:sessionId` | Authenticated | Fetch active assessment session (answer keys stripped) |
| `PATCH`| `/api/assessment-sessions/:sessionId/answers`| Authenticated | Debounced revision-safe answer autosave |
| `POST`| `/api/assessment-sessions/:sessionId/submit` | Authenticated | Idempotent session finalization, scoring, & skill update |
| `GET` | `/api/assessment-sessions/:sessionId/result` | Authenticated | Fetch overall, category, & topic-wise scorecard |
| `GET` | `/api/assessment-sessions/:sessionId/review` | Authenticated | Post-submission answer review with explanations |
| `GET` | `/api/assessment-history` | Authenticated | Paginated, sortable student assessment history |
| `GET` | `/api/skill-profiles/me` | Authenticated | Fetch student's topic-wise Initial Skill Profile |

### Administrative Endpoints (`requireRole('admin')`)
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | Admin | Overall taxonomy and question bank metrics |
| `POST` | `/api/admin/categories` | Admin | Create new category |
| `PATCH`| `/api/admin/categories/:id` | Admin | Update category details or slug |
| `DELETE`| `/api/admin/categories/:id`| Admin | Deactivate category (soft delete) |
| `POST` | `/api/admin/subjects` | Admin | Create new subject under category |
| `PATCH`| `/api/admin/subjects/:id` | Admin | Update subject |
| `DELETE`| `/api/admin/subjects/:id` | Admin | Deactivate subject (soft delete) |
| `POST` | `/api/admin/topics` | Admin | Create topic (validates hierarchy) |
| `PATCH`| `/api/admin/topics/:id` | Admin | Update topic |
| `DELETE`| `/api/admin/topics/:id` | Admin | Deactivate topic (soft delete) |
| `GET` | `/api/admin/questions` | Admin | List all questions including Drafts & Answers |
| `POST` | `/api/admin/questions` | Admin | Author and publish new question |
| `PATCH`| `/api/admin/questions/:id` | Admin | Edit question (increments version) |
| `DELETE`| `/api/admin/questions/:id`| Admin | Archive question |
| `POST` | `/api/admin/external-problems/import` | Admin | Bulk import permitted external problem metadata |
| `POST` | `/api/admin/questions/generate` | Admin | Trigger Gemini original question generation job |
| `GET` | `/api/admin/questions/review` | Admin | Paginated question review queue (`Draft` state) |
| `PATCH`| `/api/admin/questions/:id/review` | Admin | Approve or reject questions with feedback |
| `POST` | `/api/admin/questions/import` | Admin | Bulk JSON/CSV question bank importer |
| `GET` | `/api/admin/assessments` | Admin | List all assessment templates & session counts |
| `POST` | `/api/admin/assessments` | Admin | Create assessment template (validates question inventory) |
| `PATCH`| `/api/admin/assessments/:id` | Admin | Edit assessment template & revalidate inventory |
| `DELETE`| `/api/admin/assessments/:id` | Admin | Archive assessment template |
| `GET` | `/api/admin/assessment-results` | Admin | Paginated list of all student assessment results |
| `GET` | `/api/admin/assessment-stats` | Admin | Platform-wide assessment & topic accuracy analytics |

---

## 5. Administrator Setup Instructions

To securely provision the initial administrator without exposing role elevation endpoints to students:

```bash
# Run server-side admin provisioning CLI
npx tsx src/utils/createAdmin.ts <email> <password> [name]
```

*Example:*
```bash
npx tsx src/utils/createAdmin.ts admin@prepmind.com StrongAdminPass1 "Lead Admin"
```
If the user already exists, they will be promoted to `admin`. If not, a new administrative account will be created.

---

## 6. Seed Initial Placement Taxonomy, External Problems & Assessments

To populate the complete default DSA, Core CS, and Aptitude hierarchy:
```bash
npm run seed:taxonomy
# Or from server workspace:
cd server && npm run seed:taxonomy
```

To seed initial curated DSA problems from LeetCode and CodeChef:
```bash
npm run seed:external
# Or from server workspace:
cd server && npm run seed:external
```

To seed verified MCQ questions and the 4 default Phase 3 Assessment Templates:
```bash
# Preview what would be created without modifying MongoDB:
npm run seed:assessments -- --dry-run

# Execute idempotent seeding:
npm run seed:assessments
```

---

## 7. Automated Testing & Verification

All automated tests execute against an isolated in-memory MongoDB server (`mongodb-memory-server`):

```bash
npm test
```

### Test Suite Summary (111 Tests Passed: 100 Backend + 11 Frontend)
- **Backend Tests (`server/tests/`, 100 tests across 6 suites)**:
  - `assessment.test.ts` (41 tests):
    - **A. Session Management (9 tests):** Template creation, session start, session resume, duplicate active session prevention, attempt limits (`maxAttempts`), cooldowns (`cooldownHours`), unauthorized student boundary checks, archived template rejection, question inventory shortages.
    - **B. Timers & Expiration (6 tests):** Server-side expiration timestamp arithmetic, late answer rejection, automatic finalization via user sync, protection against frontend timer tampering, browser refresh persistence, expired result retention.
    - **C. Answer Autosave (8 tests):** Single answer persistence, answer updates, answer clearing (`null`), invalid option ID rejection, questions outside session rejection, stale revision protection, atomic batch autosave, post-submission modification rejection.
    - **D. Scoring Engine (8 tests):** Deterministic single-choice, negative marking, multiple-select exact match, multiple-select order independence, multiple-select partial selection rejection, unanswered scoring rules, maximum and percentage score formulas, topic and category accuracy breakdowns.
    - **E. Submission & Concurrency (4 tests):** Clean submit lifecycle, duplicate submit idempotency, concurrent submission race safety (guaranteeing exactly 1 result and exactly 1 skill profile update), post-expiration submission handling.
    - **F. Security & Permissions (6 tests):** Unauthenticated 401 rejection, cross-student session and result boundaries, student admin route denial, double-submit CSRF protection on mutations, active session answer key suppression, review release policies (`immediate`, `after_expiry`, `never`).
  - `seedAssessments.test.ts` (6 tests): First-time execution, idempotency on repetition, custom question preservation, admin template modification preservation, question structure validator rejection, dry-run mode verification.
  - `auth.test.ts` (25 tests): Registration, login, rate limiting, JWT token rotation, reuse revocation, CSRF token validation.
  - `profile.test.ts` (20 tests): Profile updates, validation, password changes with cross-device session revocation, authorization boundary checks.
  - `practice.test.ts` (5 tests): Taxonomy CRUD, circular hierarchy prevention, student answer hiding, single-choice and multiple-select evaluation, conceptual self-review validation, practice history isolation.
  - `automatedQuestionBank.test.ts` (3 tests): Permitted LeetCode & CodeChef metadata imports, deduplication, student progress updates, bulk JSON import into `Draft` review queue, and administrative approval workflow.
- **Frontend Tests (`client/src/test/components.test.jsx`, 11 tests)**:
  - Form validation on login and registration.
  - Profile editing and data submission.
  - Dashboard honest empty states without fake data.
  - Practice runner interaction: option selection, submission, and instant feedback rendering.
  - DSA Problem Explorer: LeetCode & CodeChef platform badges, direct solve links, and progress status tracking.
  - Question Review Queue: displays pending draft questions, allows approving and publishing to student bank.
  - AI Question Generator: validates taxonomy selectors and triggers backend generation.
  - Phase 3 Assessment Suite: AssessmentList diagnostic banner, AssessmentRunner countdown timer, question navigator, autosave, submission confirmation dialog, and AssessmentHistory table.

---

## 8. Multi-Phase Roadmap Status

- [x] **Phase 1:** MERN Stack Architecture, MongoDB Setup, Auth System, Student Onboarding, Profile Management, Dashboard Shell.
- [x] **Phase 2:** Dynamic Topic Taxonomy, Full Question Bank (MCQ & Conceptual), Answer Evaluation Engine, Practice History & Real Dashboard Stats, Admin Suite.
- [x] **Phase 3:** Diagnostic Assessment Engine, Timed Tests, Automatic Scoring, Answer Review & Initial Skill Analysis.
- [x] **Phase 3 Stabilization & Architecture:**
  - Automated test coverage expanded to 41 assessment tests + 6 seed tests (111 total tests passing).
  - Removal of auto-seeding on server boot; explicit, idempotent CLI commands with `--dry-run`.
  - Bayesian Knowledge Tracing (BKT) prior initialization architectural contract established (`KnowledgeState` model, separation of empirical accuracy vs latent mastery, mathematical Bayes update formulas, diagnostic replay policy).
- [ ] **Phase 4:** Bayesian Knowledge Tracing (BKT) Adaptive Engine.
- [ ] **Phase 5:** Dynamic Personalized Learning Roadmaps.
- [ ] **Phase 6:** Gemini AI Tutor Integration.
- [ ] **Phase 7:** DSA Coding Environment & Assessment Execution.
- [ ] **Phase 8:** Interactive AI Mock Interviews & Feedback Analysis.
- [ ] **Phase 9:** Placement Readiness Analytics & Enterprise Polish.
