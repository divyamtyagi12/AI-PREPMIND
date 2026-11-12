import type { Request, Response } from 'express';
import { getAuth } from '../middleware/auth';
import { ExternalProblem } from '../models/ExternalProblem';
import { ExternalProblemProgress } from '../models/ExternalProblemProgress';
import { Topic } from '../models/Topic';
import { AppError } from '../utils/AppError';

// Normalize difficulty from diverse rating scales
export function normalizeDifficulty(platform: string, rawDifficulty: string | number): 'Easy' | 'Medium' | 'Hard' {
  if (typeof rawDifficulty === 'string') {
    const lower = rawDifficulty.toLowerCase().trim();
    if (lower.includes('easy') || lower === 'basic') return 'Easy';
    if (lower.includes('hard') || lower.includes('advanced')) return 'Hard';
    return 'Medium';
  }
  if (typeof rawDifficulty === 'number') {
    // e.g. CodeChef rating: < 1400 = Easy, 1400-1799 = Medium, >= 1800 = Hard
    if (rawDifficulty < 1400) return 'Easy';
    if (rawDifficulty < 1800) return 'Medium';
    return 'Hard';
  }
  return 'Medium';
}

export async function listExternalProblems(req: Request, res: Response) {
  const { platform, difficulty, topicId, status, search } = req.query;
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '15'), 10)));
  const skip = (page - 1) * limit;

  const filter: any = { status: 'Published' };
  if (platform) filter.sourcePlatform = platform;
  if (difficulty) filter.difficulty = difficulty;
  if (topicId) filter.topicIds = topicId;
  if (search) {
    filter.$or = [
      { title: { $regex: String(search), $options: 'i' } },
      { tags: { $regex: String(search), $options: 'i' } },
      { externalProblemId: { $regex: String(search), $options: 'i' } },
    ];
  }

  const [total, problems] = await Promise.all([
    ExternalProblem.countDocuments(filter),
    ExternalProblem.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('topicIds', 'name slug'),
  ]);

  res.json({
    success: true,
    data: {
      problems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}

export async function getExternalProblemById(req: Request, res: Response) {
  const problem = await ExternalProblem.findOne({ _id: req.params.id, status: 'Published' }).populate(
    'topicIds',
    'name slug',
  );
  if (!problem) throw new AppError(404, 'External problem not found', 'NOT_FOUND');
  res.json({ success: true, data: { problem } });
}

export async function getStudentExternalProgress(req: Request, res: Response) {
  const { user } = getAuth(req);
  const progressList = await ExternalProblemProgress.find({ userId: user._id }).lean();
  const progressMap: Record<string, { status: string; notes: string; solvedAt?: any }> = {};

  for (const p of progressList) {
    progressMap[String(p.externalProblemId)] = {
      status: p.status,
      notes: p.notes,
      solvedAt: p.solvedAt,
    };
  }

  res.json({ success: true, data: { progress: progressMap } });
}

export async function updateExternalProgress(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { status, notes } = req.body;

  const problem = await ExternalProblem.findById(req.params.id);
  if (!problem) throw new AppError(404, 'External problem not found', 'NOT_FOUND');

  const updateDoc: any = {
    status,
    notes: notes || '',
    updatedAt: new Date(),
  };
  if (status === 'Solved') {
    updateDoc.solvedAt = new Date();
  }

  const progress = await ExternalProblemProgress.findOneAndUpdate(
    { userId: user._id, externalProblemId: problem._id },
    { $set: updateDoc },
    { upsert: true, new: true },
  );

  res.json({ success: true, data: { progress } });
}
