import { Router } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { csrfProtection } from '../middleware/csrf';
import * as auth from '../controllers/auth.controller';
import * as users from '../controllers/user.controller';
import * as content from '../controllers/content.controller';
import * as practice from '../controllers/practice.controller';
import * as admin from '../controllers/admin.controller';
import * as extProblems from '../controllers/externalProblem.controller';
import * as qbAdmin from '../controllers/questionBankAdmin.controller';
import * as assessments from '../controllers/assessment.controller';
import * as assessmentAdmin from '../controllers/assessmentAdmin.controller';
import * as adaptive from '../controllers/adaptive.controller';
import * as roadmap from '../controllers/roadmap.controller';
import * as tutor from '../controllers/tutor.controller';
import * as coding from '../controllers/coding.controller';
import * as interview from '../controllers/interview.controller';
import {
  createInterviewSchema,
  submitAnswerSchema,
} from '../validators/interview.validators';
import {
  runCodeSchema,
  submitCodeSchema,
  saveDraftSchema,
  createCodingProblemSchema,
  createTestCaseSchema,
} from '../validators/coding.validators';
import {
  generateRoadmapSchema,
  updateRoadmapSettingsSchema,
  replanRoadmapSchema,
  completeTaskSchema,
  rescheduleTaskSchema,
  addPrerequisiteSchema,
  updateRoadmapConfigSchema,
} from '../validators/roadmap.validators';
import {
  createConversationSchema,
  sendMessageSchema,
  updateAdminConfigSchema,
} from '../validators/tutor.validators';
import {
  startAdaptiveSessionSchema,
  submitAdaptiveAnswerSchema,
  updateBKTConfigSchema,
} from '../validators/adaptive.validators';
import { loginSchema, registerSchema } from '../validators/auth.validators';
import { changePasswordSchema, updateProfileSchema } from '../validators/user.validators';
import {
  createCategorySchema,
  updateCategorySchema,
  createSubjectSchema,
  updateSubjectSchema,
  createTopicSchema,
  updateTopicSchema,
  createQuestionSchema,
  updateQuestionSchema,
  submitAttemptSchema,
} from '../validators/topic.validators';
import {
  importExternalProblemsSchema,
  updateExternalProgressSchema,
  generateQuestionsRequestSchema,
  reviewQuestionSchema,
  bulkImportQuestionsSchema,
} from '../validators/external.validators';
import {
  createAssessmentTemplateSchema,
  updateAssessmentTemplateSchema,
  saveAssessmentAnswerSchema,
} from '../validators/assessment.validators';
import type { createRateLimiters } from '../middleware/rateLimiters';

export function buildApiRouter(limiters: ReturnType<typeof createRateLimiters>): Router {
  const api = Router();
  api.use(limiters.api);
  api.use(csrfProtection);

  api.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: { status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' },
    });
  });

  // Auth routes
  const authRouter = Router();
  authRouter.post('/register', limiters.register, validateBody(registerSchema), asyncHandler(auth.register));
  authRouter.post('/login', limiters.login, validateBody(loginSchema), asyncHandler(auth.login));
  authRouter.post('/refresh', asyncHandler(auth.refresh));
  authRouter.post('/logout', asyncHandler(auth.logout));
  authRouter.get('/me', requireAuth, asyncHandler(auth.me));
  api.use('/auth', authRouter);

  // User Profile routes
  const usersRouter = Router();
  usersRouter.use(requireAuth);
  usersRouter.get('/profile', asyncHandler(users.getProfile));
  usersRouter.patch('/profile', validateBody(updateProfileSchema), asyncHandler(users.updateProfile));
  usersRouter.patch('/password', validateBody(changePasswordSchema), asyncHandler(users.changePassword));
  api.use('/users', usersRouter);

  // Student-Facing Content Browsing (Open to authenticated students)
  const categoryRouter = Router();
  categoryRouter.get('/', asyncHandler(content.listCategories));
  categoryRouter.get('/:slug', asyncHandler(content.getCategoryBySlug));
  api.use('/categories', categoryRouter);

  const subjectRouter = Router();
  subjectRouter.get('/', asyncHandler(content.listSubjects));
  subjectRouter.get('/:id', asyncHandler(content.getSubjectById));
  api.use('/subjects', subjectRouter);

  const topicRouter = Router();
  topicRouter.get('/', asyncHandler(content.listTopics));
  topicRouter.get('/:id', asyncHandler(content.getTopicById));
  api.use('/topics', topicRouter);

  const questionRouter = Router();
  questionRouter.get('/', asyncHandler(content.listQuestions));
  questionRouter.get('/:id', asyncHandler(content.getQuestionById));
  api.use('/questions', questionRouter);

  // Student Practice & History routes
  const practiceRouter = Router();
  practiceRouter.use(requireAuth);
  practiceRouter.post('/attempts', validateBody(submitAttemptSchema), asyncHandler(practice.submitAttempt));
  practiceRouter.get('/history', asyncHandler(practice.getPracticeHistory));
  practiceRouter.get('/stats', asyncHandler(practice.getGeneralStats));
  practiceRouter.get('/topics/:topicId/stats', asyncHandler(practice.getTopicStats));
  api.use('/practice', practiceRouter);

  // Student External Problems & Completion Tracking
  const extRouter = Router();
  extRouter.get('/', asyncHandler(extProblems.listExternalProblems));
  extRouter.get('/:id', asyncHandler(extProblems.getExternalProblemById));
  extRouter.get('/progress/me', requireAuth, asyncHandler(extProblems.getStudentExternalProgress));
  extRouter.patch(
    '/:id/progress',
    requireAuth,
    validateBody(updateExternalProgressSchema),
    asyncHandler(extProblems.updateExternalProgress),
  );
  api.use('/external-problems', extRouter);

  // Phase 3: Student Assessment, Timed Session, Results & Skill Profile Routes
  const assessmentRouter = Router();
  assessmentRouter.use(requireAuth);
  assessmentRouter.get('/', asyncHandler(assessments.listAssessments));
  assessmentRouter.get('/:templateId', asyncHandler(assessments.getAssessmentById));
  assessmentRouter.post('/:templateId/start', asyncHandler(assessments.startAssessment));
  api.use('/assessments', assessmentRouter);

  const sessionRouter = Router();
  sessionRouter.use(requireAuth);
  sessionRouter.get('/:sessionId', asyncHandler(assessments.getAssessmentSession));
  sessionRouter.patch(
    '/:sessionId/answers',
    validateBody(saveAssessmentAnswerSchema),
    asyncHandler(assessments.saveAnswers),
  );
  sessionRouter.post('/:sessionId/submit', asyncHandler(assessments.submitAssessment));
  sessionRouter.get('/:sessionId/result', asyncHandler(assessments.getSessionResult));
  sessionRouter.get('/:sessionId/review', asyncHandler(assessments.getSessionReview));
  api.use('/assessment-sessions', sessionRouter);

  api.get('/assessment-history', requireAuth, asyncHandler(assessments.getAssessmentHistory));
  api.get('/skill-profiles/me', requireAuth, asyncHandler(assessments.getMySkillProfile));

  // Phase 4: Adaptive Learning, BKT Mastery, Personalized Sessions & Recommendations
  const adaptiveRouter = Router();
  adaptiveRouter.use(requireAuth);
  adaptiveRouter.get('/mastery', asyncHandler(adaptive.getMastery));
  adaptiveRouter.get('/mastery/:topicId', asyncHandler(adaptive.getTopicMastery));
  adaptiveRouter.get('/mastery/:topicId/history', asyncHandler(adaptive.getTopicHistory));
  adaptiveRouter.post(
    '/sessions',
    validateBody(startAdaptiveSessionSchema),
    asyncHandler(adaptive.startSession),
  );
  adaptiveRouter.get('/sessions/:sessionId', asyncHandler(adaptive.getSession));
  adaptiveRouter.post(
    '/sessions/:sessionId/answer',
    validateBody(submitAdaptiveAnswerSchema),
    asyncHandler(adaptive.submitAnswer),
  );
  adaptiveRouter.get('/sessions/:sessionId/next', asyncHandler(adaptive.getNextQuestion));
  adaptiveRouter.post('/sessions/:sessionId/complete', asyncHandler(adaptive.completeSession));
  adaptiveRouter.get('/sessions/:sessionId/results', asyncHandler(adaptive.getSessionResults));
  adaptiveRouter.get('/recommendations', asyncHandler(adaptive.getRecommendations));
  adaptiveRouter.get('/weak-topics', asyncHandler(adaptive.getWeakTopicsList));
  adaptiveRouter.get('/analytics', asyncHandler(adaptive.getAnalytics));
  api.use('/adaptive', adaptiveRouter);

  // Phase 5: Personalized Learning Roadmaps, Scheduling, Revisions & Tasks
  const roadmapRouter = Router();
  roadmapRouter.use(requireAuth);
  roadmapRouter.post('/generate', validateBody(generateRoadmapSchema), asyncHandler(roadmap.generate));
  roadmapRouter.get('/active', asyncHandler(roadmap.getActive));
  roadmapRouter.get('/:roadmapId', asyncHandler(roadmap.getById));
  roadmapRouter.patch('/:roadmapId/settings', validateBody(updateRoadmapSettingsSchema), asyncHandler(roadmap.updateSettings));
  roadmapRouter.post('/:roadmapId/replan', validateBody(replanRoadmapSchema), asyncHandler(roadmap.replan));
  roadmapRouter.post('/:roadmapId/pause', asyncHandler(roadmap.pause));
  roadmapRouter.post('/:roadmapId/resume', asyncHandler(roadmap.resume));
  roadmapRouter.get('/:roadmapId/tasks', asyncHandler(roadmap.getTasks));
  roadmapRouter.get('/:roadmapId/tasks/today', asyncHandler(roadmap.getToday));
  roadmapRouter.get('/:roadmapId/tasks/week', asyncHandler(roadmap.getWeek));
  roadmapRouter.get('/:roadmapId/progress', asyncHandler(roadmap.getProgress));
  roadmapRouter.get('/:roadmapId/milestones', asyncHandler(roadmap.getMilestones));
  roadmapRouter.get('/:roadmapId/analytics', asyncHandler(roadmap.getAnalytics));
  api.use('/roadmaps', roadmapRouter);

  const taskRouter = Router();
  taskRouter.use(requireAuth);
  taskRouter.post('/:taskId/complete', validateBody(completeTaskSchema), asyncHandler(roadmap.completeTaskHandler));
  taskRouter.post('/:taskId/skip', asyncHandler(roadmap.skipTaskHandler));
  taskRouter.post('/:taskId/reschedule', validateBody(rescheduleTaskSchema), asyncHandler(roadmap.rescheduleTaskHandler));
  api.use('/roadmap-tasks', taskRouter);

  const revisionRouter = Router();
  revisionRouter.use(requireAuth);
  revisionRouter.get('/due', asyncHandler(roadmap.getDue));
  revisionRouter.get('/upcoming', asyncHandler(roadmap.getDue));
  revisionRouter.post('/:revisionId/complete', asyncHandler(roadmap.completeRevision));
  api.use('/revisions', revisionRouter);

  // Phase 6: Student AI Tutor Routes
  const tutorRouter = Router();
  tutorRouter.use(requireAuth);
  tutorRouter.get('/quota', asyncHandler(tutor.getTutorQuota));
  tutorRouter.get('/conversations', asyncHandler(tutor.listConversations));
  tutorRouter.post('/conversations', validateBody(createConversationSchema), asyncHandler(tutor.createConversation));
  tutorRouter.post('/quick-context', asyncHandler(tutor.createQuickContextConversation));
  tutorRouter.get('/conversations/:id', asyncHandler(tutor.getConversation));
  tutorRouter.post('/conversations/:id/messages', validateBody(sendMessageSchema), asyncHandler(tutor.postMessage));
  tutorRouter.delete('/conversations/:id', asyncHandler(tutor.deleteConversation));
  api.use('/tutor', tutorRouter);

  // Phase 7: Student Online Coding Platform Routes
  const codingRouter = Router();
  codingRouter.use(requireAuth);
  codingRouter.get('/problems', asyncHandler(coding.listCodingProblems));
  codingRouter.get('/problems/:id', asyncHandler(coding.getCodingProblem));
  codingRouter.post('/problems/:id/run', validateBody(runCodeSchema), asyncHandler(coding.runCode));
  codingRouter.post('/problems/:id/submit', validateBody(submitCodeSchema), asyncHandler(coding.submitCode));
  codingRouter.get('/problems/:id/draft', asyncHandler(coding.getCodeDraft));
  codingRouter.put('/problems/:id/draft', validateBody(saveDraftSchema), asyncHandler(coding.saveCodeDraft));
  codingRouter.post('/problems/:id/draft', validateBody(saveDraftSchema), asyncHandler(coding.saveCodeDraft));
  codingRouter.get('/submissions', asyncHandler(coding.listSubmissions));
  codingRouter.get('/submissions/:id', asyncHandler(coding.getSubmission));
  codingRouter.get('/analytics', asyncHandler(coding.getCodingAnalytics));
  api.use('/coding', codingRouter);

  // Phase 8: AI Mock Interview Routes
  const interviewRouter = Router();
  interviewRouter.use(requireAuth);
  interviewRouter.get('/config', asyncHandler(interview.getInterviewConfig));
  interviewRouter.post('/', validateBody(createInterviewSchema), asyncHandler(interview.createInterview));
  interviewRouter.get('/', asyncHandler(interview.listInterviews));
  interviewRouter.get('/analytics', asyncHandler(interview.getInterviewAnalytics));
  interviewRouter.get('/:sessionId', asyncHandler(interview.getInterview));
  interviewRouter.post('/:sessionId/start', asyncHandler(interview.startInterview));
  interviewRouter.get('/:sessionId/current-question', asyncHandler(interview.getCurrentQuestion));
  interviewRouter.post('/:sessionId/answer', validateBody(submitAnswerSchema), asyncHandler(interview.submitAnswer));
  interviewRouter.post('/:sessionId/complete', asyncHandler(interview.completeInterview));
  interviewRouter.post('/:sessionId/abandon', asyncHandler(interview.abandonInterview));
  interviewRouter.get('/:sessionId/report', asyncHandler(interview.getInterviewReport));
  interviewRouter.get('/:sessionId/review', asyncHandler(interview.getInterviewReview));
  api.use('/interviews', interviewRouter);

  // Administrator Management routes (Strictly requires admin role)
  const adminRouter = Router();
  adminRouter.use(requireAuth);
  adminRouter.use(requireRole('admin'));

  adminRouter.get('/stats', asyncHandler(admin.getAdminStats));

  // Category CRUD
  adminRouter.post('/categories', validateBody(createCategorySchema), asyncHandler(admin.createCategory));
  adminRouter.patch('/categories/:id', validateBody(updateCategorySchema), asyncHandler(admin.updateCategory));
  adminRouter.delete('/categories/:id', asyncHandler(admin.deleteCategory));

  // Subject CRUD
  adminRouter.post('/subjects', validateBody(createSubjectSchema), asyncHandler(admin.createSubject));
  adminRouter.patch('/subjects/:id', validateBody(updateSubjectSchema), asyncHandler(admin.updateSubject));
  adminRouter.delete('/subjects/:id', asyncHandler(admin.deleteSubject));

  // Topic CRUD
  adminRouter.post('/topics', validateBody(createTopicSchema), asyncHandler(admin.createTopic));
  adminRouter.patch('/topics/:id', validateBody(updateTopicSchema), asyncHandler(admin.updateTopic));
  adminRouter.delete('/topics/:id', asyncHandler(admin.deleteTopic));

  // Question CRUD
  adminRouter.get('/questions', asyncHandler(admin.listAdminQuestions));
  adminRouter.post('/questions', validateBody(createQuestionSchema), asyncHandler(admin.createQuestion));
  adminRouter.patch('/questions/:id', validateBody(updateQuestionSchema), asyncHandler(admin.updateQuestion));
  adminRouter.delete('/questions/:id', asyncHandler(admin.deleteQuestion));

  // Automated Question Bank System Routes (Phase 2 Extension)
  adminRouter.post(
    '/external-problems/import',
    validateBody(importExternalProblemsSchema),
    asyncHandler(qbAdmin.importExternalProblems),
  );
  adminRouter.post(
    '/questions/generate',
    validateBody(generateQuestionsRequestSchema),
    asyncHandler(qbAdmin.generateQuestions),
  );
  adminRouter.get('/questions/review', asyncHandler(qbAdmin.getReviewQueue));
  adminRouter.patch(
    '/questions/:id/review',
    validateBody(reviewQuestionSchema),
    asyncHandler(qbAdmin.reviewQuestion),
  );
  adminRouter.post(
    '/questions/import',
    validateBody(bulkImportQuestionsSchema),
    asyncHandler(qbAdmin.bulkImportQuestions),
  );
  adminRouter.get('/generation-jobs', asyncHandler(qbAdmin.listGenerationJobs));
  adminRouter.get('/import-batches', asyncHandler(qbAdmin.listImportBatches));

  // Phase 3: Admin Assessment Template & Analytics Routes
  adminRouter.get('/assessments', asyncHandler(assessmentAdmin.listAdminAssessments));
  adminRouter.get('/assessments/:id', asyncHandler(assessmentAdmin.getAdminAssessmentById));
  adminRouter.post(
    '/assessments',
    validateBody(createAssessmentTemplateSchema),
    asyncHandler(assessmentAdmin.createAdminAssessment),
  );
  adminRouter.patch(
    '/assessments/:id',
    validateBody(updateAssessmentTemplateSchema),
    asyncHandler(assessmentAdmin.updateAdminAssessment),
  );
  adminRouter.delete('/assessments/:id', asyncHandler(assessmentAdmin.deleteAdminAssessment));
  adminRouter.get('/assessment-results', asyncHandler(assessmentAdmin.listAdminAssessmentResults));
  adminRouter.get('/assessment-stats', asyncHandler(assessmentAdmin.getAdminAssessmentStats));

  // Phase 4: Admin Adaptive Learning & BKT Configuration
  adminRouter.get('/adaptive/config', asyncHandler(adaptive.getAdminBKTConfig));
  adminRouter.post(
    '/adaptive/config',
    validateBody(updateBKTConfigSchema),
    asyncHandler(adaptive.updateAdminBKTConfig),
  );

  // Phase 5: Admin Prerequisite Graph & Roadmap Configuration
  adminRouter.get('/roadmap/prerequisites', asyncHandler(roadmap.listPrerequisites));
  adminRouter.post(
    '/roadmap/prerequisites',
    validateBody(addPrerequisiteSchema),
    asyncHandler(roadmap.createPrerequisite),
  );
  adminRouter.delete('/roadmap/prerequisites/:id', asyncHandler(roadmap.deletePrerequisite));
  adminRouter.get('/roadmap/config', asyncHandler(roadmap.getConfig));
  adminRouter.patch(
    '/roadmap/config',
    validateBody(updateRoadmapConfigSchema),
    asyncHandler(roadmap.updateConfig),
  );

  // Phase 6: Admin AI Tutor Configuration & Telemetry
  adminRouter.get('/tutor/config', asyncHandler(tutor.getAdminConfig));
  adminRouter.patch(
    '/tutor/config',
    validateBody(updateAdminConfigSchema),
    asyncHandler(tutor.updateAdminConfig),
  );
  adminRouter.get('/tutor/analytics', asyncHandler(tutor.getAdminUsageAnalytics));

  // Phase 7: Admin Coding Problem Management
  adminRouter.post(
    '/coding/problems',
    validateBody(createCodingProblemSchema),
    asyncHandler(coding.adminCreateCodingProblem),
  );
  adminRouter.patch('/coding/problems/:id', asyncHandler(coding.adminUpdateCodingProblem));
  adminRouter.post(
    '/coding/problems/:id/testcases',
    validateBody(createTestCaseSchema),
    asyncHandler(coding.adminAddTestCase),
  );

  api.use('/admin', adminRouter);

  return api;
}
