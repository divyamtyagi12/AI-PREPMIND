import { complete } from '../ai/gemini.js';
import { buildFollowUpPrompt } from './interviewPrompts.js';
import { z } from 'zod';

const followUpResponseSchema = z.object({
  needsFollowUp: z.boolean(),
  followUpQuestion: z.string().nullable().optional(),
  reason: z.string().optional(),
});

export async function checkAndGenerateFollowUp(params: {
  questionText: string;
  studentAnswer: string;
  interviewType: string;
  targetRole: string;
}): Promise<{ needsFollowUp: boolean; followUpQuestion: string | null }> {
  // If answer is trivially short, do not trigger an in-depth follow-up
  if (params.studentAnswer.trim().length < 25) {
    return { needsFollowUp: false, followUpQuestion: null };
  }

  const { systemPrompt, userPrompt } = buildFollowUpPrompt(params);

  try {
    const rawResponse = await complete(systemPrompt, userPrompt, {
      temperature: 0.5,
      maxOutputTokens: 300,
      json: true,
    });

    const parsed = followUpResponseSchema.parse(JSON.parse(rawResponse));
    if (parsed.needsFollowUp && parsed.followUpQuestion) {
      return {
        needsFollowUp: true,
        followUpQuestion: parsed.followUpQuestion.trim(),
      };
    }
  } catch (e) {
    // Graceful fallback: skip follow-up on error
  }

  return { needsFollowUp: false, followUpQuestion: null };
}

