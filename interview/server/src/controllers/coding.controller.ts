import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getAuth } from '../middleware/auth.js';
import { CodingProblem } from '../models/CodingProblem.js';
import { CodingTestCase } from '../models/CodingTestCase.js';
import { CodingSubmission } from '../models/CodingSubmission.js';
import { CodingProgress } from '../models/CodingProgress.js';
import { CodeDraft } from '../models/CodeDraft.js';
import {
  runCodeAgainstSampleCases,
  submitCodeSolution,
} from '../services/execution/submissionEvaluation.service.js';
import {
  runCodeSchema,
  submitCodeSchema,
  saveDraftSchema,
  createCodingProblemSchema,
  createTestCaseSchema,
} from '../validators/coding.validators.js';
import {
  ExecutionError,
  ProviderNotConfiguredError,
} from '../services/execution/executionErrors.js';

// ==========================================
// STUDENT PROBLEM & EXECUTION ENDPOINTS
// ==========================================

export async function listCodingProblems(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { difficulty, topicId, status: solveStatus, search, page = '1', limit = '20' } = req.query;

  const filter: any = { status: 'Published' };

  if (difficulty && typeof difficulty === 'string') {
    filter.difficulty = difficulty;
  }

  if (topicId && typeof topicId === 'string') {
    filter.topicIds = topicId;
  }

  if (search && typeof search === 'string') {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = { $regex: escapedSearch, $options: 'i' };
  }

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [problems, total] = await Promise.all([
    CodingProblem.find(filter)
      .populate('topicIds', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    CodingProblem.countDocuments(filter),
  ]);

  // Fetch solve status for authenticated student
  const problemIds = problems.map((p) => p._id);
  const userProgresses = await CodingProgress.find({
    userId: user._id,
    problemId: { $in: problemIds },
  }).lean();

  const progressMap = new Map<string, string>();
  for (const prog of userProgresses) {
    progressMap.set(String(prog.problemId), prog.status);
  }

  const enriched = problems.map((p) => ({
    ...p,
    solveStatus: progressMap.get(String(p._id)) || 'unattempted',
  }));

  // Filter by solve status if requested
  const filteredResult =
    solveStatus && typeof solveStatus === 'string'
      ? enriched.filter((p) => p.solveStatus === solveStatus)
      : enriched;

  return res.status(200).json({
    problems: filteredResult,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

export async function getCodingProblem(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { id } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const problem = await CodingProblem.findOne(
    isObjectId ? { $or: [{ _id: id }, { slug: id }] } : { slug: id }
  )
    .populate('topicIds', 'name')
    .lean();

  if (!problem || (problem.status !== 'Published' && user.role !== 'admin')) {
    return res.status(404).json({ error: 'Coding problem not found' });
  }

  // Fetch sample test cases ONLY
  const sampleTestCases = await CodingTestCase.find({
    problemId: problem._id,
    visibility: 'sample',
  })
    .sort({ order: 1 })
    .select('input expectedOutput visibility order')
    .lean();

  // Fetch user solve progress
  const progress = await CodingProgress.findOne({
    userId: user._id,
    problemId: problem._id,
  }).lean();

  return res.status(200).json({
    problem,
    sampleTestCases,
    userProgress: progress || { status: 'unattempted', attemptCount: 0 },
  });
}

export async function runCode(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { id } = req.params;
  const parsed = runCodeSchema.parse(req.body);

  try {
    const outcome = await runCodeAgainstSampleCases({
      userId: String(user._id),
      problemId: id,
      sourceCode: parsed.sourceCode,
      language: parsed.language,
    });

    return res.status(200).json(outcome);
  } catch (err: any) {
    if (err instanceof ProviderNotConfiguredError) {
      return res.status(503).json({ error: err.message });
    }
    if (err instanceof ExecutionError) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || 'Failed to run code' });
  }
}

export async function submitCode(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { id } = req.params;
  const parsed = submitCodeSchema.parse(req.body);

  try {
    const submission = await submitCodeSolution({
      userId: String(user._id),
      problemId: id,
      sourceCode: parsed.sourceCode,
      language: parsed.language,
    });

    return res.status(200).json({ submission });
  } catch (err: any) {
    if (err instanceof ProviderNotConfiguredError) {
      return res.status(503).json({ error: err.message });
    }
    if (err instanceof ExecutionError) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || 'Failed to submit code' });
  }
}

export async function getSubmission(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { id } = req.params;

  const submission = await CodingSubmission.findOne({ _id: id, userId: user._id })
    .populate('problemId', 'title difficulty')
    .lean();

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found or access denied' });
  }

  return res.status(200).json({ submission });
}

export async function listSubmissions(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { problemId, page = '1', limit = '15' } = req.query;

  const filter: any = { userId: user._id };
  if (problemId && typeof problemId === 'string') {
    filter.problemId = problemId;
  }

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 15));
  const skip = (pageNum - 1) * limitNum;

  const [submissions, total] = await Promise.all([
    CodingSubmission.find(filter)
      .populate('problemId', 'title difficulty')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    CodingSubmission.countDocuments(filter),
  ]);

  return res.status(200).json({
    submissions,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

// ==========================================
// CODE DRAFT ENDPOINTS
// ==========================================

export async function getCodeDraft(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { id: problemId } = req.params;
  const { language } = req.query;

  const filter: any = { userId: user._id, problemId };
  if (language && typeof language === 'string') {
    filter.language = language;
  }

  const draft = await CodeDraft.findOne(filter).lean();
  return res.status(200).json({ draft });
}

export async function saveCodeDraft(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { id: problemId } = req.params;
  const parsed = saveDraftSchema.parse(req.body);

  const draft = await CodeDraft.findOneAndUpdate(
    { userId: user._id, problemId, language: parsed.language },
    { sourceCode: parsed.sourceCode },
    { upsert: true, returnDocument: 'after' }
  );

  return res.status(200).json({ draft });
}

// ==========================================
// CODING ANALYTICS ENDPOINTS
// ==========================================

export async function getCodingAnalytics(req: Request, res: Response) {
  const { user } = getAuth(req);

  const progresses = await CodingProgress.find({ userId: user._id })
    .populate('problemId', 'title difficulty topicIds')
    .lean();

  let attemptedCount = 0;
  let solvedCount = 0;
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;

  for (const prog of progresses) {
    if (prog.status === 'attempted' || prog.status === 'solved') {
      attemptedCount++;
    }
    if (prog.status === 'solved') {
      solvedCount++;
      const diff = (prog.problemId as any)?.difficulty;
      if (diff === 'Easy') easySolved++;
      else if (diff === 'Medium') mediumSolved++;
      else if (diff === 'Hard') hardSolved++;
    }
  }

  // Submission breakdown
  const verdictStats = await CodingSubmission.aggregate([
    { $match: { userId: user._id } },
    { $group: { _id: '$verdict', count: { $sum: 1 } } },
  ]);

  return res.status(200).json({
    analytics: {
      totalAttempted: attemptedCount,
      totalSolved: solvedCount,
      easySolved,
      mediumSolved,
      hardSolved,
      verdictDistribution: verdictStats.reduce((acc: any, v: any) => {
        acc[v._id] = v.count;
        return acc;
      }, {}),
    },
  });
}

// ==========================================
// ADMIN CODING PROBLEM MANAGEMENT
// ==========================================

export async function adminCreateCodingProblem(req: Request, res: Response) {
  const { user } = getAuth(req);
  const parsed = createCodingProblemSchema.parse(req.body);

  const problem = await CodingProblem.create({
    ...parsed,
    createdBy: user._id,
  });

  return res.status(201).json({ problem });
}

export async function adminUpdateCodingProblem(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { id } = req.params;

  const updated = await CodingProblem.findByIdAndUpdate(
    id,
    { ...req.body, updatedBy: user._id },
    { returnDocument: 'after' }
  );

  if (!updated) {
    return res.status(404).json({ error: 'Coding problem not found' });
  }

  return res.status(200).json({ problem: updated });
}

export async function adminAddTestCase(req: Request, res: Response) {
  const { id: problemId } = req.params;
  const parsed = createTestCaseSchema.parse(req.body);

  const testCase = await CodingTestCase.create({
    ...parsed,
    problemId,
  });

  return res.status(201).json({ testCase });
}
