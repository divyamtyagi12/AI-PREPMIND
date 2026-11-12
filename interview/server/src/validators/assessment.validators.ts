import { z } from 'zod';
import { ASSESSMENT_STATUSES, ASSESSMENT_TYPES, REVIEW_RELEASE_POLICIES } from '../utils/constants';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId format');

const difficultyDistributionSchema = z.object({
  Easy: z.number().int().min(0),
  Medium: z.number().int().min(0),
  Hard: z.number().int().min(0),
});

const scoringSchema = z.object({
  correct: z.number().positive('Correct answer score must be positive'),
  incorrect: z.number().max(0, 'Incorrect answer score must be zero or negative'),
  unanswered: z.number().default(0),
});

const topicAllocationItemSchema = z.object({
  topicId: objectIdSchema,
  count: z.number().int().min(1),
});

export const createAssessmentTemplateSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().trim().max(2000).optional().default(''),
    type: z.enum(ASSESSMENT_TYPES),
    categoryIds: z.array(objectIdSchema).optional().default([]),
    subjectIds: z.array(objectIdSchema).optional().default([]),
    topicIds: z.array(objectIdSchema).optional().default([]),
    topicAllocations: z.array(topicAllocationItemSchema).optional().default([]),
    durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(360),
    totalQuestions: z.number().int().min(1, 'Total questions must be at least 1').max(200),
    difficultyDistribution: difficultyDistributionSchema,
    scoring: scoringSchema.optional().default({ correct: 1, incorrect: 0, unanswered: 0 }),
    maxAttempts: z.number().int().min(1).nullable().optional().default(null),
    cooldownHours: z.number().min(0).optional().default(0),
    shuffleQuestions: z.boolean().optional().default(true),
    shuffleOptions: z.boolean().optional().default(false),
    reviewReleasePolicy: z.enum(REVIEW_RELEASE_POLICIES).optional().default('immediate'),
    status: z.enum(ASSESSMENT_STATUSES).optional().default('Draft'),
  })
  .superRefine((data, ctx) => {
    const distSum =
      data.difficultyDistribution.Easy +
      data.difficultyDistribution.Medium +
      data.difficultyDistribution.Hard;
    if (distSum !== data.totalQuestions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['difficultyDistribution'],
        message: `Difficulty distribution sum (${distSum}) must equal totalQuestions (${data.totalQuestions})`,
      });
    }

    if (data.topicAllocations && data.topicAllocations.length > 0) {
      const allocSum = data.topicAllocations.reduce((acc, item) => acc + item.count, 0);
      if (allocSum > data.totalQuestions) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['topicAllocations'],
          message: `Topic allocations sum (${allocSum}) cannot exceed totalQuestions (${data.totalQuestions})`,
        });
      }
    }
  });

export const updateAssessmentTemplateSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    type: z.enum(ASSESSMENT_TYPES).optional(),
    categoryIds: z.array(objectIdSchema).optional(),
    subjectIds: z.array(objectIdSchema).optional(),
    topicIds: z.array(objectIdSchema).optional(),
    topicAllocations: z.array(topicAllocationItemSchema).optional(),
    durationMinutes: z.number().int().min(1).max(360).optional(),
    totalQuestions: z.number().int().min(1).max(200).optional(),
    difficultyDistribution: difficultyDistributionSchema.optional(),
    scoring: scoringSchema.optional(),
    maxAttempts: z.number().int().min(1).nullable().optional(),
    cooldownHours: z.number().min(0).optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
    reviewReleasePolicy: z.enum(REVIEW_RELEASE_POLICIES).optional(),
    status: z.enum(ASSESSMENT_STATUSES).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.difficultyDistribution && data.totalQuestions !== undefined) {
      const distSum =
        data.difficultyDistribution.Easy +
        data.difficultyDistribution.Medium +
        data.difficultyDistribution.Hard;
      if (distSum !== data.totalQuestions) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['difficultyDistribution'],
          message: `Difficulty distribution sum (${distSum}) must equal totalQuestions (${data.totalQuestions})`,
        });
      }
    }
  });

const singleAnswerUpdateSchema = z.object({
  questionId: objectIdSchema,
  selectedAnswer: z.union([z.string(), z.array(z.string()), z.null()]),
  revision: z.number().int().min(1).optional().default(1),
});

export const saveAssessmentAnswerSchema = z.union([
  singleAnswerUpdateSchema,
  z.object({
    answers: z.array(singleAnswerUpdateSchema).min(1),
  }),
]);

