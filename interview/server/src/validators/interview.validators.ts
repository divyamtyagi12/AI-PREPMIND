import { z } from 'zod';
import {
  INTERVIEW_TYPES,
  INTERVIEW_DIFFICULTIES,
  INTERVIEW_RESPONSE_MODES,
} from '../models/InterviewSession.js';

export const createInterviewSchema = z.object({
  interviewType: z.enum(INTERVIEW_TYPES),
  targetRole: z.string().trim().min(2).max(100),
  difficulty: z.enum(INTERVIEW_DIFFICULTIES).default('intermediate'),
  durationMinutes: z.number().int().min(5).max(60).default(20),
  responseMode: z.enum(INTERVIEW_RESPONSE_MODES).default('text'),
  personalized: z.boolean().default(true),
  projectDetails: z.string().trim().max(3000).optional(),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().trim().min(1),
  answerText: z.string().trim().min(1, 'Answer cannot be empty').max(10000, 'Answer exceeds 10,000 characters'),
  responseDurationSeconds: z.number().int().min(0).optional(),
});

