import type { Request, Response } from 'express';
import { getAuth } from '../middleware/auth';
import { ExternalProblem } from '../models/ExternalProblem';
import { Question } from '../models/Question';
import { Category } from '../models/Category';
import { Subject } from '../models/Subject';
import { Topic } from '../models/Topic';
import { QuestionGenerationJob } from '../models/QuestionGenerationJob';
import { QuestionImportBatch } from '../models/QuestionImportBatch';
import { AppError } from '../utils/AppError';
import { generateOriginalQuestionsWithAI } from '../services/ai/questionGenerator';
import { createQuestionSchema } from '../validators/topic.validators';

// --- External Problem Metadata Import ---
export async function importExternalProblems(req: Request, res: Response) {
  const { problems } = req.body;
  let importedCount = 0;
  let duplicateCount = 0;

  for (const prob of problems) {
    const existing = await ExternalProblem.findOne({
      sourcePlatform: prob.sourcePlatform,
      externalProblemId: prob.externalProblemId,
    });

    if (existing) {
      duplicateCount++;
      continue;
    }

    await ExternalProblem.create({
      sourcePlatform: prob.sourcePlatform,
      externalProblemId: prob.externalProblemId,
      title: prob.title,
      sourceUrl: prob.sourceUrl,
      difficulty: prob.difficulty,
      externalRating: prob.externalRating,
      topicIds: prob.topicIds || [],
      tags: prob.tags || [],
      metadata: prob.metadata || {},
      status: 'Published',
      licenseStatus: 'metadata_only',
      lastSyncedAt: new Date(),
    });
    importedCount++;
  }

  res.status(201).json({
    success: true,
    data: {
      importedCount,
      duplicateCount,
      totalReceived: problems.length,
    },
  });
}

// --- AI Question Generation Endpoint ---
export async function generateQuestions(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { categoryId, subjectId, topicId, difficulty, questionType, count, referencePlatform } = req.body;

  const [category, subject, topic] = await Promise.all([
    Category.findById(categoryId),
    Subject.findById(subjectId),
    Topic.findById(topicId),
  ]);

  if (!category || !subject || !topic) {
    throw new AppError(404, 'Category, Subject, or Topic not found', 'NOT_FOUND');
  }

  // Record generation job
  const job = await QuestionGenerationJob.create({
    requestedBy: user._id,
    categoryId,
    subjectId,
    topicId,
    difficulty,
    questionType,
    requestedCount: count,
    status: 'processing',
  });

  try {
    const generatedList = await generateOriginalQuestionsWithAI({
      categoryName: category.name,
      subjectName: subject.name,
      topicName: topic.name,
      difficulty,
      questionType,
      count,
      referencePlatform: referencePlatform || 'geeksforgeeks',
    });

    // Save as Drafts into Question collection under the Review Queue
    const createdQuestions = [];
    for (const q of generatedList) {
      const doc = await Question.create({
        topicId: topic._id,
        title: q.title,
        description: q.description,
        type: q.type,
        difficulty: q.difficulty,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        hints: q.hints || [],
        tags: q.tags || [],
        evaluationCriteria: q.evaluationCriteria || [],
        status: 'Draft', // Enforce Draft status for review
        contentOrigin: 'ai_generated',
        referencePlatform: referencePlatform || 'geeksforgeeks',
        reviewStatus: 'pending',
        createdBy: user._id,
        version: 1,
      });
      createdQuestions.push(doc);
    }

    job.status = 'completed';
    job.generatedCount = createdQuestions.length;
    job.generatedQuestionIds = createdQuestions.map((q) => q._id as any);
    await job.save();

    res.status(201).json({
      success: true,
      data: {
        jobId: job.id,
        generatedCount: createdQuestions.length,
        questions: createdQuestions,
      },
    });
  } catch (err: any) {
    job.status = 'failed';
    job.error = err.message || 'Generation failed';
    await job.save();
    throw err;
  }
}

// --- Question Review Queue ---
export async function getReviewQueue(req: Request, res: Response) {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '15'), 10)));
  const skip = (page - 1) * limit;

  const filter: any = { reviewStatus: 'pending' };
  if (req.query.topicId) filter.topicId = req.query.topicId;
  if (req.query.origin) filter.contentOrigin = req.query.origin;

  const [total, questions] = await Promise.all([
    Question.countDocuments(filter),
    Question.find(filter)
      .select('+correctAnswer +explanation +evaluationCriteria')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('topicId', 'name slug'),
  ]);

  res.json({
    success: true,
    data: {
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}

export async function reviewQuestion(req: Request, res: Response) {
  try {
    const { user } = getAuth(req);
    const { action, feedback } = req.body;

    const question = await Question.findById(req.params.id).select('+correctAnswer +explanation');
    if (!question) throw new AppError(404, 'Question not found', 'NOT_FOUND');

    if (action === 'approve') {
      question.reviewStatus = 'approved';
      question.status = 'Published';
    } else {
      question.reviewStatus = 'rejected';
      question.status = 'Archived';
    }

    question.reviewedBy = user._id as any;
    question.reviewedAt = new Date();
    if (feedback) question.reviewFeedback = feedback;

    await question.save();

    res.json({
      success: true,
      data: {
        message: `Question successfully ${action}d.`,
        question: question.toJSON(),
      },
    });
  } catch (err: any) {
    console.error('[reviewQuestion Error]:', err);
    throw err;
  }
}

// --- Bulk Questions JSON/CSV Import ---
export async function bulkImportQuestions(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { filename, questions } = req.body;

  const batch = await QuestionImportBatch.create({
    uploadedBy: user._id,
    filename,
    totalRows: questions.length,
    status: 'processing',
  });

  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  const errors: Array<{ row: number; message: string; field?: string }> = [];

  for (let i = 0; i < questions.length; i++) {
    const raw = questions[i];
    const rowNum = i + 1;

    // Validate with createQuestionSchema
    const validated = createQuestionSchema.safeParse(raw);
    if (!validated.success) {
      invalidCount++;
      const firstIssue = validated.error.issues[0];
      errors.push({
        row: rowNum,
        message: firstIssue.message,
        field: firstIssue.path.join('.'),
      });
      continue;
    }

    const qData = validated.data;

    // Check duplicate by title & topicId
    const existing = await Question.findOne({
      topicId: qData.topicId,
      title: qData.title.trim(),
    });
    if (existing) {
      duplicateCount++;
      errors.push({
        row: rowNum,
        message: 'Duplicate question title in this topic',
        field: 'title',
      });
      continue;
    }

    // Save as Draft
    await Question.create({
      ...qData,
      status: 'Draft',
      contentOrigin: 'bulk_imported',
      reviewStatus: 'pending',
      createdBy: user._id,
      version: 1,
    });

    validCount++;
  }

  batch.validRows = validCount;
  batch.invalidRows = invalidCount;
  batch.duplicateRows = duplicateCount;
  batch.errors = errors;
  batch.status = 'completed';
  await batch.save();

  res.status(201).json({
    success: true,
    data: {
      batchId: batch.id,
      totalRows: questions.length,
      validRows: validCount,
      invalidRows: invalidCount,
      duplicateRows: duplicateCount,
      errors,
    },
  });
}

// --- Job and Batch History ---
export async function listGenerationJobs(_req: Request, res: Response) {
  const jobs = await QuestionGenerationJob.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('topicId', 'name')
    .populate('requestedBy', 'name email');
  res.json({ success: true, data: { jobs } });
}

export async function listImportBatches(_req: Request, res: Response) {
  const batches = await QuestionImportBatch.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('uploadedBy', 'name email');
  res.json({ success: true, data: { batches } });
}
