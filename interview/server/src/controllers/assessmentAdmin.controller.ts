import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getAuth } from '../middleware/auth';
import { AssessmentTemplate } from '../models/AssessmentTemplate';
import { AssessmentSession } from '../models/AssessmentSession';
import { AssessmentResult } from '../models/AssessmentResult';
import { selectQuestionsForAssessment } from '../services/assessment.service';
import { AppError } from '../utils/AppError';

function isValidObjectId(id: unknown): id is string {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
}

export async function listAdminAssessments(req: Request, res: Response): Promise<void> {
  const filter: Record<string, unknown> = {};
  if (typeof req.query.status === 'string' && req.query.status) {
    filter.status = req.query.status;
  }
  if (typeof req.query.type === 'string' && req.query.type) {
    filter.type = req.query.type;
  }

  const templates = await AssessmentTemplate.find(filter)
    .populate('categoryIds', 'name slug')
    .populate('subjectIds', 'name slug')
    .populate('topicIds', 'name slug')
    .sort({ createdAt: -1 });

  const sessionCounts = await AssessmentSession.aggregate([
    {
      $group: {
        _id: '$templateId',
        totalSessions: { $sum: 1 },
        completedSessions: {
          $sum: {
            $cond: [{ $in: ['$status', ['submitted', 'expired']] }, 1, 0],
          },
        },
      },
    },
  ]);

  const countMap = new Map(sessionCounts.map((c) => [String(c._id), c]));

  const data = templates.map((t) => {
    const counts = countMap.get(String(t._id)) || { totalSessions: 0, completedSessions: 0 };
    return {
      ...t.toJSON(),
      totalSessions: counts.totalSessions,
      completedSessions: counts.completedSessions,
    };
  });

  res.json({
    success: true,
    data: { assessments: data },
  });
}

export async function getAdminAssessmentById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    throw new AppError(400, 'Invalid assessment ID', 'INVALID_ID');
  }

  const template = await AssessmentTemplate.findById(id)
    .populate('categoryIds', 'name slug')
    .populate('subjectIds', 'name slug')
    .populate('topicIds', 'name slug');

  if (!template) {
    throw new AppError(404, 'Assessment template not found', 'ASSESSMENT_NOT_FOUND');
  }

  res.json({
    success: true,
    data: { assessment: template.toJSON() },
  });
}

export async function createAdminAssessment(req: Request, res: Response): Promise<void> {
  const adminId = String(getAuth(req).user._id);
  const body = req.body;

  // Verify sufficient eligible questions exist in MongoDB before creating/publishing
  await selectQuestionsForAssessment({
    type: body.type,
    categoryIds: body.categoryIds,
    subjectIds: body.subjectIds,
    topicIds: body.topicIds,
    topicAllocations: body.topicAllocations,
    totalQuestions: body.totalQuestions,
    difficultyDistribution: body.difficultyDistribution,
    shuffleQuestions: body.shuffleQuestions,
    shuffleOptions: body.shuffleOptions,
  });

  const template = await AssessmentTemplate.create({
    ...body,
    createdBy: adminId,
    updatedBy: adminId,
  });

  res.status(201).json({
    success: true,
    data: { assessment: template.toJSON() },
  });
}

export async function updateAdminAssessment(req: Request, res: Response): Promise<void> {
  const adminId = String(getAuth(req).user._id);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new AppError(400, 'Invalid assessment ID', 'INVALID_ID');
  }

  const template = await AssessmentTemplate.findById(id);
  if (!template) {
    throw new AppError(404, 'Assessment template not found', 'ASSESSMENT_NOT_FOUND');
  }

  const nextTotalQuestions = req.body.totalQuestions ?? template.totalQuestions;
  const nextDist = req.body.difficultyDistribution ?? template.difficultyDistribution;
  const distSum = (nextDist?.Easy || 0) + (nextDist?.Medium || 0) + (nextDist?.Hard || 0);

  if (distSum !== nextTotalQuestions) {
    throw new AppError(
      400,
      `Difficulty distribution sum (${distSum}) must equal totalQuestions (${nextTotalQuestions})`,
      'VALIDATION_ERROR',
    );
  }

  const nextStatus = req.body.status ?? template.status;
  const nextType = req.body.type ?? template.type;
  const nextCategoryIds = req.body.categoryIds ?? template.categoryIds;
  const nextSubjectIds = req.body.subjectIds ?? template.subjectIds;
  const nextTopicIds = req.body.topicIds ?? template.topicIds;
  const nextAllocations = req.body.topicAllocations ?? template.topicAllocations;

  // Verify inventory if published or if scope/distribution is updated
  if (
    nextStatus === 'Published' ||
    req.body.totalQuestions !== undefined ||
    req.body.difficultyDistribution !== undefined ||
    req.body.topicIds !== undefined ||
    req.body.subjectIds !== undefined ||
    req.body.categoryIds !== undefined
  ) {
    await selectQuestionsForAssessment({
      type: nextType,
      categoryIds: nextCategoryIds,
      subjectIds: nextSubjectIds,
      topicIds: nextTopicIds,
      topicAllocations: nextAllocations as any,
      totalQuestions: nextTotalQuestions,
      difficultyDistribution: nextDist as any,
    });
  }

  Object.assign(template, req.body, { updatedBy: adminId });
  await template.save();

  res.json({
    success: true,
    data: { assessment: template.toJSON() },
  });
}

export async function deleteAdminAssessment(req: Request, res: Response): Promise<void> {
  const adminId = String(getAuth(req).user._id);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new AppError(400, 'Invalid assessment ID', 'INVALID_ID');
  }

  const template = await AssessmentTemplate.findById(id);
  if (!template) {
    throw new AppError(404, 'Assessment template not found', 'ASSESSMENT_NOT_FOUND');
  }

  template.status = 'Archived';
  template.updatedBy = new mongoose.Types.ObjectId(adminId);
  await template.save();

  res.json({
    success: true,
    data: {
      message: 'Assessment template archived',
      assessment: template.toJSON(),
    },
  });
}

export async function listAdminAssessmentResults(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '15'), 10) || 15));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (typeof req.query.templateId === 'string' && isValidObjectId(req.query.templateId)) {
    filter.templateId = req.query.templateId;
  }
  if (typeof req.query.type === 'string' && req.query.type) {
    filter.templateType = req.query.type;
  }

  const [results, total] = await Promise.all([
    AssessmentResult.find(filter)
      .populate('userId', 'name email college branch graduationYear')
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit),
    AssessmentResult.countDocuments(filter),
  ]);

  const formatted = results.map((r) => {
    const raw = r.toJSON() as any;
    const populatedUser = (r as any).userId;
    if (populatedUser && typeof populatedUser === 'object' && populatedUser.email) {
      raw.student = {
        id: String(populatedUser._id || populatedUser.id),
        name: populatedUser.name,
        email: populatedUser.email,
        college: populatedUser.college,
        branch: populatedUser.branch,
      };
      raw.userId = String(populatedUser._id || populatedUser.id);
    }
    return raw;
  });

  res.json({
    success: true,
    data: {
      results: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    },
  });
}

export async function getAdminAssessmentStats(_req: Request, res: Response): Promise<void> {
  const [
    totalTemplates,
    publishedTemplates,
    draftTemplates,
    archivedTemplates,
    totalSessions,
    inProgressSessions,
    submittedSessions,
    expiredSessions,
    allResults,
    templates,
  ] = await Promise.all([
    AssessmentTemplate.countDocuments(),
    AssessmentTemplate.countDocuments({ status: 'Published' }),
    AssessmentTemplate.countDocuments({ status: 'Draft' }),
    AssessmentTemplate.countDocuments({ status: 'Archived' }),
    AssessmentSession.countDocuments(),
    AssessmentSession.countDocuments({ status: 'in_progress' }),
    AssessmentSession.countDocuments({ status: 'submitted' }),
    AssessmentSession.countDocuments({ status: 'expired' }),
    AssessmentResult.find().lean(),
    AssessmentTemplate.find().lean(),
  ]);

  const totalCompleted = allResults.length;
  const averageScorePercentage =
    totalCompleted > 0
      ? Math.round(
          (allResults.reduce((acc, r) => acc + r.scorePercentage, 0) / totalCompleted) * 100,
        ) / 100
      : 0;
  const averageAccuracy =
    totalCompleted > 0
      ? Math.round((allResults.reduce((acc, r) => acc + r.accuracy, 0) / totalCompleted) * 100) /
        100
      : 0;

  // Per-template metrics
  const templateMetricsMap = new Map<
    string,
    {
      templateId: string;
      title: string;
      type: string;
      status: string;
      attempts: number;
      totalScorePct: number;
      totalAcc: number;
      totalTime: number;
    }
  >();

  for (const t of templates) {
    templateMetricsMap.set(String(t._id), {
      templateId: String(t._id),
      title: t.title,
      type: t.type,
      status: t.status,
      attempts: 0,
      totalScorePct: 0,
      totalAcc: 0,
      totalTime: 0,
    });
  }

  // Topic aggregate metrics
  const topicAggMap = new Map<
    string,
    {
      topicId: string;
      topicName: string;
      categoryName: string;
      totalQuestions: number;
      correct: number;
    }
  >();

  for (const resDoc of allResults) {
    const tid = String(resDoc.templateId);
    if (templateMetricsMap.has(tid)) {
      const m = templateMetricsMap.get(tid)!;
      m.attempts++;
      m.totalScorePct += resDoc.scorePercentage;
      m.totalAcc += resDoc.accuracy;
      m.totalTime += resDoc.timeTakenSeconds;
    }

    for (const tp of resDoc.topicPerformance || []) {
      const topId = String(tp.topicId);
      if (!topicAggMap.has(topId)) {
        topicAggMap.set(topId, {
          topicId: topId,
          topicName: tp.topicName,
          categoryName: tp.categoryName,
          totalQuestions: 0,
          correct: 0,
        });
      }
      const ta = topicAggMap.get(topId)!;
      ta.totalQuestions += tp.totalQuestions;
      ta.correct += tp.correct;
    }
  }

  const byTemplate = Array.from(templateMetricsMap.values()).map((m) => ({
    templateId: m.templateId,
    title: m.title,
    type: m.type,
    status: m.status,
    attempts: m.attempts,
    averageScorePercentage:
      m.attempts > 0 ? Math.round((m.totalScorePct / m.attempts) * 100) / 100 : 0,
    averageAccuracy: m.attempts > 0 ? Math.round((m.totalAcc / m.attempts) * 100) / 100 : 0,
    averageTimeSeconds: m.attempts > 0 ? Math.round(m.totalTime / m.attempts) : 0,
  }));

  const byTopic = Array.from(topicAggMap.values()).map((t) => ({
    ...t,
    accuracy: t.totalQuestions > 0 ? Math.round((t.correct / t.totalQuestions) * 10000) / 100 : 0,
  }));

  res.json({
    success: true,
    data: {
      overview: {
        templates: {
          total: totalTemplates,
          published: publishedTemplates,
          draft: draftTemplates,
          archived: archivedTemplates,
        },
        sessions: {
          total: totalSessions,
          inProgress: inProgressSessions,
          submitted: submittedSessions,
          expired: expiredSessions,
        },
        performance: {
          totalCompleted,
          averageScorePercentage,
          averageAccuracy,
        },
      },
      byTemplate,
      byTopic,
    },
  });
}
