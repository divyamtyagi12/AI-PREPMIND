import { z } from 'zod';

export const startAdaptiveSessionSchema = z
  .object({
    categoryId: z.string().trim().optional().nullable(),
    subjectId: z.string().trim().optional().nullable(),
    topicId: z.string().trim().optional().nullable(),
    maxQuestions: z.number().int().min(1).max(20).optional().default(5),
  })
  .refine((data) => data.categoryId || data.subjectId || data.topicId, {
    message: 'At least one of categoryId, subjectId, or topicId must be provided',
  });

export const submitAdaptiveAnswerSchema = z.object({
  questionId: z.string().trim().min(1, 'Question ID is required'),
  selectedAnswer: z.union([
    z.string().min(1, 'Option selection cannot be empty'),
    z.array(z.string().min(1)).min(1, 'Must select at least one option'),
  ]),
});

export const updateBKTConfigSchema = z.object({
  version: z.string().trim().min(2, 'Version identifier is required'),
  initialMastery: z.number().min(0.01).max(0.99),
  slip: z.number().min(0.0).max(0.49),
  guess: z.number().min(0.0).max(0.49),
  learning: z.number().min(0.01).max(0.99),
  description: z.string().optional(),
});

