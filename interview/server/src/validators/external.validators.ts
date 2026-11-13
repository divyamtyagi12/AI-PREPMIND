import { z } from 'zod';
import {
  DIFFICULTY_LEVELS,
  ACTIVE_EXTERNAL_PLATFORMS,
  EXTERNAL_PROGRESS_STATUSES,
  QUESTION_TYPES,
} from '../utils/constants';
import { objectIdSchema } from './topic.validators';

// External Problem Import Item Validator
export const importExternalProblemItemSchema = z
  .object({
    sourcePlatform: z.enum(ACTIVE_EXTERNAL_PLATFORMS),
    externalProblemId: z.string({ error: 'External problem ID is required' }).trim().min(1),
    title: z.string({ error: 'Title is required' }).trim().min(1).max(200),
    sourceUrl: z.string({ error: 'Source URL is required' }).trim().url('Must be a valid URL'),
    difficulty: z.enum(DIFFICULTY_LEVELS),
    externalRating: z.number().optional(),
    topicIds: z.array(objectIdSchema).default([]),
    tags: z.array(z.string().trim()).default([]),
    metadata: z.record(z.string(), z.any()).default({}),
  })
  .strict();

export const importExternalProblemsSchema = z
  .object({
    problems: z.array(importExternalProblemItemSchema).min(1, 'At least one problem required'),
  })
  .strict();

// Student Progress Update Validator
export const updateExternalProgressSchema = z
  .object({
    status: z.enum(EXTERNAL_PROGRESS_STATUSES).optional(),
    isBookmarked: z.boolean().optional(),
    isRevision: z.boolean().optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

// AI Question Generation Request Validator
export const generateQuestionsRequestSchema = z
  .object({
    categoryId: objectIdSchema,
    subjectId: objectIdSchema,
    topicId: objectIdSchema,
    difficulty: z.enum(DIFFICULTY_LEVELS),
    questionType: z.enum(QUESTION_TYPES),
    count: z.coerce.number().int().min(1).max(10).default(5),
    referencePlatform: z.string().trim().default('geeksforgeeks'),
  })
  .strict();

// Question Review Action Validator
export const reviewQuestionSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    feedback: z.string().trim().max(1000).optional(),
  })
  .strict();

// Bulk JSON Import Request Validator
export const bulkImportQuestionsSchema = z
  .object({
    filename: z.string().trim().min(1).default('import.json'),
    questions: z.array(z.record(z.string(), z.any())).min(1, 'At least one question required to import'),
  })
  .strict();
