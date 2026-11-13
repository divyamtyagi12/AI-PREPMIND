import type { Request, Response } from 'express';
import { getAuth } from '../middleware/auth';
import { ExternalProblem } from '../models/ExternalProblem';
import { ExternalProblemProgress } from '../models/ExternalProblemProgress';
import { Topic } from '../models/Topic';
import { AppError } from '../utils/AppError';

// Normalize difficulty from diverse rating scales
export function normalizeDifficulty(rawDifficulty: string | number, _unused?: unknown): 'Easy' | 'Medium' | 'Hard' {
  if (typeof rawDifficulty === 'string') {
    const lower = rawDifficulty.toLowerCase().trim();
    if (lower.includes('easy') || lower === 'basic') return 'Easy';
    if (lower.includes('hard') || lower.includes('advanced')) return 'Hard';
    return 'Medium';
  }
  return 'Medium';
}

export async function listExternalProblems(req: Request, res: Response) {
  const { platform, difficulty, topicId, status, search } = req.query;
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '15'), 10)));
  const skip = (page - 1) * limit;

  // In DSA practice module, only Published problems are exposed; CodeChef is excluded/archived
  const filter: any = { status: 'Published', sourcePlatform: 'leetcode' };
  if (platform && typeof platform === 'string' && platform.toLowerCase() === 'leetcode') {
    filter.sourcePlatform = 'leetcode';
  }
  if (difficulty && typeof difficulty === 'string') filter.difficulty = difficulty;
  if (topicId && typeof topicId === 'string') filter.topicIds = topicId;
  if (search && typeof search === 'string') {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escapedSearch, $options: 'i' } },
      { tags: { $regex: escapedSearch, $options: 'i' } },
      { externalProblemId: { $regex: escapedSearch, $options: 'i' } },
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
  const progressMap: Record<string, {
    status: string;
    isBookmarked: boolean;
    isRevision: boolean;
    notes: string;
    solvedAt?: any;
  }> = {};

  for (const p of progressList) {
    progressMap[String(p.externalProblemId)] = {
      status: p.status,
      isBookmarked: Boolean(p.isBookmarked),
      isRevision: Boolean(p.isRevision || p.status === 'Revisit'),
      notes: p.notes,
      solvedAt: p.solvedAt,
    };
  }

  res.json({ success: true, data: { progress: progressMap } });
}

export async function updateExternalProgress(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { status, isBookmarked, isRevision, notes } = req.body;

  const problem = await ExternalProblem.findById(req.params.id);
  if (!problem) throw new AppError(404, 'External problem not found', 'NOT_FOUND');

  const updateDoc: any = {
    updatedAt: new Date(),
  };

  if (status !== undefined) {
    updateDoc.status = status;
    if (status === 'Solved') {
      updateDoc.solvedAt = new Date();
    }
  }

  if (isBookmarked !== undefined) {
    updateDoc.isBookmarked = Boolean(isBookmarked);
  }

  if (isRevision !== undefined) {
    updateDoc.isRevision = Boolean(isRevision);
    if (isRevision && !updateDoc.status) {
      updateDoc.status = 'Revisit';
    }
  }

  if (notes !== undefined) {
    updateDoc.notes = notes;
  }

  const progress = await ExternalProblemProgress.findOneAndUpdate(
    { userId: user._id, externalProblemId: problem._id },
    { $set: updateDoc },
    { upsert: true, new: true },
  );

  res.json({ success: true, data: { progress } });
}
