# PrepMind AI — MongoDB Database Schema & Indexing Reference

## 1. Entity Inventory (41 Mongoose Models)

All 41 Mongoose models are located in `interview/server/src/models/`:

| # | Phase | Model File | Model Name | Collection Purpose | Key Compound / Unique Indexes |
|---|---|---|---|---|---|
| 1 | **Phase 1** | `User.ts` | `User` | Student & admin accounts, onboarding profile | `{ email: 1 }` (unique), `{ role: 1 }` |
| 2 | **Phase 1** | `Session.ts` | `Session` | Hashed rotating refresh tokens & device session state | `{ tokenHash: 1 }` (unique), `{ userId: 1 }`, `{ expiresAt: 1 }` |
| 3 | **Phase 2** | `Category.ts` | `Category` | Top-level domains (DSA, Core CS, Aptitude) | `{ slug: 1 }` (unique), `{ displayOrder: 1 }` |
| 4 | **Phase 2** | `Subject.ts` | `Subject` | Subjects within categories (OS, DBMS, CN, etc.) | `{ categoryId: 1, slug: 1 }` (unique) |
| 5 | **Phase 2** | `Topic.ts` | `Topic` | Granular preparation topics (21 DSA + Core CS + Aptitude) | `{ subjectId: 1, slug: 1 }` (unique), `{ categoryId: 1 }` |
| 6 | **Phase 2** | `Question.ts` | `Question` | Graded MCQ, multi-select, and conceptual questions | `{ topicId: 1, status: 1, difficulty: 1 }`, `{ contentHash: 1 }` |
| 7 | **Phase 2** | `PracticeAttempt.ts` | `PracticeAttempt` | Individual student question attempts | `{ userId: 1, questionId: 1, createdAt: -1 }` |
| 8 | **Phase 2** | `ExternalProblem.ts` | `ExternalProblem` | Curated LeetCode & CodeChef problem metadata | `{ platform: 1, externalId: 1 }` (unique), `{ topicId: 1 }` |
| 9 | **Phase 2** | `ExternalProblemProgress.ts` | `ExternalProblemProgress` | Student completion status on external DSA problems | `{ userId: 1, problemId: 1 }` (unique) |
| 10 | **Phase 2** | `QuestionGenerationJob.ts` | `QuestionGenerationJob` | Gemini AI question generation audit log | `{ requestedBy: 1, status: 1 }` |
| 11 | **Phase 2** | `QuestionImportBatch.ts` | `QuestionImportBatch` | Bulk import batch telemetry | `{ uploadedBy: 1, status: 1 }` |
| 12 | **Phase 3** | `AssessmentTemplate.ts` | `AssessmentTemplate` | Blueprint for diagnostic and topic/subject tests | `{ type: 1, status: 1 }` |
| 13 | **Phase 3** | `AssessmentSession.ts` | `AssessmentSession` | Active/submitted timed test state & frozen questions | `{ userId: 1, templateId: 1, status: 1 }` |
| 14 | **Phase 3** | `AssessmentResult.ts` | `AssessmentResult` | Immutable scored breakdown per completed session | `{ sessionId: 1 }` (unique), `{ userId: 1, completedAt: -1 }` |
| 15 | **Phase 3** | `InitialSkillProfile.ts` | `InitialSkillProfile` | Aggregated topic-wise baseline skill profile | `{ userId: 1, topicId: 1 }` (unique) |
| 16 | **Phase 4** | `KnowledgeState.ts` | `KnowledgeState` | Per-student per-topic BKT mastery probability `P(L_n)` | `{ userId: 1, topicId: 1 }` (unique) |
| 17 | **Phase 4** | `LearningObservation.ts` | `LearningObservation` | Immutable ledger of graded observations driving BKT | `{ observationId: 1 }` (unique), `{ userId: 1, topicId: 1, observedAt: 1 }` |
| 18 | **Phase 4** | `MasteryHistory.ts` | `MasteryHistory` | Time-series snapshots of student BKT mastery changes | `{ userId: 1, topicId: 1, recordedAt: 1 }` |
| 19 | **Phase 4** | `AdaptiveSession.ts` | `AdaptiveSession` | Adaptive practice session state and question log | `{ userId: 1, status: 1 }` |
| 20 | **Phase 4** | `BKTParameterConfig.ts` | `BKTParameterConfig` | Versioned BKT priors (`P(L0)`, `P(T)`, `P(S)`, `P(G)`) | `{ version: 1 }` (unique), `{ isActive: 1 }` |
| 21 | **Phase 5** | `TopicPrerequisite.ts` | `TopicPrerequisite` | Directed Acyclic Graph (DAG) edges between topics | `{ topicId: 1, prerequisiteTopicId: 1 }` (unique) |
| 22 | **Phase 5** | `LearningRoadmap.ts` | `LearningRoadmap` | Personalized study plan metadata & progress | `{ userId: 1, status: 1 }` |
| 23 | **Phase 5** | `RoadmapTask.ts` | `RoadmapTask` | Scheduled daily study/practice/revision tasks | `{ roadmapId: 1, scheduledDate: 1, status: 1 }` |
| 24 | **Phase 5** | `RoadmapMilestone.ts` | `RoadmapMilestone` | Weekly/phase milestones within a roadmap | `{ roadmapId: 1, order: 1 }` |
| 25 | **Phase 5** | `RevisionSchedule.ts` | `RevisionSchedule` | Spaced repetition schedule (`[1, 3, 7, 14, 30]` days) | `{ userId: 1, topicId: 1, status: 1, nextRevisionDate: 1 }` |
| 26 | **Phase 5** | `RoadmapAdjustmentLog.ts` | `RoadmapAdjustmentLog` | Audit log of dynamic replanning events | `{ roadmapId: 1, createdAt: -1 }` |
| 27 | **Phase 5** | `RoadmapConfig.ts` | `RoadmapConfig` | Admin-tunable priority weights & workload caps | `{ isActive: 1 }` |
| 28 | **Phase 6** | `TutorConversation.ts` | `TutorConversation` | Contextual AI Tutor thread metadata | `{ userId: 1, status: 1, lastMessageAt: -1 }` |
| 29 | **Phase 6** | `TutorMessage.ts` | `TutorMessage` | User & assistant messages with mode/hint telemetry | `{ conversationId: 1, createdAt: 1 }` |
| 30 | **Phase 6** | `TutorUsage.ts` | `TutorUsage` | Daily per-student request and token quota ledger | `{ userId: 1, date: 1 }` (unique) |
| 31 | **Phase 6** | `TutorAdminConfig.ts` | `TutorAdminConfig` | Global AI Tutor rate limits, model, and allowed modes | `{ version: -1 }` |
| 32 | **Phase 7** | `CodingProblem.ts` | `CodingProblem` | Online coding problem statement, starter code & limits | `{ slug: 1 }` (unique), `{ status: 1, difficulty: 1 }` |
| 33 | **Phase 7** | `CodingTestCase.ts` | `CodingTestCase` | Sample (`visibility: 'sample'`) and hidden test cases | `{ problemId: 1, visibility: 1, order: 1 }` |
| 34 | **Phase 7** | `CodingSubmission.ts` | `CodingSubmission` | Evaluated code submission & per-testcase metrics | `{ userId: 1, problemId: 1, submittedAt: -1 }` |
| 35 | **Phase 7** | `CodeDraft.ts` | `CodeDraft` | Autosaved student editor code per problem & language | `{ userId: 1, problemId: 1, language: 1 }` (unique) |
| 36 | **Phase 7** | `CodingProgress.ts` | `CodingProgress` | Per-problem solve status (`unattempted`/`attempted`/`solved`) | `{ userId: 1, problemId: 1 }` (unique) |
| 37 | **Phase 8** | `InterviewSession.ts` | `InterviewSession` | Mock interview configuration, timer, and lifecycle state | `{ userId: 1, status: 1, createdAt: -1 }` |
| 38 | **Phase 8** | `InterviewQuestion.ts` | `InterviewQuestion` | Primary & adaptive follow-up questions per session | `{ sessionId: 1, questionOrder: 1 }` |
| 39 | **Phase 8** | `InterviewAnswer.ts` | `InterviewAnswer` | Student text/voice transcript response per question | `{ sessionId: 1, questionId: 1 }` (unique) |
| 40 | **Phase 8** | `InterviewEvaluation.ts` | `InterviewEvaluation` | Per-question weighted rubric criterion scores & feedback | `{ sessionId: 1, questionId: 1 }` (unique) |
| 41 | **Phase 8** | `InterviewReport.ts` | `InterviewReport` | Session-level domain sub-scores, strengths & action plan | `{ sessionId: 1 }` (unique), `{ userId: 1, evaluatedAt: -1 }` |
