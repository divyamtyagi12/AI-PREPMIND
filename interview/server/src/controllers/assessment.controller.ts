import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getAuth } from '../middleware/auth';
import { AssessmentTemplate } from '../models/AssessmentTemplate';
import { AssessmentSession } from '../models/AssessmentSession';
import { AssessmentResult } from '../models/AssessmentResult';
import { InitialSkillProfile } from '../models/InitialSkillProfile';
import {
  evaluateObjectiveQuestion,
  finalizeAssessmentSession,
  isAnswerProvided,
  saveSessionAnswers,
  startOrResumeAssessmentSession,
  syncExpiredSessionsForUser,
} from '../services/assessment.service';
import { AppError } from '../utils/AppError';

function isValidObjectId(id: unknown): id is string {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
}

export async function listAssessments(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  await syncExpiredSessionsForUser(userId);

  const filter: Record<string, unknown> = { status: 'Published' };
  if (typeof req.query.type === 'string' && req.query.type) {
    filter.type = req.query.type;
  }
  if (typeof req.query.categoryId === 'string' && isValidObjectId(req.query.categoryId)) {
    filter.categoryIds = req.query.categoryId;
  }
  if (typeof req.query.subjectId === 'string' && isValidObjectId(req.query.subjectId)) {
    filter.subjectIds = req.query.subjectId;
  }
  if (typeof req.query.topicId === 'string' && isValidObjectId(req.query.topicId)) {
    filter.topicIds = req.query.topicId;
  }

  const templates = await AssessmentTemplate.find(filter)
    .populate('categoryIds', 'name slug')
    .populate('subjectIds', 'name slug')
    .populate('topicIds', 'name slug')
    .sort({ createdAt: -1 });

  const userSessions = await AssessmentSession.find({ userId }).sort({ createdAt: -1 }).lean();
  const userResults = await AssessmentResult.find({ userId }).sort({ completedAt: -1 }).lean();

  const now = Date.now();
  const enriched = templates.map((tpl) => {
    const tid = String(tpl._id);
    const tplSessions = userSessions.filter((s) => String(s.templateId) === tid);
    const activeSession = tplSessions.find(
      (s) => s.status === 'in_progress' && new Date(s.expiresAt).getTime() > now,
    );
    const completedSessions = tplSessions.filter(
      (s) => s.status === 'submitted' || s.status === 'expired',
    );
    const latestResult = userResults.find((r) => String(r.templateId) === tid) || null;

    let canStart = true;
    let cooldownEndsAt: string | null = null;

    if (!activeSession) {
      if (
        tpl.maxAttempts !== null &&
        tpl.maxAttempts !== undefined &&
        completedSessions.length >= tpl.maxAttempts
      ) {
        canStart = false;
      } else if (tpl.cooldownHours > 0 && completedSessions.length > 0) {
        const lastSession = completedSessions[0];
        const lastEnd = lastSession.submittedAt || lastSession.expiresAt || lastSession.createdAt;
        const nextTime = new Date(lastEnd).getTime() + tpl.cooldownHours * 3600_000;
        if (now < nextTime) {
          canStart = false;
          cooldownEndsAt = new Date(nextTime).toISOString();
        }
      }
    }

    return {
      ...tpl.toJSON(),
      studentStatus: {
        activeSessionId: activeSession ? String(activeSession._id) : null,
        attemptsUsed: completedSessions.length,
        maxAttempts: tpl.maxAttempts,
        canStart,
        cooldownEndsAt,
        latestResult: latestResult
          ? {
              sessionId: String(latestResult.sessionId),
              rawScore: latestResult.rawScore,
              maximumScore: latestResult.maximumScore,
              scorePercentage: latestResult.scorePercentage,
              accuracy: latestResult.accuracy,
              completedAt: latestResult.completedAt,
            }
          : null,
      },
    };
  });

  res.json({
    success: true,
    data: { assessments: enriched },
  });
}

export async function getAssessmentById(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { templateId } = req.params;

  if (!isValidObjectId(templateId)) {
    throw new AppError(400, 'Invalid assessment template ID', 'INVALID_ID');
  }

  await syncExpiredSessionsForUser(userId);

  const template = await AssessmentTemplate.findById(templateId)
    .populate('categoryIds', 'name slug')
    .populate('subjectIds', 'name slug')
    .populate('topicIds', 'name slug');

  if (!template || template.status !== 'Published') {
    throw new AppError(404, 'Assessment not found', 'ASSESSMENT_NOT_FOUND');
  }

  const tplSessions = await AssessmentSession.find({
    userId,
    templateId: template._id,
  })
    .sort({ createdAt: -1 })
    .lean();

  const tplResults = await AssessmentResult.find({
    userId,
    templateId: template._id,
  })
    .sort({ completedAt: -1 });

  const now = Date.now();
  const activeSession = tplSessions.find(
    (s) => s.status === 'in_progress' && new Date(s.expiresAt).getTime() > now,
  );
  const completedSessions = tplSessions.filter(
    (s) => s.status === 'submitted' || s.status === 'expired',
  );

  let canStart = true;
  let cooldownEndsAt: string | null = null;

  if (!activeSession) {
    if (
      template.maxAttempts !== null &&
      template.maxAttempts !== undefined &&
      completedSessions.length >= template.maxAttempts
    ) {
      canStart = false;
    } else if (template.cooldownHours > 0 && completedSessions.length > 0) {
      const lastSession = completedSessions[0];
      const lastEnd = lastSession.submittedAt || lastSession.expiresAt || lastSession.createdAt;
      const nextTime = new Date(lastEnd).getTime() + template.cooldownHours * 3600_000;
      if (now < nextTime) {
        canStart = false;
        cooldownEndsAt = new Date(nextTime).toISOString();
      }
    }
  }

  res.json({
    success: true,
    data: {
      assessment: {
        ...template.toJSON(),
        studentStatus: {
          activeSessionId: activeSession ? String(activeSession._id) : null,
          attemptsUsed: completedSessions.length,
          maxAttempts: template.maxAttempts,
          canStart,
          cooldownEndsAt,
          pastResults: tplResults.map((r) => r.toJSON()),
        },
      },
    },
  });
}

export async function startAssessment(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { templateId } = req.params;

  if (!isValidObjectId(templateId)) {
    throw new AppError(400, 'Invalid assessment template ID', 'INVALID_ID');
  }

  const { session, resumed } = await startOrResumeAssessmentSession(userId, templateId);

  res.status(resumed ? 200 : 201).json({
    success: true,
    data: {
      session: session.toJSON(),
      resumed,
      serverTime: new Date().toISOString(),
    },
  });
}

export async function getAssessmentSession(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { sessionId } = req.params;

  if (!isValidObjectId(sessionId)) {
    throw new AppError(400, 'Invalid session ID', 'INVALID_ID');
  }

  let session = await AssessmentSession.findById(sessionId);
  if (!session) {
    throw new AppError(404, 'Assessment session not found', 'SESSION_NOT_FOUND');
  }

  if (String(session.userId) !== String(userId) && getAuth(req).user.role !== 'admin') {
    throw new AppError(403, 'You do not have permission to view this session', 'FORBIDDEN');
  }

  if (session.status === 'in_progress' && Date.now() > session.expiresAt.getTime()) {
    const finalized = await finalizeAssessmentSession(session._id, 'timer_expired');
    session = finalized.session;
  }

  res.json({
    success: true,
    data: {
      session: session.toJSON(),
      serverTime: new Date().toISOString(),
    },
  });
}

export async function saveAnswers(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { sessionId } = req.params;

  if (!isValidObjectId(sessionId)) {
    throw new AppError(400, 'Invalid session ID', 'INVALID_ID');
  }

  const data = await saveSessionAnswers(userId, sessionId, req.body);

  res.json({
    success: true,
    data,
  });
}

export async function submitAssessment(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { sessionId } = req.params;

  if (!isValidObjectId(sessionId)) {
    throw new AppError(400, 'Invalid session ID', 'INVALID_ID');
  }

  const existing = await AssessmentSession.findById(sessionId);
  if (!existing) {
    throw new AppError(404, 'Assessment session not found', 'SESSION_NOT_FOUND');
  }

  if (String(existing.userId) !== String(userId)) {
    throw new AppError(403, 'You do not have permission to submit this session', 'FORBIDDEN');
  }

  const { session, result } = await finalizeAssessmentSession(sessionId, 'manual_submit');

  res.json({
    success: true,
    data: {
      session: session.toJSON(),
      result: result.toJSON(),
    },
  });
}

export async function getSessionResult(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { sessionId } = req.params;

  if (!isValidObjectId(sessionId)) {
    throw new AppError(400, 'Invalid session ID', 'INVALID_ID');
  }

  let session = await AssessmentSession.findById(sessionId);
  if (!session) {
    throw new AppError(404, 'Assessment session not found', 'SESSION_NOT_FOUND');
  }

  if (String(session.userId) !== String(userId) && getAuth(req).user.role !== 'admin') {
    throw new AppError(403, 'You do not have permission to view this result', 'FORBIDDEN');
  }

  if (session.status === 'in_progress') {
    if (Date.now() > session.expiresAt.getTime()) {
      const finalized = await finalizeAssessmentSession(session._id, 'timer_expired');
      session = finalized.session;
    } else {
      throw new AppError(400, 'Assessment session is still in progress', 'SESSION_IN_PROGRESS');
    }
  }

  let result = await AssessmentResult.findOne({ sessionId: session._id });
  if (!result && (session.status === 'submitted' || session.status === 'expired')) {
    const finalized = await finalizeAssessmentSession(session._id, 'manual_submit');
    result = finalized.result;
  }

  if (!result) {
    throw new AppError(404, 'Assessment result not found', 'RESULT_NOT_FOUND');
  }

  res.json({
    success: true,
    data: {
      result: result.toJSON(),
      session: session.toJSON(),
    },
  });
}

export async function getSessionReview(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { sessionId } = req.params;

  if (!isValidObjectId(sessionId)) {
    throw new AppError(400, 'Invalid session ID', 'INVALID_ID');
  }

  let session = await AssessmentSession.findById(sessionId);
  if (!session) {
    throw new AppError(404, 'Assessment session not found', 'SESSION_NOT_FOUND');
  }

  const isAdmin = getAuth(req).user.role === 'admin';
  if (String(session.userId) !== String(userId) && !isAdmin) {
    throw new AppError(403, 'You do not have permission to review this session', 'FORBIDDEN');
  }

  if (session.status === 'in_progress') {
    if (Date.now() > session.expiresAt.getTime()) {
      const finalized = await finalizeAssessmentSession(session._id, 'timer_expired');
      session = finalized.session;
    } else {
      throw new AppError(
        403,
        'Answer review is not available while the assessment is in progress',
        'SESSION_IN_PROGRESS',
      );
    }
  }

  const policy = session.reviewReleasePolicySnapshot || 'immediate';
  if (!isAdmin) {
    if (policy === 'never') {
      throw new AppError(
        403,
        'Answer review is disabled for this assessment by administrator policy',
        'REVIEW_DISABLED',
      );
    }
    if (policy === 'after_expiry' && Date.now() < session.expiresAt.getTime()) {
      throw new AppError(
        403,
        'Answer review will become available after the assessment timer window closes',
        'REVIEW_LOCKED_UNTIL_EXPIRY',
      );
    }
  }

  const answerMap = new Map<string, unknown>();
  for (const ans of session.answers) {
    answerMap.set(String(ans.questionId), ans.selectedAnswer);
  }

  const reviewItems = session.questionSnapshots.map((snap, index) => {
    const qid = String(snap.questionId);
    const selectedAnswer = answerMap.get(qid) ?? null;
    const isAnswered = isAnswerProvided(selectedAnswer);
    const isCorrect = isAnswered
      ? evaluateObjectiveQuestion(
          snap.type as 'single_choice' | 'multiple_select',
          snap.correctAnswer,
          selectedAnswer,
        )
      : false;

    return {
      questionNumber: index + 1,
      questionId: qid,
      title: snap.title,
      description: snap.description,
      type: snap.type,
      difficulty: snap.difficulty,
      topicId: String(snap.topicId),
      topicName: snap.topicName,
      subjectId: String(snap.subjectId),
      subjectName: snap.subjectName,
      categoryId: String(snap.categoryId),
      categoryName: snap.categoryName,
      options: snap.options,
      selectedAnswer,
      correctAnswer: snap.correctAnswer,
      explanation: snap.explanation,
      isAnswered,
      isCorrect,
    };
  });

  res.json({
    success: true,
    data: {
      sessionId: String(session._id),
      templateId: String(session.templateId),
      templateTitle: session.templateTitle,
      templateType: session.templateType,
      status: session.status,
      submittedAt: session.submittedAt,
      reviewItems,
    },
  });
}

export async function getAssessmentHistory(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  await syncExpiredSessionsForUser(userId);

  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { userId };
  if (typeof req.query.type === 'string' && req.query.type) {
    filter.templateType = req.query.type;
  }
  if (typeof req.query.completionTrigger === 'string' && req.query.completionTrigger) {
    filter.completionTrigger = req.query.completionTrigger;
  }

  const sortField =
    req.query.sortBy === 'scorePercentage'
      ? 'scorePercentage'
      : req.query.sortBy === 'rawScore'
        ? 'rawScore'
        : 'completedAt';
  const sortOrder = req.query.order === 'asc' ? 1 : -1;

  const [results, total, allUserResults, activeDiagnosticSession, skillsCount] = await Promise.all([
    AssessmentResult.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit),
    AssessmentResult.countDocuments(filter),
    AssessmentResult.find({ userId }).sort({ completedAt: -1 }).lean(),
    AssessmentSession.findOne({
      userId,
      templateType: 'full_diagnostic',
      status: 'in_progress',
    }).lean(),
    InitialSkillProfile.countDocuments({ userId }),
  ]);

  // Compute summary stats for student dashboard & history header
  const totalCompleted = allUserResults.length;
  const latestScorePercentage =
    totalCompleted > 0 ? allUserResults[0].scorePercentage : null;
  const averageScorePercentage =
    totalCompleted > 0
      ? Math.round(
          (allUserResults.reduce((acc, r) => acc + r.scorePercentage, 0) / totalCompleted) * 100,
        ) / 100
      : null;

  const completedDiagnostic = allUserResults.find((r) => r.templateType === 'full_diagnostic');
  let diagnosticStatus: 'Not Started' | 'In Progress' | 'Completed' = 'Not Started';
  if (completedDiagnostic) {
    diagnosticStatus = 'Completed';
  } else if (activeDiagnosticSession) {
    diagnosticStatus = 'In Progress';
  }

  res.json({
    success: true,
    data: {
      history: results.map((r) => r.toJSON()),
      summary: {
        totalCompleted,
        latestScorePercentage,
        averageScorePercentage,
        topicsAssessed: skillsCount,
        diagnosticStatus,
        activeDiagnosticSessionId: activeDiagnosticSession
          ? String(activeDiagnosticSession._id)
          : null,
        latestDiagnosticSessionId: completedDiagnostic
          ? String(completedDiagnostic.sessionId)
          : null,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    },
  });
}

export async function getMySkillProfile(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  await syncExpiredSessionsForUser(userId);

  const profiles = await InitialSkillProfile.find({ userId }).sort({
    accuracy: -1,
    lastAssessedAt: -1,
  });

  const serialized = profiles.map((p) => p.toJSON());

  const strengths = serialized.filter((p) => p.baselineLevel === 'Strong');
  const developing = serialized.filter((p) => p.baselineLevel === 'Developing');
  const needsImprovement = serialized.filter((p) => p.baselineLevel === 'Needs Improvement');
  const insufficientData = serialized.filter((p) => p.baselineLevel === 'Insufficient Data');

  res.json({
    success: true,
    data: {
      skills: serialized,
      grouped: {
        strengths,
        developing,
        needsImprovement,
        insufficientData,
      },
      summary: {
        totalTopicsAssessed: serialized.length,
        strongCount: strengths.length,
        developingCount: developing.length,
        needsImprovementCount: needsImprovement.length,
        insufficientDataCount: insufficientData.length,
      },
    },
  });
}
