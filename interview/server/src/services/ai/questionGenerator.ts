import { z } from 'zod';
import { complete } from './gemini';
import { AppError } from '../../utils/AppError';

const generatedQuestionItemSchema = z
  .object({
    title: z.string().trim().min(5).max(200),
    description: z.string().trim().min(10).max(5000),
    type: z.enum(['single_choice', 'multiple_select', 'short_conceptual']),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']),
    options: z
      .array(
        z.object({
          id: z.string().trim().min(1),
          text: z.string().trim().min(1),
        }),
      )
      .default([]),
    correctAnswer: z.any(),
    explanation: z.string().trim().min(5).max(5000),
    hints: z.array(z.string().trim()).default([]),
    tags: z.array(z.string().trim()).default([]),
    evaluationCriteria: z.array(z.string().trim()).default([]),
  })
  .strict();

export interface QuestionGenPromptOptions {
  categoryName: string;
  subjectName: string;
  topicName: string;
  difficulty: string;
  questionType: string;
  count: number;
  referencePlatform: string;
}

export async function generateOriginalQuestionsWithAI(opts: QuestionGenPromptOptions) {
  const systemPrompt = `You are a Senior Computer Science Educator, Placement Expert, and Technical Content Author.
Your role is to create high-quality, completely ORIGINAL technical and placement preparation questions.
Reference Subject/Topic Coverage: Inspired by topics commonly studied on ${opts.referencePlatform} (such as GeeksforGeeks), but all question text, options, explanations, and code examples MUST BE 100% ORIGINAL. Do not copy or paraphrase existing proprietary questions.

FORMAT REQUIREMENTS:
Return ONLY a valid JSON array of objects. Do not wrap in markdown quotes if possible, or provide valid JSON.
Each object must conform to:
{
  "title": "Clear concise question title",
  "description": "Full problem statement, context, or code snippet",
  "type": "${opts.questionType}",
  "difficulty": "${opts.difficulty}",
  "options": [
    {"id": "opt_1", "text": "Option 1"},
    {"id": "opt_2", "text": "Option 2"},
    {"id": "opt_3", "text": "Option 3"},
    {"id": "opt_4", "text": "Option 4"}
  ],
  "correctAnswer": "opt_1", // If single_choice: valid option ID string. If multiple_select: array of option IDs ["opt_1", "opt_3"]. If short_conceptual: detailed reference answer text string.
  "explanation": "Thorough, step-by-step mathematical/logical/theoretical derivation of why the answer is correct.",
  "hints": ["Hint 1", "Hint 2"],
  "tags": ["relevant", "topic", "tags"],
  "evaluationCriteria": ["Criterion 1 for conceptual checklist", "Criterion 2"] // Only if short_conceptual
}

RULES:
1. For single_choice: exactly 4 distinct options, exactly one correct option ID in correctAnswer.
2. For multiple_select: 4 distinct options, 2 or more correct option IDs in correctAnswer array.
3. For short_conceptual: options should be empty array [], correctAnswer must be a reference model solution text.
4. Explanations must be educational, correct, and completely self-contained.`;

  const userPrompt = `Generate ${opts.count} ${opts.difficulty} level "${opts.questionType}" questions for:
Category: ${opts.categoryName}
Subject: ${opts.subjectName}
Topic: ${opts.topicName}

Ensure all numerical or theoretical assertions are mathematically and empirically accurate.`;

  let rawResponse: string;
  try {
    rawResponse = await complete(systemPrompt, userPrompt, { temperature: 0.3, maxOutputTokens: 4000, json: true });
  } catch (err: any) {
    if (err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new AppError(429, 'Gemini API quota exceeded. Please try again in a few minutes.', 'AI_QUOTA_EXCEEDED');
    }
    throw new AppError(500, `AI Question generation failed: ${err?.message || err}`, 'AI_GEN_FAILED');
  }

  // Parse JSON
  let parsed: any;
  try {
    const clean = rawResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    parsed = JSON.parse(clean);
    if (!Array.isArray(parsed) && parsed.questions && Array.isArray(parsed.questions)) {
      parsed = parsed.questions;
    }
  } catch {
    throw new AppError(500, 'AI returned an unparseable response format. Please retry.', 'AI_PARSE_ERROR');
  }

  if (!Array.isArray(parsed)) {
    throw new AppError(500, 'AI did not return a question list. Please retry.', 'AI_INVALID_FORMAT');
  }

  // Validate each question with Zod
  const validatedQuestions: any[] = [];
  for (const item of parsed) {
    const vResult = generatedQuestionItemSchema.safeParse(item);
    if (vResult.success) {
      validatedQuestions.push(vResult.data);
    }
  }

  if (validatedQuestions.length === 0) {
    throw new AppError(500, 'None of the generated questions satisfied schema verification.', 'AI_VALIDATION_FAILED');
  }

  return validatedQuestions;
}

