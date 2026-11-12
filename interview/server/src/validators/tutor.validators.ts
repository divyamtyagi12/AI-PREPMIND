import { z } from 'zod';
import { TUTOR_CONTEXT_TYPES } from '../models/TutorConversation.js';
import { TUTOR_MODES } from '../models/TutorMessage.js';

export const createConversationSchema = z.object({
  title: z.string().trim().max(150).optional(),
  topicId: z.string().trim().optional(),
  contextType: z.enum(TUTOR_CONTEXT_TYPES).default('general'),
  contextReferenceId: z.string().trim().optional(),
});

export const sendMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(10000, 'Message exceeds 10,000 characters'),
  mode: z.enum(TUTOR_MODES).default('explain'),
  hintLevel: z.number().int().min(1).max(4).optional(),
});

export const updateAdminConfigSchema = z.object({
  isActive: z.boolean().optional(),
  dailyRequestLimit: z.number().int().min(1).max(200).optional(),
  allowedModes: z.array(z.enum(TUTOR_MODES)).optional(),
  defaultModel: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().min(256).max(4096).optional(),
});

