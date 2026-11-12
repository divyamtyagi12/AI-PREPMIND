import { z } from 'zod';
import { DIFFICULTY_LEVELS, QUESTION_STATUSES, QUESTION_TYPES } from '../utils/constants';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId');

export const slugSchema = z
  .string({ error: 'Slug is required' })
  .trim()
  .toLowerCase()
  .min(2, 'Slug must be at least 2 characters')
  .max(100, 'Slug must be at most 100 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

// Category Validators
export const createCategorySchema = z
  .object({
    name: z.string({ error: 'Name is required' }).trim().min(2).max(100),
    slug: slugSchema,
    description: z.string().trim().max(500).default(''),
    icon: z.string().trim().max(50).default('Code2'),
    displayOrder: z.coerce.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateCategorySchema = createCategorySchema.partial().refine((d) => Object.keys(d).length > 0, {
  message: 'No fields to update',
});

// Subject Validators
export const createSubjectSchema = z
  .object({
    categoryId: objectIdSchema,
    name: z.string({ error: 'Name is required' }).trim().min(2).max(100),
    slug: slugSchema,
    description: z.string().trim().max(500).default(''),
    displayOrder: z.coerce.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateSubjectSchema = createSubjectSchema.partial().refine((d) => Object.keys(d).length > 0, {
  message: 'No fields to update',
});

// Topic Validators
export const createTopicSchema = z
  .object({
    categoryId: objectIdSchema,
    subjectId: objectIdSchema,
    parentTopicId: objectIdSchema.nullable().optional(),
    name: z.string({ error: 'Name is required' }).trim().min(2).max(100),
    slug: slugSchema,
    description: z.string().trim().max(1000).default(''),
    difficulty: z.enum(DIFFICULTY_LEVELS).default('Medium'),
    estimatedLearningTime: z.string().trim().max(50).default('1 hour'),
    prerequisites: z.array(z.string().trim()).default([]),
    displayOrder: z.coerce.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateTopicSchema = createTopicSchema.partial().refine((d) => Object.keys(d).length > 0, {
  message: 'No fields to update',
});

// Question Option
const optionSchema = z
  .object({
    id: z.string({ error: 'Option ID is required' }).trim().min(1),
    text: z.string({ error: 'Option text is required' }).trim().min(1),
  })
  .strict();

// Question Validators
export const createQuestionSchema = z
  .object({
    topicId: objectIdSchema,
    title: z.string({ error: 'Title is required' }).trim().min(5).max(200),
    description: z.string({ error: 'Description is required' }).trim().min(10).max(5000),
    type: z.enum(QUESTION_TYPES),
    difficulty: z.enum(DIFFICULTY_LEVELS),
    options: z.array(optionSchema).default([]),
    correctAnswer: z.any(),
    explanation: z.string({ error: 'Explanation is required' }).trim().min(5).max(5000),
    hints: z.array(z.string().trim()).default([]),
    tags: z.array(z.string().trim()).default([]),
    evaluationCriteria: z.array(z.string().trim()).default([]),
    status: z.enum(QUESTION_STATUSES).default('Draft'),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.type === 'single_choice' || data.type === 'multiple_select') {
      if (data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MCQs must have at least 2 options',
          path: ['options'],
        });
      }
      const optionIds = new Set<string>();
      for (const opt of data.options) {
        if (optionIds.has(opt.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate option ID: "${opt.id}"`,
            path: ['options'],
          });
        }
        optionIds.add(opt.id);
      }

      if (data.type === 'single_choice') {
        if (typeof data.correctAnswer !== 'string' || !optionIds.has(data.correctAnswer)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Single choice must have a valid option ID as correctAnswer',
            path: ['correctAnswer'],
          });
        }
      } else if (data.type === 'multiple_select') {
        if (
          !Array.isArray(data.correctAnswer) ||
          data.correctAnswer.length === 0 ||
          !data.correctAnswer.every((id: any) => typeof id === 'string' && optionIds.has(id))
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Multiple select must have an array of valid option IDs as correctAnswer',
            path: ['correctAnswer'],
          });
        }
      }
    } else if (data.type === 'short_conceptual') {
      if (typeof data.correctAnswer !== 'string' || data.correctAnswer.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Conceptual questions must have a reference answer text in correctAnswer',
          path: ['correctAnswer'],
        });
      }
    }
  });

export const updateQuestionSchema = z
  .object({
    topicId: objectIdSchema.optional(),
    title: z.string().trim().min(5).max(200).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    type: z.enum(QUESTION_TYPES).optional(),
    difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
    options: z.array(optionSchema).optional(),
    correctAnswer: z.any().optional(),
    explanation: z.string().trim().min(5).max(5000).optional(),
    hints: z.array(z.string().trim()).optional(),
    tags: z.array(z.string().trim()).optional(),
    evaluationCriteria: z.array(z.string().trim()).optional(),
    status: z.enum(QUESTION_STATUSES).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

// Practice Submission Validator
export const submitAttemptSchema = z
  .object({
    questionId: objectIdSchema,
    submittedAnswer: z.any(),
    timeTakenSeconds: z.coerce.number().min(0).max(3600).default(0),
    practiceSessionId: z.string().trim().optional(),
    idempotencyKey: z.string().trim().max(100).optional(),
  })
  .strict();

