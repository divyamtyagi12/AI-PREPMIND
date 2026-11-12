import type { Request, Response } from 'express';
import { getAuth } from '../middleware/auth';
import { Category } from '../models/Category';
import { Subject } from '../models/Subject';
import { Topic } from '../models/Topic';
import { Question } from '../models/Question';
import { PracticeAttempt } from '../models/PracticeAttempt';
import { AppError } from '../utils/AppError';
import {
  validateCategoryExists,
  validateSubjectExists,
  validateTopicHierarchy,
} from '../services/question.service';

// --- Category Management ---
export async function createCategory(req: Request, res: Response) {
  const existing = await Category.findOne({ slug: req.body.slug });
  if (existing) throw new AppError(409, 'Category with this slug already exists', 'SLUG_EXISTS');

  const category = await Category.create(req.body);
  res.status(201).json({ success: true, data: { category } });
}

export async function updateCategory(req: Request, res: Response) {
  if (req.body.slug) {
    const existing = await Category.findOne({ slug: req.body.slug, _id: { $ne: req.params.id } });
    if (existing) throw new AppError(409, 'Category with this slug already exists', 'SLUG_EXISTS');
  }

  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!category) throw new AppError(404, 'Category not found', 'NOT_FOUND');

  res.json({ success: true, data: { category } });
}

export async function deleteCategory(req: Request, res: Response) {
  // Soft delete / archive to protect historical practice records
  const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) throw new AppError(404, 'Category not found', 'NOT_FOUND');
  res.json({ success: true, data: { message: 'Category deactivated successfully' } });
}

// --- Subject Management ---
export async function createSubject(req: Request, res: Response) {
  await validateCategoryExists(req.body.categoryId);

  const existing = await Subject.findOne({ categoryId: req.body.categoryId, slug: req.body.slug });
  if (existing) throw new AppError(409, 'Subject with this slug already exists in this category', 'SLUG_EXISTS');

  const subject = await Subject.create(req.body);
  res.status(201).json({ success: true, data: { subject } });
}

export async function updateSubject(req: Request, res: Response) {
  if (req.body.categoryId) await validateCategoryExists(req.body.categoryId);

  if (req.body.slug) {
    const current = await Subject.findById(req.params.id);
    if (!current) throw new AppError(404, 'Subject not found', 'NOT_FOUND');
    const categoryId = req.body.categoryId || current.categoryId;
    const existing = await Subject.findOne({
      categoryId,
      slug: req.body.slug,
      _id: { $ne: req.params.id },
    });
    if (existing) throw new AppError(409, 'Subject with this slug already exists in this category', 'SLUG_EXISTS');
  }

  const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!subject) throw new AppError(404, 'Subject not found', 'NOT_FOUND');

  res.json({ success: true, data: { subject } });
}

export async function deleteSubject(req: Request, res: Response) {
  const subject = await Subject.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!subject) throw new AppError(404, 'Subject not found', 'NOT_FOUND');
  res.json({ success: true, data: { message: 'Subject deactivated successfully' } });
}

// --- Topic Management ---
export async function createTopic(req: Request, res: Response) {
  await validateCategoryExists(req.body.categoryId);
  await validateSubjectExists(req.body.subjectId);
  await validateTopicHierarchy(null, req.body.parentTopicId);

  const existing = await Topic.findOne({ subjectId: req.body.subjectId, slug: req.body.slug });
  if (existing) throw new AppError(409, 'Topic with this slug already exists in this subject', 'SLUG_EXISTS');

  const topic = await Topic.create(req.body);
  res.status(201).json({ success: true, data: { topic } });
}

export async function updateTopic(req: Request, res: Response) {
  const current = await Topic.findById(req.params.id);
  if (!current) throw new AppError(404, 'Topic not found', 'NOT_FOUND');

  if (req.body.categoryId) await validateCategoryExists(req.body.categoryId);
  if (req.body.subjectId) await validateSubjectExists(req.body.subjectId);

  if (req.body.parentTopicId !== undefined) {
    await validateTopicHierarchy(current._id, req.body.parentTopicId);
  }

  if (req.body.slug) {
    const subjectId = req.body.subjectId || current.subjectId;
    const existing = await Topic.findOne({
      subjectId,
      slug: req.body.slug,
      _id: { $ne: req.params.id },
    });
    if (existing) throw new AppError(409, 'Topic with this slug already exists in this subject', 'SLUG_EXISTS');
  }

  const topic = await Topic.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: { topic } });
}

export async function deleteTopic(req: Request, res: Response) {
  const topic = await Topic.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!topic) throw new AppError(404, 'Topic not found', 'NOT_FOUND');
  res.json({ success: true, data: { message: 'Topic deactivated successfully' } });
}

// --- Question Management ---
export async function listAdminQuestions(req: Request, res: Response) {
  const { topicId, status, difficulty, type, search } = req.query;
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (topicId) filter.topicId = topicId;
  if (status) filter.status = status;
  if (difficulty) filter.difficulty = difficulty;
  if (type) filter.type = type;
  if (search) {
    filter.$or = [
      { title: { $regex: String(search), $options: 'i' } },
      { tags: { $regex: String(search), $options: 'i' } },
    ];
  }

  const [total, questions] = await Promise.all([
    Question.countDocuments(filter),
    Question.find(filter)
      .select('+correctAnswer +explanation +evaluationCriteria')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('topicId', 'name slug categoryId subjectId'),
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

export async function createQuestion(req: Request, res: Response) {
  const { user } = getAuth(req);
  const topic = await Topic.findById(req.body.topicId);
  if (!topic) throw new AppError(404, 'Topic not found', 'TOPIC_NOT_FOUND');

  const question = await Question.create({
    ...req.body,
    createdBy: user._id,
    version: 1,
  });

  res.status(201).json({ success: true, data: { question } });
}

export async function updateQuestion(req: Request, res: Response) {
  const { user } = getAuth(req);
  const current = await Question.findById(req.params.id).select('+correctAnswer');
  if (!current) throw new AppError(404, 'Question not found', 'NOT_FOUND');

  if (req.body.topicId) {
    const topic = await Topic.findById(req.body.topicId);
    if (!topic) throw new AppError(404, 'Topic not found', 'TOPIC_NOT_FOUND');
  }

  const updated = await Question.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      updatedBy: user._id,
      $inc: { version: 1 },
    },
    { new: true },
  ).select('+correctAnswer +explanation +evaluationCriteria');

  res.json({ success: true, data: { question: updated } });
}

export async function deleteQuestion(req: Request, res: Response) {
  // Archive question to maintain referential integrity of past student attempts
  const question = await Question.findByIdAndUpdate(req.params.id, { status: 'Archived' }, { new: true });
  if (!question) throw new AppError(404, 'Question not found', 'NOT_FOUND');
  res.json({ success: true, data: { message: 'Question archived successfully' } });
}

// --- Admin Overview Stats ---
export async function getAdminStats(_req: Request, res: Response) {
  const [categoriesCount, subjectsCount, topicsCount, questionsTotal, publishedQuestions, totalAttempts] =
    await Promise.all([
      Category.countDocuments({ isActive: true }),
      Subject.countDocuments({ isActive: true }),
      Topic.countDocuments({ isActive: true }),
      Question.countDocuments({ status: { $ne: 'Archived' } }),
      Question.countDocuments({ status: 'Published' }),
      PracticeAttempt.countDocuments(),
    ]);

  const questionsByDifficulty = await Question.aggregate([
    { $match: { status: 'Published' } },
    { $group: { _id: '$difficulty', count: { $sum: 1 } } },
  ]);

  const questionsByType = await Question.aggregate([
    { $match: { status: 'Published' } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: {
      categoriesCount,
      subjectsCount,
      topicsCount,
      questionsTotal,
      publishedQuestions,
      totalAttempts,
      byDifficulty: questionsByDifficulty,
      byType: questionsByType,
    },
  });
}

