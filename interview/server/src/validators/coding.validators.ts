import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../services/execution/executionValidation.js';
import { DIFFICULTY_LEVELS } from '../utils/constants.js';

export const runCodeSchema = z.object({
  sourceCode: z.string().min(1, 'Source code cannot be empty').max(50000, 'Source code exceeds 50KB limit'),
  language: z.enum(SUPPORTED_LANGUAGES, { message: 'Invalid or unsupported programming language' }),
});

export const submitCodeSchema = z.object({
  sourceCode: z.string().min(1, 'Source code cannot be empty').max(50000, 'Source code exceeds 50KB limit'),
  language: z.enum(SUPPORTED_LANGUAGES, { message: 'Invalid or unsupported programming language' }),
});

export const saveDraftSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  sourceCode: z.string().max(50000, 'Draft exceeds 50KB limit'),
});

export const createCodingProblemSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().min(3).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().trim().min(10),
  difficulty: z.enum(DIFFICULTY_LEVELS),
  topicIds: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  examples: z
    .array(
      z.object({
        input: z.string(),
        output: z.string(),
        explanation: z.string().optional(),
      })
    )
    .default([]),
  starterCode: z
    .object({
      cpp: z.string().optional(),
      java: z.string().optional(),
      python: z.string().optional(),
      javascript: z.string().optional(),
    })
    .default({}),
  timeLimitMs: z.number().int().min(500).max(10000).default(2000),
  memoryLimitKb: z.number().int().min(32768).max(524288).default(262144),
  status: z.enum(['Draft', 'Published', 'Archived']).default('Draft'),
});

export const createTestCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  visibility: z.enum(['sample', 'hidden']).default('sample'),
  weight: z.number().min(1).default(1),
  order: z.number().int().default(1),
});

