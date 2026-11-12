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

  api.use('/admin', adminRouter);

  return api;
}
