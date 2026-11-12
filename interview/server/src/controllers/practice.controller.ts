import type { Request, Response } from 'express';
import { getAuth } from '../middleware/auth';
import { recordPracticeAttempt } from '../services/practice.service';
import { getStudentPracticeStats, getTopicPracticeStats } from '../services/statistics.service';
import { PracticeAttempt } from '../models/PracticeAttempt';
import { Topic } from '../models/Topic';

export async function submitAttempt(req: Request, res: Response) {
  const { user } = getAuth(req);
  const result = await recordPracticeAttempt(user.id, req.body);
  res.status(201).json({ success: true, data: result });
}

export async function getPracticeHistory(req: Request, res: Response) {
  const { user } = getAuth(req);
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10)));
  const skip = (page - 1) * limit;

  const filter: any = { userId: user._id };

  if (req.query.topicId) filter.topicId = req.query.topicId;
  if (req.query.status) {
    if (req.query.status === 'correct') filter.isCorrect = true;
    else if (req.query.status === 'incorrect') filter.isCorrect = false;
    else if (req.query.status === 'self_review') filter.evaluationStatus = 'self_review';
  }

  // Support subjectId / categoryId filtering if given
  if (req.query.subjectId && typeof req.query.subjectId === 'string') {
    const topics: any[] = await Topic.find({ subjectId: req.query.subjectId }).select('_id').lean();
    filter.topicId = { $in: topics.map((t) => t._id) };
  } else if (req.query.categoryId && typeof req.query.categoryId === 'string') {
    const topics: any[] = await Topic.find({ categoryId: req.query.categoryId }).select('_id').lean();
    filter.topicId = { $in: topics.map((t) => t._id) };
  }

  const [total, attempts] = await Promise.all([
    PracticeAttempt.countDocuments(filter),
    PracticeAttempt.find(filter)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('questionId', 'title difficulty type')
      .populate('topicId', 'name slug'),
  ]);

  res.json({
    success: true,
    data: {
      attempts: attempts.map((a: any) => ({
        id: a.id,
        questionId: a.questionId?._id,
        questionTitle: a.questionId?.title || 'Unknown Question',
        difficulty: a.questionId?.difficulty,
        type: a.questionId?.type,
        topicName: a.topicId?.name || 'General',
        submittedAnswer: a.submittedAnswer,
        isCorrect: a.isCorrect,
        evaluationStatus: a.evaluationStatus,
        timeTakenSeconds: a.timeTakenSeconds,
        attemptNumber: a.attemptNumber,
        submittedAt: a.submittedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}

export async function getGeneralStats(req: Request, res: Response) {
  const { user } = getAuth(req);
  const stats = await getStudentPracticeStats(user.id);
  res.json({ success: true, data: { stats } });
}

export async function getTopicStats(req: Request, res: Response) {
  const { user } = getAuth(req);
  const stats = await getTopicPracticeStats(user.id, req.params.topicId);
  res.json({ success: true, data: { stats } });
}
