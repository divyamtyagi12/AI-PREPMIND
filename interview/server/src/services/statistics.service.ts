import { Types } from 'mongoose';
import { PracticeAttempt } from '../models/PracticeAttempt';
import { Question } from '../models/Question';
import { Topic } from '../models/Topic';
import { Category } from '../models/Category';
import { AssessmentSession } from '../models/AssessmentSession';
import { AssessmentResult } from '../models/AssessmentResult';
import { InitialSkillProfile } from '../models/InitialSkillProfile';
import { syncExpiredSessionsForUser } from './assessment.service';

export async function getStudentPracticeStats(userId: string) {
  const userObjectId = new Types.ObjectId(userId);

  // 1. Overall attempt aggregations
  const [overallStats] = await PracticeAttempt.aggregate([
    { $match: { userId: userObjectId } },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        uniqueQuestions: { $addToSet: '$questionId' },
        evaluatedAttempts: {
          $sum: { $cond: [{ $eq: ['$evaluationStatus', 'evaluated'] }, 1, 0] },
        },
        correctAnswers: {
          $sum: { $cond: [{ $eq: ['$isCorrect', true] }, 1, 0] },
        },
        selfReviewAttempts: {
          $sum: { $cond: [{ $eq: ['$evaluationStatus', 'self_review'] }, 1, 0] },
        },
      },
    },
  ]);

  const totalAttempts = overallStats?.totalAttempts || 0;
  const uniqueQuestionsCount = overallStats?.uniqueQuestions?.length || 0;
  const evaluatedAttempts = overallStats?.evaluatedAttempts || 0;
  const correctAnswers = overallStats?.correctAnswers || 0;
  const selfReviewAttempts = overallStats?.selfReviewAttempts || 0;

  const objectiveAccuracy = evaluatedAttempts > 0 ? Math.round((correctAnswers / evaluatedAttempts) * 100) : null;

  // 2. Category-wise practice breakdown
  const categoryBreakdown = await PracticeAttempt.aggregate([
    { $match: { userId: userObjectId } },
    {
      $lookup: {
        from: 'topics',
        localField: 'topicId',
        foreignField: '_id',
        as: 'topic',
      },
    },
    { $unwind: '$topic' },
    {
      $lookup: {
        from: 'categories',
        localField: 'topic.categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    {
      $group: {
        _id: '$category._id',
        categoryName: { $first: '$category.name' },
        categorySlug: { $first: '$category.slug' },
        attemptsCount: { $sum: 1 },
        correctCount: { $sum: { $cond: [{ $eq: ['$isCorrect', true] }, 1, 0] } },
        evaluatedCount: { $sum: { $cond: [{ $eq: ['$evaluationStatus', 'evaluated'] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        categoryId: '$_id',
        name: '$categoryName',
        slug: '$categorySlug',
        attempts: '$attemptsCount',
        accuracy: {
          $cond: [
            { $gt: ['$evaluatedCount', 0] },
            { $round: [{ $multiply: [{ $divide: ['$correctCount', '$evaluatedCount'] }, 100] }, 0] },
            null,
          ],
        },
      },
    },
  ]);

  // 3. Recent 5 practice attempts
  const recentAttempts = await PracticeAttempt.find({ userId: userObjectId })
    .sort({ submittedAt: -1 })
    .limit(5)
    .populate('questionId', 'title difficulty type')
    .populate('topicId', 'name slug');

  // 4. Phase 3 Assessment & Initial Skill Profile Summary
  await syncExpiredSessionsForUser(userId);
  const [assessmentResults, activeDiagnostic, skillProfiles] = await Promise.all([
    AssessmentResult.find({ userId: userObjectId }).sort({ completedAt: -1 }).lean(),
    AssessmentSession.findOne({
      userId: userObjectId,
      templateType: 'full_diagnostic',
      status: 'in_progress',
    }).lean(),
    InitialSkillProfile.find({ userId: userObjectId }).sort({ accuracy: -1, lastAssessedAt: -1 }).lean(),
  ]);

  const totalCompletedAssessments = assessmentResults.length;
  const latestScorePercentage =
    totalCompletedAssessments > 0 ? assessmentResults[0].scorePercentage : null;
  const averageScorePercentage =
    totalCompletedAssessments > 0
      ? Math.round(
          (assessmentResults.reduce((acc, r) => acc + r.scorePercentage, 0) /
            totalCompletedAssessments) *
            100,
        ) / 100
      : null;

  const completedDiagnostic = assessmentResults.find((r) => r.templateType === 'full_diagnostic');
  let diagnosticStatus: 'Not Started' | 'In Progress' | 'Completed' = 'Not Started';
  if (completedDiagnostic) {
    diagnosticStatus = 'Completed';
  } else if (activeDiagnostic) {
    diagnosticStatus = 'In Progress';
  }

  return {
    totalAttempts,
    uniqueQuestionsAttempted: uniqueQuestionsCount,
    evaluatedAttempts,
    correctAnswers,
    selfReviewAttempts,
    objectiveAccuracy,
    byCategory: categoryBreakdown,
    recentActivity: recentAttempts.map((a: any) => ({
      id: a.id,
      questionTitle: a.questionId?.title || 'Unknown Question',
      difficulty: a.questionId?.difficulty,
      type: a.questionId?.type,
      topicName: a.topicId?.name || 'General',
      isCorrect: a.isCorrect,
      evaluationStatus: a.evaluationStatus,
      submittedAt: a.submittedAt,
    })),
    assessmentStats: {
      diagnosticStatus,
      activeDiagnosticSessionId: activeDiagnostic ? String(activeDiagnostic._id) : null,
      latestDiagnosticSessionId: completedDiagnostic ? String(completedDiagnostic.sessionId) : null,
      totalCompletedAssessments,
      latestScorePercentage,
      averageScorePercentage,
      topicsAssessed: skillProfiles.length,
      skillOverview: skillProfiles.slice(0, 6).map((sp) => ({
        topicId: String(sp.topicId),
        topicName: sp.topicName,
        categoryName: sp.categoryName,
        accuracy: sp.accuracy,
        baselineLevel: sp.baselineLevel,
        questionsAttempted: sp.questionsAttempted,
      })),
    },
  };
}

export async function getTopicPracticeStats(userId: string, topicId: string) {
  const userObjectId = new Types.ObjectId(userId);
  const topicObjectId = new Types.ObjectId(topicId);

  const [stats] = await PracticeAttempt.aggregate([
    { $match: { userId: userObjectId, topicId: topicObjectId } },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        uniqueQuestions: { $addToSet: '$questionId' },
        correctAnswers: {
          $sum: { $cond: [{ $eq: ['$isCorrect', true] }, 1, 0] },
        },
        evaluatedAttempts: {
          $sum: { $cond: [{ $eq: ['$evaluationStatus', 'evaluated'] }, 1, 0] },
        },
      },
    },
  ]);

  const totalQuestionsInTopic = await Question.countDocuments({ topicId: topicObjectId, status: 'Published' });

  return {
    topicId,
    totalQuestions: totalQuestionsInTopic,
    attemptedCount: stats?.uniqueQuestions?.length || 0,
    totalAttempts: stats?.totalAttempts || 0,
    correctAnswers: stats?.correctAnswers || 0,
    accuracy: stats?.evaluatedAttempts > 0 ? Math.round((stats.correctAnswers / stats.evaluatedAttempts) * 100) : null,
  };
}

