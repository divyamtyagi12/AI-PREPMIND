import type { Request, Response } from 'express';
import { Category } from '../models/Category';
import { Subject } from '../models/Subject';
import { Topic } from '../models/Topic';
import { Question } from '../models/Question';
import { AppError } from '../utils/AppError';
import { serializeStudentQuestion } from '../services/question.service';

export async function listCategories(_req: Request, res: Response) {
  const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
  res.json({ success: true, data: { categories } });
}

export async function getCategoryBySlug(req: Request, res: Response) {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true });
  if (!category) throw new AppError(404, 'Category not found', 'CATEGORY_NOT_FOUND');

  const subjects = await Subject.find({ categoryId: category._id, isActive: true }).sort({
    displayOrder: 1,
    name: 1,
  });

  // Fetch count of published questions for each subject
  const subjectIds = subjects.map((s) => s._id);
  const topics = await Topic.find({ subjectId: { $in: subjectIds }, isActive: true }).select('_id subjectId');

  const topicIds = topics.map((t) => t._id);
  const questionCounts = await Question.aggregate([
    { $match: { topicId: { $in: topicIds }, status: 'Published' } },
    { $group: { _id: '$topicId', count: { $sum: 1 } } },
  ]);

  const topicCountMap = new Map<string, number>();
  for (const qc of questionCounts) {
    topicCountMap.set(String(qc._id), qc.count);
  }

  const enhancedSubjects = subjects.map((s) => {
    const subTopics = topics.filter((t) => String(t.subjectId) === String(s._id));
    let questionCount = 0;
    for (const st of subTopics) {
      questionCount += topicCountMap.get(String(st._id)) || 0;
    }
    return {
      ...s.toJSON(),
      topicCount: subTopics.length,
      questionCount,
    };
  });

  res.json({
    success: true,
    data: {
      category,
      subjects: enhancedSubjects,
    },
  });
}

export async function listSubjects(req: Request, res: Response) {
  const filter: any = { isActive: true };
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;

  const subjects = await Subject.find(filter).sort({ displayOrder: 1, name: 1 });
  res.json({ success: true, data: { subjects } });
}

export async function getSubjectById(req: Request, res: Response) {
  const subject = await Subject.findOne({ _id: req.params.id, isActive: true }).populate('categoryId', 'name slug');
  if (!subject) throw new AppError(404, 'Subject not found', 'SUBJECT_NOT_FOUND');

  const topics = await Topic.find({ subjectId: subject._id, isActive: true }).sort({ displayOrder: 1, name: 1 });

  // Attach published question count per topic
  const topicIds = topics.map((t) => t._id);
  const counts = await Question.aggregate([
    { $match: { topicId: { $in: topicIds }, status: 'Published' } },
    { $group: { _id: '$topicId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map<string, number>();
  for (const c of counts) countMap.set(String(c._id), c.count);

  const enhancedTopics = topics.map((t) => ({
    ...t.toJSON(),
    questionCount: countMap.get(String(t._id)) || 0,
  }));

  res.json({ success: true, data: { subject, topics: enhancedTopics } });
}

export async function listTopics(req: Request, res: Response) {
  const filter: any = { isActive: true };
  if (req.query.subjectId) filter.subjectId = req.query.subjectId;
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;

  const topics = await Topic.find(filter).sort({ displayOrder: 1, name: 1 });
  res.json({ success: true, data: { topics } });
}

export async function getTopicById(req: Request, res: Response) {
  const topic = await Topic.findOne({ _id: req.params.id, isActive: true })
    .populate('categoryId', 'name slug')
    .populate('subjectId', 'name slug');

  if (!topic) throw new AppError(404, 'Topic not found', 'TOPIC_NOT_FOUND');

  const questionCount = await Question.countDocuments({ topicId: topic._id, status: 'Published' });

  res.json({ success: true, data: { topic: { ...topic.toJSON(), questionCount } } });
}

export async function listQuestions(req: Request, res: Response) {
  const { topicId, subjectId, categoryId, difficulty, type, search } = req.query;
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10)));
  const skip = (page - 1) * limit;

  const filter: any = { status: 'Published' };

  if (topicId && typeof topicId === 'string') {
    filter.topicId = topicId;
  } else if (subjectId && typeof subjectId === 'string') {
    const topics: any[] = await Topic.find({ subjectId, isActive: true }).select('_id').lean();
    filter.topicId = { $in: topics.map((t) => t._id) };
  } else if (categoryId && typeof categoryId === 'string') {
    const topics: any[] = await Topic.find({ categoryId, isActive: true }).select('_id').lean();
    filter.topicId = { $in: topics.map((t) => t._id) };
  }

  if (difficulty && typeof difficulty === 'string') filter.difficulty = difficulty;
  if (type && typeof type === 'string') filter.type = type;
  if (search && typeof search === 'string') {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escapedSearch, $options: 'i' } },
      { tags: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  const [total, questions] = await Promise.all([
    Question.countDocuments(filter),
    Question.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('topicId', 'name slug'),
  ]);

  res.json({
    success: true,
    data: {
      questions: questions.map(serializeStudentQuestion),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}

export async function getQuestionById(req: Request, res: Response) {
  const question = await Question.findOne({ _id: req.params.id, status: 'Published' }).populate(
    'topicId',
    'name slug categoryId subjectId',
  );

  if (!question) throw new AppError(404, 'Question not found', 'QUESTION_NOT_FOUND');

  res.json({ success: true, data: { question: serializeStudentQuestion(question) } });
}
