import { Types } from 'mongoose';
import { Category } from '../models/Category';
import { Subject } from '../models/Subject';
import { Topic } from '../models/Topic';
import { Question } from '../models/Question';
import { AppError } from '../utils/AppError';

export async function validateCategoryExists(categoryId: string | Types.ObjectId) {
  const cat = await Category.findById(categoryId);
  if (!cat) throw new AppError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  return cat;
}

export async function validateSubjectExists(subjectId: string | Types.ObjectId) {
  const sub = await Subject.findById(subjectId);
  if (!sub) throw new AppError(404, 'Subject not found', 'SUBJECT_NOT_FOUND');
  return sub;
}

export async function validateTopicHierarchy(
  topicId: string | Types.ObjectId | null,
  parentTopicId: string | Types.ObjectId | null,
) {
  if (!parentTopicId) return;
  if (topicId && String(topicId) === String(parentTopicId)) {
    throw new AppError(400, 'A topic cannot be its own parent', 'CIRCULAR_HIERARCHY');
  }

  // Walk up parents to ensure no circular loop
  let currentParentId: any = parentTopicId;
  const visited = new Set<string>();
  if (topicId) visited.add(String(topicId));

  while (currentParentId) {
    if (visited.has(String(currentParentId))) {
      throw new AppError(400, 'Circular topic hierarchy detected', 'CIRCULAR_HIERARCHY');
    }
    visited.add(String(currentParentId));
    const parent: any = await Topic.findById(currentParentId).select('parentTopicId');
    if (!parent) {
      throw new AppError(404, 'Parent topic not found', 'PARENT_TOPIC_NOT_FOUND');
    }
    currentParentId = parent.parentTopicId;
  }
}

/**
 * Public serializer for student-facing questions.
 * Strips correctAnswer, explanation, and evaluationCriteria.
 */
export function serializeStudentQuestion(q: any) {
  return {
    id: String(q._id || q.id),
    topicId: q.topicId,
    title: q.title,
    description: q.description,
    type: q.type,
    difficulty: q.difficulty,
    options: q.options || [],
    hints: q.hints || [],
    tags: q.tags || [],
    version: q.version || 1,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}

