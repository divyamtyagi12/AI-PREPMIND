import { complete } from '../ai/gemini.js';
import { buildQuestionGenerationPrompt } from './interviewPrompts.js';
import type { BoundedInterviewContext } from './interviewContext.service.js';
import { z } from 'zod';

const generatedQuestionSchema = z.object({
  questionText: z.string().min(5),
  questionType: z.string().default('technical'),
  difficulty: z.string().default('intermediate'),
  expectedCompetencies: z.array(z.string()).default([]),
  evaluationRubric: z.record(z.string(), z.any()).default({}),
});

export async function generateInterviewQuestion(params: {
  interviewType: string;
  targetRole: string;
  difficulty: string;
  questionOrder: number;
  totalQuestions: number;
  context: BoundedInterviewContext;
  previousQuestions: string[];
  projectDetails?: string;
}) {
  const { systemPrompt, userPrompt } = buildQuestionGenerationPrompt(params);

  try {
    const rawResponse = await complete(systemPrompt, userPrompt, {
      temperature: 0.6,
      maxOutputTokens: 800,
      json: true,
    });

    const parsedJson = JSON.parse(rawResponse);
    return generatedQuestionSchema.parse(parsedJson);
  } catch (error) {
    // Graceful fallback question matching interview type if Gemini fails or gives malformed output
    return getFallbackQuestion(params.interviewType, params.targetRole, params.difficulty);
  }
}

function getFallbackQuestion(interviewType: string, role: string, difficulty: string) {
  switch (interviewType) {
    case 'hr':
      return {
        questionText: 'Tell me about yourself and why you are interested in this role.',
        questionType: 'hr',
        difficulty,
        expectedCompetencies: ['Self-awareness', 'Clarity', 'Motivation'],
        evaluationRubric: { criteria: [{ name: 'Communication', weight: 1 }] },
      };
    case 'behavioral':
      return {
        questionText: 'Describe a challenging technical situation you faced and how you resolved it.',
        questionType: 'behavioral',
        difficulty,
        expectedCompetencies: ['Problem solving', 'STAR structure', 'Resilience'],
        evaluationRubric: { criteria: [{ name: 'STAR Framework', weight: 1 }] },
      };
    case 'dsa':
      return {
        questionText: 'Explain how you would determine if a linked list contains a cycle without extra space.',
        questionType: 'dsa',
        difficulty,
        expectedCompetencies: ['Two-pointer technique', 'Time/space complexity'],
        evaluationRubric: { criteria: [{ name: 'Algorithmic Logic', weight: 1 }] },
      };
    case 'project':
      return {
        questionText: 'Walk me through the architecture of a major project you built. What database did you pick and why?',
        questionType: 'project',
        difficulty,
        expectedCompetencies: ['Architecture', 'Trade-offs', 'Database design'],
        evaluationRubric: { criteria: [{ name: 'Technical Depth', weight: 1 }] },
      };
    default:
      return {
        questionText: `Can you explain the difference between processes and threads, and how context switching works in ${role}?`,
        questionType: 'technical',
        difficulty,
        expectedCompetencies: ['OS fundamentals', 'Concurrency', 'Clarity'],
        evaluationRubric: { criteria: [{ name: 'Conceptual Correctness', weight: 1 }] },
      };
  }
}

